'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback, use } from 'react';
import { useAuth } from '@/components/AuthProvider';
import KpiCard from '@/components/KpiCard';
import { evaluateMetric, BENCHMARKS } from '@/lib/meta-benchmarks';

const PLATFORMS = [
  { key: 'all', label: 'Alle' },
  { key: 'meta', label: 'Meta', icon: '\u25CE' },
];

const DATE_RANGES = [
  { key: 'today', label: 'Heute', days: 0 },
  { key: 'yesterday', label: 'Gestern', days: 1 },
  { key: '7d', label: '7 Tage', days: 7 },
  { key: '14d', label: '14 Tage', days: 14 },
  { key: '30d', label: '30 Tage', days: 30 },
];

// Metric sections for the table
const METRIC_SECTIONS = [
  {
    label: 'Performance',
    metrics: [
      { key: 'spend', label: 'Ausgaben', format: 'eur' },
      { key: 'roas', label: 'ROAS', format: 'x' },
      { key: 'cpa', label: 'CPA', format: 'eur' },
      { key: 'cpc', label: 'CPC', format: 'eur' },
      { key: 'cpm', label: 'CPM', format: 'eur' },
      { key: 'ctr', label: 'CTR', format: '%' },
    ],
  },
  {
    label: 'Funnel',
    metrics: [
      { key: 'impressions', label: 'Impr.', format: 'int' },
      { key: 'link_clicks', label: 'Klicks', format: 'int' },
      { key: 'lp_views', label: 'LPV', format: 'int' },
      { key: 'atc', label: 'ATC', format: 'int' },
      { key: 'checkout_initiated', label: 'Checkout', format: 'int' },
      { key: 'purchases', label: 'Kaeufe', format: 'int' },
      { key: 'revenue', label: 'Umsatz', format: 'eur' },
    ],
  },
  {
    label: 'Raten',
    metrics: [
      { key: 'cvr', label: 'CVR', format: '%' },
      { key: 'atc_rate', label: 'ATC-Rate', format: '%' },
      { key: 'checkout_rate', label: 'CO-Rate', format: '%' },
      { key: 'cost_per_lpv', label: '\u20AC/LPV', format: 'eur' },
      { key: 'cost_per_atc', label: '\u20AC/ATC', format: 'eur' },
      { key: 'lpv_click_ratio', label: 'LPV/Klick', format: '%' },
      { key: 'frequency', label: 'Frequenz', format: 'dec1' },
    ],
  },
  {
    label: 'Video',
    metrics: [
      { key: 'hook_rate', label: 'Hook', format: '%' },
      { key: 'hold_rate', label: 'Hold', format: '%' },
      { key: 'video_view_rate_25', label: 'VVR 25%', format: '%' },
      { key: 'video_view_rate_50', label: 'VVR 50%', format: '%' },
      { key: 'video_view_rate_100', label: 'VVR 100%', format: '%' },
    ],
  },
];

