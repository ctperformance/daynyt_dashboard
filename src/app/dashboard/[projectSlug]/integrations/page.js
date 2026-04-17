'use client';

import Link from 'next/link';
import { Suspense, useState, useEffect, useCallback, use } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

const INTEGRATIONS_CONFIG = [
  {
    key: 'quiz',
    name: 'Quiz-Funnel',
    icon: '\u2726',
    provider: null,
    description: 'Quiz Webhook (Add-on)',
    detailPath: '/quiz',
    addonKey: 'quiz',
  },
  {
    key: 'meta',
    name: 'Meta Ads',
    icon: '\u25CE',
    provider: 'meta',
    description: 'Meta Business Manager \u2014 Facebook & Instagram Ads',
    detailPath: '/meta',
  },
  {
    key: 'google',
    name: 'Google Ads',
    icon: '\u25C9',
    provider: 'google',
    description: 'Google Ads API \u2014 Search, Display, Shopping',
    detailPath: '/google',
  },
  {
    key: 'tiktok',
    name: 'TikTok Ads',
    icon: '\u266A',
    provider: 'tiktok',
    description: 'TikTok Business API',
    detailPath: '/tiktok',
  },
  {
    key: 'snapchat',
    name: 'Snapchat Ads',
    icon: '\u25C7',
    provider: 'snapchat',
    description: 'Snapchat Marketing API',
    detailPath: '/snapchat',
  },
  {
    key: 'bing',
    name: 'Bing Ads',
    icon: '\u25A3',
    provider: 'bing',
    description: 'Microsoft Advertising API',
    detailPath: '/bing',
  },
  {
    key: 'shopify',
    name: 'Shopify',
    icon: '\u2B21',
    provider: 'shopify',
    description: 'Shopify Admin API \u2014 Bestellungen, Umsatz, Produkte',
    detailPath: '/shopify',
    needsShopOAuth: true,
  },
  {
    key: 'klaviyo',
    name: 'Klaviyo (E-Mail)',
    icon: '\u2709',
    provider: 'klaviyo',
    description: 'E-Mail Marketing \u2014 Kampagnen, Flows, Listen',
    detailPath: '/email',
  },
  {
    key: 'clarity',
    name: 'Microsoft Clarity',
    icon: '\u25CE',
    provider: 'clarity',
    description: 'Website Analytics \u2014 Heatmaps, Sessions, Rage Clicks',
    detailPath: '/clarity',
    needsApiKey: true,
  },
];

export default function IntegrationsPage({ params }) {
  const { projectSlug } = use(params);

  return (
    <Suspense fallback={<div className="px-8 py-8 text-gray-600 text-sm">Laden...</div>}>
      <IntegrationsContent projectSlug={projectSlug} />
    </Suspense>
  );
}

