'use client';

import Link from 'next/link';
import { Suspense, useState, useEffect, useCallback, use } from 'react';
import { useSearchParams } from 'next/navigation';
import { openOAuthPopup } from '@/lib/oauth-popup';
import { useAuth } from '@/components/AuthProvider';

const INTEGRATIONS_CONFIG = [
  {
    key: 'quiz',
    name: 'Nervensystem-Quiz',
    icon: '\u2726',
    provider: null,
    description: 'Shopify Quiz Webhook',
    alwaysConnected: true,
  },
  {
    key: 'meta',
    name: 'Meta Ads',
    icon: '\u25CE',
    provider: 'meta',
    description: 'Meta Business Manager API',
  },
  {
    key: 'google',
    name: 'Google Ads',
    icon: '\u25C9',
    provider: 'google',
    description: 'Google Ads API',
  },
  {
    key: 'tiktok',
    name: 'TikTok Ads',
    icon: '\u266A',
    provider: 'tiktok',
    description: 'TikTok Business API',
  },
  {
    key: 'snapchat',
    name: 'Snapchat Ads',
    icon: '\u25C7',
    provider: 'snapchat',
    description: 'Snapchat Marketing API',
  },
  {
    key: 'shopify',
    name: 'Shopify',
    icon: '\u2B21',
    provider: 'shopify',
    description: 'Shopify Admin API',
    needsShopInput: !process.env.NEXT_PUBLIC_SHOPIFY_CUSTOM_DIST,
  },
  {
    key: 'klaviyo',
    name: 'Klaviyo',
    icon: '\u2709',
    provider: 'klaviyo',
    description: 'E-Mail Marketing API',
  },
  {
    key: 'clarity',
    name: 'Microsoft Clarity',
    icon: '\u25CE',
    provider: 'clarity',
    description: 'Website Analytics & Heatmaps',
    needsApiKey: true,
  },
];

export default function SettingsPage({ params }) {
  const { projectSlug } = use(params);

  return (
    <Suspense fallback={<div className="px-8 py-8 text-gray-600 text-sm">Laden...</div>}>
      <SettingsContent projectSlug={projectSlug} />
    </Suspense>
  );
}

