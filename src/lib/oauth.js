/**
 * OAuth configuration and helpers for Meta and Shopify integrations.
 */

const PROVIDERS = {
  meta: {
    authorizationUrl: 'https://www.facebook.com/v19.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v19.0/oauth/access_token',
    revokeUrl: 'https://graph.facebook.com/v19.0/me/permissions',
    scopes: ['ads_read', 'read_insights', 'business_management'],
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

    const config = PROVIDERS.shopify;
    const res = await fetch(`https://${shop}/admin/api_permissions/current.json`, {
      method: 'DELETE',
      headers: {
        'X-Shopify-Access-Token': token,
        'Content-Type': 'application/json',
      },
    });
    return res.ok;
  }

  throw new Error(`Revoke not supported for provider: ${provider}`);
}

export { PROVIDERS };
