import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { exchangeCode, decodeOAuthState, resolveProjectId } from '@/lib/oauth';
import { createServiceClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET(request) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('auth_code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    const { project_id: stateProjectId, project_slug: stateProjectSlug } = decodeOAuthState(state);
    const projectSlug = stateProjectSlug || 'ease';
    const settingsUrl = `${baseUrl}/dashboard/${projectSlug}/integrations`;

    if (error) {
      console.error('TikTok OAuth denied:', error);
      return NextResponse.redirect(`${settingsUrl}?error=tiktok_denied`);
    }

    if (!code || !state) {
      return NextResponse.redirect(`${settingsUrl}?error=tiktok_missing_params`);
    }

    const cookieStore = await cookies();
    const storedState = cookieStore.get('oauth_state_tiktok')?.value;
    cookieStore.delete('oauth_state_tiktok');

    if (!storedState || storedState !== state) {
      return NextResponse.redirect(`${settingsUrl}?error=tiktok_state_mismatch`);
    }

    const supabase = createServiceClient();
    const projectId = await resolveProjectId(supabase, { project_id: stateProjectId, project_slug: stateProjectSlug });
    if (!projectId) {
      return NextResponse.redirect(`${settingsUrl}?error=tiktok_no_project`);
    }

    const tokenResponse = await exchangeCode('tiktok', code);
    const tokenData = tokenResponse.data || tokenResponse;
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return NextResponse.redirect(`${settingsUrl}?error=tiktok_no_token`);
    }

    const advertiserIds = tokenData.advertiser_ids || [];
    const primaryAdvertiserId = advertiserIds[0] || null;

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
    return NextResponse.redirect(`${baseUrl}/dashboard/ease/integrations?error=tiktok_callback_failed`);
  }
}