function IntegrationsContent({ projectSlug }) {
  const searchParams = useSearchParams();
  const { userProjects } = useAuth();
  const [status, setStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [shopifyDomain, setShopifyDomain] = useState('');
  const [disconnecting, setDisconnecting] = useState(null);
  const [clarityProjectId, setClarityProjectId] = useState('');
  const [clarityApiToken, setClarityApiToken] = useState('');
  const [savingApiKey, setSavingApiKey] = useState(false);
  const [selectingAccount, setSelectingAccount] = useState(null);
  const [showAccountSelector, setShowAccountSelector] = useState(null);

  const project = userProjects.find((p) => p.slug === projectSlug);
  const projectName = project?.name || projectSlug.toUpperCase();
  const projectId = project?.id;

  const fetchStatus = useCallback(async () => {
    if (!projectId) return;
    try {
      const res = await fetch(`/api/integrations/status?project_id=${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (err) {
      console.error('Failed to fetch integration status:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    const connected = searchParams.get('connected');
    const error = searchParams.get('error');

    const selectAccount = searchParams.get('select_account');
    if (selectAccount) {
      setShowAccountSelector(selectAccount);
    }

    if (connected) {
      const nameMap = { meta: 'Meta Ads', shopify: 'Shopify', google: 'Google Ads', tiktok: 'TikTok Ads', snapchat: 'Snapchat Ads', bing: 'Bing Ads', klaviyo: 'Klaviyo', clarity: 'Microsoft Clarity' };
      const providerName = nameMap[connected] || connected;
      setToast({ type: 'success', message: selectAccount ? `${providerName} verbunden \u2014 bitte Werbekonto w\u00E4hlen.` : `${providerName} erfolgreich verbunden!` });
      window.history.replaceState({}, '', `/dashboard/${projectSlug}/integrations`);
      fetchStatus();
    } else if (error) {
      setToast({ type: 'error', message: `Verbindungsfehler: ${error}` });
      window.history.replaceState({}, '', `/dashboard/${projectSlug}/integrations`);
    }
  }, [searchParams, fetchStatus, projectSlug]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleDisconnect = async (provider) => {
    if (!confirm('Verbindung wirklich trennen?')) return;
    setDisconnecting(provider);
    try {
      const res = await fetch('/api/auth/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, project_id: projectId }),
      });
      if (res.ok) {
        setToast({ type: 'success', message: 'Verbindung getrennt.' });
        fetchStatus();
      } else {
        setToast({ type: 'error', message: 'Fehler beim Trennen der Verbindung.' });
      }
    } catch {
      setToast({ type: 'error', message: 'Netzwerkfehler.' });
    } finally {
      setDisconnecting(null);
    }
  };

  const handleOAuthRedirect = (provider) => {
    window.location.href = `/api/auth/${provider}?project_id=${projectId}&project_slug=${projectSlug}`;
  };

  const handleApiKeySave = async (provider, token, accountId) => {
    setSavingApiKey(true);
    try {
      const res = await fetch('/api/integrations/save-apikey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          provider,
          api_token: token,
          provider_account_id: accountId,
        }),
      });
      if (res.ok) {
        setToast({ type: 'success', message: `${provider === 'clarity' ? 'Microsoft Clarity' : provider} erfolgreich verbunden!` });
        fetchStatus();
      } else {
        setToast({ type: 'error', message: 'Fehler beim Speichern der Verbindung.' });
      }
    } catch {
      setToast({ type: 'error', message: 'Netzwerkfehler.' });
    }
    setSavingApiKey(false);
  };

  const handleSelectAdAccount = async (provider, accountId) => {
    setSelectingAccount(provider);
    try {
      const res = await fetch('/api/integrations/select-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, provider, account_id: accountId }),
      });
      if (res.ok) {
        const data = await res.json();
        setToast({ type: 'success', message: `Werbekonto "${data.account.name}" ausgew\u00E4hlt.` });
        setShowAccountSelector(null);
        fetchStatus();
      } else {
        setToast({ type: 'error', message: 'Fehler beim Ausw\u00E4hlen des Kontos.' });
      }
    } catch {
      setToast({ type: 'error', message: 'Netzwerkfehler.' });
    } finally {
      setSelectingAccount(null);
    }
  };

  const handleClarityConnect = (e) => {
    e.preventDefault();
    if (clarityProjectId && clarityApiToken) {
      handleApiKeySave('clarity', clarityApiToken, clarityProjectId);
    }
  };

  const handleShopifyConnect = (e) => {
    e.preventDefault();
    if (!shopifyDomain) return;
    const domain = shopifyDomain.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
    window.location.href = `/api/auth/shopify?shop=${encodeURIComponent(domain)}&project_id=${projectId}&project_slug=${projectSlug}`;
  };

  const projectAddons = project?.addons || {};
  const isAddonEnabled = (integration) => {
    if (!integration.addonKey) return true;
    return projectAddons[integration.addonKey]?.enabled === true;
  };
  const getAddonName = (integration) => {
    if (!integration.addonKey) return integration.name;
    return projectAddons[integration.addonKey]?.name || integration.name;
  };
  const visibleIntegrations = INTEGRATIONS_CONFIG.filter((i) => isAddonEnabled(i));

  const getIntegrationStatus = (integration) => {
    if (integration.addonKey && isAddonEnabled(integration)) return 'connected';
    if (!integration.provider) return 'disconnected';
    return status[integration.provider]?.connected ? 'connected' : 'disconnected';
  };

  const getStatusDetail = (integration) => {
    if (integration.addonKey && isAddonEnabled(integration)) return 'Add-on aktiv';
    const providerStatus = status[integration.provider];
    if (!providerStatus?.connected) return 'Nicht verbunden';
    if (providerStatus.needs_reauth) return 'Verbindung abgelaufen';
    if (providerStatus.account_id) {
      return `Konto: ${providerStatus.metadata?.primary_account_name || providerStatus.metadata?.shop_name || providerStatus.account_id}`;
    }
    return 'Verbunden';
  };

  const connectedCount = visibleIntegrations.filter((i) => getIntegrationStatus(i) === 'connected').length;

  return (
    <div className="px-8 py-8 max-w-[1800px] mx-auto w-full">
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl border text-sm font-medium shadow-lg transition-all ${
          toast.type === 'success'
            ? 'bg-ease-green/10 border-ease-green/30 text-ease-green'
            : 'bg-ease-red/10 border-ease-red/30 text-ease-red'
        }`}>
          {toast.message}
        </div>
      )}

      <div className="flex items-center gap-2 text-xs mb-2 animate-fade-in">
        <Link href="/dashboard" className="text-ease-muted hover:text-white transition-colors">Dashboard</Link>
        <span className="text-white/20">/</span>
        <Link href={`/dashboard/${projectSlug}`} className="text-ease-muted hover:text-white transition-colors">{projectName}</Link>
        <span className="text-white/20">/</span>
        <span className="text-white font-medium">Integrationen</span>
      </div>

      <div className="flex items-end justify-between mb-8 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Integrationen</h1>
          <p className="text-xs text-ease-muted mt-1">
            {connectedCount} von {visibleIntegrations.length} Kan\u00E4len verbunden
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 animate-fade-in">
        {visibleIntegrations.map((integration) => {
          const integrationStatus = getIntegrationStatus(integration);
          const detail = getStatusDetail(integration);
          const providerStatus = status[integration.provider];
          const needsReauth = providerStatus?.needs_reauth;

          return (
            <div key={integration.key} className={`glass rounded-2xl p-5 border transition-all ${
              needsReauth
                ? 'border-ease-red/30 bg-ease-red/5'
                : integrationStatus === 'connected'
                ? 'border-white/[0.08]'
                : 'border-white/[0.04]'
            }`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 ${
                    integrationStatus === 'connected' ? 'bg-ease-accent/10 text-ease-accent' : 'bg-white/[0.04] text-white/30'
                  }`}>
                    {integration.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{getAddonName(integration)}</p>
                    <p className="text-[11px] text-ease-muted mt-0.5 truncate">{integration.description}</p>
                  </div>
                </div>
                {integrationStatus === 'connected' && !needsReauth && (
                  <span className="flex items-center gap-1.5 text-[10px] text-ease-green bg-ease-green/10 px-2 py-0.5 rounded-full shrink-0">
                    <span className="w-1.5 h-1.5 bg-ease-green rounded-full" />
                    Live
                  </span>
                )}
                {needsReauth && (
                  <span className="flex items-center gap-1.5 text-[10px] text-ease-red bg-ease-red/10 px-2 py-0.5 rounded-full shrink-0">
                    <span className="w-1.5 h-1.5 bg-ease-red rounded-full" />
                    Abgelaufen
                  </span>
                )}
              </div>

              {!loading && (
                <p className="text-[11px] text-white/40 mb-3">{detail}</p>
              )}

              {/* Action row */}
              <div className="flex items-center gap-2 flex-wrap">
                {loading ? (
                  <span className="text-xs text-white/30">Laden...</span>
                ) : integrationStatus === 'connected' ? (
                  <>
                    {integration.detailPath && (
                      <Link
                        href={`/dashboard/${projectSlug}${integration.detailPath}`}
                        className="text-[11px] text-white bg-white/[0.06] hover:bg-white/[0.1] px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Daten ansehen \u2192
                      </Link>
                    )}
                    {!integration.addonKey && (
                      <button
                        onClick={() => handleDisconnect(integration.provider)}
                        disabled={disconnecting === integration.provider}
                        className="text-[11px] text-ease-red/70 hover:text-ease-red bg-ease-red/5 hover:bg-ease-red/10 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {disconnecting === integration.provider ? '...' : 'Trennen'}
                      </button>
                    )}
                    {needsReauth && (
                      <button
                        onClick={() => handleOAuthRedirect(integration.provider)}
                        className="text-[11px] text-ease-red bg-ease-red/10 hover:bg-ease-red/15 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Neu verbinden
                      </button>
                    )}
                  </>
                ) : integration.needsApiKey ? (
                  <span className="text-[11px] text-ease-accent">Unten: API-Key eingeben</span>
                ) : integration.needsShopOAuth ? (
                  <span className="text-[11px] text-ease-accent">Unten: Shopify-Domain eingeben</span>
                ) : (
                  <button
                    onClick={() => handleOAuthRedirect(integration.provider)}
                    className="text-[11px] text-ease-accent bg-ease-accent/10 hover:bg-ease-accent/20 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Jetzt verbinden
                  </button>
                )}
              </div>

              {/* Ad Account Selector */}
              {integrationStatus === 'connected' && !loading && status[integration.provider]?.metadata?.ad_accounts?.length > 1 && (
                <div className="mt-3">
                  {showAccountSelector === integration.provider ? (
                    <div className="space-y-2">
                      <p className="text-[11px] text-white/40">Werbekonto ausw\u00E4hlen:</p>
                      <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                        {status[integration.provider].metadata.ad_accounts.map((acc) => (
                          <button
                            key={acc.account_id}
                            onClick={() => handleSelectAdAccount(integration.provider, acc.account_id)}
                            disabled={selectingAccount === integration.provider}
                            className={`text-left text-xs px-3 py-2 rounded-lg border transition-colors disabled:opacity-50 ${
                              acc.account_id === status[integration.provider]?.account_id
                                ? 'border-ease-accent bg-ease-accent/10 text-ease-accent'
                                : 'border-white/[0.06] bg-white/[0.02] text-white/60 hover:border-white/20 hover:text-white'
                            }`}
                          >
                            <span className="font-medium">{acc.name}</span>
                            <span className="text-white/30 ml-2">({acc.account_id})</span>
                            {acc.account_id === status[integration.provider]?.account_id && (
                              <span className="ml-2 text-ease-green">&#10003;</span>
                            )}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => setShowAccountSelector(null)}
                        className="text-[11px] text-white/40 hover:text-white transition-colors"
                      >
                        Abbrechen
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowAccountSelector(integration.provider)}
                      className="text-[11px] text-white/40 hover:text-ease-accent transition-colors"
                    >
                      {status[integration.provider]?.metadata?.needs_account_selection
                        ? '\u26A0 Werbekonto ausw\u00E4hlen'
                        : 'Werbekonto wechseln'}
                    </button>
                  )}
                </div>
              )}

              {integration.needsShopOAuth && integrationStatus === 'disconnected' && !loading && (
                <form onSubmit={handleShopifyConnect} className="mt-3 space-y-2">
                  <input
                    id="shopify-domain"
                    type="text"
                    value={shopifyDomain}
                    onChange={(e) => setShopifyDomain(e.target.value)}
                    placeholder="dein-store.myshopify.com"
                    className="w-full bg-ease-bg border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-ease-accent transition-colors"
                    required
                  />
                  <button
                    type="submit"
                    className="w-full text-xs text-ease-accent bg-ease-accent/10 hover:bg-ease-accent/20 px-3 py-2 rounded-lg transition-colors"
                  >
                    Mit Shopify verbinden
                  </button>
                </form>
              )}

              {integration.needsApiKey && integrationStatus === 'disconnected' && !loading && (
                <form onSubmit={handleClarityConnect} className="mt-3 space-y-2">
                  <input
                    type="text"
                    value={clarityProjectId}
                    onChange={(e) => setClarityProjectId(e.target.value)}
                    placeholder="Clarity Project ID"
                    className="w-full bg-ease-bg border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-ease-accent transition-colors"
                    required
                  />
                  <input
                    type="password"
                    value={clarityApiToken}
                    onChange={(e) => setClarityApiToken(e.target.value)}
                    placeholder="API Token"
                    className="w-full bg-ease-bg border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-ease-accent transition-colors"
                    required
                  />
                  <button
                    type="submit"
                    disabled={savingApiKey}
                    className="w-full text-xs text-ease-accent bg-ease-accent/10 hover:bg-ease-accent/20 px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {savingApiKey ? 'Speichere...' : 'Verbinden'}
                  </button>
                </form>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
