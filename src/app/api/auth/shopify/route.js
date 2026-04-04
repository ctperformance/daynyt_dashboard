import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAuthUrl } from '@/lib/oauth';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET(request) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const { searchParams } = new URL(request.url);
  const projectSlug = searchParams.get('project_slug') || 'ease';
  const projectId = searchParams.get('project_id') || null;
  const settingsUrl = `${baseUrl}/dashboard/${projectSlug}/settings`;

  try {
    // Standard OAuth flow — requires shop domain
    const shop = searchParams.get('shop');

    if (!shop) {
      return NextResponse.redirect(`${settingsUrl}?error=shopify_no_shop`);
    }

    // Normalize shop domain
    let shopDomain = shop.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
    if (!shopDomain.includes('.')) shopDomain = `${shopDomain}.myshopify.com`;
    if (!shopDomain.includes('.myshopify.com')) shopDomain = `${shopDomain.split('.')[0]}.myshopify.com`;

    const state = crypto.randomUUID();
    const nonce = crypto.randomUUID();

    // Store state, nonce, shop, and project info in cookies
    const cookieStore = await cookies();
    const cookieOpts = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600,
      path: '/',
    };

    cookieStore.set('oauth_state_shopify', state, cookieOpts);
    cookieStore.set('oauth_nonce_shopify', nonce, cookieOpts);
    cookieStore.set('oauth_shop_shopify', shopDomain, cookieOpts);
    cookieStore.set('oauth_project_shopify', JSON.stringify({
      project_id: projectId,
      project_slug: projectSlug,
    }), cookieOpts);

    const authUrl = getAuthUrl('shopify', state, { shop: shopDomain });
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Shopify OAuth init error:', error);
    return NextResponse.redirect(`${settingsUrl}?error=shopify_init_failed`);
  }
}
