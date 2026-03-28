import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAuthUrl } from '@/lib/oauth';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET() {
  try {
    const state = crypto.randomUUID();

    // Store state in cookie for CSRF validation on callback
    const cookieStore = await cookies();
    cookieStore.set('oauth_state_meta', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    });

    const authUrl = getAuthUrl('meta', state);
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Meta OAuth init error:', error);
    return NextResponse.redirect(
      new URL('/dashboard/ease/settings?error=meta_init_failed', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
    );
  }
}
