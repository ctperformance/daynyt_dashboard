/**
 * OAuth configuration and helpers for Meta, Shopify, Google Ads, TikTok, Snapchat, and Klaviyo integrations.
 */

const PROVIDERS = {
  meta: {
    authorizationUrl: 'https://www.facebook.com/v21.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v21.0/oauth/access_token',
    revokeUrl: 'https://graph.facebook.com/v21.0/me/permissions',
    scopes: ['ads_read', 'ads_management', 'business_management'],
    clientId: process.env.META_APP_ID,
    clientSecret: process.env.META_APP_SECRET,
  },
  shopify: {
    // Authorization URL is per-shop: https://{shop}.myshopify.com/admin/oauth/authorize
    authorizationUrl: (shop) => `https://${shop}/admin/oauth/authorize`,
    tokenUrl: (shop) => `https://${shop}/admin/oauth/access_token`,
    scopes: ['read_orders', 'read_products', 'read_analytics', 'read_reports'],
    clientId: process.env.SHOPIFY_CLIENT_ID,
    clientSecret: process.env.SHOPIFY_CLIENT_SECRET,
  },
  google: {
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    revokeUrl: 'https://oauth2.googleapis.com/revoke',
    scopes: ['https://www.googleapis.com/auth/adwords'],
    clientId: process.env.GOOGLE_ADS_CLIENT_ID,
    clientSecret: process.env.GOOGLE_ADS_CLIENT_SECRET,
  },
  tiktok: {
    authorizationUrl: 'https://business-api.tiktok.com/portal/auth',
    tokenUrl: 'https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/',
    revokeUrl: null,
    scopes: [],
    clientId: process.env.TIKTOK_APP_ID,
    clientSecret: process.env.TIKTOK_APP_SECRET,
  },
  snapchat: {
    authorizationUrl: 'https://accounts.snapchat.com/login/oauth2/authorize',
    tokenUrl: 'https://accounts.snapchat.com/login/oauth2/access_token',
    revokeUrl: null,
    scopes: ['snapchat-marketing-api'],
    clientId: process.env.SNAPCHAT_CLIENT_ID,
    clientSecret: process.env.SNAPCHAT_CLIENT_SECRET,
  },
  klaviyo: {
    authorizationUrl: 'https://www.klaviyo.com/oauth/authorize',
    tokenUrl: 'https://a.klaviyo.com/oauth/token',
    revokeUrl: null,
    scopes: ['accounts:read', 'campaigns:read', 'flows:read', 'lists:read', 'metrics:read', 'profiles:read', 'segments:read'],
    clientId: process.env.KLAVIYO_CLIENT_ID,
    clientSecret: process.env.KLAVIYO_CLIENT_SECRET,
  },
  bing: {
    authorizationUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    revokeUrl: null,
    scopes: ['https://ads.microsoft.com/msads.manage', 'offline_access'],
    clientId: process.env.BING_ADS_CLIENT_ID,
    clientSecret: process.env.BING_ADS_CLIENT_SECRET,
  },
};

/**
 * Get the base URL for redirects, derived from environment or request headers.
 */
function getBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

/**
 * Build the OAuth authorization URL for a provider.
 * @param {'meta'|'shopify'} provider
 * @param {string} state - CSRF state token
 * @param {object} options - { shop?: string } for Shopify
 * @returns {string} The full authorization URL
 */
