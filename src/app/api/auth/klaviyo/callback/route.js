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
      console.error('Klaviyo OAuth denied:', error);
      return NextResponse.redirect(`${settingsUrl}?error=klaviyo_denied`);
    }

    if (!code || !state) {
      return NextResponse.redirect(`${settingsUrl}?error=klaviyo_missing_params`);
    }

    // Validate state against cookie
    const cookieStore = await cookies();
    const storedState = cookieStore.get('oauth_state_klaviyo')?.value;
    cookieStore.delete('oauth_state_klaviyo');

    if (!storedState || storedState !== state) {
      return NextResponse.redirect(`${settingsUrl}?error=klaviyo_state_mismatch`);
    }

    // Exchange code for tokens
    const tokenData = await exchangeCode('klaviyo', code);
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token || null;
    const expiresIn = tokenData.expires_in;

    if (!accessToken) {
      return NextResponse.redirect(`${settingsUrl}?error=klaviyo_no_token`);
    }

    // Fetch account info
    let accountInfo = {};
    try {
      const accountRes = await fetch('https://a.klaviyo.com/api/accounts/', {
        headers: {
          'Authorization': `Klaviyo-API-Key ${accessToken}`,
          'revision': '2024-10-15',
          'Accept': 'application/json',
        },
      });
      if (accountRes.ok) {
        const accountData = await accountRes.json();
        const account = accountData.data?.[0];
        if (account) {
          accountInfo = {
            account_id: account.id,
            account_name: account.attributes?.contact_information?.default_sender_name || account.id,
            timezone: account.attributes?.timezone || null,
          };
        }
      }
    } catch (accErr) {
      console.warn('Could not fetch Klaviyo account info:', accErr.message);
    }

    // Store in Supabase
    const supabase = createServiceClient();
    const projectId = process.env.NEXT_PUBLIC_PROJECT_ID;

    const tokenExpiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : null;

    const { error: dbError } = await supabase
      .from('integrations_oauth')
      .upsert({
        project_id: projectId,
        provider: 'klaviyo',
        access_token: accessToken,
        refresh_token: refreshToken,
        token_expires_at: tokenExpiresAt,
        scope: 'accounts:read,campaigns:read,flows:read,lists:read,metrics:read,profiles:read,segments:read',
        provider_account_id: accountInfo.account_id || null,
        provider_metadata: {
          account_name: accountInfo.account_name || null,
          timezone: accountInfo.timezone || null,
        },
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'project_id,provider',
      });

    if (dbError) {
      console.error('Failed to store Klaviyo token:', dbError);
      return NextResponse.redirect(`${settingsUrl}?error=klaviyo_db_error`);
    }

    return NextResponse.redirect(`${settingsUrl}?connected=klaviyo`);
  } catch (error) {
    console.error('Klaviyo OAuth callback error:', error);
    return NextResponse.redirect(`${settingsUrl}?error=klaviyo_callback_failed`);
  }
}
