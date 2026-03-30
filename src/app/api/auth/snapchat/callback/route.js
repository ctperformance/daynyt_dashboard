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
      console.error('Snapchat OAuth denied:', error);
      return NextResponse.redirect(`${settingsUrl}?error=snapchat_denied`);
    }

    if (!code || !state) {
      return NextResponse.redirect(`${settingsUrl}?error=snapchat_missing_params`);
    }

    // Validate state against cookie
    const cookieStore = await cookies();
    const storedState = cookieStore.get('oauth_state_snapchat')?.value;
    cookieStore.delete('oauth_state_snapchat');

    if (!storedState || storedState !== state) {
      return NextResponse.redirect(`${settingsUrl}?error=snapchat_state_mismatch`);
    }

    // Exchange code for tokens
    const tokenData = await exchangeCode('snapchat', code);
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token || null;
    const expiresIn = tokenData.expires_in;

    if (!accessToken) {
      return NextResponse.redirect(`${settingsUrl}?error=snapchat_no_token`);
    }

    const tokenExpiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null;

    // Fetch ad accounts from Snapchat Marketing API
    let adAccounts = [];
    let primaryAdAccountId = null;
    let primaryAdAccountName = null;
    try {
      const meRes = await fetch('https://adsapi.snapchat.com/v1/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (meRes.ok) {
        const meData = await meRes.json();
        const orgId = meData.me?.organization_id;
        if (orgId) {
          const adAccountsRes = await fetch(
            `https://adsapi.snapchat.com/v1/organizations/${orgId}/adaccounts`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          if (adAccountsRes.ok) {
            const adAccountsData = await adAccountsRes.json();
            adAccounts = (adAccountsData.adaccounts || []).map((aa) => ({
              id: aa.adaccount?.id,
              name: aa.adaccount?.name,
              currency: aa.adaccount?.currency,
              status: aa.adaccount?.status,
            }));
            primaryAdAccountId = adAccounts[0]?.id || null;
            primaryAdAccountName = adAccounts[0]?.name || null;
          }
        }
      }
    } catch (apiError) {
      console.warn('Could not fetch Snapchat ad accounts:', apiError.message);
    }

    // Store in Supabase
    const supabase = createServiceClient();
    const projectId = process.env.NEXT_PUBLIC_PROJECT_ID;

    const { error: dbError } = await supabase
      .from('integrations_oauth')
      .upsert({
        project_id: projectId,
        provider: 'snapchat',
        access_token: accessToken,
        refresh_token: refreshToken,
        token_expires_at: tokenExpiresAt,
        scope: 'snapchat-marketing-api',
        provider_account_id: primaryAdAccountId,
        provider_metadata: {
          ad_accounts: adAccounts,
          primary_account_name: primaryAdAccountName,
        },
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'project_id,provider',
      });

    if (dbError) {
      console.error('Failed to store Snapchat token:', dbError);
      return NextResponse.redirect(`${settingsUrl}?error=snapchat_db_error`);
    }

    return NextResponse.redirect(`${settingsUrl}?connected=snapchat`);
  } catch (error) {
    console.error('Snapchat OAuth callback error:', error);
    return NextResponse.redirect(`${settingsUrl}?error=snapchat_callback_failed`);
  }
}
