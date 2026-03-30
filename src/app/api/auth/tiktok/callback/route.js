import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { exchangeCode } from '@/lib/oauth';
import { createServiceClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET(request) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const settingsUrl = `${baseUrl}/dashboard/ease/settings`;

  try {
    const { searchParams } = new URL(request.url);
    // TikTok uses auth_code instead of code
    const code = searchParams.get('auth_code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      console.error('TikTok OAuth denied:', error);
      return NextResponse.redirect(`${settingsUrl}?error=tiktok_denied`);
    }

    if (!code || !state) {
      return NextResponse.redirect(`${settingsUrl}?error=tiktok_missing_params`);
    }

    // Validate state against cookie
    const cookieStore = await cookies();
    const storedState = cookieStore.get('oauth_state_tiktok')?.value;
    cookieStore.delete('oauth_state_tiktok');

    if (!storedState || storedState !== state) {
      return NextResponse.redirect(`${settingsUrl}?error=tiktok_state_mismatch`);
    }

    // Exchange auth_code for tokens
    const tokenResponse = await exchangeCode('tiktok', code);
    // TikTok wraps the token data in a `data` field
    const tokenData = tokenResponse.data || tokenResponse;
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return NextResponse.redirect(`${settingsUrl}?error=tiktok_no_token`);
    }

    const advertiserIds = tokenData.advertiser_ids || [];
    const primaryAdvertiserId = advertiserIds[0] || null;

    // Store in Supabase
    const supabase = createServiceClient();
    const projectId = process.env.NEXT_PUBLIC_PROJECT_ID;

    const { error: dbError } = await supabase
      .from('integrations_oauth')
      .upsert({
        project_id: projectId,
        provider: 'tiktok',
        access_token: accessToken,
        refresh_token: null,
        token_expires_at: null,
        scope: 'advertiser_management',
        provider_account_id: primaryAdvertiserId,
        provider_metadata: {
          advertiser_ids: advertiserIds,
          primary_advertiser_id: primaryAdvertiserId,
        },
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'project_id,provider',
      });

    if (dbError) {
      console.error('Failed to store TikTok token:', dbError);
      return NextResponse.redirect(`${settingsUrl}?error=tiktok_db_error`);
    }

    return NextResponse.redirect(`${settingsUrl}?connected=tiktok`);
  } catch (error) {
    console.error('TikTok OAuth callback error:', error);
    return NextResponse.redirect(`${settingsUrl}?error=tiktok_callback_failed`);
  }
}
