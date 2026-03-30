'use client';

import { useState, useEffect } from 'react';

const DEFAULT_SETTINGS = {
  targetRoas: 2.5,
  targetCpa: 25.0,
  maxBudgetPerDay: 500,
  autoScale: false,
  periods: { d3: true, d7: true, d14: true },
};

function generateRecommendations(campaigns, settings) {
  if (!campaigns || campaigns.length === 0) return [];
  const recs = [];

  for (const c of campaigns) {
    const roas = parseFloat(c.roas) || 0;
    const cpa = parseFloat(c.cpa) || 0;
    const spend = parseFloat(c.spend) || 0;

    // Good performer - suggest scaling
    if (roas >= settings.targetRoas * 1.2 && cpa <= settings.targetCpa) {
      recs.push({
        id: `scale-${c.id}`,
        priority: 'Hoch',
        title: `${c.name} skalieren`,
        description: `ROAS von ${roas.toLocaleString('de-DE', { minimumFractionDigits: 2 })}x bei einem CPA von ${cpa.toLocaleString('de-DE', { minimumFractionDigits: 2, style: 'currency', currency: 'EUR' })}. Budget kann erhoht werden.`,
        action: 'scale',
        campaignId: c.id,
        provider: c.provider || 'meta',
      });
    }
    // Borderline performer
    else if (roas >= settings.targetRoas * 0.8 && roas < settings.targetRoas * 1.2) {
      recs.push({
        id: `watch-${c.id}`,
        priority: 'Mittel',
        title: `${c.name} beobachten`,
        description: `ROAS von ${roas.toLocaleString('de-DE', { minimumFractionDigits: 2 })}x liegt nahe am Zielwert. Weitere Optimierung empfohlen.`,
        action: 'watch',
        campaignId: c.id,
        provider: c.provider || 'meta',
      });
    }
    // Underperformer with significant spend
    else if (roas < settings.targetRoas * 0.5 && spend > 50) {
      recs.push({
        id: `pause-${c.id}`,
        priority: 'Hoch',
        title: `${c.name} pausieren`,
        description: `ROAS von ${roas.toLocaleString('de-DE', { minimumFractionDigits: 2 })}x liegt weit unter dem Zielwert. Pausierung empfohlen.`,
        action: 'pause',
        campaignId: c.id,
        provider: c.provider || 'meta',
      });
    }
  }

  // Sort by priority
  const order = { Hoch: 0, Mittel: 1, Niedrig: 2 };
  recs.sort((a, b) => (order[a.priority] || 2) - (order[b.priority] || 2));
  return recs;
}

const PRIORITY_STYLES = {
  Hoch: 'bg-red-500/10 text-red-400 border-red-500/20',
  Mittel: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  Niedrig: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
};

