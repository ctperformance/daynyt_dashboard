import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { exchangeCode } from '@/lib/oauth';
import { createServiceClient } from '@/lib/supabase-server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

/**
 * Validate Shopify HMAC to ensure the callback is authentic.
 */
function validateShopifyHmac(query, secret) {
  const hmac = query.get('hmac');
  if (!hmac) return false;

  // Build the message from all params except hmac
  const params = new URLSearchParams();
  for (const [key, value] of query.entries()) {
    if (key !== 'hmac') {
      params.set(key, value);
    }
  }

  // Sort params alphabetically
  const sortedParams = new URLSearchParams([...params.entries()].sort());
  const message = sortedParams.toString();

  const generatedHmac = crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(hmac, 'hex'),
    Buffer.from(generatedHmac, 'hex')
  );
}

export async function GET(request) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const settingsUrl = `${baseUrl}/dashboard/ease/settings`;

  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const shop = searchParams.get('shop');
    const hmac = searchParams.get('hmac');

    if (!code || !state || !shop || !hmac) {
      return NextResponse.redirect(`${settingsUrl}?error=shopify_missing_params`);
    }

    // Validate HMAC
    const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;
    if (clientSecret) {
      const isValid = validateShopifyHmac(searchParams, clientSecret);
      if (!isValid) {
        console.error('Shopify HMAC validation failed');
        return NextResponse.redirect(`${settingsUrl}?error=shopify_hmac_invalid`);
      }
    }

    // Validate state against cookie
    const cookieStore = await cookies();
    const storedState = cookieStore.get('oauth_state_shopify')?.value;
    const storedShop = cookieStore.get('oauth_shop_shopify')?.value;

    cookieStore.delete('oauth_state_shopify');
    cookieStore.delete('oauth_nonce_shopify');
    cookieStore.delete('oauth_shop_shopify');

    if (!storedState || storedState !== state) {
      return NextResponse.redirect(`${settingsUrl}?error=shopify_state_mismatch`);
    }

    if (storedShop && storedShop !== shop) {
      return NextResponse.redirect(`${settingsUrl}?error=shopify_shop_mismatch`);
    }

    // Exchange code for permanent access token
    const tokenData = await exchangeCode('shopify', code, { shop });
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return NextResponse.redirect(`${settingsUrl}?error=shopify_no_token`);
    }

    // Fetch shop info
    let shopInfo = {};
    try {
      const shopRes = await fetch(`https://${shop}/admin/api/2025-01/shop.json`, {
        headers: { 'X-Shopify-Access-Token': accessToken },
      });
      if (shopRes.ok) {
        const shopData = await shopRes.json();
        shopInfo = shopData.shop || {};
      }
    } catch (e) {
      console.warn('Could not fetch shop info:', e.message);
    }

    // Store in Supabase
    const supabase = createServiceClient();
    const projectId = process.env.NEXT_PUBLIC_PROJECT_ID;

    const { error: dbError } = await supabase
      .from('integrations_oauth')
      .upsert({
        project_id: projectId,
        provider: 'shopify',
        access_token: accessToken,
        refresh_token: null, // Shopify tokens don't expire
        token_expires_at: null,
        scope: tokenData.scope || 'read_orders,read_products,read_analytics,read_reports',
        provider_account_id: shop,
        provider_metadata: {
          shop_name: shopInfo.name || shop,
          shop_domain: shopInfo.domain || shop,
          shop_email: shopInfo.email || null,
          currency: shopInfo.currency || null,
          plan: shopInfo.plan_name || null,
        },
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'project_id,provider',
      });

    if (dbError) {
      console.error('Failed to store Shopify token:', dbError);
      return NextResponse.redirect(`${settingsUrl}?error=shopify_db_error`);
    }

    return NextResponse.redirect(`${settingsUrl}?connected=shopify`);
  } catch (error) {
    console.error('Shopify OAuth callback error:', error);
    return NextResponse.redirect(`${settingsUrl}?error=shopify_callback_failed`);
  }
}
