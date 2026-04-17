'use client';

import { useEffect } from 'react';

function fmtEur(n) {
  return `\u20AC${Number(n || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtInt(n) {
  return Number(n || 0).toLocaleString('de-DE');
}
function fmtPct(n) {
  return `${Number(n || 0).toFixed(1)}%`;
}

function StatBlock({ label, value, sub, tone }) {
  const toneCls = tone === 'green' ? 'text-ease-green' : tone === 'red' ? 'text-ease-red' : tone === 'yellow' ? 'text-yellow-400' : 'text-white';
  return (
    <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl px-4 py-3">
      <div className="text-[10px] uppercase tracking-wider text-white/30 mb-1">{label}</div>
      <div className={`text-lg font-semibold ${toneCls}`}>{value}</div>
      {sub && <div className="text-[10px] text-white/40 mt-0.5">{sub}</div>}
    </div>
  );
}

export default function AdDetailDrawer({ ad, clarity, onClose, projectSlug }) {
  useEffect(() => {
    const onEsc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onEsc);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onEsc);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  if (!ad) return null;

  const roas = parseFloat(ad.roas) || (ad.revenue && ad.spend ? ad.revenue / ad.spend : 0);
  const roasTone = roas >= 2 ? 'green' : roas >= 1 ? 'yellow' : 'red';
  const qualityTone = clarity?.quality_score >= 70 ? 'green' : clarity?.quality_score >= 40 ? 'yellow' : 'red';

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] animate-fade-in"
        onClick={onClose}
      />
      <aside className="fixed top-0 right-0 bottom-0 w-full max-w-[640px] bg-[#0F0F0F] border-l border-white/10 z-[95] overflow-y-auto animate-slide-in-right">
        <header className="sticky top-0 bg-[#0F0F0F]/95 backdrop-blur-lg border-b border-white/[0.06] px-6 py-4 flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] text-white/40 uppercase tracking-wider mb-1">Ad-Detail</div>
            <h2 className="text-lg font-semibold truncate">{ad.name}</h2>
            <div className="text-xs text-ease-muted mt-0.5 truncate">
              {ad.campaign_name} {ad.adset_name ? `\u203A ${ad.adset_name}` : ''}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white text-2xl leading-none px-2"
            aria-label="Schlie\u00DFen"
          >
            &times;
          </button>
        </header>

        <div className="p-6 space-y-6">
          {ad.creative_thumbnail && (
            <div className="rounded-2xl overflow-hidden border border-white/[0.06] bg-black">
              {ad.creative_type === 'VIDEO' ? (
                <video
                  src={ad.creative_thumbnail}
                  controls
                  autoPlay
                  muted
                  playsInline
                  className="w-full max-h-[400px] object-contain bg-black"
                />
              ) : (
                <img src={ad.creative_thumbnail} alt="" className="w-full max-h-[400px] object-contain bg-black" />
              )}
            </div>
          )}

          <section>
            <h3 className="text-[11px] uppercase tracking-wider text-white/40 mb-2">Performance (Meta)</h3>
            <div className="grid grid-cols-2 gap-3">
              <StatBlock label="Ausgaben" value={fmtEur(ad.spend)} />
              <StatBlock
                label="ROAS"
                value={`${Number(roas).toFixed(2)}x`}
                tone={roasTone}
                sub={`Umsatz ${fmtEur(ad.revenue)}`}
              />
              <StatBlock label="K\u00E4ufe" value={fmtInt(ad.purchases)} sub={ad.cpa ? `CPA ${fmtEur(ad.cpa)}` : null} />
              <StatBlock label="Klicks" value={fmtInt(ad.link_clicks || ad.clicks)} sub={ad.ctr ? `CTR ${fmtPct(ad.ctr)}` : null} />
              <StatBlock label="Impressionen" value={fmtInt(ad.impressions)} />
              <StatBlock label="CPM" value={ad.cpm ? fmtEur(ad.cpm) : '\u2014'} />
            </div>
          </section>

          <section>
            <h3 className="text-[11px] uppercase tracking-wider text-white/40 mb-2 flex items-center gap-2">
              Website-Verhalten (Clarity)
              {clarity && (
                <span className="text-[10px] text-white/30 normal-case tracking-normal">
                  gematcht \u00FCber UTM-Content
                </span>
              )}
            </h3>
            {clarity ? (
              <div className="grid grid-cols-2 gap-3">
                <StatBlock label="Sessions" value={fmtInt(clarity.sessions)} />
                <StatBlock
                  label="Quality Score"
                  value={String(clarity.quality_score)}
                  tone={qualityTone}
                  sub="von 100"
                />
                <StatBlock label="\u00D8 Sitzungsdauer" value={`${clarity.avg_duration}s`} />
                <StatBlock label="\u00D8 Scroll-Tiefe" value={`${clarity.avg_scroll}%`} />
                <StatBlock label="Engagement-Rate" value={`${clarity.engagement_rate}%`} />
                <StatBlock
                  label="Rage Clicks"
                  value={fmtInt(clarity.rage_clicks)}
                  tone={clarity.rage_clicks > 0 ? 'red' : null}
                />
              </div>
            ) : (
              <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl px-4 py-6 text-center text-xs text-white/40">
                Keine Clarity-Daten gematcht.
                <div className="mt-2 text-[11px] text-white/30">
                  Tipp: Stelle sicher, dass der Ad-Name als <code className="text-white/50">utm_content</code> in den Landing-Page-URLs gesetzt ist.
                </div>
              </div>
            )}
          </section>

          {ad.video_view_rate_25 !== undefined && ad.video_view_rate_25 !== null && ad.video_view_rate_25 > 0 && (
            <section>
              <h3 className="text-[11px] uppercase tracking-wider text-white/40 mb-2">Video-Performance</h3>
              <div className="grid grid-cols-2 gap-3">
                <StatBlock label="Hook Rate" value={fmtPct(ad.hook_rate)} sub="3-Sek. Views / Impr." />
                <StatBlock label="Hold Rate" value={fmtPct(ad.hold_rate)} sub="ThruPlay / 3-Sek." />
                <StatBlock label="VVR 50%" value={fmtPct(ad.video_view_rate_50)} />
                <StatBlock label="VVR 100%" value={fmtPct(ad.video_view_rate_100)} />
              </div>
            </section>
          )}

          <section>
            <h3 className="text-[11px] uppercase tracking-wider text-white/40 mb-2">Schnellaktionen</h3>
            <div className="grid grid-cols-2 gap-2">
              <a
                href={`https://clarity.microsoft.com/projects`}
                target="_blank"
                rel="noreferrer"
                className="block text-xs text-center bg-white/[0.04] hover:bg-white/[0.08] text-white/70 py-2.5 rounded-lg transition-colors"
              >
                Clarity Sessions {'\u2197'}
              </a>
              <a
                href={`https://business.facebook.com/adsmanager/manage/ads?selected_ad_ids=${ad.id}`}
                target="_blank"
                rel="noreferrer"
                className="block text-xs text-center bg-white/[0.04] hover:bg-white/[0.08] text-white/70 py-2.5 rounded-lg transition-colors"
              >
                In Meta Ads Manager {'\u2197'}
              </a>
            </div>
          </section>
        </div>
      </aside>
    </>
  );
}
