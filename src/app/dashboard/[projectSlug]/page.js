'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback, use } from 'react';
import { useAuth } from '@/components/AuthProvider';
import DateRangeSelector from '@/components/DateRangeSelector';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import KpiCard from '@/components/KpiCard';
import { getDateRange } from '@/lib/date-ranges';

const CHANNEL_CONFIG = {
  meta: {
    title: 'Meta Ads',
    icon: '◎',
    segment: '/meta',
    kpis: ['Spend', 'ROAS', 'Conversions'],
    kpiKeys: ['spend', 'roas', 'conversions'],
  },
  shopify: {
    title: 'Shopify',
    icon: '⬡',
    segment: '/shopify',
    kpis: ['Umsatz', 'Bestellungen', 'AOV'],
    kpiKeys: ['revenue', 'orders', 'aov'],
  },
  google: {
    title: 'Google Ads',
    icon: '◉',
    segment: '/google',
    kpis: ['Spend', 'ROAS', 'Klicks'],
    kpiKeys: ['spend', 'roas', 'clicks'],
  },
  tiktok: {
    title: 'TikTok Ads',
    icon: '♪',
    segment: '/tiktok',
    kpis: ['Spend', 'Impressionen', 'CTR'],
    kpiKeys: ['spend', 'impressions', 'ctr'],
  },
  snapchat: {
    title: 'Snapchat Ads',
    icon: '◇',
    segment: '/snapchat',
    kpis: ['Spend', 'Swipe-Ups', 'Conversions'],
    kpiKeys: ['spend', 'swipe_ups', 'conversions'],
  },
  bing: {
    title: 'Bing Ads',
    icon: '\u25A3',
    segment: '/bing',
    kpis: ['Spend', 'ROAS', 'Conversions'],
    kpiKeys: ['spend', 'roas', 'conversions'],
  },
  klaviyo: {
    title: 'E-Mail (Klaviyo)',
    icon: '\u2709',
    segment: '/email',
    kpis: ['Gesendet', 'Open Rate', 'Umsatz'],
    kpiKeys: ['sends', 'open_rate', 'revenue'],
  },
  clarity: {
    title: 'Website Analytics',
    icon: '\u25CE',
    segment: '/clarity',
    kpis: ['Sessions', 'Engagement-Rate', '\u00D8 Session-Dauer'],
    kpiKeys: ['sessions', 'engagement_rate_display', 'avg_session_duration_display'],
  },
};