export function getAuthUrl(provider, state, options = {}) {
  const config = PROVIDERS[provider];
  if (!config) throw new Error(`Unknown provider: ${provider}`);

  const baseUrl = getBaseUrl();

  if (provider === 'meta') {
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: `${baseUrl}/api/auth/meta/callback`,
      scope: config.scopes.join(','),
      state,
      response_type: 'code',
      auth_type: 'reauthorize',
    });
    return `${config.authorizationUrl}?${params.toString()}`;
  }

  if (provider === 'shopify') {
    const shop = options.shop;
    if (!shop) throw new Error('Shopify requires a shop domain');
    const params = new URLSearchParams({
      client_id: config.clientId,
      scope: config.scopes.join(','),
      redirect_uri: `${baseUrl}/api/auth/shopify/callback`,
      state,
    });
    return `${config.authorizationUrl(shop)}?${params.toString()}`;
  }

  if (provider === 'google') {
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: `${baseUrl}/api/auth/google/callback`,
      scope: config.scopes.join(' '),
      state,
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent',
    });
    return `${config.authorizationUrl}?${params.toString()}`;
  }

  if (provider === 'tiktok') {
    // TikTok uses app_id instead of client_id and has a unique URL format
    const params = new URLSearchParams({
      app_id: config.clientId,
      state,
      redirect_uri: `${baseUrl}/api/auth/tiktok/callback`,
    });
    return `${config.authorizationUrl}?${params.toString()}`;
  }

  if (provider === 'snapchat') {
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: `${baseUrl}/api/auth/snapchat/callback`,
      scope: config.scopes.join(' '),
      state,
      response_type: 'code',
    });
    return `${config.authorizationUrl}?${params.toString()}`;
  }

  if (provider === 'klaviyo') {
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: `${baseUrl}/api/auth/klaviyo/callback`,
      scope: config.scopes.join(' '),
      state,
      response_type: 'code',
    });
    return `${config.authorizationUrl}?${params.toString()}`;
  }

  if (provider === 'bing') {
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: `${baseUrl}/api/auth/bing/callback`,
      scope: config.scopes.join(' '),
      state,
      response_type: 'code',
    });
    return `${config.authorizationUrl}?${params.toString()}`;
  }

  throw new Error(`Provider ${provider} not implemented`);
}

/**
 * Exchange an authorization code for tokens.
 * @param {'meta'|'shopify'} provider
 * @param {string} code
 * @param {object} options - { shop?: string } for Shopify
 * @returns {Promise<object>} Token response
 */
