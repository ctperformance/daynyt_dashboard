'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback, use } from 'react';
import { useAuth } from '@/components/AuthProvider';
import KpiCard from '@/components/KpiCard';
import AdsCopilot from '@/components/AdsCopilot';

const PLATFORMS = [
  { key: 'all', label: 'Alle' },
  { key: 'meta', label: 'Meta', icon: '\u25CE' },
  { key: 'google', label: 'Google', icon: '\u25C9' },
  { key: 'tiktok', label: 'TikTok', icon: '\u266A' },
  { key: 'snapchat', label: 'Snapchat', icon: '\u25C7' },
];

const DATE_RANGES = [
  { key: 'today', label: 'Heute', days: 0 },
  { key: 'yesterday', label: 'Gestern', days: 1 },
  { key: '7d', label: '7 Tage', days: 7 },
  { key: '14d', label: '14 Tage', days: 14 },
  { key: '30d', label: '30 Tage', days: 30 },
];

const TABS = [
  { key: 'campaigns', label: 'Kampagnen' },
  { key: 'adsets', label: 'Anzeigengruppen' },
  { key: 'ads', label: 'Anzeigen' },
];

function fmt(n, decimals = 2) {
  return Number(n || 0).toLocaleString('de-DE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtInt(n) {
  return Number(n || 0).toLocaleString('de-DE');
}

function platformIcon(provider) {
  const map = { meta: '\u25CE', google: '\u25C9', tiktok: '\u266A', snapchat: '\u25C7' };
  return map[provider] || '\u25CB';
}

function platformLabel(provider) {
  const map = { meta: 'Meta', google: 'Google', tiktok: 'TikTok', snapchat: 'Snapchat' };
  return map[provider] || provider;
}

// Traffic light evaluation
function evaluateMetric(value, goodThreshold, direction = 'above') {
  if (direction === 'above') {
    if (value >= goodThreshold) return 'green';
    if (value >= goodThreshold * 0.7) return 'yellow';
    return 'red';
  }
  // below = lower is better (CPA)
  if (value <= goodThreshold) return 'green';
  if (value <= goodThreshold * 1.3) return 'yellow';
  return 'red';
}

function TrafficLight({ color }) {
  const colors = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
  };
  return (
    <span className={`inline-block w-2.5 h-2.5 rounded-full ${colors[color] || colors.red}`} />
  );
}

