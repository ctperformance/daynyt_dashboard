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
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    const { project_id: stateProjectId, project_slug: stateProjectSlug } = decodeOAuthState(state);
    const projectSlug = stateProjectSlug || 'ease';
    const settingsUrl = `${baseUrl}/dashboard/${projectSlug}/integrations`;

    if (error) {
      console.error('Google OAuth denied:', error);
      return NextResponse.redirect(`${settingsUrl}?error=google_denied`);
    }

    if (!code || !state) {
      return NextResponse.redirect(`${settingsUrl}?error=google_missing_params`);
    }

    const cookieStore = await cookies();
    const storedState = cookieStore.get('oauth_state_google')?.value;
    cookieStore.delete('oauth_state_google');

    if (!storedState || storedState !== state) {
      return NextResponse.redirect(`${settingsUrl}?error=google_state_mismatch`);
    }

    const supabase = createServiceClient();
    const projectId = await resolveProjectId(supabase, { project_id: stateProjectId, project_slug: stateProjectSlug });
    if (!projectId) {
      return NextResponse.redirect(`${settingsUrl}?error=google_no_project`);
    }

    const tokenData = await exchangeCode('google', code);
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token || null;
    const expiresIn = tokenData.expires_in;

    if (!accessToken) {
      return NextResponse.redirect(`${settingsUrl}?error=google_no_token`);
    }

    const tokenExpiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null;

    let customerAccounts = [];
    let primaryCustomerId = null;
    try {
      const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
      const customersRes = await fetch(
        'https://googleads.googleapis.com/v16/customers:listAccessibleCustomers',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'developer-token': developerToken || '',
          },
        }
      );
      if (customersRes.ok) {
        const customersData = await customersRes.json();
        customerAccounts = (customersData.resourceNames || []).map((rn) => {
          const id = rn.replace('customers/', '');
          return { id, resourceName: rn };
        });
        primaryCustomerId = customerAccounts[0]?.id || null;
      }
    } catch (apiError) {
      console.warn('Could not fetch Google Ads customers:', apiError.message);
    }

    const { error: dbError } = await supabase
      .from('integrations_oauth')
      .upsert({
        project_id: projectId,
        provider: 'google',
        access_token: accessToken,
        refresh_token: refreshToken,
        token_expires_at: tokenExpiresAt,
        scope: 'https://www.googleapis.com/auth/adwords',
        provider_account_id: primaryCustomerId,
        provider_metadata: {
          customer_accounts: customerAccounts,
          primary_customer_id: primaryCustomerId,
        },
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'project_id,provider',
      });

    if (dbError) {
      console.error('Failed to store Google token:', dbError);
      return NextResponse.redirect(`${settingsUrl}?error=google_db_error`);
    }

    return NextResponse.redirect(`${settingsUrl}?connected=google`);
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    return NextResponse.redirect(`${baseUrl}/dashboard/ease/integrations?error=google_callback_failed`);
  }
}
