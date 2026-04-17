import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { exchangeCode } from '@/lib/oauth';
import { createServiceClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET(request) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Parse state to get project info
    let stateData = {};
    let projectSlug = 'ease';
    let projectId = null;
    try {
      stateData = JSON.parse(Buffer.from(state || '', 'base64url').toString());
      projectSlug = stateData.project_slug || projectSlug;
      projectId = stateData.project_id || null;
    } catch {
      // Fallback: look up project by slug
    }

    // If no project_id from state, look it up by slug
    if (!projectId) {
      const supabaseLookup = createServiceClient();
      const { data: proj } = await supabaseLookup
        .from('projects')
        .select('id')
        .eq('slug', projectSlug)
        .single();
      projectId = proj?.id;
    }

    if (!projectId) {
      return NextResponse.redirect(`${baseUrl}/dashboard/${projectSlug}/integrations?error=meta_no_project`);
    }

    const settingsUrl = `${baseUrl}/dashboard/${projectSlug}/integrations`;

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

    // Store in Supabase — do NOT auto-select an ad account.
    // If user had a previously selected account, keep it; otherwise leave null
    // so they can pick from the account selector in settings.
    const supabase = createServiceClient();
    const adAccounts = adAccountsData.data || [];

    // Check if there's an existing selection
    const { data: existing } = await supabase
      .from('integrations_oauth')
      .select('provider_account_id')
      .eq('project_id', projectId)
      .eq('provider', 'meta')
      .single();

    // Keep existing selection if it's still in the account list, otherwise null
    const previousAccountId = existing?.provider_account_id;
    const stillValid = adAccounts.some(a => a.account_id === previousAccountId);
    const selectedAccountId = stillValid ? previousAccountId : null;
    const selectedAccount = selectedAccountId ? adAccounts.find(a => a.account_id === selectedAccountId) : null;

    const { error: dbError } = await supabase
      .from('integrations_oauth')
      .upsert({
        project_id: projectId,
        provider: 'meta',
        access_token: longLivedToken,
        refresh_token: null,
        token_expires_at: tokenExpiresAt,
        scope: 'ads_read,read_insights,business_management',
        provider_account_id: selectedAccountId,
        provider_metadata: {
          ad_accounts: adAccounts,
          primary_account_name: selectedAccount?.name || null,
          currency: selectedAccount?.currency || null,
          timezone: selectedAccount?.timezone_name || null,
          needs_account_selection: !selectedAccountId && adAccounts.length > 1,
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

    // If multiple accounts and none selected, prompt selection
    if (!selectedAccountId && adAccounts.length > 1) {
      return NextResponse.redirect(`${settingsUrl}?connected=meta&select_account=meta`);
    }

    return NextResponse.redirect(`${settingsUrl}?connected=meta`);
  } catch (error) {
    console.error('Meta OAuth callback error:', error);
    return NextResponse.redirect(`${baseUrl}/dashboard/ease/integrations?error=meta_callback_failed`);
  }
}
