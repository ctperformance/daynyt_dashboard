'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback, useRef, use } from 'react';
import { useAuth } from '@/components/AuthProvider';
import KpiCard from '@/components/KpiCard';
import { evaluateMetric, BENCHMARKS } from '@/lib/meta-benchmarks';

const DATE_RANGES = [
  { key: 'today', label: 'Heute', days: 0 },
  { key: 'yesterday', label: 'Gestern', days: 1 },
  { key: '7d', label: '7 Tage', days: 7 },
  { key: '14d', label: '14 Tage', days: 14 },
  { key: '30d', label: '30 Tage', days: 30 },
  { key: 'custom', label: 'Custom', days: null },
];

// Metric descriptions for tooltips
const METRIC_DESCRIPTIONS = {
  spend: 'Gesamtausgaben für Werbung',
  roas: 'Return on Ad Spend — Umsatz pro ausgegebenem Euro',
  cpa: 'Cost per Acquisition — Kosten pro Kauf',
  cpc: 'Cost per Click — Kosten pro Link-Klick',
  cpm: 'Cost per Mille — Kosten pro 1.000 Impressionen',
  ctr: 'Click-Through-Rate — Link-Klicks / Impressionen',
  ctr_all: 'CTR (alle) — Alle Klicks / Impressionen',
  impressions: 'Wie oft deine Anzeige angezeigt wurde',
  link_clicks: 'Klicks auf den Link in der Anzeige',
  lp_views: 'Landing Page Views — Nutzer, die die Seite geladen haben',
  atc: 'Add to Cart — Produkt in den Warenkorb gelegt',
  checkout_initiated: 'Checkout gestartet',
  purchases: 'Abgeschlossene Käufe',
  revenue: 'Gesamtumsatz aus Käufen',
  cvr: 'Conversion Rate — Käufe / Link-Klicks',
  atc_rate: 'ATC-Rate — Warenkorb / Landing Page Views',
  checkout_rate: 'Checkout-Rate — Checkout / Warenkorb',
  cost_per_lpv: 'Kosten pro Landing Page View',
  cost_per_atc: 'Kosten pro Add to Cart',
  lpv_click_ratio: 'Anteil der Klicks, die tatsächlich die Seite laden',
  frequency: 'Durchschnittliche Häufigkeit pro Person',
  hook_rate: 'Hook Rate — 3-Sek. Views / Impressionen (wie viele schauen hin)',
  hold_rate: 'Hold Rate — ThruPlay / 3-Sek. Views (wie viele bleiben dran)',
  video_view_rate_25: 'Anteil der Impressionen mit 25% Video gesehen',
  video_view_rate_50: 'Anteil der Impressionen mit 50% Video gesehen',
  video_view_rate_100: 'Anteil der Impressionen mit 100% Video gesehen',
};

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
      { key: 'purchases', label: 'Käufe', format: 'int' },
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
  green: 'text-ease-green',
  yellow: 'text-yellow-400',
  red: 'text-ease-red',
};

function MetricCell({ value, metricKey, format }) {
  const color = evaluateMetric(metricKey, value);
  const formatted = formatValue(value, format);
  if (!color || value === 0) {
    return <span className="text-ease-muted">{formatted}</span>;
  }
  return <span className={COLOR_CLASSES[color]}>{formatted}</span>;
}