// Scaling Modal Component
function ScaleModal({ campaign, onClose, onAction, actionLoading }) {
  const targetCpa = 25;
  const roas = parseFloat(campaign.roas) || 0;
  const cpa = parseFloat(campaign.cpa) || 0;
  const ctr = parseFloat(campaign.ctr) || 0;
  const frequency = parseFloat(campaign.frequency) || 0;
  const spend = parseFloat(campaign.spend) || 0;

  // Thresholds for different periods (simulated - in production, fetch multi-period data)
  const periods = [
    {
      label: '3 Tage',
      roasThreshold: 1.5,
      cpaThreshold: targetCpa * 1.5,
      scaleAmount: '20%',
      action: 'increase_20',
    },
    {
      label: '7 Tage',
      roasThreshold: 2.0,
      cpaThreshold: targetCpa * 1.2,
      scaleAmount: '50%',
      action: 'increase_50',
    },
    {
      label: '14 Tage',
      roasThreshold: 2.5,
      cpaThreshold: targetCpa,
      scaleAmount: 'CBO',
      action: 'move_to_cbo',
    },
  ];

  const metrics = [
    { label: 'ROAS', value: `${fmt(roas)}x`, evaluate: (p) => evaluateMetric(roas, p.roasThreshold, 'above') },
    { label: 'CPA', value: `\u20AC${fmt(cpa)}`, evaluate: (p) => evaluateMetric(cpa, p.cpaThreshold, 'below') },
    { label: 'CTR', value: `${fmt(ctr)}%`, evaluate: () => evaluateMetric(ctr, 1.0, 'above') },
    { label: 'Frequenz', value: fmt(frequency, 1), evaluate: () => evaluateMetric(frequency, 3.0, 'below') },
    { label: 'Ausgaben', value: `\u20AC${fmt(spend)}`, evaluate: () => 'green' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-ease-bg border border-ease-border rounded-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="px-6 py-5 border-b border-ease-border flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-ease-cream">Kampagne skalieren</h2>
            <p className="text-sm text-gray-500 mt-0.5">{campaign.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-ease-cream transition-colors text-xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* Current Metrics */}
        <div className="px-6 py-5 border-b border-ease-border">
          <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-3">Aktuelle Performance</h3>
          <div className="grid grid-cols-5 gap-3">
            {metrics.map((m) => (
              <div key={m.label} className="bg-ease-card border border-ease-border rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 mb-1">{m.label}</p>
                <p className="text-sm font-semibold text-ease-cream">{m.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Period Analysis */}
        <div className="px-6 py-5 border-b border-ease-border">
          <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-3">Bewertung nach Zeitraum</h3>
          <div className="space-y-3">
            {periods.map((period) => (
              <div
                key={period.label}
                className="bg-ease-card border border-ease-border rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-ease-cream">{period.label}</span>
                  <span className="text-xs text-gray-500">
                    ROAS &gt; {period.roasThreshold}x | CPA &lt; \u20AC{fmt(period.cpaThreshold)}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  {metrics.map((m) => (
                    <div key={m.label} className="flex items-center gap-1.5">
                      <TrafficLight color={m.evaluate(period)} />
                      <span className="text-xs text-gray-400">{m.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-6 py-5 flex flex-wrap gap-3">
          <button
            onClick={() => onAction('increase_20')}
            disabled={actionLoading}
            className="flex-1 min-w-[140px] bg-ease-accent/10 border border-ease-accent/30 text-ease-accent font-medium text-sm py-3 rounded-xl hover:bg-ease-accent/20 transition-colors disabled:opacity-50"
          >
            {actionLoading === 'increase_20' ? 'Wird ausgefuehrt...' : '+20% Budget'}
          </button>
          <button
            onClick={() => onAction('increase_50')}
            disabled={actionLoading}
            className="flex-1 min-w-[140px] bg-ease-accent/10 border border-ease-accent/30 text-ease-accent font-medium text-sm py-3 rounded-xl hover:bg-ease-accent/20 transition-colors disabled:opacity-50"
          >
            {actionLoading === 'increase_50' ? 'Wird ausgefuehrt...' : '+50% Budget'}
          </button>
          <button
            onClick={() => onAction('move_to_cbo')}
            disabled={actionLoading}
            className="flex-1 min-w-[140px] bg-ease-accent text-black font-medium text-sm py-3 rounded-xl hover:bg-ease-accent/90 transition-colors disabled:opacity-50"
          >
            {actionLoading === 'move_to_cbo' ? 'Wird ausgefuehrt...' : 'In CBO verschieben'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdsPage({ params }) {
  const { projectSlug } = use(params);
  const { userProjects } = useAuth();

  const project = userProjects.find((p) => p.slug === projectSlug);
  const projectName = project?.name || projectSlug.toUpperCase();
  const projectId = project?.id;

  const [activeTab, setActiveTab] = useState('campaigns');
  const [platform, setPlatform] = useState('all');
  const [dateRange, setDateRange] = useState('30d');
  const [campaigns, setCampaigns] = useState(null);
  const [connectedPlatforms, setConnectedPlatforms] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Scaling modal
  const [scaleTarget, setScaleTarget] = useState(null);
  const [scaleLoading, setScaleLoading] = useState(null);
  const [scaleMessage, setScaleMessage] = useState(null);

  // Toggle loading states
  const [toggleLoading, setToggleLoading] = useState({});

  const days = DATE_RANGES.find((d) => d.key === dateRange)?.days ?? 30;

  // Check connected platforms
  useEffect(() => {
    if (!projectId) return;
    async function check() {
      try {
        const res = await fetch(`/api/integrations/status?project_id=${projectId}`);
        if (res.ok) {
          const data = await res.json();
          setConnectedPlatforms({
            meta: data.meta?.connected || false,
            google: data.google?.connected || false,
            tiktok: data.tiktok?.connected || false,
            snapchat: data.snapchat?.connected || false,
          });
        }
      } catch {
        // silent
      }
    }
    check();
  }, [projectId]);

  // Fetch campaigns from all connected platforms
  const fetchCampaigns = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);

    const allCampaigns = [];

    // Fetch Meta campaigns
    if (connectedPlatforms.meta && (platform === 'all' || platform === 'meta')) {
      try {
        const res = await fetch(`/api/meta/campaigns?project_id=${projectId}&days=${days}`);
        if (res.ok) {
          const data = await res.json();
          const metaCampaigns = (data.campaigns || []).map((c) => ({
            ...c,
            provider: 'meta',
            status: c.status || 'ACTIVE',
          }));
          allCampaigns.push(...metaCampaigns);
        }
      } catch {
        // silent
      }
    }

    // Other platform fetches would go here (google, tiktok, snapchat)
    // Stubbed for now - same pattern as meta

    setCampaigns(allCampaigns);
    setLoading(false);
  }, [projectId, connectedPlatforms, platform, days]);

  useEffect(() => {
    if (Object.keys(connectedPlatforms).length > 0) {
      fetchCampaigns();
    }
  }, [connectedPlatforms, fetchCampaigns]);

  // Aggregate KPIs
  const totals = campaigns
    ? campaigns.reduce(
        (acc, c) => ({
          spend: acc.spend + (parseFloat(c.spend) || 0),
          conversions: acc.conversions + (parseInt(c.conversions, 10) || 0),
          revenue: acc.revenue + (parseFloat(c.revenue) || 0),
          impressions: acc.impressions + (parseInt(c.impressions, 10) || 0),
        }),
        { spend: 0, conversions: 0, revenue: 0, impressions: 0 }
      )
    : null;

  const totalRoas = totals && totals.spend > 0 ? totals.revenue / totals.spend : 0;
  const totalCpa = totals && totals.conversions > 0 ? totals.spend / totals.conversions : 0;

  // Handle scale action
  async function handleScaleAction(action) {
    if (!scaleTarget) return;
    setScaleLoading(action);
    setScaleMessage(null);
    try {
      const res = await fetch('/api/ads/scale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: scaleTarget.provider,
          campaign_id: scaleTarget.id,
          action,
          project_id: projectId,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setScaleMessage({ type: 'success', text: data.message });
        fetchCampaigns();
      } else {
        setScaleMessage({ type: 'error', text: data.error || 'Fehler beim Skalieren' });
      }
    } catch {
      setScaleMessage({ type: 'error', text: 'Netzwerkfehler' });
    }
    setScaleLoading(null);
  }

  // Handle toggle status
  async function handleToggle(campaign) {
    const newStatus = campaign.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    setToggleLoading((prev) => ({ ...prev, [campaign.id]: true }));
    try {
      const res = await fetch('/api/ads/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: campaign.provider,
          campaign_id: campaign.id,
          status: newStatus,
          project_id: projectId,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCampaigns((prev) =>
          prev.map((c) => (c.id === campaign.id ? { ...c, status: newStatus } : c))
        );
      }
    } catch {
      // silent
    }
    setToggleLoading((prev) => ({ ...prev, [campaign.id]: false }));
  }

  const hasAnyConnection = Object.values(connectedPlatforms).some(Boolean);

  const filteredCampaigns =
    campaigns && platform !== 'all'
      ? campaigns.filter((c) => c.provider === platform)
      : campaigns;

  return (
    <div className="px-8 py-8 max-w-[1400px]">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-1">
        <Link href="/dashboard" className="text-gray-500 hover:text-ease-cream transition-colors">
          Dashboard
        </Link>
        <span className="text-gray-600">/</span>
        <Link
          href={`/dashboard/${projectSlug}`}
          className="text-gray-500 hover:text-ease-cream transition-colors"
        >
          {projectName}
        </Link>
        <span className="text-gray-600">/</span>
        <span className="text-ease-cream font-medium">Ads Manager</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-ease-cream">Ads Manager</h1>
        <AdsCopilot
          projectId={projectId}
          campaigns={filteredCampaigns}
          onScale={(campaignId, provider) => {
            const c = campaigns?.find((x) => x.id === campaignId);
            if (c) setScaleTarget(c);
          }}
          onPause={(campaignId, provider) => {
            const c = campaigns?.find((x) => x.id === campaignId);
            if (c) handleToggle({ ...c, status: 'ACTIVE' });
          }}
        />
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 mb-6 border-b border-ease-border">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.key
                ? 'border-ease-accent text-ease-accent'
                : 'border-transparent text-gray-500 hover:text-ease-cream'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        {/* Platform Filter */}
        <div className="flex items-center gap-1.5">
          {PLATFORMS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPlatform(p.key)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors ${
                platform === p.key
                  ? 'bg-ease-accent/10 text-ease-accent font-medium'
                  : 'text-gray-500 hover:text-ease-cream hover:bg-white/5'
              }`}
            >
              {p.icon && <span>{p.icon}</span>}
              {p.label}
            </button>
          ))}
        </div>

        <div className="w-px h-6 bg-ease-border" />

        {/* Date Range */}
        <div className="flex items-center gap-1.5">
          {DATE_RANGES.map((d) => (
            <button
              key={d.key}
              onClick={() => setDateRange(d.key)}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                dateRange === d.key
                  ? 'bg-ease-accent/10 text-ease-accent font-medium'
                  : 'text-gray-500 hover:text-ease-cream hover:bg-white/5'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Not connected state */}
      {!loading && !hasAnyConnection && (
        <div className="bg-ease-card border border-ease-border rounded-xl p-12 text-center">
          <div className="text-4xl mb-4 opacity-40">&#9654;</div>
          <h2 className="text-lg font-semibold text-ease-cream mb-2">
            Keine Werbeplattformen verbunden
          </h2>
          <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
            Verbinde deine Werbekonten unter den jeweiligen Kanalseiten, um alle Kampagnen hier
            zentral zu verwalten.
          </p>
          <div className="flex justify-center gap-3">
            <Link
              href={`/dashboard/${projectSlug}/meta`}
              className="text-sm px-4 py-2 rounded-lg bg-ease-accent/10 text-ease-accent hover:bg-ease-accent/20 transition-colors"
            >
              Meta verbinden
            </Link>
            <Link
              href={`/dashboard/${projectSlug}/google`}
              className="text-sm px-4 py-2 rounded-lg bg-white/5 text-gray-400 hover:text-ease-cream hover:bg-white/10 transition-colors"
            >
              Google verbinden
            </Link>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && hasAnyConnection && (
        <div className="text-center py-20">
          <div className="text-gray-600 text-sm">Kampagnendaten werden geladen...</div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl mb-6">
          {error}
        </div>
      )}

      {/* Content - Campaigns Tab */}
      {!loading && hasAnyConnection && activeTab === 'campaigns' && (
        <>
          {/* KPI Summary Bar */}
          {totals && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <KpiCard
                title="Gesamtausgaben"
                value={`\u20AC${fmt(totals.spend)}`}
                icon={'\u25CE'}
              />
              <KpiCard
                title="Gesamt-ROAS"
                value={`${fmt(totalRoas)}x`}
              />
              <KpiCard
                title="Conversions"
                value={fmtInt(totals.conversions)}
              />
              <KpiCard
                title="Durchschn. CPA"
                value={`\u20AC${fmt(totalCpa)}`}
              />
            </div>
          )}

          {/* Campaign Table */}
          {filteredCampaigns && filteredCampaigns.length > 0 && (
            <div className="bg-ease-card border border-ease-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-ease-border text-xs text-gray-500">
                      <th className="text-left px-5 py-3 font-medium w-8">Status</th>
                      <th className="text-left px-4 py-3 font-medium">Name</th>
                      <th className="text-center px-3 py-3 font-medium">Plattform</th>
                      <th className="text-right px-4 py-3 font-medium">Ausgaben</th>
                      <th className="text-right px-4 py-3 font-medium">ROAS</th>
                      <th className="text-right px-4 py-3 font-medium">CPA</th>
                      <th className="text-right px-4 py-3 font-medium">Conversions</th>
                      <th className="text-right px-4 py-3 font-medium">Impressionen</th>
                      <th className="text-right px-5 py-3 font-medium">Aktionen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCampaigns.map((campaign, idx) => {
                      const isActive = campaign.status === 'ACTIVE';
                      return (
                        <tr
                          key={`${campaign.provider}-${campaign.id}`}
                          className={`border-b border-ease-border/50 hover:bg-white/[0.02] transition-colors ${
                            idx % 2 === 1 ? 'bg-white/[0.01]' : ''
                          }`}
                        >
                          <td className="px-5 py-3">
                            <span
                              className={`inline-block w-2.5 h-2.5 rounded-full ${
                                isActive ? 'bg-green-500' : 'bg-red-500'
                              }`}
                              title={isActive ? 'Aktiv' : 'Pausiert'}
                            />
                          </td>
                          <td className="px-4 py-3 text-ease-cream font-medium truncate max-w-[240px]">
                            {campaign.name}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span
                              className="inline-flex items-center gap-1 text-xs text-gray-400"
                              title={platformLabel(campaign.provider)}
                            >
                              <span className="text-sm">{platformIcon(campaign.provider)}</span>
                            </span>
                          </td>
                          <td className="text-right px-4 py-3 text-gray-400">
                            &euro;{fmt(campaign.spend)}
                          </td>
                          <td className="text-right px-4 py-3">
                            <span
                              className={
                                parseFloat(campaign.roas) >= 1
                                  ? 'text-green-500'
                                  : 'text-red-500'
                              }
                            >
                              {fmt(campaign.roas)}x
                            </span>
                          </td>
                          <td className="text-right px-4 py-3 text-gray-400">
                            &euro;{fmt(campaign.cpa)}
                          </td>
                          <td className="text-right px-4 py-3 text-gray-400">
                            {fmtInt(campaign.conversions)}
                          </td>
                          <td className="text-right px-4 py-3 text-gray-400">
                            {fmtInt(campaign.impressions)}
                          </td>
                          <td className="text-right px-5 py-3">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setScaleTarget(campaign)}
                                className="text-xs px-2.5 py-1 rounded-md bg-ease-accent/10 text-ease-accent font-medium hover:bg-ease-accent/20 transition-colors"
                              >
                                Skalieren
                              </button>
                              <button
                                onClick={() => handleToggle(campaign)}
                                disabled={toggleLoading[campaign.id]}
                                className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                                  isActive
                                    ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                                    : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                                } disabled:opacity-50`}
                              >
                                {toggleLoading[campaign.id]
                                  ? '...'
                                  : isActive
                                  ? 'Pausieren'
                                  : 'Aktivieren'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {filteredCampaigns && filteredCampaigns.length === 0 && (
            <div className="bg-ease-card border border-ease-border rounded-xl p-8 text-center">
              <p className="text-gray-500 text-sm">
                Keine Kampagnendaten fuer diesen Zeitraum und diese Plattform gefunden.
              </p>
            </div>
          )}
        </>
      )}

      {/* Adsets Tab (Placeholder) */}
      {!loading && hasAnyConnection && activeTab === 'adsets' && (
        <div className="bg-ease-card border border-ease-border rounded-xl p-12 text-center">
          <div className="text-3xl mb-3 opacity-40">&#9881;</div>
          <h2 className="text-lg font-semibold text-ease-cream mb-2">Anzeigengruppen</h2>
          <p className="text-sm text-gray-500">
            Detaillierte Anzeigengruppen-Verwaltung wird in Kuerze verfuegbar sein.
          </p>
        </div>
      )}

      {/* Ads Tab (Placeholder) */}
      {!loading && hasAnyConnection && activeTab === 'ads' && (
        <div className="bg-ease-card border border-ease-border rounded-xl p-12 text-center">
          <div className="text-3xl mb-3 opacity-40">&#9881;</div>
          <h2 className="text-lg font-semibold text-ease-cream mb-2">Anzeigen</h2>
          <p className="text-sm text-gray-500">
            Detaillierte Anzeigen-Verwaltung wird in Kuerze verfuegbar sein.
          </p>
        </div>
      )}

      {/* Scale Modal */}
      {scaleTarget && (
        <ScaleModal
          campaign={scaleTarget}
          onClose={() => {
            setScaleTarget(null);
            setScaleMessage(null);
          }}
          onAction={handleScaleAction}
          actionLoading={scaleLoading}
        />
      )}

      {/* Scale Message Toast */}
      {scaleMessage && (
        <div
          className={`fixed bottom-6 right-6 z-[60] max-w-md px-5 py-3 rounded-xl text-sm font-medium shadow-lg ${
            scaleMessage.type === 'success'
              ? 'bg-green-500/10 border border-green-500/30 text-green-400'
              : 'bg-red-500/10 border border-red-500/30 text-red-400'
          }`}
        >
          {scaleMessage.text}
          <button
            onClick={() => setScaleMessage(null)}
            className="ml-3 text-current opacity-60 hover:opacity-100"
          >
            &times;
          </button>
        </div>
      )}
    </div>
  );
}
