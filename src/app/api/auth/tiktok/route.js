import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAuthUrl } from '@/lib/oauth';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET() {
  try {
    const state = crypto.randomUUID();

    const cookieStore = await cookies();
    cookieStore.set('oauth_state_tiktok', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600,
      path: '/',
    });

    const authUrl = getAuthUrl('tiktok', state);
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('TikTok OAuth init error:', error);
    return NextResponse.redirect(
      new URL('/dashboard/ease/settings?error=tiktok_init_failed', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
    );
  }
}