export async function exchangeCode(provider, code, options = {}) {
  const config = PROVIDERS[provider];
  if (!config) throw new Error(`Unknown provider: ${provider}`);

  const baseUrl = getBaseUrl();

  if (provider === 'meta') {
    const params = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: `${baseUrl}/api/auth/meta/callback`,
      code,
    });

    const res = await fetch(`${config.tokenUrl}?${params.toString()}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Meta token exchange failed: ${JSON.stringify(err)}`);
    }
    return res.json();
  }

  if (provider === 'shopify') {
    const shop = options.shop;
    if (!shop) throw new Error('Shopify requires a shop domain');

    const res = await fetch(config.tokenUrl(shop), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Shopify token exchange failed: ${JSON.stringify(err)}`);
    }
    return res.json();
  }

  if (provider === 'google') {
    const res = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: `${baseUrl}/api/auth/google/callback`,
        code,
        grant_type: 'authorization_code',
      }).toString(),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Google token exchange failed: ${JSON.stringify(err)}`);
    }
    return res.json();
  }

  if (provider === 'tiktok') {
    // TikTok uses JSON body and auth_code parameter
    const res = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_id: config.clientId,
        secret: config.clientSecret,
        auth_code: code,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`TikTok token exchange failed: ${JSON.stringify(err)}`);
    }
    return res.json();
  }

  if (provider === 'snapchat') {
    const res = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: `${baseUrl}/api/auth/snapchat/callback`,
        code,
        grant_type: 'authorization_code',
      }).toString(),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Snapchat token exchange failed: ${JSON.stringify(err)}`);
    }
    return res.json();
  }

  if (provider === 'klaviyo') {
    const res = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: `${baseUrl}/api/auth/klaviyo/callback`,
        code,
        grant_type: 'authorization_code',
      }).toString(),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Klaviyo token exchange failed: ${JSON.stringify(err)}`);
    }
    return res.json();
  }

  if (provider === 'bing') {
    const res = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: `${baseUrl}/api/auth/bing/callback`,
        code,
        grant_type: 'authorization_code',
      }).toString(),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Bing token exchange failed: ${JSON.stringify(err)}`);
    }
    return res.json();
  }

  throw new Error(`Provider ${provider} not implemented`);
}

/**
 * Refresh an expired token (Meta only -- Shopify tokens don't expire).
 * @param {'meta'} provider
 * @param {string} currentToken
 * @returns {Promise<object>} New token response
 */
export async function refreshToken(provider, currentToken) {
  if (provider === 'meta') {
    const config = PROVIDERS.meta;
    const params = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      fb_exchange_token: currentToken,
    });

    const res = await fetch(`${config.tokenUrl}?${params.toString()}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Meta token refresh failed: ${JSON.stringify(err)}`);
    }
    return res.json();
  }

  if (provider === 'google') {
    const config = PROVIDERS.google;
    const res = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: currentToken,
        grant_type: 'refresh_token',
      }).toString(),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Google token refresh failed: ${JSON.stringify(err)}`);
    }
    return res.json();
  }

  if (provider === 'snapchat') {
    const config = PROVIDERS.snapchat;
    const res = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: currentToken,
        grant_type: 'refresh_token',
      }).toString(),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Snapchat token refresh failed: ${JSON.stringify(err)}`);
    }
    return res.json();
  }

  if (provider === 'klaviyo') {
    const config = PROVIDERS.klaviyo;
    const res = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: currentToken,
        grant_type: 'refresh_token',
      }).toString(),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Klaviyo token refresh failed: ${JSON.stringify(err)}`);
    }
    return res.json();
  }

  if (provider === 'bing') {
    const config = PROVIDERS.bing;
    const res = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: currentToken,
        grant_type: 'refresh_token',
      }).toString(),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Bing token refresh failed: ${JSON.stringify(err)}`);
    }
    return res.json();
  }

  throw new Error(`Token refresh not supported for provider: ${provider}`);
}

/**
 * Revoke an access token.
 * @param {'meta'|'shopify'} provider
 * @param {string} token
 * @param {object} options - { shop?: string } for Shopify
 * @returns {Promise<boolean>}
 */
export async function revokeToken(provider, token, options = {}) {
  if (provider === 'meta') {
    const config = PROVIDERS.meta;
    const res = await fetch(config.revokeUrl, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.ok;
  }

  if (provider === 'shopify') {
    const shop = options.shop;
    if (!shop) throw new Error('Shopify requires a shop domain');

    const res = await fetch(`https://${shop}/admin/api_permissions/current.json`, {
      method: 'DELETE',
      headers: {
        'X-Shopify-Access-Token': token,
        'Content-Type': 'application/json',
      },
    });
    return res.ok;
  }

  if (provider === 'google') {
    const config = PROVIDERS.google;
    const res = await fetch(`${config.revokeUrl}?token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return res.ok;
  }

  // TikTok, Snapchat, Klaviyo, and Bing don't have standard revoke endpoints
  if (provider === 'tiktok' || provider === 'snapchat' || provider === 'klaviyo' || provider === 'bing') {
    // Gracefully skip -- just remove from DB
    return true;
  }

  throw new Error(`Revoke not supported for provider: ${provider}`);
}

export function encodeOAuthState({ projectId, projectSlug }) {
  const payload = JSON.stringify({
    csrf: crypto.randomUUID(),
    project_id: projectId || null,
    project_slug: projectSlug || null,
  });
  return Buffer.from(payload).toString('base64url');
}

export function decodeOAuthState(stateString) {
  try {
    const decoded = Buffer.from(stateString || '', 'base64url').toString();
    const parsed = JSON.parse(decoded);
    return {
      project_id: parsed.project_id || null,
      project_slug: parsed.project_slug || null,
    };
  } catch {
    return { project_id: null, project_slug: null };
  }
}

export async function resolveProjectId(supabase, { project_id, project_slug }) {
  if (project_id) return project_id;
  if (!project_slug) return null;
  const { data } = await supabase
    .from('projects')
    .select('id')
    .eq('slug', project_slug)
    .single();
  return data?.id || null;
}

export { PROVIDERS };