function fmt(n, decimals = 2) {
  return Number(n || 0).toLocaleString('de-DE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
function fmtInt(n) {
  return Number(n || 0).toLocaleString('de-DE');
}

function formatValue(value, format) {
  if (value === null || value === undefined) return '\u2014';
  switch (format) {
    case 'eur': return `\u20AC${fmt(value)}`;
    case 'x': return `${fmt(value)}x`;
    case '%': return `${fmt(value)}%`;
    case 'int': return fmtInt(value);
    case 'dec1': return fmt(value, 1);
    default: return String(value);
  }
}

// Benchmark color classes
const COLOR_CLASSES = {
  green: 'text-green-400',
  yellow: 'text-yellow-400',
  red: 'text-red-400',
};

const COLOR_BG_CLASSES = {
  green: 'bg-green-500/10 text-green-400 border-green-500/30',
  yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  red: 'bg-red-500/10 text-red-400 border-red-500/30',
};

function MetricCell({ value, metricKey, format }) {
  const color = evaluateMetric(metricKey, value);
  const formatted = formatValue(value, format);
  if (!color || value === 0) {
    return <span className="text-gray-500">{formatted}</span>;
  }
  return <span className={COLOR_CLASSES[color]}>{formatted}</span>;
}

// Status dot
function StatusDot({ status }) {
  const isActive = status === 'ACTIVE';
  const isPaused = status === 'PAUSED';
  const color = isActive ? 'bg-green-500' : isPaused ? 'bg-yellow-500' : 'bg-gray-600';
  const label = isActive ? 'Aktiv' : isPaused ? 'Pausiert' : status;
  return <span className={`inline-block w-2 h-2 rounded-full ${color}`} title={label} />;
}

// Metric section toggle
function useMetricSections() {
  const [activeSections, setActiveSections] = useState(['Performance', 'Funnel']);
  const toggleSection = (label) => {
    setActiveSections(prev =>
      prev.includes(label) ? prev.filter(s => s !== label) : [...prev, label]
    );
  };
  const activeMetrics = METRIC_SECTIONS.filter(s => activeSections.includes(s.label)).flatMap(s => s.metrics);
  return { activeSections, toggleSection, activeMetrics };
}

export default function AdsPage({ params }) {
  const { projectSlug } = use(params);
  const { userProjects } = useAuth();

  const project = userProjects.find((p) => p.slug === projectSlug);
  const projectName = project?.name || projectSlug.toUpperCase();
  const projectId = project?.id;

  // View state
  const [viewLevel, setViewLevel] = useState('campaigns');
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [selectedAdset, setSelectedAdset] = useState(null);

  const [platform, setPlatform] = useState('all');
  const [dateRange, setDateRange] = useState('30d');
  const [campaigns, setCampaigns] = useState(null);
  const [adsets, setAdsets] = useState(null);
  const [ads, setAds] = useState(null);
  const [connectedPlatforms, setConnectedPlatforms] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fetchedAt, setFetchedAt] = useState(null);

  const { activeSections, toggleSection, activeMetrics } = useMetricSections();

  const days = DATE_RANGES.find((d) => d.key === dateRange)?.days ?? 30;

  // Check connected platforms
  useEffect(() => {
    if (!projectId) return;
    fetch(`/api/integrations/status?project_id=${projectId}`)
      .then(r => r.ok ? r.json() : {})
      .then(data => {
        setConnectedPlatforms({
          meta: data.meta?.connected || false,
          google: data.google?.connected || false,
        });
      })
      .catch(() => {});
  }, [projectId]);

  // Fetch campaigns
  const fetchCampaigns = useCallback(async () => {
    if (!projectId || !connectedPlatforms.meta) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/meta/campaigns?project_id=${projectId}&days=${days}`);
      if (res.ok) {
        const data = await res.json();
        setCampaigns((data.campaigns || []).map(c => ({ ...c, provider: 'meta' })));
        setFetchedAt(data.fetched_at);
      } else {
        const err = await res.json().catch(() => ({}));
        if (err.token_expired) {
          setError('Meta Token abgelaufen — bitte neu verbinden unter Einstellungen.');
        } else {
          setError(err.detail || err.error || 'Fehler beim Laden');
        }
      }
    } catch { setError('Netzwerkfehler'); }
    setLoading(false);
  }, [projectId, connectedPlatforms.meta, days]);

  useEffect(() => {
    if (connectedPlatforms.meta) fetchCampaigns();
  }, [connectedPlatforms.meta, fetchCampaigns]);

  // Fetch adsets
  const fetchAdsets = useCallback(async (campaign) => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/meta/adsets?project_id=${projectId}&campaign_id=${campaign.id}&days=${days}`);
      if (res.ok) {
        const data = await res.json();
        setAdsets((data.adsets || []).map(a => ({ ...a, provider: 'meta' })));
        setFetchedAt(data.fetched_at);
      } else { setError('Fehler beim Laden der Anzeigengruppen'); }
    } catch { setError('Netzwerkfehler'); }
    setLoading(false);
  }, [projectId, days]);

  // Fetch ads
  const fetchAds = useCallback(async (adset) => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/meta/ads?project_id=${projectId}&adset_id=${adset.id}&days=${days}`);
      if (res.ok) {
        const data = await res.json();
        setAds((data.ads || []).map(a => ({ ...a, provider: 'meta' })));
        setFetchedAt(data.fetched_at);
      } else { setError('Fehler beim Laden der Anzeigen'); }
    } catch { setError('Netzwerkfehler'); }
    setLoading(false);
  }, [projectId, days]);

  // Re-fetch on date change at drill level
  useEffect(() => {
    if (viewLevel === 'adsets' && selectedCampaign) fetchAdsets(selectedCampaign);
    else if (viewLevel === 'ads' && selectedAdset) fetchAds(selectedAdset);
  }, [days]); // eslint-disable-line

  // Navigation
  function drillIntoCampaign(campaign) {
    setSelectedCampaign(campaign);
    setSelectedAdset(null);
    setViewLevel('adsets');
    fetchAdsets(campaign);
  }
  function drillIntoAdset(adset) {
    setSelectedAdset(adset);
    setViewLevel('ads');
    fetchAds(adset);
  }
  function goToCampaigns() {
    setViewLevel('campaigns');
    setSelectedCampaign(null);
    setSelectedAdset(null);
    setError(null);
  }
  function goToAdsets() {
    setViewLevel('adsets');
    setSelectedAdset(null);
    setError(null);
    if (selectedCampaign) fetchAdsets(selectedCampaign);
  }
  function handleRefresh() {
    if (viewLevel === 'campaigns') fetchCampaigns();
    else if (viewLevel === 'adsets' && selectedCampaign) fetchAdsets(selectedCampaign);
    else if (viewLevel === 'ads' && selectedAdset) fetchAds(selectedAdset);
  }

  const currentData = viewLevel === 'campaigns' ? campaigns : viewLevel === 'adsets' ? adsets : ads;
  const hasAnyConnection = connectedPlatforms.meta;
  const levelLabels = { campaigns: 'Kampagnen', adsets: 'Anzeigengruppen', ads: 'Anzeigen' };

  // Totals
  const totals = currentData?.reduce((acc, c) => ({
    spend: acc.spend + (c.spend || 0),
    purchases: acc.purchases + (c.purchases || 0),
    revenue: acc.revenue + (c.revenue || 0),
    impressions: acc.impressions + (c.impressions || 0),
    link_clicks: acc.link_clicks + (c.link_clicks || 0),
  }), { spend: 0, purchases: 0, revenue: 0, impressions: 0, link_clicks: 0 }) || null;

  const totalRoas = totals?.spend > 0 ? totals.revenue / totals.spend : 0;
  const totalCpa = totals?.purchases > 0 ? totals.spend / totals.purchases : 0;

  return (
    <div className="px-8 py-8 max-w-[1600px]">
      {/* Breadcrumb */}
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
        <div className="flex items-center gap-3">
          {/* Refresh */}
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg text-gray-400 hover:text-ease-cream hover:bg-white/5 transition-colors disabled:opacity-50"
            title="Daten aktualisieren"
          >
            <span className={loading ? 'animate-spin' : ''}>&#8635;</span>
            Aktualisieren
          </button>
          {fetchedAt && (
            <span className="text-[10px] text-gray-600">
              {new Date(fetchedAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
            </span>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-4">
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
        <div className="w-px h-6 bg-ease-border" />
        {/* Section toggles */}
        <div className="flex items-center gap-1.5">
          {METRIC_SECTIONS.map((s) => (
            <button
              key={s.label}
              onClick={() => toggleSection(s.label)}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                activeSections.includes(s.label)
                  ? 'bg-ease-accent/10 text-ease-accent font-medium'
                  : 'text-gray-600 hover:text-gray-400 hover:bg-white/5'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Not connected */}
      {!loading && !hasAnyConnection && (
        <div className="bg-ease-card border border-ease-border rounded-xl p-12 text-center">
          <h2 className="text-lg font-semibold text-ease-cream mb-2">Keine Werbeplattformen verbunden</h2>
          <p className="text-sm text-gray-500 mb-6">Verbinde Meta Ads unter Einstellungen.</p>
          <Link href={`/dashboard/${projectSlug}/settings`} className="text-sm px-4 py-2 rounded-lg bg-ease-accent/10 text-ease-accent hover:bg-ease-accent/20 transition-colors">
            Einstellungen
          </Link>
        </div>
      )}

      {/* Loading */}
      {loading && hasAnyConnection && (
        <div className="text-center py-20">
          <div className="text-gray-600 text-sm">{levelLabels[viewLevel]} werden geladen...</div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl mb-6">{error}</div>
      )}

      {/* Content */}
      {!loading && hasAnyConnection && currentData && (
        <>
          {/* Drill-down breadcrumb */}
          {viewLevel !== 'campaigns' && (
            <div className="flex items-center gap-1.5 text-sm mb-4 flex-wrap">
              <button onClick={goToCampaigns} className="text-gray-500 hover:text-ease-accent transition-colors">Alle Kampagnen</button>
              <span className="text-gray-600">&rsaquo;</span>
              {viewLevel === 'ads' ? (
                <>
                  <button onClick={goToAdsets} className="text-gray-500 hover:text-ease-accent transition-colors">{selectedCampaign?.name}</button>
                  <span className="text-gray-600">&rsaquo;</span>
                  <span className="text-ease-cream font-medium">{selectedAdset?.name}</span>
                </>
              ) : (
                <span className="text-ease-cream font-medium">{selectedCampaign?.name}</span>
              )}
            </div>
          )}

          {/* KPI Summary */}
          {totals && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <KpiCard title="Ausgaben" value={`\u20AC${fmt(totals.spend)}`} icon={'\u25CE'} />
              <KpiCard title="ROAS" value={
                <span className={COLOR_CLASSES[evaluateMetric('roas', totalRoas)] || 'text-ease-cream'}>
                  {fmt(totalRoas)}x
                </span>
              } />
              <KpiCard title="Kaeufe" value={fmtInt(totals.purchases)} />
              <KpiCard title="CPA" value={
                <span className={COLOR_CLASSES[evaluateMetric('cpa', totalCpa)] || 'text-ease-cream'}>
                  &euro;{fmt(totalCpa)}
                </span>
              } />
            </div>
          )}

          {/* Level header */}
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-sm font-medium text-ease-cream">{levelLabels[viewLevel]}</h2>
            <span className="text-xs text-gray-600">{currentData.length} Eintraege</span>
            {viewLevel !== 'campaigns' && (
              <button
                onClick={viewLevel === 'ads' ? goToAdsets : goToCampaigns}
                className="ml-auto text-xs text-gray-500 hover:text-ease-accent transition-colors"
              >
                &larr; Zurueck
              </button>
            )}
          </div>

          {/* Data Table */}
          {currentData.length > 0 ? (
            <div className="bg-ease-card border border-ease-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-ease-border text-[11px] text-gray-500">
                      {viewLevel === 'campaigns' && <th className="text-left px-3 py-2.5 font-medium w-6"></th>}
                      <th className="text-left px-3 py-2.5 font-medium min-w-[180px] sticky left-0 bg-ease-card z-10">Name</th>
                      {activeMetrics.map((m) => (
                        <th key={m.key} className="text-right px-2.5 py-2.5 font-medium whitespace-nowrap">
                          {BENCHMARKS[m.key] ? (
                            <span title={`Gut: ${BENCHMARKS[m.key].green}${BENCHMARKS[m.key].unit} | OK: ${BENCHMARKS[m.key].yellow}${BENCHMARKS[m.key].unit}`}>
                              {m.label}
                            </span>
                          ) : m.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {currentData.map((row, idx) => {
                      const canDrill = (viewLevel === 'campaigns' || viewLevel === 'adsets');
                      return (
                        <tr
                          key={row.id || idx}
                          onClick={() => {
                            if (viewLevel === 'campaigns') drillIntoCampaign(row);
                            else if (viewLevel === 'adsets') drillIntoAdset(row);
                          }}
                          className={`border-b border-ease-border/30 transition-colors ${
                            canDrill ? 'cursor-pointer hover:bg-ease-accent/[0.04]' : 'hover:bg-white/[0.02]'
                          } ${idx % 2 === 1 ? 'bg-white/[0.01]' : ''}`}
                        >
                          {viewLevel === 'campaigns' && (
                            <td className="px-3 py-2.5"><StatusDot status={row.status} /></td>
                          )}
                          <td className="px-3 py-2.5 text-ease-cream font-medium truncate max-w-[220px] sticky left-0 bg-ease-card z-10">
                            <span className="flex items-center gap-1.5">
                              {row.name}
                              {canDrill && <span className="text-gray-600 text-[10px]">&rsaquo;</span>}
                            </span>
                          </td>
                          {activeMetrics.map((m) => (
                            <td key={m.key} className="text-right px-2.5 py-2.5 whitespace-nowrap">
                              <MetricCell value={row[m.key]} metricKey={m.key} format={m.format} />
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-ease-card border border-ease-border rounded-xl p-8 text-center">
              <p className="text-gray-500 text-sm">Keine Daten fuer diesen Zeitraum.</p>
            </div>
          )}

          {/* Benchmark Legend */}
          <div className="mt-4 flex items-center gap-4 text-[10px] text-gray-600">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500" /> Gut</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-yellow-500" /> OK</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" /> Schlecht</span>
            <span className="text-gray-700">|</span>
            <span>Benchmark-Farben basierend auf E-Commerce DACH Standards</span>
          </div>
        </>
      )}
    </div>
  );
}
