'use client';

import Link from 'next/link';
import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { openOAuthPopup } from '@/lib/oauth-popup';

const PROJECT_ID = process.env.NEXT_PUBLIC_PROJECT_ID;

const INTEGRATIONS_CONFIG = [
  {
    key: 'quiz',
    name: 'Nervensystem-Quiz',
    icon: '\u2726',
    provider: null, // always connected, no OAuth
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
    key: 'shopify',
    name: 'Shopify',
    icon: '\u2B21',
    provider: 'shopify',
    description: 'Shopify Admin API',
    // Custom Distribution: no shop input needed, the install URL handles it
    needsShopInput: !process.env.NEXT_PUBLIC_SHOPIFY_CUSTOM_DIST,
  },
  {
    key: 'email',
    name: 'E-Mail Marketing',
    icon: '\u2709',
    provider: null, // not yet implemented
    description: 'Klaviyo / Mailchimp API',
    comingSoon: true,
  },
];

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="px-8 py-8 text-gray-600 text-sm">Laden...</div>}>
      <SettingsContent />
    </Suspense>
  );
}

function SettingsContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [shopDomain, setShopDomain] = useState('');
  const [disconnecting, setDisconnecting] = useState(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/integrations/status?project_id=${PROJECT_ID}`);
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (err) {
      console.error('Failed to fetch integration status:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Show toast on redirect from OAuth
  useEffect(() => {
    const connected = searchParams.get('connected');
    const error = searchParams.get('error');

    if (connected) {
      const providerName = connected === 'meta' ? 'Meta Ads' : connected === 'shopify' ? 'Shopify' : connected;
      setToast({ type: 'success', message: `${providerName} erfolgreich verbunden!` });
      // Clean URL
      window.history.replaceState({}, '', '/dashboard/ease/settings');
      // Refresh status
      fetchStatus();
    } else if (error) {
      setToast({ type: 'error', message: `Verbindungsfehler: ${error}` });
      window.history.replaceState({}, '', '/dashboard/ease/settings');
    }
  }, [searchParams, fetchStatus]);

  // Auto-hide toast
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
        body: JSON.stringify({ provider, project_id: PROJECT_ID }),
      });

      if (res.ok) {
        setToast({ type: 'success', message: 'Verbindung getrennt.' });
        fetchStatus();
      } else {
        setToast({ type: 'error', message: 'Fehler beim Trennen der Verbindung.' });
      }
    } catch (err) {
      setToast({ type: 'error', message: 'Netzwerkfehler.' });
    } finally {
      setDisconnecting(null);
    }
  };

  const handleOAuthPopup = (provider, url) => {
    openOAuthPopup(url || `/api/auth/${provider}`, {
      onSuccess: (connectedProvider) => {
        const providerName = connectedProvider === 'meta' ? 'Meta Ads' : connectedProvider === 'shopify' ? 'Shopify' : connectedProvider;
        setToast({ type: 'success', message: `${providerName} erfolgreich verbunden!` });
        fetchStatus();
      },
      onError: (error) => {
        setToast({ type: 'error', message: `Verbindungsfehler: ${error}` });
      },
    });
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
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl border text-sm font-medium shadow-lg transition-all ${
          toast.type === 'success'
            ? 'bg-ease-green/10 border-ease-green/30 text-ease-green'
            : 'bg-ease-red/10 border-ease-red/30 text-ease-red'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-1">
        <Link href="/dashboard" className="text-gray-500 hover:text-ease-cream transition-colors">Dashboard</Link>
        <span className="text-gray-600">/</span>
        <Link href="/dashboard/ease" className="text-gray-500 hover:text-ease-cream transition-colors">EASE</Link>
        <span className="text-gray-600">/</span>
        <span className="text-ease-cream font-medium">Einstellungen</span>
      </div>

      <div className="mb-8">
        <h1 className="text-xl font-semibold text-ease-cream">Einstellungen</h1>
        <p className="text-xs text-gray-500 mt-0.5">Integrationen & Konfiguration fuer EASE</p>
      </div>

      {/* Integrations */}
      <div className="mb-8">
        <h2 className="text-sm font-medium text-ease-cream mb-4">Integrationen</h2>
        <div className="flex flex-col gap-3">
          {INTEGRATIONS_CONFIG.map((integration) => {
            const integrationStatus = getIntegrationStatus(integration);
            const detail = getStatusDetail(integration);

            return (
              <div
                key={integration.key}
                className="bg-ease-card border border-ease-border rounded-xl p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${
                      integrationStatus === 'connected'
                        ? 'bg-ease-accent/10 text-ease-accent'
                        : 'bg-white/5 text-gray-600'
                    }`}>
                      {integration.icon}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-ease-cream">{integration.name}</p>
                      <p className="text-xs text-gray-500">{integration.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {!loading && (
                      <span className="text-xs text-gray-500">{detail}</span>
                    )}
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
                      <span className="text-[11px] text-gray-600 bg-white/5 px-3 py-1 rounded-full">
                        Bald verfuegbar
                      </span>
                    ) : integration.needsShopInput ? (
                      <button
                        onClick={() => {
                          const el = document.getElementById('shopify-input');
                          if (el) el.focus();
                        }}
                        className="text-[11px] text-ease-accent bg-ease-accent/10 hover:bg-ease-accent/20 px-3 py-1 rounded-full transition-colors"
                      >
                        Verbinden
                      </button>
                    ) : integration.provider === 'shopify' ? (
                      <button
                        onClick={() => {
                          // Custom Distribution: redirect in same window (Shopify blocks popups)
                          window.location.href = '/api/auth/shopify';
                        }}
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

                {/* Shopify store input (shown when disconnected) */}
                {integration.needsShopInput && integrationStatus === 'disconnected' && !loading && (
                  <form onSubmit={handleShopifyConnect} className="mt-3 flex items-center gap-2 pl-[52px]">
                    <input
                      id="shopify-input"
                      type="text"
                      value={shopDomain}
                      onChange={(e) => setShopDomain(e.target.value)}
                      placeholder="ease-store.myshopify.com"
                      className="flex-1 max-w-xs bg-ease-bg border border-ease-border rounded-lg px-3 py-1.5 text-xs text-ease-cream placeholder-gray-600 focus:outline-none focus:border-ease-accent transition-colors"
                      required
                    />
                    <button
                      type="submit"
                      className="text-[11px] text-ease-accent bg-ease-accent/10 hover:bg-ease-accent/20 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Store verbinden
                    </button>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Project Info */}
      <div>
        <h2 className="text-sm font-medium text-ease-cream mb-4">Projekt-Info</h2>
        <div className="bg-ease-card border border-ease-border rounded-xl p-5 space-y-3">
          <InfoRow label="Kunde" value="EASE" />
          <InfoRow label="Projekt" value="Nervensystem & Stressmanagement" />
          <InfoRow label="Project ID" value={PROJECT_ID || '\u2014'} mono />
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
