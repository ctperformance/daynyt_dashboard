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
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      console.error('Bing OAuth denied:', error);
      return NextResponse.redirect(`${settingsUrl}?error=bing_denied`);
    }

    if (!code || !state) {
      return NextResponse.redirect(`${settingsUrl}?error=bing_missing_params`);
    }

    // Validate state against cookie
    const cookieStore = await cookies();
    const storedState = cookieStore.get('oauth_state_bing')?.value;
    cookieStore.delete('oauth_state_bing');

    if (!storedState || storedState !== state) {
      return NextResponse.redirect(`${settingsUrl}?error=bing_state_mismatch`);
    }

    // Exchange code for tokens
    const tokenData = await exchangeCode('bing', code);
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token || null;
    const expiresIn = tokenData.expires_in;

    if (!accessToken) {
      return NextResponse.redirect(`${settingsUrl}?error=bing_no_token`);
    }

    const tokenExpiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null;

    // Fetch Bing Ads account info
    let accountId = null;
    let accountName = null;
    const developerToken = process.env.BING_ADS_DEVELOPER_TOKEN;

    try {
      const accountsRes = await fetch(
        'https://campaign.api.bingads.microsoft.com/Api/v13/CustomerManagement/GetUser',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            DeveloperToken: developerToken || '',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        }
      );

      if (accountsRes.ok) {
        const accountsData = await accountsRes.json();
        accountId = accountsData?.User?.Id?.toString() || null;
        accountName = accountsData?.User?.UserName || null;
      }
    } catch (apiError) {
      console.warn('Could not fetch Bing Ads account info:', apiError.message);
    }

    // Store in Supabase
    const supabase = createServiceClient();
    const projectId = process.env.NEXT_PUBLIC_PROJECT_ID;

    const { error: dbError } = await supabase
      .from('integrations_oauth')
      .upsert({
        project_id: projectId,
        provider: 'bing',
        access_token: accessToken,
        refresh_token: refreshToken,
        token_expires_at: tokenExpiresAt,
        scope: 'https://ads.microsoft.com/msads.manage offline_access',
        provider_account_id: accountId,
        provider_metadata: {
          account_name: accountName,
          developer_token: developerToken,
        },
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'project_id,provider',
      });

    if (dbError) {
      console.error('Failed to store Bing token:', dbError);
      return NextResponse.redirect(`${settingsUrl}?error=bing_db_error`);
    }

    return NextResponse.redirect(`${settingsUrl}?connected=bing`);
  } catch (error) {
    console.error('Bing OAuth callback error:', error);
    return NextResponse.redirect(`${settingsUrl}?error=bing_callback_failed`);
  }
}