export default function ProjectOverview({ params }) {
  const { projectSlug } = use(params);
  const { userProjects } = useAuth();
  const [dateRange, setDateRange] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [integrationStatus, setIntegrationStatus] = useState({});
  const [channelData, setChannelData] = useState({});
  const [quizStats, setQuizStats] = useState(null);

  const project = userProjects.find((p) => p.slug === projectSlug);
  const projectName = project?.name || projectSlug.toUpperCase();
  const projectId = project?.id;

  const { since, until } = getDateRange(dateRange);

  const today = new Date().toLocaleDateString('de-DE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Fetch integration status
  useEffect(() => {
    if (!projectId) return;
    fetch(`/api/integrations/status?project_id=${projectId}`)
      .then((r) => r.json())
      .then((data) => setIntegrationStatus(data))
      .catch(() => {});
  }, [projectId]);

  // Fetch all channel data in parallel when date range changes
  const fetchAllData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);

    const params = new URLSearchParams({
      project_id: projectId,
      since,
      until,
    });

    const fetches = {};

    // Quiz stats
    fetches.quiz = fetch(`/api/dashboard-stats?project_id=${projectId}&days=${getDateRange(dateRange).days || 30}`)
      .then((r) => r.json())
      .catch(() => null);

    // For each connected platform, fetch data
    for (const [key] of Object.entries(CHANNEL_CONFIG)) {
      if (integrationStatus[key]?.connected) {
        fetches[key] = fetch(`/api/${key}/stats?${params}`)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null);
      }
    }

    try {
      const keys = Object.keys(fetches);
      const results = await Promise.allSettled(Object.values(fetches));

      const newData = {};
      results.forEach((result, idx) => {
        const key = keys[idx];
        if (result.status === 'fulfilled' && result.value) {
          if (key === 'quiz') {
            setQuizStats(result.value);
          } else {
            const val = result.value;
            // Extract totals from stats responses for all channels
            if (val.totals) {
              newData[key] = val.totals;
            } else if (key === 'clarity') {
              // Add display-formatted values for the overview card
              newData[key] = {
                ...val,
                engagement_rate_display: val.engagement_rate ? `${(val.engagement_rate * 100).toFixed(1)}%` : '--',
                avg_session_duration_display: val.average_session_duration
                  ? `${Math.floor(val.average_session_duration / 60)}:${Math.round(val.average_session_duration % 60).toString().padStart(2, '0')}`
                  : '--',
              };
            } else {
              newData[key] = val;
            }
          }
        }
      });
      setChannelData(newData);
    } catch {
      // errors handled per-channel
    } finally {
      setLoading(false);
    }
  }, [projectId, since, until, integrationStatus, dateRange]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Aggregate KPIs
  const shopifyRevenue = channelData.shopify?.revenue || 0;
  const shopifyOrders = channelData.shopify?.orders || 0;

  const totalAdSpend =
    (channelData.meta?.spend || 0) +
    (channelData.google?.spend || 0) +
    (channelData.tiktok?.spend || 0) +
    (channelData.snapchat?.spend || 0) +
    (channelData.bing?.spend || 0);

  const totalConversions =
    (channelData.meta?.conversions || 0) +
    (channelData.google?.conversions || 0) +
    (channelData.tiktok?.conversions || 0) +
    (channelData.snapchat?.conversions || 0) +
    (channelData.bing?.conversions || 0);

  const gesamtRoas = totalAdSpend > 0 ? (shopifyRevenue / totalAdSpend).toFixed(2) : '--';
  const blendedCpa = totalConversions > 0 ? (totalAdSpend / totalConversions).toFixed(2) : '--';
  const blendedAov = shopifyOrders > 0 ? (shopifyRevenue / shopifyOrders).toFixed(2) : '--';

  const fmt = (v, prefix = '', suffix = '') => {
    if (v === 0 || v === '--' || v === undefined || v === null) return '--';
    return `${prefix}${typeof v === 'number' ? v.toLocaleString('de-DE', { maximumFractionDigits: 2 }) : v}${suffix}`;
  };

  return (
    <div className="px-8 py-8 max-w-6xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-1">
        <Link href="/dashboard" className="text-gray-500 hover:text-ease-cream transition-colors">
          Dashboard
        </Link>
        <span className="text-gray-600">/</span>
        <span className="text-ease-cream font-medium">{projectName}</span>
      </div>

      {/* Header + Date Range */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-ease-cream">{projectName}</h1>
          <p className="text-sm text-gray-500 mt-1">{today}</p>
        </div>
        <DateRangeSelector selected={dateRange} onChange={setDateRange} />
      </div>

      {/* Top KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {loading ? (
          <LoadingSkeleton variant="kpi" count={6} />
        ) : (
          <>
            <KpiCard title="Total Umsatz" value={fmt(shopifyRevenue, '', ' \u20AC')} icon="\u20AC" />
            <KpiCard title="Total Ad Spend" value={fmt(totalAdSpend, '', ' \u20AC')} icon="\u25B6" />
            <KpiCard title="Gesamt-ROAS" value={fmt(gesamtRoas, '', 'x')} icon="\u2191" />
            <KpiCard title="Bestellungen" value={fmt(shopifyOrders)} icon="\u2B21" />
            <KpiCard title="Blended CPA" value={fmt(blendedCpa, '', ' \u20AC')} icon="\u25CE" />
            <KpiCard title="Blended AOV" value={fmt(blendedAov, '', ' \u20AC')} icon="\u2205" />
          </>
        )}
      </div>

      {/* Channel Performance Grid */}
      <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
        Kanal-Performance
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {loading ? (
          <LoadingSkeleton variant="card" count={4} />
        ) : (
          Object.entries(CHANNEL_CONFIG).map(([key, config]) => {
            const connected = integrationStatus[key]?.connected;
            const data = channelData[key];
            return (
              <ChannelPerformanceCard
                key={key}
                channelKey={key}
                config={config}
                connected={connected}
                data={data}
                projectSlug={projectSlug}
              />
            );
          })
        )}
      </div>

      {/* Quick Stats Row */}
      <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
        Schnell-Statistiken
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-ease-card border border-ease-border rounded-xl px-5 py-4">
          <p className="text-xs text-gray-500 mb-1">Quiz-Leads</p>
          <p className="text-2xl font-bold text-ease-cream">
            {quizStats?.submissions?.length ?? '--'}
          </p>
        </div>
        <div className="bg-ease-card border border-ease-border rounded-xl px-5 py-4">
          <p className="text-xs text-gray-500 mb-1">E-Mail Subscribers</p>
          <p className="text-2xl font-bold text-ease-cream">
            {channelData.klaviyo?.subscribers ? fmt(channelData.klaviyo.subscribers) : '--'}
          </p>
          {!integrationStatus.klaviyo?.connected && (
            <p className="text-[11px] text-gray-600 mt-0.5">Klaviyo verbinden</p>
          )}
        </div>
        <div className="bg-ease-card border border-ease-border rounded-xl px-5 py-4">
          <p className="text-xs text-gray-500 mb-1">Conversion Rate</p>
          <p className="text-2xl font-bold text-ease-cream">
            {shopifyOrders > 0 && (channelData.google?.clicks || 0) > 0
              ? ((shopifyOrders / channelData.google.clicks) * 100).toFixed(1) + '%'
              : '--'}
          </p>
        </div>
      </div>

      {/* Integration Hint */}
      <div className="border border-dashed border-ease-border rounded-xl p-6 text-center">
        <p className="text-sm text-gray-500">
          Weitere Integrationen? Verbinde neue Datenquellen unter{' '}
          <Link href={`/dashboard/${projectSlug}/settings`} className="text-ease-accent hover:underline">
            Einstellungen
          </Link>
        </p>
      </div>
    </div>
  );
}

