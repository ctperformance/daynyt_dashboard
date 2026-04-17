'use client';

import Link from 'next/link';
import { useState, useEffect, use } from 'react';
import { useAuth } from '@/components/AuthProvider';

const SORT_OPTIONS = [
  { key: 'roas', label: 'ROAS', desc: true },
  { key: 'cpa', label: 'CPA', desc: false },
  { key: 'ctr', label: 'CTR', desc: true },
  { key: 'purchases', label: 'Käufe', desc: true },
  { key: 'spend', label: 'Ausgaben', desc: true },
  { key: 'hook_rate', label: 'Hook Rate', desc: true },
  { key: 'hold_rate', label: 'Hold Rate', desc: true },
];

const DATE_RANGES = [
  { key: '7d', label: '7T', days: 7 },
  { key: '14d', label: '14T', days: 14 },
  { key: '30d', label: '30T', days: 30 },
  { key: '90d', label: '90T', days: 90 },
];

const TONES = [
  { key: 'professional', label: 'Professionell' },
  { key: 'casual', label: 'Casual' },
  { key: 'urgency', label: 'Urgency' },
  { key: 'story', label: 'Story' },
];

const PLATFORMS = [
  { key: 'meta', label: 'Meta' },
  { key: 'google', label: 'Google' },
  { key: 'tiktok', label: 'TikTok' },
  { key: 'snapchat', label: 'Snapchat' },
];