// Status dot
function StatusDot({ status }) {
  const isActive = status === 'ACTIVE';
  const isPaused = status === 'PAUSED';
  const color = isActive ? 'bg-ease-green' : isPaused ? 'bg-yellow-400' : 'bg-ease-muted';
  const label = isActive ? 'Aktiv' : isPaused ? 'Pausiert' : status;
  return (
    <span className="flex items-center gap-1.5" title={label}>
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${color}`} />
    </span>
  );
}

// Column header with tooltip
function ColumnHeader({ metricKey, label }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const ref = useRef(null);
  const bench = BENCHMARKS[metricKey];
  const desc = METRIC_DESCRIPTIONS[metricKey];

  const handleMouseEnter = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top });
    }
    setShowTooltip(true);
  };

  return (
    <th
      ref={ref}
      className="text-right px-2.5 py-3 font-medium whitespace-nowrap"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span className={`cursor-help ${bench ? 'border-b border-dotted border-white/20' : ''}`}>
        {label}
      </span>
      {showTooltip && (desc || bench) && (
        <div
          className="fixed z-[100] bg-[#1A1A1A] border border-white/10 rounded-xl px-4 py-3 text-[11px] leading-relaxed text-white/70 pointer-events-none whitespace-nowrap shadow-2xl shadow-black/50"
          style={{ left: tooltipPos.x, top: tooltipPos.y - 8, transform: 'translate(-50%, -100%)' }}
        >
          {desc && <div className="text-white/80 font-normal mb-1.5">{desc}</div>}
          {bench && (
            <div className="flex items-center gap-3 pt-1.5 border-t border-white/10 text-[10px]">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-ease-green" />
                Gut: {bench.direction === 'lower' ? '≤' : '≥'}{bench.green}{bench.unit}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                OK: {bench.direction === 'lower' ? '≤' : '≥'}{bench.yellow}{bench.unit}
              </span>
            </div>
          )}
        </div>
      )}
    </th>
  );
}

// Ad creative preview on hover
function AdPreview({ thumbnail, type, mouseY }) {
  if (!thumbnail) return null;
  return (
    <div
      className="fixed z-[100] animate-fade-in-fast pointer-events-none"
      style={{ left: '280px', top: Math.max(mouseY - 150, 20) }}
    >
      <div className="rounded-2xl overflow-hidden shadow-2xl shadow-black/70 border border-white/10 bg-ease-bg">
        {type === 'VIDEO' ? (
          <video
            src={thumbnail}
            autoPlay
            muted
            loop
            playsInline
            className="w-64 h-64 object-cover"
          />
        ) : (
          <img
            src={thumbnail}
            alt=""
            className="w-64 h-auto max-h-80 object-cover"
          />
        )}
      </div>
    </div>
  );
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

// Loading skeleton rows
function SkeletonTable({ rows = 5, cols = 8 }) {
  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left px-3 py-3 w-6"><div className="skeleton h-3 w-3 rounded-full" /></th>
              <th className="text-left px-3 py-3 min-w-[180px]"><div className="skeleton h-3 w-32 rounded" /></th>
              {Array.from({ length: cols }).map((_, i) => (
                <th key={i} className="text-right px-2.5 py-3"><div className="skeleton h-3 w-14 rounded ml-auto" /></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, i) => (
              <tr key={i} className="border-b border-white/[0.03]">
                <td className="px-3 py-3"><div className="skeleton h-2 w-2 rounded-full" /></td>
                <td className="px-3 py-3"><div className="skeleton h-3 w-40 rounded" style={{ animationDelay: `${i * 100}ms` }} /></td>
                {Array.from({ length: cols }).map((_, j) => (
                  <td key={j} className="text-right px-2.5 py-3">
                    <div className="skeleton h-3 w-12 rounded ml-auto" style={{ animationDelay: `${(i * cols + j) * 30}ms` }} />
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
  const [hoveredAd, setHoveredAd] = useState(null);
  const [mouseY, setMouseY] = useState(0);

  const [dateRange, setDateRange] = useState('30d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [campaigns, setCampaigns] = useState(null);
  const [adsets, setAdsets] = useState(null);
  const [ads, setAds] = useState(null);
  const [connectedPlatforms, setConnectedPlatforms] = useState({});
  const [clarityData, setClarityData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fetchedAt, setFetchedAt] = useState(null);

  const { activeSections, toggleSection, activeMetrics } = useMetricSections();

  const selectedRange = DATE_RANGES.find((d) => d.key === dateRange);
  const days = selectedRange?.days ?? 30;
  const isCustom = dateRange === 'custom';
  const dateParams = isCustom && customFrom && customTo
    ? `from=${customFrom}&to=${customTo}`
    : `days=${days}`;

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
      const res = await fetch(`/api/meta/campaigns?project_id=${projectId}&${dateParams}`);
      if (res.ok) {
        const data = await res.json();
        setCampaigns((data.campaigns || []).map(c => ({ ...c, provider: 'meta' })));
        setFetchedAt(data.fetched_at);
        // Also fetch clarity data
        fetch(`/api/clarity/per-ad?project_id=${projectId}&${dateParams}`)
          .then(r => r.ok ? r.json() : null)
          .then(data => setClarityData(data?.data || null))
          .catch(() => {});
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
  }, [projectId, connectedPlatforms.meta, dateParams]);

  useEffect(() => {
    if (connectedPlatforms.meta) fetchCampaigns();
  }, [connectedPlatforms.meta, fetchCampaigns]);

  // Fetch adsets
  const fetchAdsets = useCallback(async (campaign) => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/meta/adsets?project_id=${projectId}&campaign_id=${campaign.id}&${dateParams}`);
      if (res.ok) {
        const data = await res.json();
        setAdsets((data.adsets || []).map(a => ({ ...a, provider: 'meta' })));
        setFetchedAt(data.fetched_at);
      } else { setError('Fehler beim Laden der Anzeigengruppen'); }
    } catch { setError('Netzwerkfehler'); }
    setLoading(false);
  }, [projectId, dateParams]);

  // Fetch ads
  const fetchAds = useCallback(async (adset) => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/meta/ads?project_id=${projectId}&adset_id=${adset.id}&${dateParams}`);
      if (res.ok) {
        const data = await res.json();
        setAds((data.ads || []).map(a => ({ ...a, provider: 'meta' })));
        setFetchedAt(data.fetched_at);
      } else { setError('Fehler beim Laden der Anzeigen'); }
    } catch { setError('Netzwerkfehler'); }
    setLoading(false);
  }, [projectId, dateParams]);

  // Re-fetch on date change at drill level
  useEffect(() => {
    if (viewLevel === 'adsets' && selectedCampaign) fetchAdsets(selectedCampaign);
    else if (viewLevel === 'ads' && selectedAdset) fetchAds(selectedAdset);
  }, [dateParams]); // eslint-disable-line

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
      <div className="flex items-center gap-2 text-xs mb-2 animate-fade-in">
        <Link href="/dashboard" className="text-ease-muted hover:text-white transition-colors">Dashboard</Link>
        <span className="text-white/20">/</span>
        <Link href={`/dashboard/${projectSlug}`} className="text-ease-muted hover:text-white transition-colors">{projectName}</Link>
        <span className="text-white/20">/</span>
        <span className="text-white font-medium">Ads Manager</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-8 animate-fade-in">
        <h1 className="text-2xl font-bold tracking-tight">Ads Manager</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg text-ease-muted hover:text-white hover:bg-white/[0.04] transition-all disabled:opacity-40"
            title="Daten aktualisieren"
          >
            <span className={`text-sm ${loading ? 'animate-spin' : ''}`}>&#8635;</span>
            Aktualisieren
          </button>
          {fetchedAt && (
            <span className="text-[10px] text-white/20">
              {new Date(fetchedAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
            </span>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6 animate-fade-in" style={{ animationDelay: '0.05s' }}>
        <div className="flex items-center gap-1">
          {DATE_RANGES.map((d) => (
            <button
              key={d.key}
              onClick={() => setDateRange(d.key)}
              className={`text-xs px-3 py-1.5 rounded-lg transition-all ${
                dateRange === d.key
                  ? 'bg-white/10 text-white font-medium'
                  : 'text-ease-muted hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
        {dateRange === 'custom' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="text-xs px-2 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-white"
            />
            <span className="text-white/20">&ndash;</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="text-xs px-2 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-white"
            />
          </div>
        )}
        <div className="w-px h-5 bg-white/[0.08]" />
        <div className="flex items-center gap-1">
          {METRIC_SECTIONS.map((s) => (
            <button
              key={s.label}
              onClick={() => toggleSection(s.label)}
              className={`text-xs px-3 py-1.5 rounded-lg transition-all ${
                activeSections.includes(s.label)
                  ? 'bg-white/10 text-white font-medium'
                  : 'text-white/25 hover:text-ease-muted hover:bg-white/[0.04]'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Not connected */}
      {!loading && !hasAnyConnection && (
        <div className="glass rounded-2xl p-16 text-center animate-fade-in">
          <div className="w-12 h-12 rounded-xl bg-white/[0.04] flex items-center justify-center mx-auto mb-4">
            <span className="text-xl text-ease-muted">&#9678;</span>
          </div>
          <h2 className="text-base font-semibold mb-2">Keine Werbeplattformen verbunden</h2>
          <p className="text-sm text-ease-muted mb-6">Verbinde Meta Ads unter Einstellungen.</p>
          <Link href={`/dashboard/${projectSlug}/settings`} className="text-xs px-5 py-2 rounded-lg bg-white/10 text-white hover:bg-white/15 transition-all">
            Einstellungen
          </Link>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && hasAnyConnection && (
        <div className="animate-fade-in">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[1,2,3,4].map(i => (
              <div key={i} className="glass rounded-2xl p-5 space-y-3" style={{ animationDelay: `${i * 50}ms` }}>
                <div className="skeleton h-3 w-16 rounded" />
                <div className="skeleton h-6 w-24 rounded" />
              </div>
            ))}
          </div>
          <SkeletonTable rows={6} cols={activeMetrics.length} />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-ease-red/5 border border-ease-red/20 text-ease-red text-sm px-4 py-3 rounded-xl mb-6 animate-fade-in">
          {error}
        </div>
      )}

      {/* Content */}
      {!loading && hasAnyConnection && currentData && (
        <div className="animate-fade-in">
          {/* Drill-down breadcrumb */}
          {viewLevel !== 'campaigns' && (
            <div className="flex items-center gap-1.5 text-sm mb-5 flex-wrap">
              <button onClick={goToCampaigns} className="text-ease-muted hover:text-white transition-colors">Alle Kampagnen</button>
              <span className="text-white/15">&#8250;</span>
              {viewLevel === 'ads' ? (
                <>
                  <button onClick={goToAdsets} className="text-ease-muted hover:text-white transition-colors">{selectedCampaign?.name}</button>
                  <span className="text-white/15">&#8250;</span>
                  <span className="text-white font-medium">{selectedAdset?.name}</span>
                </>
              ) : (
                <span className="text-white font-medium">{selectedCampaign?.name}</span>
              )}
            </div>
          )}

          {/* KPI Summary */}
          {totals && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <KpiCard title="Ausgaben" value={`\u20AC${fmt(totals.spend)}`} />
              <KpiCard title="ROAS" value={
                <span className={COLOR_CLASSES[evaluateMetric('roas', totalRoas)] || 'text-white'}>
                  {fmt(totalRoas)}x
                </span>
              } />
              <KpiCard title="Käufe" value={fmtInt(totals.purchases)} />
              <KpiCard title="CPA" value={
                <span className={COLOR_CLASSES[evaluateMetric('cpa', totalCpa)] || 'text-white'}>
                  &euro;{fmt(totalCpa)}
                </span>
              } />
            </div>
          )}

          {/* Level header */}
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-sm font-semibold">{levelLabels[viewLevel]}</h2>
            <span className="text-[11px] text-white/20">{currentData.length} Einträge</span>
            {viewLevel !== 'campaigns' && (
              <button
                onClick={viewLevel === 'ads' ? goToAdsets : goToCampaigns}
                className="ml-auto text-xs text-ease-muted hover:text-white transition-colors flex items-center gap-1"
              >
                <span>&#8592;</span> Zurück
              </button>
            )}
          </div>

          {/* Data Table */}
          {currentData.length > 0 ? (
            <div className="glass rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-[11px] text-white/30 uppercase tracking-wider">
                      {viewLevel === 'campaigns' && <th className="text-left px-3 py-3 font-medium w-6"></th>}
                      <th className="text-left px-3 py-3 font-medium min-w-[180px] sticky left-0 bg-[#151515] z-10">Name</th>
                      {activeMetrics.map((m) => (
                        <ColumnHeader key={m.key} metricKey={m.key} label={m.label} />
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {currentData.map((row, idx) => {
                      const canDrill = (viewLevel === 'campaigns' || viewLevel === 'adsets');
                      const isAdsLevel = viewLevel === 'ads';
                      const hasPreview = isAdsLevel && row.creative_thumbnail;
                      return (
                        <tr
                          key={row.id || idx}
                          onClick={() => {
                            if (viewLevel === 'campaigns') drillIntoCampaign(row);
                            else if (viewLevel === 'adsets') drillIntoAdset(row);
                          }}
                          onMouseEnter={() => isAdsLevel && setHoveredAd(row.id)}
                          onMouseLeave={() => isAdsLevel && setHoveredAd(null)}
                          onMouseMove={(e) => isAdsLevel && setMouseY(e.clientY)}
                          className={`border-b border-white/[0.03] table-row-hover ${
                            canDrill ? 'cursor-pointer' : ''
                          }`}
                          style={{ animationDelay: `${idx * 30}ms` }}
                        >
                          {viewLevel === 'campaigns' && (
                            <td className="px-3 py-3"><StatusDot status={row.status} /></td>
                          )}
                          <td className="px-3 py-3 font-medium truncate max-w-[220px] sticky left-0 bg-[#151515] z-10 relative">
                            <span className="flex items-center gap-2">
                              {/* Ad thumbnail preview */}
                              {isAdsLevel && row.creative_thumbnail && (
                                <img
                                  src={row.creative_thumbnail}
                                  alt=""
                                  className="w-7 h-7 rounded object-cover shrink-0 border border-white/[0.06]"
                                />
                              )}
                              <span className="truncate">{row.name}</span>
                              {canDrill && <span className="text-white/15 text-[10px] shrink-0">&#8250;</span>}
                            </span>
                            {/* Hover preview */}
                            {hasPreview && hoveredAd === row.id && (
                              <AdPreview thumbnail={row.creative_thumbnail} type={row.creative_type} mouseY={mouseY} />
                            )}
                          </td>
                          {activeMetrics.map((m) => (
                            <td key={m.key} className="text-right px-2.5 py-3 whitespace-nowrap">
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
            <div className="glass rounded-2xl p-10 text-center">
              <p className="text-ease-muted text-sm">Keine Daten für diesen Zeitraum.</p>
            </div>
          )}

          {/* Clarity Website Quality */}
          {clarityData && clarityData.length > 0 && (
            <div className="mt-6 glass rounded-2xl overflow-hidden animate-fade-in">
              <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
                <h3 className="text-sm font-semibold">Website-Qualität (Clarity)</h3>
                <span className="text-[10px] text-white/20">Daten von Microsoft Clarity</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-[11px] text-white/30 uppercase tracking-wider">
                      <th className="text-left px-4 py-3 font-medium">Kampagne / Adset</th>
                      <th className="text-right px-3 py-3 font-medium">Sessions</th>
                      <th className="text-right px-3 py-3 font-medium">{'\u00D8'} Dauer</th>
                      <th className="text-right px-3 py-3 font-medium">Scroll %</th>
                      <th className="text-right px-3 py-3 font-medium">Engagement</th>
                      <th className="text-right px-3 py-3 font-medium">Rage Clicks</th>
                      <th className="text-right px-4 py-3 font-medium">Qualität</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clarityData.map((row, i) => (
                      <tr key={i} className="border-b border-white/[0.03] table-row-hover">
                        <td className="px-4 py-3 font-medium truncate max-w-[220px]">
                          {row.campaign}{row.adset ? ` \u2192 ${row.adset}` : ''}
                        </td>
                        <td className="text-right px-3 py-3 text-ease-muted">{row.sessions}</td>
                        <td className="text-right px-3 py-3 text-ease-muted">{row.avg_duration}s</td>
                        <td className="text-right px-3 py-3 text-ease-muted">{row.avg_scroll}%</td>
                        <td className="text-right px-3 py-3 text-ease-muted">{row.engagement_rate}%</td>
                        <td className="text-right px-3 py-3 text-ease-muted">{row.rage_clicks}</td>
                        <td className="text-right px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                            row.quality_score >= 70 ? 'bg-ease-green/10 text-ease-green' :
                            row.quality_score >= 40 ? 'bg-yellow-400/10 text-yellow-400' :
                            'bg-ease-red/10 text-ease-red'
                          }`}>
                            {row.quality_score}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Benchmark Legend */}
          <div className="mt-5 flex items-center gap-5 text-[10px] text-white/25">
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-ease-green" /> Gut</span>
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-yellow-400" /> OK</span>
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-ease-red" /> Schwach</span>
            <span className="text-white/10">|</span>
            <span>E-Commerce DACH Benchmarks</span>
          </div>
        </div>
      )}
    </div>
  );
}