export default function AdsCopilot({ projectId, campaigns, onScale, onPause }) {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load settings
  useEffect(() => {
    if (!projectId) return;
    async function load() {
      try {
        const res = await fetch(`/api/ads/copilot?project_id=${projectId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.settings && Object.keys(data.settings).length > 0) {
            setSettings({ ...DEFAULT_SETTINGS, ...data.settings });
          }
        }
      } catch {
        // use defaults
      }
    }
    load();
  }, [projectId]);

  async function saveSettings() {
    setSaving(true);
    try {
      await fetch('/api/ads/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, settings }),
      });
    } catch {
      // silent
    }
    setSaving(false);
  }

  const recommendations = generateRecommendations(campaigns, settings);

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
          open
            ? 'bg-ease-accent text-black'
            : 'bg-ease-card border border-ease-border text-ease-cream hover:border-ease-accent/50'
        }`}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
          <path d="M8 1l1.5 4.5L14 7l-4.5 1.5L8 13l-1.5-4.5L2 7l4.5-1.5L8 1z" fill="currentColor" />
        </svg>
        Copilot
      </button>

      {/* Slide-out Panel */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <div className="fixed top-0 right-0 h-full w-[420px] max-w-full bg-ease-bg border-l border-ease-border z-50 flex flex-col shadow-2xl animate-in slide-in-from-right">
            {/* Header */}
            <div className="px-6 py-5 border-b border-ease-border flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                  <path d="M8 1l1.5 4.5L14 7l-4.5 1.5L8 13l-1.5-4.5L2 7l4.5-1.5L8 1z" fill="#d4a853" />
                </svg>
                <h2 className="text-lg font-semibold text-ease-cream">Copilot</h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-500 hover:text-ease-cream transition-colors text-xl leading-none"
              >
                &times;
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {/* Tab switcher */}
              <div className="px-6 pt-4 pb-2 flex gap-2">
                <button
                  onClick={() => setShowSettings(false)}
                  className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
                    !showSettings
                      ? 'bg-ease-accent/10 text-ease-accent font-medium'
                      : 'text-gray-500 hover:text-ease-cream'
                  }`}
                >
                  Empfehlungen
                </button>
                <button
                  onClick={() => setShowSettings(true)}
                  className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
                    showSettings
                      ? 'bg-ease-accent/10 text-ease-accent font-medium'
                      : 'text-gray-500 hover:text-ease-cream'
                  }`}
                >
                  Einstellungen
                </button>
              </div>

              {!showSettings ? (
                /* Recommendations */
                <div className="px-6 py-4 space-y-3">
                  {recommendations.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-3xl mb-3 opacity-40">&#10024;</div>
                      <p className="text-gray-500 text-sm">
                        Keine Empfehlungen verfuegbar. Verbinde Werbekonten und lass Kampagnen laufen.
                      </p>
                    </div>
                  ) : (
                    recommendations.map((rec) => (
                      <div
                        key={rec.id}
                        className="bg-ease-card border border-ease-border rounded-xl p-4 space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                                  PRIORITY_STYLES[rec.priority] || PRIORITY_STYLES.Niedrig
                                }`}
                              >
                                {rec.priority}
                              </span>
                            </div>
                            <h3 className="text-sm font-medium text-ease-cream truncate">{rec.title}</h3>
                          </div>
                        </div>
                        <p className="text-xs text-gray-400 leading-relaxed">{rec.description}</p>
                        <div className="flex gap-2">
                          {rec.action === 'scale' && (
                            <button
                              onClick={() => onScale?.(rec.campaignId, rec.provider)}
                              className="text-xs px-3 py-1.5 rounded-lg bg-ease-accent/10 text-ease-accent font-medium hover:bg-ease-accent/20 transition-colors"
                            >
                              Jetzt skalieren
                            </button>
                          )}
                          {rec.action === 'pause' && (
                            <button
                              onClick={() => onPause?.(rec.campaignId, rec.provider)}
                              className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 font-medium hover:bg-red-500/20 transition-colors"
                            >
                              Jetzt pausieren
                            </button>
                          )}
                          {rec.action === 'watch' && (
                            <span className="text-xs px-3 py-1.5 rounded-lg bg-yellow-500/10 text-yellow-400">
                              Beobachten
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                /* Settings */
                <div className="px-6 py-4 space-y-5">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Ziel-ROAS</label>
                    <input
                      type="number"
                      step="0.1"
                      value={settings.targetRoas}
                      onChange={(e) =>
                        setSettings({ ...settings, targetRoas: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full bg-ease-card border border-ease-border rounded-lg px-3 py-2 text-sm text-ease-cream focus:outline-none focus:border-ease-accent/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Ziel-CPA</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.5"
                        value={settings.targetCpa}
                        onChange={(e) =>
                          setSettings({ ...settings, targetCpa: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full bg-ease-card border border-ease-border rounded-lg px-3 py-2 pr-8 text-sm text-ease-cream focus:outline-none focus:border-ease-accent/50"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                        &euro;
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Max. Budget / Tag</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="10"
                        value={settings.maxBudgetPerDay}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            maxBudgetPerDay: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full bg-ease-card border border-ease-border rounded-lg px-3 py-2 pr-8 text-sm text-ease-cream focus:outline-none focus:border-ease-accent/50"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                        &euro;
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-ease-cream">Auto-Scale</p>
                      <p className="text-xs text-gray-500">Automatisch skalieren wenn Kriterien erfuellt</p>
                    </div>
                    <button
                      onClick={() => setSettings({ ...settings, autoScale: !settings.autoScale })}
                      className={`w-11 h-6 rounded-full transition-colors relative ${
                        settings.autoScale ? 'bg-ease-accent' : 'bg-ease-border'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                          settings.autoScale ? 'translate-x-[22px]' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-2">Bewertungszeitraeume</label>
                    <div className="flex gap-3">
                      {[
                        { key: 'd3', label: '3 Tage' },
                        { key: 'd7', label: '7 Tage' },
                        { key: 'd14', label: '14 Tage' },
                      ].map((p) => (
                        <label key={p.key} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.periods?.[p.key] ?? true}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                periods: { ...settings.periods, [p.key]: e.target.checked },
                              })
                            }
                            className="w-4 h-4 rounded border-ease-border bg-ease-card accent-ease-accent"
                          />
                          <span className="text-sm text-gray-300">{p.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={saveSettings}
                    disabled={saving}
                    className="w-full bg-ease-accent text-black font-medium text-sm py-2.5 rounded-lg hover:bg-ease-accent/90 transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Speichern...' : 'Einstellungen speichern'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
