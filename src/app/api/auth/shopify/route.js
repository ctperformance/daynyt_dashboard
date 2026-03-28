import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAuthUrl } from '@/lib/oauth';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET(request) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const settingsUrl = `${baseUrl}/dashboard/ease/settings`;

  try {
    const { searchParams } = new URL(request.url);
    const shop = searchParams.get('shop');

    if (!shop) {
      return NextResponse.redirect(`${settingsUrl}?error=shopify_no_shop`);
    }

    // Normalize shop domain
    const shopDomain = shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`;

    const state = crypto.randomUUID();
    const nonce = crypto.randomUUID();

    // Store state and nonce in cookies for validation
    const cookieStore = await cookies();
    cookieStore.set('oauth_state_shopify', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600,
      path: '/',
    });
    cookieStore.set('oauth_nonce_shopify', nonce, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600,
      path: '/',
    });
    cookieStore.set('oauth_shop_shopify', shopDomain, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600,
      path: '/',
    });

    const authUrl = getAuthUrl('shopify', state, { shop: shopDomain });
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Shopify OAuth init error:', error);
    return NextResponse.redirect(`${settingsUrl}?error=shopify_init_failed`);
  }
}