function ChannelPerformanceCard({ channelKey, config, connected, data, projectSlug }) {
  const href = connected
    ? `/dashboard/${projectSlug}${config.segment}`
    : `/dashboard/${projectSlug}/settings`;

  if (!connected) {
    return (
      <Link
        href={href}
        className="group bg-ease-card border border-ease-border rounded-xl p-5 hover:border-ease-accent/30 transition-all duration-200"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg bg-white/5 text-gray-600">
            {config.icon}
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">{config.title}</h3>
            <p className="text-xs text-gray-600">Nicht verbunden</p>
          </div>
        </div>
        <p className="text-xs text-ease-accent group-hover:underline">
          In Einstellungen verbinden &rarr;
        </p>
      </Link>
    );
  }

  const fmt = (v) => {
    if (v === undefined || v === null) return '--';
    if (typeof v === 'number') return v.toLocaleString('de-DE', { maximumFractionDigits: 2 });
    return v;
  };

  return (
    <Link
      href={href}
      className="group bg-ease-card border border-ease-border rounded-xl p-5 hover:border-ease-accent/30 transition-all duration-200"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg bg-ease-accent/10 text-ease-accent">
            {config.icon}
          </div>
          <h3 className="text-sm font-medium text-ease-cream group-hover:text-ease-accent transition-colors">
            {config.title}
          </h3>
        </div>
        <span className="flex items-center gap-1.5 text-[11px] text-ease-green bg-ease-green/10 px-2 py-0.5 rounded-full">
          <span className="w-1.5 h-1.5 bg-ease-green rounded-full" />
          Live
        </span>
      </div>

      <div className="flex gap-6 pt-3 border-t border-ease-border/50">
        {config.kpis.map((label, idx) => (
          <div key={label}>
            <span className="text-lg font-semibold text-ease-cream">
              {data ? fmt(data[config.kpiKeys[idx]]) : '--'}
            </span>
            <span className="text-[11px] text-gray-500 ml-1.5">{label}</span>
          </div>
        ))}
      </div>

      <div className="flex justify-end mt-2">
        <span className="text-gray-600 group-hover:text-ease-accent group-hover:translate-x-1 transition-all text-sm">
          &rarr;
        </span>
      </div>
    </Link>
  );
}