function fmt(n, decimals = 2) {
  return Number(n || 0).toLocaleString('de-DE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
function fmtInt(n) {
  return Number(n || 0).toLocaleString('de-DE');
}

export default function CreativesPage({ params }) {
  const { projectSlug } = use(params);
  const { userProjects } = useAuth();

  const project = userProjects.find((p) => p.slug === projectSlug);
  const projectName = project?.name || projectSlug.toUpperCase();
  const projectId = project?.id;

  // Best ads state
  const [topAds, setTopAds] = useState(null);
  const [loadingAds, setLoadingAds] = useState(false);
  const [sortBy, setSortBy] = useState('roas');
  const [days, setDays] = useState(30);
  const [expandedAd, setExpandedAd] = useState(null);

  // Copy generator state
  const [copyInput, setCopyInput] = useState('');
  const [copyTone, setCopyTone] = useState('professional');
  const [copyPlatform, setCopyPlatform] = useState('meta');
  const [generatedCopy, setGeneratedCopy] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch all ads across all campaigns/adsets to find top performers
  useEffect(() => {
    if (!projectId) return;
    async function fetchTopAds() {
      setLoadingAds(true);
      try {
        // First get campaigns
        const campRes = await fetch(`/api/meta/campaigns?project_id=${projectId}&days=${days}`);
        if (!campRes.ok) { setLoadingAds(false); return; }
        const campData = await campRes.json();
        const campaigns = campData.campaigns || [];

        // For each campaign, get adsets, then ads
        let allAds = [];
        for (const camp of campaigns.slice(0, 10)) {
          const asRes = await fetch(`/api/meta/adsets?project_id=${projectId}&campaign_id=${camp.id}&days=${days}`);
          if (!asRes.ok) continue;
          const asData = await asRes.json();
          const adsets = asData.adsets || [];

          for (const adset of adsets.slice(0, 10)) {
            const adRes = await fetch(`/api/meta/ads?project_id=${projectId}&adset_id=${adset.id}&days=${days}`);
            if (!adRes.ok) continue;
            const adData = await adRes.json();
            allAds.push(...(adData.ads || []).map(a => ({
              ...a,
              campaign_name: camp.name,
              adset_name: adset.name,
            })));
          }
        }

        setTopAds(allAds);
      } catch {
        setTopAds([]);
      }
      setLoadingAds(false);
    }
    fetchTopAds();
  }, [projectId, days]);

  // Sort ads
  const sortedAds = topAds
    ? [...topAds].sort((a, b) => {
        const opt = SORT_OPTIONS.find(s => s.key === sortBy);
        const aVal = a[sortBy] || 0;
        const bVal = b[sortBy] || 0;
        return opt?.desc ? bVal - aVal : aVal - bVal;
      }).filter(a => a.spend > 0)
    : [];

  // Download creative thumbnail
  async function handleDownload(ad) {
    if (!ad.creative_thumbnail) return;
    try {
      const res = await fetch(ad.creative_thumbnail);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${ad.name.replace(/[^a-zA-Z0-9]/g, '_')}.${ad.creative_type === 'VIDEO' ? 'mp4' : 'jpg'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // Fallback: open in new tab
      window.open(ad.creative_thumbnail, '_blank');
    }
  }

  // Copy ad details to clipboard for duplication
  function handleDuplicate(ad) {
    const text = [
      `Ad: ${ad.name}`,
      `Kampagne: ${ad.campaign_name}`,
      `Anzeigengruppe: ${ad.adset_name}`,
      `ROAS: ${ad.roas}x | CPA: \u20AC${ad.cpa} | CTR: ${ad.ctr}%`,
      `Ausgaben: \u20AC${fmt(ad.spend)} | Käufe: ${ad.purchases}`,
      ad.hook_rate ? `Hook Rate: ${ad.hook_rate}% | Hold Rate: ${ad.hold_rate}%` : '',
    ].filter(Boolean).join('\n');
    navigator.clipboard.writeText(text);
  }

  // Copy generator
  const handleGenerateCopy = async () => {
    if (!copyInput.trim()) return;
    setGenerating(true);
    setGeneratedCopy(null);
    try {
      const res = await fetch('/api/creatives/generate-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_description: copyInput,
          tone: copyTone,
          platform: copyPlatform,
          project_id: projectId,
        }),
      });
      const data = await res.json();
      if (res.ok) setGeneratedCopy(data);
    } catch {
      // silently fail
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyToClipboard = () => {
    if (!generatedCopy) return;
    const text = `${generatedCopy.headline}\n\n${generatedCopy.primary_text}\n\n${generatedCopy.cta}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="px-8 py-8 max-w-[1800px] mx-auto w-full">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs mb-2 animate-fade-in">
        <Link href="/dashboard" className="text-ease-muted hover:text-white transition-colors">Dashboard</Link>
        <span className="text-white/20">/</span>
        <Link href={`/dashboard/${projectSlug}`} className="text-ease-muted hover:text-white transition-colors">{projectName}</Link>
        <span className="text-white/20">/</span>
        <span className="text-white font-medium">Ad Creator</span>
      </div>

      <div className="flex items-center justify-between mb-8 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ad Creator</h1>
          <p className="text-xs text-ease-muted mt-1">Beste Ads analysieren und neue erstellen</p>
        </div>
      </div>

      {/* ===== TOP PERFORMING ADS ===== */}
      <section className="mb-10 animate-fade-in" style={{ animationDelay: '0.05s' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold">Top Performing Ads</h2>
          <div className="flex items-center gap-3">
            {/* Date range */}
            <div className="flex items-center gap-1">
              {DATE_RANGES.map((d) => (
                <button
                  key={d.key}
                  onClick={() => setDays(d.days)}
                  className={`text-xs px-2.5 py-1 rounded-lg transition-all ${
                    days === d.days
                      ? 'bg-white/10 text-white font-medium'
                      : 'text-ease-muted hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <div className="w-px h-4 bg-white/[0.08]" />
            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-white appearance-none cursor-pointer"
            >
              {SORT_OPTIONS.map((s) => (
                <option key={s.key} value={s.key}>Sortieren: {s.label}</option>
              ))}
            </select>
          </div>
        </div>

        {loadingAds && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="glass rounded-2xl overflow-hidden">
                <div className="h-48 skeleton" />
                <div className="p-4 space-y-3">
                  <div className="skeleton h-4 w-3/4 rounded" />
                  <div className="skeleton h-3 w-1/2 rounded" />
                  <div className="flex gap-2">
                    <div className="skeleton h-6 w-16 rounded" />
                    <div className="skeleton h-6 w-16 rounded" />
                    <div className="skeleton h-6 w-16 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loadingAds && sortedAds.length === 0 && (
          <div className="glass rounded-2xl p-12 text-center">
            <div className="w-12 h-12 rounded-xl bg-white/[0.04] flex items-center justify-center mx-auto mb-4">
              <span className="text-xl text-ease-muted">{'\u25B6'}</span>
            </div>
            <p className="text-sm text-ease-muted mb-2">Keine Anzeigendaten gefunden</p>
            <p className="text-xs text-white/20">Verbinde Meta Ads unter Einstellungen, um deine besten Ads hier zu sehen.</p>
          </div>
        )}

        {!loadingAds && sortedAds.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedAds.slice(0, 12).map((ad, idx) => (
              <div
                key={ad.id || idx}
                className="glass rounded-2xl overflow-hidden group hover:border-white/10 transition-all"
              >
                {/* Creative Preview */}
                <div className="relative h-48 bg-[#111] flex items-center justify-center overflow-hidden">
                  {ad.creative_thumbnail ? (
                    ad.creative_type === 'VIDEO' ? (
                      <video
                        src={ad.creative_thumbnail}
                        muted
                        loop
                        playsInline
                        className="w-full h-full object-cover"
                        onMouseEnter={(e) => e.target.play()}
                        onMouseLeave={(e) => { e.target.pause(); e.target.currentTime = 0; }}
                      />
                    ) : (
                      <img
                        src={ad.creative_thumbnail}
                        alt={ad.name}
                        className="w-full h-full object-cover"
                      />
                    )
                  ) : (
                    <div className="text-ease-muted text-xs">Kein Creative</div>
                  )}
                  {/* Rank badge */}
                  <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-white">{idx + 1}</span>
                  </div>
                  {/* Type badge */}
                  {ad.creative_type && (
                    <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm border border-white/10">
                      <span className="text-[9px] font-medium text-white/70">{ad.creative_type}</span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-4">
                  <p className="text-sm font-medium truncate mb-0.5">{ad.name}</p>
                  <p className="text-[11px] text-ease-muted truncate mb-3">
                    {ad.campaign_name} {'\u2192'} {ad.adset_name}
                  </p>

                  {/* Key Metrics */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="bg-white/[0.03] rounded-lg px-2.5 py-2 text-center">
                      <p className="text-[10px] text-white/30 uppercase">ROAS</p>
                      <p className={`text-sm font-semibold ${ad.roas >= 1 ? 'text-ease-green' : 'text-ease-red'}`}>
                        {fmt(ad.roas)}x
                      </p>
                    </div>
                    <div className="bg-white/[0.03] rounded-lg px-2.5 py-2 text-center">
                      <p className="text-[10px] text-white/30 uppercase">CPA</p>
                      <p className="text-sm font-semibold">{'\u20AC'}{fmt(ad.cpa)}</p>
                    </div>
                    <div className="bg-white/[0.03] rounded-lg px-2.5 py-2 text-center">
                      <p className="text-[10px] text-white/30 uppercase">CTR</p>
                      <p className="text-sm font-semibold">{fmt(ad.ctr)}%</p>
                    </div>
                  </div>

                  {/* Expandable details */}
                  {expandedAd === ad.id && (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px] mb-3 pt-3 border-t border-white/[0.06] animate-fade-in-fast">
                      <div className="flex justify-between"><span className="text-white/30">Ausgaben</span><span>{'\u20AC'}{fmt(ad.spend)}</span></div>
                      <div className="flex justify-between"><span className="text-white/30">Umsatz</span><span>{'\u20AC'}{fmt(ad.revenue)}</span></div>
                      <div className="flex justify-between"><span className="text-white/30">Käufe</span><span>{fmtInt(ad.purchases)}</span></div>
                      <div className="flex justify-between"><span className="text-white/30">Impressionen</span><span>{fmtInt(ad.impressions)}</span></div>
                      <div className="flex justify-between"><span className="text-white/30">Klicks</span><span>{fmtInt(ad.link_clicks)}</span></div>
                      <div className="flex justify-between"><span className="text-white/30">CPM</span><span>{'\u20AC'}{fmt(ad.cpm)}</span></div>
                      {ad.hook_rate > 0 && (
                        <>
                          <div className="flex justify-between"><span className="text-white/30">Hook Rate</span><span>{fmt(ad.hook_rate, 1)}%</span></div>
                          <div className="flex justify-between"><span className="text-white/30">Hold Rate</span><span>{fmt(ad.hold_rate, 1)}%</span></div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-white/[0.04]">
                    <button
                      onClick={() => setExpandedAd(expandedAd === ad.id ? null : ad.id)}
                      className="text-[11px] text-ease-muted hover:text-white transition-colors"
                    >
                      {expandedAd === ad.id ? 'Weniger' : 'Details'}
                    </button>
                    <div className="flex-1" />
                    {ad.creative_thumbnail && (
                      <button
                        onClick={() => handleDownload(ad)}
                        className="text-[11px] text-ease-muted hover:text-white transition-colors flex items-center gap-1"
                      >
                        <span className="text-xs">{'\u2193'}</span> Download
                      </button>
                    )}
                    <button
                      onClick={() => handleDuplicate(ad)}
                      className="text-[11px] text-ease-muted hover:text-white transition-colors flex items-center gap-1"
                    >
                      <span className="text-xs">{'\u2398'}</span> Kopieren
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ===== COPY GENERATOR ===== */}
      <section className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <h2 className="text-sm font-semibold mb-4">Copy Generator</h2>
        <div className="glass rounded-2xl p-5 space-y-4">
          <div>
            <label className="text-xs text-ease-muted block mb-1.5">Produkt / Angebot beschreiben</label>
            <textarea
              value={copyInput}
              onChange={(e) => setCopyInput(e.target.value)}
              rows={3}
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/20 transition-colors resize-none"
              placeholder="z.B. Nervensystem-Regulierung Supplement, reduziert Stress in 14 Tagen..."
            />
          </div>

          <div className="flex flex-wrap gap-4">
            <div>
              <label className="text-xs text-ease-muted block mb-1.5">Tonalität</label>
              <div className="flex gap-1.5">
                {TONES.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setCopyTone(t.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                      copyTone === t.key
                        ? 'bg-white/10 text-white font-medium'
                        : 'text-ease-muted hover:text-white hover:bg-white/[0.04]'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-ease-muted block mb-1.5">Plattform</label>
              <div className="flex gap-1.5">
                {PLATFORMS.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => setCopyPlatform(p.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                      copyPlatform === p.key
                        ? 'bg-white/10 text-white font-medium'
                        : 'text-ease-muted hover:text-white hover:bg-white/[0.04]'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={handleGenerateCopy}
            disabled={generating || !copyInput.trim()}
            className="px-5 py-2.5 bg-white/10 text-white text-xs font-medium rounded-lg hover:bg-white/15 transition-all disabled:opacity-30"
          >
            {generating ? 'Generiere...' : 'Copy generieren'}
          </button>

          {generatedCopy && (
            <div className="mt-4 pt-4 border-t border-white/[0.06] space-y-3 animate-fade-in">
              <div>
                <p className="text-[10px] text-white/30 uppercase mb-1">Headline</p>
                <p className="text-sm font-medium">{generatedCopy.headline}</p>
              </div>
              <div>
                <p className="text-[10px] text-white/30 uppercase mb-1">Primary Text</p>
                <p className="text-sm text-white/70 whitespace-pre-wrap">{generatedCopy.primary_text}</p>
              </div>
              <div>
                <p className="text-[10px] text-white/30 uppercase mb-1">CTA</p>
                <p className="text-sm font-medium">{generatedCopy.cta}</p>
              </div>
              <button
                onClick={handleCopyToClipboard}
                className="px-4 py-2 bg-white/[0.04] text-ease-muted hover:text-white text-xs rounded-lg hover:bg-white/[0.08] transition-all"
              >
                {copied ? 'Kopiert!' : 'In Zwischenablage kopieren'}
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
