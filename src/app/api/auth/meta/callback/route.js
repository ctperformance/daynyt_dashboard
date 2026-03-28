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

    // User denied access
    if (error) {
      console.error('Meta OAuth denied:', error);
      return NextResponse.redirect(`${settingsUrl}?error=meta_denied`);
    }

    if (!code || !state) {
      return NextResponse.redirect(`${settingsUrl}?error=meta_missing_params`);
    }

    // Validate state against cookie
    const cookieStore = await cookies();
    const storedState = cookieStore.get('oauth_state_meta')?.value;
    cookieStore.delete('oauth_state_meta');

    if (!storedState || storedState !== state) {
      return NextResponse.redirect(`${settingsUrl}?error=meta_state_mismatch`);
    }

    // Exchange code for access token
    const tokenData = await exchangeCode('meta', code);
    const accessToken = tokenData.access_token;
    const expiresIn = tokenData.expires_in; // seconds

    if (!accessToken) {
      return NextResponse.redirect(`${settingsUrl}?error=meta_no_token`);
    }

    // Fetch user's ad accounts
    const adAccountsRes = await fetch(
      `https://graph.facebook.com/v21.0/me/adaccounts?fields=id,name,account_id,currency,timezone_name&access_token=${accessToken}`
    );
    const adAccountsData = adAccountsRes.ok ? await adAccountsRes.json() : { data: [] };

    // Get long-lived token (exchange short-lived for long-lived)
    let longLivedToken = accessToken;
    let tokenExpiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null;

    try {
      const llRes = await fetch(
        `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.META_APP_ID}&client_secret=${process.env.META_APP_SECRET}&fb_exchange_token=${accessToken}`
      );
      if (llRes.ok) {
        const llData = await llRes.json();
        longLivedToken = llData.access_token || longLivedToken;
        if (llData.expires_in) {
          tokenExpiresAt = new Date(Date.now() + llData.expires_in * 1000).toISOString();
        }
      }
    } catch (llError) {
      console.warn('Could not exchange for long-lived token, using short-lived:', llError.message);
    }

    // Store in Supabase
    const supabase = createServiceClient();
    const projectId = process.env.NEXT_PUBLIC_PROJECT_ID;

    const primaryAdAccount = adAccountsData.data?.[0];

    const { error: dbError } = await supabase
      .from('integrations_oauth')
      .upsert({
        project_id: projectId,
        provider: 'meta',
        access_token: longLivedToken,
        refresh_token: null,
        token_expires_at: tokenExpiresAt,
        scope: 'ads_read,read_insights,business_management',
        provider_account_id: primaryAdAccount?.account_id || null,
        provider_metadata: {
          ad_accounts: adAccountsData.data || [],
          primary_account_name: primaryAdAccount?.name || null,
          currency: primaryAdAccount?.currency || null,
          timezone: primaryAdAccount?.timezone_name || null,
        },
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'project_id,provider',
      });

    if (dbError) {
      console.error('Failed to store Meta token:', dbError);
      return NextResponse.redirect(`${settingsUrl}?error=meta_db_error`);
    }

    return NextResponse.redirect(`${settingsUrl}?connected=meta`);
  } catch (error) {
    console.error('Meta OAuth callback error:', error);
    return NextResponse.redirect(`${settingsUrl}?error=meta_callback_failed`);
  }
}
