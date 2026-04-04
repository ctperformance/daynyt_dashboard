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

function evaluateMetric(value, goodThreshold, direction = 'above') {
  if (direction === 'above') {
    if (value >= goodThreshold) return 'green';
    if (value >= goodThreshold * 0.7) return 'yellow';
    return 'red';
  }
  if (value <= goodThreshold) return 'green';
  if (value <= goodThreshold * 1.3) return 'yellow';
  return 'red';
}

function TrafficLight({ color }) {
  const colors = { green: 'bg-green-500', yellow: 'bg-yellow-500', red: 'bg-red-500' };
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${colors[color] || colors.red}`} />;
}

// Drill-down breadcrumb
function DrilldownBreadcrumb({ items, onNavigate }) {
  return (
    <div className="flex items-center gap-1.5 text-sm mb-4 flex-wrap">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-gray-600">&rsaquo;</span>}
          {item.onClick ? (
            <button
              onClick={item.onClick}
              className="text-gray-500 hover:text-ease-accent transition-colors"
            >
              {item.label}
            </button>
          ) : (
            <span className="text-ease-cream font-medium">{item.label}</span>
          )}
        </span>
      ))}
    </div>
  );
}

// Reusable data table for campaigns, adsets, ads
function DataTable({ rows, columns, onRowClick, level }) {
  if (!rows || rows.length === 0) {
    return (
      <div className="bg-ease-card border border-ease-border rounded-xl p-8 text-center">
        <p className="text-gray-500 text-sm">Keine Daten fuer diesen Zeitraum gefunden.</p>
      </div>
    );
  }

  return (
    <div className="bg-ease-card border border-ease-border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ease-border text-xs text-gray-500">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'} px-4 py-3 font-medium first:pl-5 last:pr-5`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr
                key={row.id || idx}
                onClick={() => onRowClick?.(row)}
                className={`border-b border-ease-border/50 transition-colors ${
                  idx % 2 === 1 ? 'bg-white/[0.01]' : ''
                } ${onRowClick ? 'cursor-pointer hover:bg-ease-accent/[0.04]' : 'hover:bg-white/[0.02]'}`}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'} px-4 py-3 first:pl-5 last:pr-5 ${col.className?.(row) || 'text-gray-400'}`}
                  >
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Scale Modal
function ScaleModal({ campaign, onClose, onAction, actionLoading }) {
  const targetCpa = 25;
  const roas = parseFloat(campaign.roas) || 0;
  const cpa = parseFloat(campaign.cpa) || 0;
  const ctr = parseFloat(campaign.ctr) || 0;
  const frequency = parseFloat(campaign.frequency) || 0;
  const spend = parseFloat(campaign.spend) || 0;

  const periods = [
    { label: '3 Tage', roasThreshold: 1.5, cpaThreshold: targetCpa * 1.5, action: 'increase_20' },
    { label: '7 Tage', roasThreshold: 2.0, cpaThreshold: targetCpa * 1.2, action: 'increase_50' },
    { label: '14 Tage', roasThreshold: 2.5, cpaThreshold: targetCpa, action: 'move_to_cbo' },
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
        <div className="px-6 py-5 border-b border-ease-border flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-ease-cream">Kampagne skalieren</h2>
            <p className="text-sm text-gray-500 mt-0.5">{campaign.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-ease-cream transition-colors text-xl leading-none">&times;</button>
        </div>
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
        <div className="px-6 py-5 border-b border-ease-border">
          <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-3">Bewertung nach Zeitraum</h3>
          <div className="space-y-3">
            {periods.map((period) => (
              <div key={period.label} className="bg-ease-card border border-ease-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-ease-cream">{period.label}</span>
                  <span className="text-xs text-gray-500">ROAS &gt; {period.roasThreshold}x | CPA &lt; &euro;{fmt(period.cpaThreshold)}</span>
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
        <div className="px-6 py-5 flex flex-wrap gap-3">
          <button onClick={() => onAction('increase_20')} disabled={actionLoading} className="flex-1 min-w-[140px] bg-ease-accent/10 border border-ease-accent/30 text-ease-accent font-medium text-sm py-3 rounded-xl hover:bg-ease-accent/20 transition-colors disabled:opacity-50">
            {actionLoading === 'increase_20' ? 'Wird ausgefuehrt...' : '+20% Budget'}
          </button>
          <button onClick={() => onAction('increase_50')} disabled={actionLoading} className="flex-1 min-w-[140px] bg-ease-accent/10 border border-ease-accent/30 text-ease-accent font-medium text-sm py-3 rounded-xl hover:bg-ease-accent/20 transition-colors disabled:opacity-50">
            {actionLoading === 'increase_50' ? 'Wird ausgefuehrt...' : '+50% Budget'}
          </button>
          <button onClick={() => onAction('move_to_cbo')} disabled={actionLoading} className="flex-1 min-w-[140px] bg-ease-accent text-black font-medium text-sm py-3 rounded-xl hover:bg-ease-accent/90 transition-colors disabled:opacity-50">
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

  // View state: campaigns (top level), adsets (drill into campaign), ads (drill into adset)
  const [viewLevel, setViewLevel] = useState('campaigns');
  const [selectedCampaign, setSelectedCampaign] = useState(null); // { id, name, provider }
  const [selectedAdset, setSelectedAdset] = useState(null); // { id, name }

  const [platform, setPlatform] = useState('all');
  const [dateRange, setDateRange] = useState('30d');
  const [campaigns, setCampaigns] = useState(null);
  const [adsets, setAdsets] = useState(null);
  const [ads, setAds] = useState(null);
  const [connectedPlatforms, setConnectedPlatforms] = useState({});
  const [clarityConnected, setClarityConnected] = useState(false);
  const [clarityQuality, setClarityQuality] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [scaleTarget, setScaleTarget] = useState(null);
  const [scaleLoading, setScaleLoading] = useState(null);
  const [scaleMessage, setScaleMessage] = useState(null);
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
          setClarityConnected(data.clarity?.connected || false);
        }
      } catch {}
    }
    check();
  }, [projectId]);

  // Fetch campaigns
  const fetchCampaigns = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    const allCampaigns = [];

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
      } catch {}
    }

    setCampaigns(allCampaigns);
    setLoading(false);
  }, [projectId, connectedPlatforms, platform, days]);

  useEffect(() => {
    if (Object.keys(connectedPlatforms).length > 0) {
      fetchCampaigns();
    }
  }, [connectedPlatforms, fetchCampaigns]);

  // Fetch adsets when drilling into a campaign
  const fetchAdsets = useCallback(async (campaign) => {
    if (!projectId || !campaign) return;
    setLoading(true);
    setError(null);
    setAdsets(null);

    try {
      const res = await fetch(`/api/meta/adsets?project_id=${projectId}&campaign_id=${campaign.id}&days=${days}`);
      if (res.ok) {
        const data = await res.json();
        setAdsets((data.adsets || []).map((a) => ({ ...a, provider: campaign.provider || 'meta' })));
      } else {
        setError('Fehler beim Laden der Anzeigengruppen.');
      }
    } catch {
      setError('Netzwerkfehler beim Laden der Anzeigengruppen.');
    }
    setLoading(false);
  }, [projectId, days]);

  // Fetch ads when drilling into an adset
  const fetchAds = useCallback(async (adset) => {
    if (!projectId || !adset) return;
    setLoading(true);
    setError(null);
    setAds(null);

    try {
      const res = await fetch(`/api/meta/ads?project_id=${projectId}&adset_id=${adset.id}&days=${days}`);
      if (res.ok) {
        const data = await res.json();
        setAds((data.ads || []).map((a) => ({ ...a, provider: selectedCampaign?.provider || 'meta' })));
      } else {
        setError('Fehler beim Laden der Anzeigen.');
      }
    } catch {
      setError('Netzwerkfehler beim Laden der Anzeigen.');
    }
    setLoading(false);
  }, [projectId, days, selectedCampaign]);

  // Re-fetch when date range changes at adset/ad level
  useEffect(() => {
    if (viewLevel === 'adsets' && selectedCampaign) fetchAdsets(selectedCampaign);
    if (viewLevel === 'ads' && selectedAdset) fetchAds(selectedAdset);
  }, [days]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clarity quality data
  useEffect(() => {
    if (!clarityConnected || !projectId) return;
    async function fetchClarityQuality() {
      try {
        const res = await fetch(`/api/clarity/campaigns?project_id=${projectId}`);
        if (res.ok) {
          const data = await res.json();
          const qualityMap = {};
          for (const c of (data.campaigns || [])) qualityMap[c.campaign] = c;
          setClarityQuality(qualityMap);
        }
      } catch {}
    }
    fetchClarityQuality();
  }, [clarityConnected, projectId]);

  // Navigation handlers
  function handleCampaignClick(campaign) {
    setSelectedCampaign(campaign);
    setSelectedAdset(null);
    setViewLevel('adsets');
    fetchAdsets(campaign);
  }

  function handleAdsetClick(adset) {
    setSelectedAdset(adset);
    setViewLevel('ads');
    fetchAds(adset);
  }

  function navigateToCampaigns() {
    setViewLevel('campaigns');
    setSelectedCampaign(null);
    setSelectedAdset(null);
    setAdsets(null);
    setAds(null);
    setError(null);
  }

  function navigateToAdsets() {
    setViewLevel('adsets');
    setSelectedAdset(null);
    setAds(null);
    setError(null);
    if (selectedCampaign) fetchAdsets(selectedCampaign);
  }

  // Aggregate KPIs based on current view
  const currentData = viewLevel === 'campaigns' ? campaigns : viewLevel === 'adsets' ? adsets : ads;
  const totals = currentData
    ? currentData.reduce(
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

  // Scale & toggle handlers
  async function handleScaleAction(action) {
    if (!scaleTarget) return;
    setScaleLoading(action);
    setScaleMessage(null);
    try {
      const res = await fetch('/api/ads/scale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: scaleTarget.provider, campaign_id: scaleTarget.id, action, project_id: projectId }),
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

  async function handleToggle(campaign) {
    const newStatus = campaign.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    setToggleLoading((prev) => ({ ...prev, [campaign.id]: true }));
    try {
      const res = await fetch('/api/ads/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: campaign.provider, campaign_id: campaign.id, status: newStatus, project_id: projectId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCampaigns((prev) => prev.map((c) => (c.id === campaign.id ? { ...c, status: newStatus } : c)));
      }
    } catch {}
    setToggleLoading((prev) => ({ ...prev, [campaign.id]: false }));
  }

  const hasAnyConnection = Object.values(connectedPlatforms).some(Boolean);
  const filteredCampaigns = campaigns && platform !== 'all' ? campaigns.filter((c) => c.provider === platform) : campaigns;

  // Table columns
  const campaignColumns = [
    {
      key: 'status',
      label: 'Status',
      align: 'left',
      render: (row) => (
        <span className={`inline-block w-2.5 h-2.5 rounded-full ${row.status === 'ACTIVE' ? 'bg-green-500' : 'bg-red-500'}`} title={row.status === 'ACTIVE' ? 'Aktiv' : 'Pausiert'} />
      ),
    },
    {
      key: 'name',
      label: 'Kampagne',
      align: 'left',
      className: () => 'text-ease-cream font-medium truncate max-w-[240px]',
      render: (row) => (
        <span className="flex items-center gap-2">
          {row.name}
          <span className="text-gray-600 text-xs">&rsaquo;</span>
        </span>
      ),
    },
    {
      key: 'provider',
      label: 'Plattform',
      align: 'center',
      render: (row) => <span className="text-sm" title={platformLabel(row.provider)}>{platformIcon(row.provider)}</span>,
    },
    { key: 'spend', label: 'Ausgaben', align: 'right', render: (row) => `\u20AC${fmt(row.spend)}` },
    {
      key: 'roas',
      label: 'ROAS',
      align: 'right',
      className: (row) => parseFloat(row.roas) >= 1 ? 'text-green-500' : 'text-red-500',
      render: (row) => `${fmt(row.roas)}x`,
    },
    { key: 'cpa', label: 'CPA', align: 'right', render: (row) => `\u20AC${fmt(row.cpa)}` },
    { key: 'conversions', label: 'Conv.', align: 'right', render: (row) => fmtInt(row.conversions) },
    { key: 'impressions', label: 'Impr.', align: 'right', render: (row) => fmtInt(row.impressions) },
    { key: 'ctr', label: 'CTR', align: 'right', render: (row) => `${row.ctr}%` },
    {
      key: 'quality',
      label: 'Qualitaet',
      align: 'right',
      render: (row) => {
        const cq = clarityQuality[row.name];
        if (!clarityConnected || !cq) return <span className="text-gray-600">&mdash;</span>;
        const score = cq.quality_score;
        const colorClass = score > 70 ? 'text-green-500 bg-green-500/10' : score >= 40 ? 'text-yellow-500 bg-yellow-500/10' : 'text-red-500 bg-red-500/10';
        return (
          <span className="relative group">
            <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${colorClass}`}>{score}</span>
            <span className="absolute bottom-full right-0 mb-2 hidden group-hover:block z-10 bg-ease-bg border border-ease-border rounded-lg px-3 py-2 text-xs text-gray-400 whitespace-nowrap shadow-lg">
              Sessions: {cq.sessions}<br />Scroll-Tiefe: {Math.round(cq.avg_scroll_depth)}%<br />Session-Dauer: {Math.floor(cq.avg_session_duration / 60)}:{Math.round(cq.avg_session_duration % 60).toString().padStart(2, '0')}
            </span>
          </span>
        );
      },
    },
    {
      key: 'actions',
      label: 'Aktionen',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => setScaleTarget(row)} className="text-xs px-2.5 py-1 rounded-md bg-ease-accent/10 text-ease-accent font-medium hover:bg-ease-accent/20 transition-colors">Skalieren</button>
          <button
            onClick={() => handleToggle(row)}
            disabled={toggleLoading[row.id]}
            className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${row.status === 'ACTIVE' ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'} disabled:opacity-50`}
          >
            {toggleLoading[row.id] ? '...' : row.status === 'ACTIVE' ? 'Pausieren' : 'Aktivieren'}
          </button>
        </div>
      ),
    },
  ];

  const adsetColumns = [
    {
      key: 'name',
      label: 'Anzeigengruppe',
      align: 'left',
      className: () => 'text-ease-cream font-medium truncate max-w-[260px]',
      render: (row) => (
        <span className="flex items-center gap-2">
          {row.name}
          <span className="text-gray-600 text-xs">&rsaquo;</span>
        </span>
      ),
    },
    { key: 'spend', label: 'Ausgaben', align: 'right', render: (row) => `\u20AC${fmt(row.spend)}` },
    {
      key: 'roas',
      label: 'ROAS',
      align: 'right',
      className: (row) => parseFloat(row.roas) >= 1 ? 'text-green-500' : 'text-red-500',
      render: (row) => `${fmt(row.roas)}x`,
    },
    { key: 'cpa', label: 'CPA', align: 'right', render: (row) => `\u20AC${fmt(row.cpa)}` },
    { key: 'conversions', label: 'Conv.', align: 'right', render: (row) => fmtInt(row.conversions) },
    { key: 'impressions', label: 'Impr.', align: 'right', render: (row) => fmtInt(row.impressions) },
    { key: 'clicks', label: 'Klicks', align: 'right', render: (row) => fmtInt(row.clicks) },
    { key: 'ctr', label: 'CTR', align: 'right', render: (row) => `${row.ctr}%` },
    { key: 'cpc', label: 'CPC', align: 'right', render: (row) => `\u20AC${row.cpc}` },
    { key: 'frequency', label: 'Frequenz', align: 'right', render: (row) => row.frequency },
  ];

  const adColumns = [
    {
      key: 'name',
      label: 'Anzeige',
      align: 'left',
      className: () => 'text-ease-cream font-medium truncate max-w-[260px]',
    },
    { key: 'spend', label: 'Ausgaben', align: 'right', render: (row) => `\u20AC${fmt(row.spend)}` },
    {
      key: 'roas',
      label: 'ROAS',
      align: 'right',
      className: (row) => parseFloat(row.roas) >= 1 ? 'text-green-500' : 'text-red-500',
      render: (row) => `${fmt(row.roas)}x`,
    },
    { key: 'cpa', label: 'CPA', align: 'right', render: (row) => `\u20AC${fmt(row.cpa)}` },
    { key: 'conversions', label: 'Conv.', align: 'right', render: (row) => fmtInt(row.conversions) },
    { key: 'impressions', label: 'Impr.', align: 'right', render: (row) => fmtInt(row.impressions) },
    { key: 'clicks', label: 'Klicks', align: 'right', render: (row) => fmtInt(row.clicks) },
    { key: 'ctr', label: 'CTR', align: 'right', render: (row) => `${row.ctr}%` },
    { key: 'cpc', label: 'CPC', align: 'right', render: (row) => `\u20AC${row.cpc}` },
    { key: 'frequency', label: 'Frequenz', align: 'right', render: (row) => row.frequency },
  ];

  // Build breadcrumb items
  const breadcrumbItems = [{ label: 'Alle Kampagnen', onClick: viewLevel !== 'campaigns' ? navigateToCampaigns : null }];
  if (selectedCampaign) {
    breadcrumbItems.push({
      label: selectedCampaign.name,
      onClick: viewLevel === 'ads' ? navigateToAdsets : null,
    });
  }
  if (selectedAdset) {
    breadcrumbItems.push({ label: selectedAdset.name });
  }

  // Level label for header
  const levelLabels = { campaigns: 'Kampagnen', adsets: 'Anzeigengruppen', ads: 'Anzeigen' };

  return (
    <div className="px-8 py-8 max-w-[1400px]">
      {/* Page Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-1">
        <Link href="/dashboard" className="text-gray-500 hover:text-ease-cream transition-colors">Dashboard</Link>
        <span className="text-gray-600">/</span>
        <Link href={`/dashboard/${projectSlug}`} className="text-gray-500 hover:text-ease-cream transition-colors">{projectName}</Link>
        <span className="text-gray-600">/</span>
        <span className="text-ease-cream font-medium">Ads Manager</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-ease-cream">Ads Manager</h1>
        <AdsCopilot
          projectId={projectId}
          campaigns={filteredCampaigns}
          onScale={(campaignId) => {
            const c = campaigns?.find((x) => x.id === campaignId);
            if (c) setScaleTarget(c);
          }}
          onPause={(campaignId) => {
            const c = campaigns?.find((x) => x.id === campaignId);
            if (c) handleToggle({ ...c, status: 'ACTIVE' });
          }}
        />
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        {/* Platform Filter */}
        <div className="flex items-center gap-1.5">
          {PLATFORMS.map((p) => (
            <button
              key={p.key}
              onClick={() => { setPlatform(p.key); if (viewLevel !== 'campaigns') navigateToCampaigns(); }}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors ${
                platform === p.key ? 'bg-ease-accent/10 text-ease-accent font-medium' : 'text-gray-500 hover:text-ease-cream hover:bg-white/5'
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
                dateRange === d.key ? 'bg-ease-accent/10 text-ease-accent font-medium' : 'text-gray-500 hover:text-ease-cream hover:bg-white/5'
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
          <h2 className="text-lg font-semibold text-ease-cream mb-2">Keine Werbeplattformen verbunden</h2>
          <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">Verbinde deine Werbekonten unter den jeweiligen Kanalseiten, um alle Kampagnen hier zentral zu verwalten.</p>
          <div className="flex justify-center gap-3">
            <Link href={`/dashboard/${projectSlug}/meta`} className="text-sm px-4 py-2 rounded-lg bg-ease-accent/10 text-ease-accent hover:bg-ease-accent/20 transition-colors">Meta verbinden</Link>
            <Link href={`/dashboard/${projectSlug}/google`} className="text-sm px-4 py-2 rounded-lg bg-white/5 text-gray-400 hover:text-ease-cream hover:bg-white/10 transition-colors">Google verbinden</Link>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && hasAnyConnection && (
        <div className="text-center py-20">
          <div className="text-gray-600 text-sm">
            {viewLevel === 'campaigns' ? 'Kampagnendaten' : viewLevel === 'adsets' ? 'Anzeigengruppen' : 'Anzeigen'} werden geladen...
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl mb-6">{error}</div>
      )}

      {/* Content */}
      {!loading && hasAnyConnection && (
        <>
          {/* Drill-down breadcrumb */}
          {viewLevel !== 'campaigns' && (
            <DrilldownBreadcrumb items={breadcrumbItems} />
          )}

          {/* KPI Summary */}
          {totals && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <KpiCard title="Gesamtausgaben" value={`\u20AC${fmt(totals.spend)}`} icon={'\u25CE'} />
              <KpiCard title="Gesamt-ROAS" value={`${fmt(totalRoas)}x`} />
              <KpiCard title="Conversions" value={fmtInt(totals.conversions)} />
              <KpiCard title="Durchschn. CPA" value={`\u20AC${fmt(totalCpa)}`} />
            </div>
          )}

          {/* Level indicator */}
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-sm font-medium text-ease-cream">{levelLabels[viewLevel]}</h2>
            <span className="text-xs text-gray-600">
              {currentData ? `${currentData.length} Eintraege` : ''}
            </span>
            {viewLevel !== 'campaigns' && (
              <button
                onClick={viewLevel === 'ads' ? navigateToAdsets : navigateToCampaigns}
                className="ml-auto text-xs text-gray-500 hover:text-ease-accent transition-colors flex items-center gap-1"
              >
                &larr; Zurueck
              </button>
            )}
          </div>

          {/* Campaigns view */}
          {viewLevel === 'campaigns' && (
            <DataTable
              rows={filteredCampaigns}
              columns={campaignColumns}
              onRowClick={handleCampaignClick}
              level="campaigns"
            />
          )}

          {/* Adsets view */}
          {viewLevel === 'adsets' && adsets && (
            <DataTable
              rows={adsets}
              columns={adsetColumns}
              onRowClick={handleAdsetClick}
              level="adsets"
            />
          )}

          {/* Ads view */}
          {viewLevel === 'ads' && ads && (
            <DataTable
              rows={ads}
              columns={adColumns}
              level="ads"
            />
          )}
        </>
      )}

      {/* Scale Modal */}
      {scaleTarget && (
        <ScaleModal
          campaign={scaleTarget}
          onClose={() => { setScaleTarget(null); setScaleMessage(null); }}
          onAction={handleScaleAction}
          actionLoading={scaleLoading}
        />
      )}

      {/* Scale Message Toast */}
      {scaleMessage && (
        <div className={`fixed bottom-6 right-6 z-[60] max-w-md px-5 py-3 rounded-xl text-sm font-medium shadow-lg ${
          scaleMessage.type === 'success' ? 'bg-green-500/10 border border-green-500/30 text-green-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'
        }`}>
          {scaleMessage.text}
          <button onClick={() => setScaleMessage(null)} className="ml-3 text-current opacity-60 hover:opacity-100">&times;</button>
        </div>
      )}
    </div>
  );
}
