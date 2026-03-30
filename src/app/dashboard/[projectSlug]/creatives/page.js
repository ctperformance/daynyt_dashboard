'use client';

import Link from 'next/link';
import { useState, use } from 'react';
import { useAuth } from '@/components/AuthProvider';

const AD_FORMATS = [
  { key: '1080x1080', label: '1080 x 1080', desc: 'Quadrat (Feed)' },
  { key: '1080x1350', label: '1080 x 1350', desc: '4:5 (Feed)' },
  { key: '1200x628', label: '1200 x 628', desc: 'Landscape (Link)' },
  { key: 'video', label: 'Video', desc: 'Bald verfuegbar', disabled: true },
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

const PLACEHOLDER_TEMPLATES = [
  { id: 1, name: 'Minimalistisch', preview: 'bg-gradient-to-br from-gray-800 to-gray-900' },
  { id: 2, name: 'Bold Statement', preview: 'bg-gradient-to-br from-ease-accent/30 to-ease-accent/10' },
  { id: 3, name: 'Produkt-Fokus', preview: 'bg-gradient-to-br from-blue-900/30 to-purple-900/30' },
  { id: 4, name: 'Social Proof', preview: 'bg-gradient-to-br from-green-900/30 to-teal-900/30' },
];

export default function CreativesPage({ params }) {
  const { projectSlug } = use(params);
  const { userProjects } = useAuth();

  const project = userProjects.find((p) => p.slug === projectSlug);
  const projectName = project?.name || projectSlug.toUpperCase();
  const projectId = project?.id;

  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [adConfig, setAdConfig] = useState({
    format: '1080x1080',
    template: 1,
    headline: '',
    body: '',
    cta: '',
  });

  // Copy generator
  const [copyInput, setCopyInput] = useState('');
  const [copyTone, setCopyTone] = useState('professional');
  const [copyPlatform, setCopyPlatform] = useState('meta');
  const [generatedCopy, setGeneratedCopy] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const wizardSteps = ['Format', 'Vorlage', 'Inhalt', 'Branding', 'Vorschau'];

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
      if (res.ok) {
        setGeneratedCopy(data);
      }
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
    <div className="px-8 py-8 max-w-5xl">
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
        <span className="text-ease-cream font-medium">Ad Creator</span>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-ease-cream">Ad Creator</h1>
          <p className="text-xs text-gray-500 mt-0.5">Anzeigen erstellen und verwalten</p>
        </div>
        <button
          onClick={() => {
            setWizardOpen(true);
            setWizardStep(0);
          }}
          className="px-5 py-2.5 bg-ease-accent text-black text-sm font-medium rounded-lg hover:bg-ease-accent/90 transition-colors"
        >
          Neue Anzeige erstellen
        </button>
      </div>

      {/* Wizard Modal */}
      {wizardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-ease-card border border-ease-border rounded-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            {/* Wizard Header */}
            <div className="flex items-center justify-between p-5 border-b border-ease-border">
              <h2 className="text-base font-semibold text-ease-cream">Neue Anzeige</h2>
              <button
                onClick={() => setWizardOpen(false)}
                className="text-gray-500 hover:text-ease-cream transition-colors text-lg"
              >
                &times;
              </button>
            </div>

            {/* Step Indicators */}
            <div className="flex items-center gap-1 px-5 pt-4">
              {wizardSteps.map((step, idx) => (
                <div key={step} className="flex items-center gap-1">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
                      idx <= wizardStep
                        ? 'bg-ease-accent text-black'
                        : 'bg-white/5 text-gray-600'
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <span
                    className={`text-xs ${
                      idx <= wizardStep ? 'text-ease-cream' : 'text-gray-600'
                    }`}
                  >
                    {step}
                  </span>
                  {idx < wizardSteps.length - 1 && (
                    <div className="w-6 h-px bg-ease-border mx-1" />
                  )}
                </div>
              ))}
            </div>

            {/* Step Content */}
            <div className="p-5">
              {wizardStep === 0 && (
                <div>
                  <h3 className="text-sm font-medium text-ease-cream mb-3">Format waehlen</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {AD_FORMATS.map((f) => (
                      <button
                        key={f.key}
                        disabled={f.disabled}
                        onClick={() => setAdConfig({ ...adConfig, format: f.key })}
                        className={`p-4 rounded-xl border text-left transition-colors ${
                          adConfig.format === f.key
                            ? 'border-ease-accent bg-ease-accent/5'
                            : 'border-ease-border hover:border-ease-accent/30'
                        } ${f.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                      >
                        <p className="text-sm font-medium text-ease-cream">{f.label}</p>
                        <p className="text-xs text-gray-500">{f.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {wizardStep === 1 && (
                <div>
                  <h3 className="text-sm font-medium text-ease-cream mb-3">Vorlage waehlen</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {PLACEHOLDER_TEMPLATES.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setAdConfig({ ...adConfig, template: t.id })}
                        className={`rounded-xl border overflow-hidden transition-colors ${
                          adConfig.template === t.id
                            ? 'border-ease-accent'
                            : 'border-ease-border hover:border-ease-accent/30'
                        }`}
                      >
                        <div className={`h-32 ${t.preview}`} />
                        <p className="text-xs text-ease-cream p-3">{t.name}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {wizardStep === 2 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-ease-cream mb-3">Inhalt eingeben</h3>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Headline</label>
                    <input
                      type="text"
                      value={adConfig.headline}
                      onChange={(e) => setAdConfig({ ...adConfig, headline: e.target.value })}
                      className="w-full bg-ease-bg border border-ease-border rounded-lg px-3 py-2 text-sm text-ease-cream focus:outline-none focus:border-ease-accent transition-colors"
                      placeholder="Deine aufmerksamkeitsstarke Headline"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Body Text</label>
                    <textarea
                      value={adConfig.body}
                      onChange={(e) => setAdConfig({ ...adConfig, body: e.target.value })}
                      rows={3}
                      className="w-full bg-ease-bg border border-ease-border rounded-lg px-3 py-2 text-sm text-ease-cream focus:outline-none focus:border-ease-accent transition-colors resize-none"
                      placeholder="Beschreibe dein Produkt oder Angebot..."
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Call to Action</label>
                    <input
                      type="text"
                      value={adConfig.cta}
                      onChange={(e) => setAdConfig({ ...adConfig, cta: e.target.value })}
                      className="w-full bg-ease-bg border border-ease-border rounded-lg px-3 py-2 text-sm text-ease-cream focus:outline-none focus:border-ease-accent transition-colors"
                      placeholder="z.B. Jetzt entdecken"
                    />
                  </div>
                </div>
              )}

              {wizardStep === 3 && (
                <div>
                  <h3 className="text-sm font-medium text-ease-cream mb-3">Branding</h3>
                  <p className="text-xs text-gray-500 mb-4">
                    Farben und Logo werden automatisch aus dem Brand Hub uebernommen.
                  </p>
                  <div className="bg-ease-bg rounded-xl p-4 border border-ease-border">
                    <p className="text-xs text-gray-400">
                      Gehe zum{' '}
                      <Link
                        href={`/dashboard/${projectSlug}/brand`}
                        className="text-ease-accent hover:underline"
                      >
                        Brand Hub
                      </Link>
                      , um deine Markenfarben und dein Logo einzurichten.
                    </p>
                  </div>
                </div>
              )}

              {wizardStep === 4 && (
                <div>
                  <h3 className="text-sm font-medium text-ease-cream mb-3">Vorschau</h3>
                  <div className="bg-ease-bg rounded-xl border border-ease-border p-6 flex flex-col items-center gap-4">
                    {/* Preview placeholder */}
                    <div
                      className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg flex flex-col items-center justify-center p-8 text-center"
                      style={{
                        width: adConfig.format === '1200x628' ? '360px' : '270px',
                        height:
                          adConfig.format === '1080x1350'
                            ? '337px'
                            : adConfig.format === '1200x628'
                              ? '188px'
                              : '270px',
                      }}
                    >
                      <p className="text-lg font-bold text-ease-cream mb-2">
                        {adConfig.headline || 'Headline'}
                      </p>
                      <p className="text-xs text-gray-400 mb-3">
                        {adConfig.body || 'Body text...'}
                      </p>
                      {adConfig.cta && (
                        <span className="px-4 py-1.5 bg-ease-accent text-black text-xs font-medium rounded-lg">
                          {adConfig.cta}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      Format: {adConfig.format} | Vorlage #{adConfig.template}
                    </p>
                    <button className="px-5 py-2.5 bg-ease-accent text-black text-sm font-medium rounded-lg hover:bg-ease-accent/90 transition-colors opacity-50 cursor-not-allowed">
                      Download (bald verfuegbar)
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Wizard Nav */}
            <div className="flex items-center justify-between p-5 border-t border-ease-border">
              <button
                onClick={() => {
                  if (wizardStep === 0) setWizardOpen(false);
                  else setWizardStep(wizardStep - 1);
                }}
                className="px-4 py-2 text-sm text-gray-400 hover:text-ease-cream transition-colors"
              >
                {wizardStep === 0 ? 'Abbrechen' : 'Zurueck'}
              </button>
              {wizardStep < wizardSteps.length - 1 && (
                <button
                  onClick={() => setWizardStep(wizardStep + 1)}
                  className="px-5 py-2 bg-ease-accent text-black text-sm font-medium rounded-lg hover:bg-ease-accent/90 transition-colors"
                >
                  Weiter
                </button>
              )}
              {wizardStep === wizardSteps.length - 1 && (
                <button
                  onClick={() => setWizardOpen(false)}
                  className="px-5 py-2 bg-ease-accent text-black text-sm font-medium rounded-lg hover:bg-ease-accent/90 transition-colors"
                >
                  Fertig
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Copy Generator Section */}
      <section className="mb-8">
        <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
          Copy erstellen
        </h2>
        <div className="bg-ease-card border border-ease-border rounded-xl p-5 space-y-4">
          <div>
            <label className="text-xs text-gray-500 block mb-1">
              Produkt / Angebot beschreiben
            </label>
            <textarea
              value={copyInput}
              onChange={(e) => setCopyInput(e.target.value)}
              rows={3}
              className="w-full bg-ease-bg border border-ease-border rounded-lg px-3 py-2 text-sm text-ease-cream placeholder-gray-600 focus:outline-none focus:border-ease-accent transition-colors resize-none"
              placeholder="z.B. Nervensystem-Regulierung Supplement, reduziert Stress in 14 Tagen..."
            />
          </div>

          <div className="flex flex-wrap gap-4">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Tonalitaet</label>
              <div className="flex gap-1.5">
                {TONES.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setCopyTone(t.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      copyTone === t.key
                        ? 'bg-ease-accent text-black'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Plattform</label>
              <div className="flex gap-1.5">
                {PLATFORMS.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => setCopyPlatform(p.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      copyPlatform === p.key
                        ? 'bg-ease-accent text-black'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
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
            className="px-5 py-2.5 bg-ease-accent text-black text-sm font-medium rounded-lg hover:bg-ease-accent/90 transition-colors disabled:opacity-50"
          >
            {generating ? 'Generiere...' : 'Copy generieren'}
          </button>

          {generatedCopy && (
            <div className="mt-4 pt-4 border-t border-ease-border space-y-3">
              <div>
                <p className="text-xs text-gray-500 mb-1">Headline</p>
                <p className="text-sm font-medium text-ease-cream">{generatedCopy.headline}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Primary Text</p>
                <p className="text-sm text-ease-cream whitespace-pre-wrap">
                  {generatedCopy.primary_text}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">CTA</p>
                <p className="text-sm font-medium text-ease-accent">{generatedCopy.cta}</p>
              </div>
              <button
                onClick={handleCopyToClipboard}
                className="px-4 py-2 bg-white/5 text-gray-400 hover:text-ease-cream text-sm rounded-lg hover:bg-white/10 transition-colors"
              >
                {copied ? 'Kopiert!' : 'In Zwischenablage kopieren'}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Recent Creatives Gallery */}
      <section>
        <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
          Letzte Creatives
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-ease-card border border-ease-border rounded-xl overflow-hidden group"
            >
              <div className="h-36 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                <span className="text-gray-600 text-xs">Platzhalter</span>
              </div>
              <div className="p-3">
                <p className="text-xs text-ease-cream font-medium truncate">
                  Anzeige {i}
                </p>
                <p className="text-[11px] text-gray-500">30.03.2026</p>
                <div className="flex gap-1 mt-2">
                  <span className="text-[10px] bg-white/5 text-gray-500 px-1.5 py-0.5 rounded">
                    Meta
                  </span>
                </div>
                <div className="flex gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="text-[11px] text-gray-400 hover:text-ease-cream">
                    Download
                  </button>
                  <button className="text-[11px] text-gray-400 hover:text-ease-cream">
                    Duplizieren
                  </button>
                  <button className="text-[11px] text-ease-red/70 hover:text-ease-red">
                    Loeschen
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