function SettingsContent({ projectSlug }) {
  const searchParams = useSearchParams();
  const { userProjects } = useAuth();
  const [status, setStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [shopDomain, setShopDomain] = useState('');
  const [disconnecting, setDisconnecting] = useState(null);
  const [clarityProjectId, setClarityProjectId] = useState('');
  const [clarityApiToken, setClarityApiToken] = useState('');
  const [savingApiKey, setSavingApiKey] = useState(false);

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

    if (connected) {
      const nameMap = { meta: 'Meta Ads', shopify: 'Shopify', google: 'Google Ads', tiktok: 'TikTok Ads', snapchat: 'Snapchat Ads', klaviyo: 'Klaviyo', clarity: 'Microsoft Clarity' };
      const providerName = nameMap[connected] || connected;
      setToast({ type: 'success', message: `${providerName} erfolgreich verbunden!` });
      window.history.replaceState({}, '', `/dashboard/${projectSlug}/settings`);
      fetchStatus();
    } else if (error) {
      setToast({ type: 'error', message: `Verbindungsfehler: ${error}` });
      window.history.replaceState({}, '', `/dashboard/${projectSlug}/settings`);
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

  const handleOAuthPopup = (provider, url) => {
    openOAuthPopup(url || `/api/auth/${provider}`, {
      onSuccess: (connectedProvider) => {
        const nameMap = { meta: 'Meta Ads', shopify: 'Shopify', google: 'Google Ads', tiktok: 'TikTok Ads', snapchat: 'Snapchat Ads', klaviyo: 'Klaviyo', clarity: 'Microsoft Clarity' };
        const providerName = nameMap[connectedProvider] || connectedProvider;
        setToast({ type: 'success', message: `${providerName} erfolgreich verbunden!` });
        fetchStatus();
      },
      onError: (error) => {
        setToast({ type: 'error', message: `Verbindungsfehler: ${error}` });
      },
    });
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

  const handleClarityConnect = (e) => {
    e.preventDefault();
    if (clarityProjectId && clarityApiToken) {
      handleApiKeySave('clarity', clarityApiToken, clarityProjectId);
    }
  };

  const handleShopifyConnect = (e) => {
    e.preventDefault();
    if (shopDomain) {
      handleOAuthPopup('shopify', `/api/auth/shopify?shop=${encodeURIComponent(shopDomain)}`);
    }
  };

  const getIntegrationStatus = (integration) => {
    if (integration.alwaysConnected) return 'connected';
    if (integration.comingSoon) return 'coming_soon';
    if (!integration.provider) return 'disconnected';
    return status[integration.provider]?.connected ? 'connected' : 'disconnected';
  };

  const getStatusDetail = (integration) => {
    if (integration.alwaysConnected) return 'Letzte Daten: Live';
    if (integration.comingSoon) return 'Nicht verfuegbar';
    const providerStatus = status[integration.provider];
    if (!providerStatus?.connected) return 'Nicht verbunden';
    if (providerStatus.account_id) {
      return `Konto: ${providerStatus.metadata?.primary_account_name || providerStatus.metadata?.shop_name || providerStatus.account_id}`;
    }
    return 'Verbunden';
  };

  return (
    <div className="px-8 py-8 max-w-4xl">
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl border text-sm font-medium shadow-lg transition-all ${
          toast.type === 'success'
            ? 'bg-ease-green/10 border-ease-green/30 text-ease-green'
            : 'bg-ease-red/10 border-ease-red/30 text-ease-red'
        }`}>
          {toast.message}
        </div>
      )}

      <div className="flex items-center gap-2 text-sm mb-1">
        <Link href="/dashboard" className="text-gray-500 hover:text-ease-cream transition-colors">Dashboard</Link>
        <span className="text-gray-600">/</span>
        <Link href={`/dashboard/${projectSlug}`} className="text-gray-500 hover:text-ease-cream transition-colors">{projectName}</Link>
        <span className="text-gray-600">/</span>
        <span className="text-ease-cream font-medium">Einstellungen</span>
      </div>

      <div className="mb-8">
        <h1 className="text-xl font-semibold text-ease-cream">Einstellungen</h1>
        <p className="text-xs text-gray-500 mt-0.5">Integrationen & Konfiguration fuer {projectName}</p>
      </div>

      <div className="mb-8">
        <h2 className="text-sm font-medium text-ease-cream mb-4">Integrationen</h2>
        <div className="flex flex-col gap-3">
          {INTEGRATIONS_CONFIG.map((integration) => {
            const integrationStatus = getIntegrationStatus(integration);
            const detail = getStatusDetail(integration);

            return (
              <div key={integration.key} className="bg-ease-card border border-ease-border rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${
                      integrationStatus === 'connected' ? 'bg-ease-accent/10 text-ease-accent' : 'bg-white/5 text-gray-600'
                    }`}>
                      {integration.icon}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-ease-cream">{integration.name}</p>
                      <p className="text-xs text-gray-500">{integration.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {!loading && <span className="text-xs text-gray-500">{detail}</span>}
                    {loading ? (
                      <span className="text-xs text-gray-600">Laden...</span>
                    ) : integrationStatus === 'connected' ? (
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1.5 text-[11px] text-ease-green bg-ease-green/10 px-2.5 py-1 rounded-full">
                          <span className="w-1.5 h-1.5 bg-ease-green rounded-full" />
                          Verbunden
                        </span>
                        {!integration.alwaysConnected && (
                          <button
                            onClick={() => handleDisconnect(integration.provider)}
                            disabled={disconnecting === integration.provider}
                            className="text-[11px] text-ease-red/70 hover:text-ease-red bg-ease-red/5 hover:bg-ease-red/10 px-2.5 py-1 rounded-full transition-colors disabled:opacity-50"
                          >
                            {disconnecting === integration.provider ? '...' : 'Trennen'}
                          </button>
                        )}
                      </div>
                    ) : integrationStatus === 'coming_soon' ? (
                      <span className="text-[11px] text-gray-600 bg-white/5 px-3 py-1 rounded-full">Bald verfuegbar</span>
                    ) : integration.needsApiKey ? (
                      <span className="text-[11px] text-ease-accent bg-ease-accent/10 px-3 py-1 rounded-full">
                        API-Key eingeben
                      </span>
                    ) : integration.needsShopInput ? (
                      <button
                        onClick={() => document.getElementById('shopify-input')?.focus()}
                        className="text-[11px] text-ease-accent bg-ease-accent/10 hover:bg-ease-accent/20 px-3 py-1 rounded-full transition-colors"
                      >
                        Verbinden
                      </button>
                    ) : integration.provider === 'shopify' ? (
                      <button
                        onClick={() => { window.location.href = '/api/auth/shopify'; }}
                        className="text-[11px] text-ease-accent bg-ease-accent/10 hover:bg-ease-accent/20 px-3 py-1 rounded-full transition-colors"
                      >
                        Verbinden
                      </button>
                    ) : (
                      <button
                        onClick={() => handleOAuthPopup(integration.provider)}
                        className="text-[11px] text-ease-accent bg-ease-accent/10 hover:bg-ease-accent/20 px-3 py-1 rounded-full transition-colors"
                      >
                        Verbinden
                      </button>
                    )}
                  </div>
                </div>

                {integration.needsShopInput && integrationStatus === 'disconnected' && !loading && (
                  <form onSubmit={handleShopifyConnect} className="mt-3 flex items-center gap-2 pl-[52px]">
                    <input
                      id="shopify-input"
                      type="text"
                      value={shopDomain}
                      onChange={(e) => setShopDomain(e.target.value)}
                      placeholder="your-store.myshopify.com"
                      className="flex-1 max-w-xs bg-ease-bg border border-ease-border rounded-lg px-3 py-1.5 text-xs text-ease-cream placeholder-gray-600 focus:outline-none focus:border-ease-accent transition-colors"
                      required
                    />
                    <button type="submit" className="text-[11px] text-ease-accent bg-ease-accent/10 hover:bg-ease-accent/20 px-3 py-1.5 rounded-lg transition-colors">
                      Store verbinden
                    </button>
                  </form>
                )}

                {integration.needsApiKey && integrationStatus === 'disconnected' && !loading && (
                  <form onSubmit={handleClarityConnect} className="mt-3 pl-[52px] space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={clarityProjectId}
                        onChange={(e) => setClarityProjectId(e.target.value)}
                        placeholder="Clarity Project ID"
                        className="flex-1 max-w-[200px] bg-ease-bg border border-ease-border rounded-lg px-3 py-1.5 text-xs text-ease-cream placeholder-gray-600 focus:outline-none focus:border-ease-accent transition-colors"
                        required
                      />
                      <input
                        type="password"
                        value={clarityApiToken}
                        onChange={(e) => setClarityApiToken(e.target.value)}
                        placeholder="API Token"
                        className="flex-1 max-w-[200px] bg-ease-bg border border-ease-border rounded-lg px-3 py-1.5 text-xs text-ease-cream placeholder-gray-600 focus:outline-none focus:border-ease-accent transition-colors"
                        required
                      />
                      <button
                        type="submit"
                        disabled={savingApiKey}
                        className="text-[11px] text-ease-accent bg-ease-accent/10 hover:bg-ease-accent/20 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {savingApiKey ? '...' : 'Verbinden'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-medium text-ease-cream mb-4">Projekt-Info</h2>
        <div className="bg-ease-card border border-ease-border rounded-xl p-5 space-y-3">
          <InfoRow label="Kunde" value={projectName} />
          <InfoRow label="Slug" value={projectSlug} mono />
          <InfoRow label="Project ID" value={projectId || '\u2014'} mono />
          <InfoRow label="Status" value="Aktiv" />
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-gray-500">{label}</span>
      <span className={`text-sm ${mono ? 'font-mono text-gray-400 text-xs' : 'text-ease-cream'}`}>{value}</span>
    </div>
  );
}
