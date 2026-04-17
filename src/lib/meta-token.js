const REFRESH_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export async function getValidMetaToken(supabase, projectId) {
  const { data: integration, error } = await supabase
    .from('integrations_oauth')
    .select('access_token, provider_account_id, provider_metadata, token_expires_at, connected_at')
    .eq('project_id', projectId)
    .eq('provider', 'meta')
    .single();

  if (error || !integration) {
    return { ok: false, status: 404, error: 'Meta not connected', connected: false };
  }

  const { access_token, token_expires_at } = integration;
  const expiresAt = token_expires_at ? new Date(token_expires_at).getTime() : null;
  const now = Date.now();

  if (expiresAt && expiresAt <= now) {
    await markNeedsReauth(supabase, projectId, 'token_expired_at_db');
    return {
      ok: false,
      status: 401,
      error: 'Meta token expired. Please reconnect in Settings.',
      token_expired: true,
      expired_at: token_expires_at,
    };
  }

  if (expiresAt && expiresAt - now < REFRESH_WINDOW_MS) {
    const refreshed = await tryRefreshLongLivedToken(access_token);
    if (refreshed) {
      await supabase
        .from('integrations_oauth')
        .update({
          access_token: refreshed.access_token,
          token_expires_at: refreshed.expires_at,
          updated_at: new Date().toISOString(),
          provider_metadata: {
            ...(integration.provider_metadata || {}),
            needs_reauth: false,
            last_refreshed_at: new Date().toISOString(),
          },
        })
        .eq('project_id', projectId)
        .eq('provider', 'meta');

      return {
        ok: true,
        integration: { ...integration, access_token: refreshed.access_token, token_expires_at: refreshed.expires_at },
      };
    }
  }

  return { ok: true, integration };
}

async function tryRefreshLongLivedToken(currentToken) {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret || !currentToken) return null;

  try {
    const url = `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${currentToken}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.access_token) return null;

    const expiresAt = data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000).toISOString()
      : null;

    return { access_token: data.access_token, expires_at: expiresAt };
  } catch {
    return null;
  }
}

async function markNeedsReauth(supabase, projectId, reason) {
  try {
    const { data: current } = await supabase
      .from('integrations_oauth')
      .select('provider_metadata')
      .eq('project_id', projectId)
      .eq('provider', 'meta')
      .single();

    await supabase
      .from('integrations_oauth')
      .update({
        provider_metadata: {
          ...(current?.provider_metadata || {}),
          needs_reauth: true,
          reauth_reason: reason,
          reauth_flagged_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq('project_id', projectId)
      .eq('provider', 'meta');
  } catch (e) {
    console.error('Failed to mark Meta integration needs_reauth:', e);
  }
}

export async function handleMetaApiError(supabase, projectId, errBody, httpStatus) {
  const isAuthError = httpStatus === 401 || errBody?.error?.code === 190 || errBody?.error?.type === 'OAuthException';
  if (isAuthError) {
    const refreshResult = await refreshAndRetryFlag(supabase, projectId);
    if (refreshResult?.access_token) {
      return { retry: true, new_token: refreshResult.access_token };
    }
    await markNeedsReauth(supabase, projectId, `api_error_${errBody?.error?.code || httpStatus}`);
    return { token_expired: true };
  }
  return { token_expired: false };
}

async function refreshAndRetryFlag(supabase, projectId) {
  const { data: integration } = await supabase
    .from('integrations_oauth')
    .select('access_token')
    .eq('project_id', projectId)
    .eq('provider', 'meta')
    .single();

  if (!integration?.access_token) return null;
  const refreshed = await tryRefreshLongLivedToken(integration.access_token);
  if (!refreshed) return null;

  await supabase
    .from('integrations_oauth')
    .update({
      access_token: refreshed.access_token,
      token_expires_at: refreshed.expires_at,
      updated_at: new Date().toISOString(),
    })
    .eq('project_id', projectId)
    .eq('provider', 'meta');

  return refreshed;
}
