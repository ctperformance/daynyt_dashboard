'use client';

import Link from 'next/link';
import { useState, useEffect, use } from 'react';
import KpiCard from '@/components/KpiCard';
import DateRangeSelector from '@/components/DateRangeSelector';
import { useAuth } from '@/components/AuthProvider';

function fmt(n, decimals = 0) {
  return Number(n || 0).toLocaleString('de-DE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtDuration(seconds) {
  if (!seconds) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function QualityBadge({ score }) {
  if (score > 70) {
    return <span className="inline-flex items-center gap-1 text-xs font-medium text-ease-green bg-ease-green/10 px-2 py-0.5 rounded-full">{score}</span>;
  }
  if (score >= 40) {
    return <span className="inline-flex items-center gap-1 text-xs font-medium text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-full">{score}</span>;
  }
  return <span className="inline-flex items-center gap-1 text-xs font-medium text-ease-red bg-ease-red/10 px-2 py-0.5 rounded-full">{score}</span>;
}

export default function ClarityPage({ params }) {
  const { projectSlug } = use(params);
  const { userProjects } = useAuth();
  const [configured, setConfigured] = useState(null);
  const [stats, setStats] = useState(null);
  const [campaignData, setCampaignData] = useState(null);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState('30d');

  // Setup form state
  const [clarityProjectId, setClarityProjectId] = useState('');
  const [clarityApiToken, setClarityApiToken] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);

  const project = userProjects.find((p) => p.slug === projectSlug);
  const projectName = project?.name || projectSlug.toUpperCase();
  const projectId = project?.id;

  useEffect(() => {
    if (!projectId) return;
    async function checkStatus() {
      try {
        const res = await fetch(`/api/integrations/status?project_id=${projectId}`);
        if (res.ok) {
          const data = await res.json();
          setConfigured(data.clarity?.connected || false);
        } else {
          setConfigured(false);
        }
      } catch {
        setConfigured(false);
      }
    }
    checkStatus();
  }, [projectId]);

  useEffect(() => {
    if (!configured || !projectId) return;
    async function fetchData() {
      try {
        const [statsRes, campaignsRes] = await Promise.all([
          fetch(`/api/clarity/stats?project_id=${projectId}`),
          fetch(`/api/clarity/campaigns?project_id=${projectId}`),
        ]);
        if (statsRes.ok) {
          setStats(await statsRes.json());
        }
        if (campaignsRes.ok) {
          const cData = await campaignsRes.json();
          setCampaignData(cData.campaigns || []);
        }
      } catch {
        setError('Netzwerkfehler beim Laden der Daten.');
      }
    }
    fetchData();
  }, [configured, projectId]);

  const handleSaveClarity = async (e) => {
    e.preventDefault();
    if (!clarityProjectId || !clarityApiToken) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch('/api/integrations/save-apikey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          provider: 'clarity',
          api_token: clarityApiToken,
          provider_account_id: clarityProjectId,
        }),
      });
      if (res.ok) {
        setSaveMsg({ type: 'success', text: 'Clarity erfolgreich verbunden!' });
        setConfigured(true);
      } else {
        setSaveMsg({ type: 'error', text: 'Fehler beim Speichern.' });
      }
    } catch {
      setSaveMsg({ type: 'error', text: 'Netzwerkfehler.' });
    }
    setSaving(false);
  };

  return (
    <div className="px-8 py-8 max-w-6xl">
      <div className="flex items-center gap-2 text-sm mb-1">
        <Link href="/dashboard" className="text-gray-500 hover:text-ease-cream transition-colors">Dashboard</Link>
        <span className="text-gray-600">/</span>
        <Link href={`/dashboard/${projectSlug}`} className="text-gray-500 hover:text-ease-cream transition-colors">{projectName}</Link>
        <span className="text-gray-600">/</span>
        <span className="text-ease-cream font-medium">Website Analytics</span>
      </div>

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-xl font-semibold text-ease-cream">Website Analytics</h1>
        {configured && <DateRangeSelector selected={dateRange} onChange={setDateRange} />}
      </div>

      {configured === null && (
        <div className="text-center py-20"><div className="text-gray-600 text-sm">Laden...</div></div>
      )}

      {/* Setup Prompt */}
      {configured === false && (
        <div className="bg-ease-card border border-ease-border rounded-xl p-8 max-w-lg mx-auto text-center">
          <div className="w-16 h-16 bg-ease-accent/10 rounded-2xl flex items-center justify-center text-3xl text-ease-accent mx-auto mb-5">
            {'\u25CE'}
          </div>
          <h2 className="text-lg font-medium text-ease-cream mb-2">Microsoft Clarity verbinden</h2>
          <p className="text-sm text-gray-500 leading-relaxed mb-6">
            Gib deine Clarity Project ID und deinen API Token ein, um Website-Analytics, Heatmaps und Session-Daten zu sehen.
          </p>
          <form onSubmit={handleSaveClarity} className="space-y-3 text-left">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Clarity Project ID</label>
              <input
                type="text"
                value={clarityProjectId}
                onChange={(e) => setClarityProjectId(e.target.value)}
                placeholder="z.B. abc123def"
                className="w-full bg-ease-bg border border-ease-border rounded-lg px-4 py-2.5 text-sm text-ease-cream placeholder-gray-600 focus:outline-none focus:border-ease-accent transition-colors"
                required
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">API Token</label>
              <input
                type="password"
                value={clarityApiToken}
                onChange={(e) => setClarityApiToken(e.target.value)}
                placeholder="Clarity API Token"
                className="w-full bg-ease-bg border border-ease-border rounded-lg px-4 py-2.5 text-sm text-ease-cream placeholder-gray-600 focus:outline-none focus:border-ease-accent transition-colors"
                required
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-ease-accent text-black font-medium text-sm px-6 py-2.5 rounded-lg hover:bg-ease-accent/90 transition-colors disabled:opacity-50"
            >
              {saving ? 'Wird gespeichert...' : 'Verbinden'}
            </button>
            {saveMsg && (
              <p className={`text-xs mt-2 ${saveMsg.type === 'success' ? 'text-ease-green' : 'text-ease-red'}`}>
                {saveMsg.text}
              </p>
            )}
          </form>
        </div>
      )}

      {configured === true && (
        <>
          {error && (
            <div className="bg-ease-red/10 border border-ease-red/30 text-ease-red text-sm px-4 py-3 rounded-xl mb-6">{error}</div>
          )}

          {/* KPI Row */}
          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
              <KpiCard title="Sessions" value={fmt(stats.sessions)} icon={'\u25CE'} />
              <KpiCard title="Seiten/Session" value={fmt(stats.pages_per_session, 1)} />
              <KpiCard title="Scroll-Tiefe" value={`${fmt(stats.scroll_depth)}%`} />
              <KpiCard title="Engagement-Rate" value={`${fmt(stats.engagement_rate * 100, 1)}%`} />
              <KpiCard title="Session-Dauer" value={fmtDuration(stats.average_session_duration)} />
              <KpiCard title="Dead Clicks" value={fmt(stats.dead_clicks)} />
            </div>
          )}

          {/* Probleme Section */}
          {stats && (
            <div className="mb-8">
              <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">Probleme</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-ease-card border border-ease-border rounded-xl p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500">Rage Clicks</span>
                    <span className="text-ease-red text-lg">{'\u2717'}</span>
                  </div>
                  <p className="text-2xl font-bold text-ease-cream">{fmt(stats.rage_clicks)}</p>
                  <p className="text-xs text-gray-600 mt-1">Nutzer klicken wiederholt frustriert</p>
                </div>
                <div className="bg-ease-card border border-ease-border rounded-xl p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500">Dead Clicks</span>
                    <span className="text-yellow-500 text-lg">{'\u26A0'}</span>
                  </div>
                  <p className="text-2xl font-bold text-ease-cream">{fmt(stats.dead_clicks)}</p>
                  <p className="text-xs text-gray-600 mt-1">Klicks ohne Reaktion</p>
                </div>
                <div className="bg-ease-card border border-ease-border rounded-xl p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500">Quick Backs</span>
                    <span className="text-yellow-500 text-lg">{'\u21A9'}</span>
                  </div>
                  <p className="text-2xl font-bold text-ease-cream">{fmt(stats.quick_backs)}</p>
                  <p className="text-xs text-gray-600 mt-1">Schnelle Ruecknavigation</p>
                </div>
              </div>
            </div>
          )}

          {/* Ad-Qualitaet Section */}
          {campaignData && campaignData.length > 0 && (
            <div className="mb-8">
              <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">Ad-Qualitaet</h2>
              <div className="bg-ease-card border border-ease-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-ease-border text-xs text-gray-500">
                        <th className="text-left px-5 py-3 font-medium">Kampagne</th>
                        <th className="text-center px-3 py-3 font-medium">Plattform</th>
                        <th className="text-right px-4 py-3 font-medium">Sessions</th>
                        <th className="text-right px-4 py-3 font-medium">{'\u00D8'} Session-Dauer</th>
                        <th className="text-right px-4 py-3 font-medium">{'\u00D8'} Scroll-Tiefe</th>
                        <th className="text-right px-4 py-3 font-medium">Engagement</th>
                        <th className="text-right px-4 py-3 font-medium">Rage Clicks</th>
                        <th className="text-right px-5 py-3 font-medium">Qualitaets-Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {campaignData.map((c, idx) => (
                        <tr key={idx} className="border-b border-ease-border/50 hover:bg-white/[0.02] transition-colors">
                          <td className="px-5 py-3 text-ease-cream font-medium truncate max-w-[200px]">{c.campaign}</td>
                          <td className="text-center px-3 py-3 text-gray-400 text-xs">{c.platform}</td>
                          <td className="text-right px-4 py-3 text-gray-400">{fmt(c.sessions)}</td>
                          <td className="text-right px-4 py-3 text-gray-400">{fmtDuration(c.avg_session_duration)}</td>
                          <td className="text-right px-4 py-3 text-gray-400">{fmt(c.avg_scroll_depth)}%</td>
                          <td className="text-right px-4 py-3 text-gray-400">{fmt(c.engagement_rate * 100, 1)}%</td>
                          <td className="text-right px-4 py-3 text-gray-400">{fmt(c.rage_clicks)}</td>
                          <td className="text-right px-5 py-3">
                            <QualityBadge score={c.quality_score} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Heatmap Highlights Placeholder */}
          <div className="bg-ease-card border border-dashed border-ease-border rounded-xl p-8 text-center">
            <div className="text-3xl mb-3 opacity-40">{'\u2668'}</div>
            <h2 className="text-lg font-semibold text-ease-cream mb-2">Heatmap Highlights</h2>
            <p className="text-sm text-gray-500">
              Heatmap-Visualisierungen werden in einer zukuenftigen Version verfuegbar sein.
            </p>
          </div>

          {!stats && !error && (
            <div className="text-center py-12"><div className="text-gray-600 text-sm">Analytics-Daten werden geladen...</div></div>
          )}
        </>
      )}
    </div>
  );
}
