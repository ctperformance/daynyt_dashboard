'use client';

import Link from 'next/link';
import { useState, useEffect, use } from 'react';
import { useAuth } from '@/components/AuthProvider';

export default function BrandHubPage({ params }) {
  const { projectSlug } = use(params);
  const { userProjects } = useAuth();

  const project = userProjects.find((p) => p.slug === projectSlug);
  const projectName = project?.name || projectSlug.toUpperCase();
  const projectId = project?.id;

  const [url, setUrl] = useState('');
  const [scraping, setScraping] = useState(false);
  const [scrapeResult, setScrapeResult] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [brand, setBrand] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);

  // Target audience fields
  const [audience, setAudience] = useState({
    alter: '',
    geschlecht: '',
    interessen: '',
    schmerzpunkte: '',
    wuensche: '',
  });

  // Load existing brand profile
  useEffect(() => {
    if (!projectId) return;
    fetch(`/api/brand/save?project_id=${projectId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.brand_profile && Object.keys(data.brand_profile).length > 0) {
          setBrand(data.brand_profile);
          setConfirmed(true);
          if (data.brand_profile.audience) {
            setAudience(data.brand_profile.audience);
          }
        }
      })
      .catch(() => {});
  }, [projectId]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleScrape = async (e) => {
    e.preventDefault();
    if (!url) return;
    setScraping(true);
    setScrapeResult(null);
    try {
      const res = await fetch('/api/brand/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, project_id: projectId }),
      });
      const data = await res.json();
      if (res.ok) {
        setScrapeResult(data);
      } else {
        setToast({ type: 'error', message: data.error || 'Fehler beim Scraping' });
      }
    } catch {
      setToast({ type: 'error', message: 'Netzwerkfehler' });
    } finally {
      setScraping(false);
    }
  };

  const handleConfirmScrape = () => {
    setBrand(scrapeResult);
    setConfirmed(true);
    setScrapeResult(null);
  };

  const handleSave = async () => {
    if (!projectId || !brand) return;
    setSaving(true);
    try {
      const res = await fetch('/api/brand/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          brand_profile: { ...brand, audience },
        }),
      });
      if (res.ok) {
        setToast({ type: 'success', message: 'Brand-Profil gespeichert!' });
      } else {
        setToast({ type: 'error', message: 'Fehler beim Speichern' });
      }
    } catch {
      setToast({ type: 'error', message: 'Netzwerkfehler' });
    } finally {
      setSaving(false);
    }
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer?.files || e.target?.files || []);
    const valid = files.filter(
      (f) => f.type === 'application/pdf' || f.type.startsWith('image/')
    );
    setUploadedFiles((prev) => [
      ...prev,
      ...valid.map((f) => ({ name: f.name, size: f.size, id: Date.now() + Math.random() })),
    ]);
  };

  const removeFile = (id) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  return (
    <div className="px-8 py-8 max-w-4xl">
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl border text-sm font-medium shadow-lg transition-all ${
            toast.type === 'success'
              ? 'bg-ease-green/10 border-ease-green/30 text-ease-green'
              : 'bg-ease-red/10 border-ease-red/30 text-ease-red'
          }`}
        >
          {toast.message}
        </div>
      )}

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
        <span className="text-ease-cream font-medium">Brand Hub</span>
      </div>

      <div className="mb-8">
        <h1 className="text-xl font-semibold text-ease-cream">Brand Hub</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Markenidentitaet verwalten und pflegen
        </p>
      </div>

      {/* Website Scraping Section */}
      <section className="mb-8">
        <h2 className="text-sm font-medium text-ease-cream mb-4">Website analysieren</h2>
        <div className="bg-ease-card border border-ease-border rounded-xl p-5">
          <form onSubmit={handleScrape} className="flex items-center gap-3">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Website-URL eingeben (z.B. https://example.com)"
              className="flex-1 bg-ease-bg border border-ease-border rounded-lg px-4 py-2.5 text-sm text-ease-cream placeholder-gray-600 focus:outline-none focus:border-ease-accent transition-colors"
              required
            />
            <button
              type="submit"
              disabled={scraping}
              className="px-5 py-2.5 bg-ease-accent text-black text-sm font-medium rounded-lg hover:bg-ease-accent/90 transition-colors disabled:opacity-50"
            >
              {scraping ? 'Analysiere...' : 'Branding analysieren'}
            </button>
          </form>

          {/* Scrape Results */}
          {scrapeResult && (
            <div className="mt-5 pt-5 border-t border-ease-border">
              <h3 className="text-sm font-medium text-ease-cream mb-3">Ergebnis:</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                {scrapeResult.colors?.map((color, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded border border-ease-border"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-xs font-mono text-gray-400">{color}</span>
                  </div>
                ))}
              </div>
              {scrapeResult.description && (
                <p className="text-sm text-gray-400 mb-3">
                  <span className="text-gray-500">Beschreibung:</span> {scrapeResult.description}
                </p>
              )}
              {scrapeResult.logo_url && (
                <p className="text-sm text-gray-400 mb-3">
                  <span className="text-gray-500">Logo:</span>{' '}
                  <span className="font-mono text-xs">{scrapeResult.logo_url}</span>
                </p>
              )}
              <div className="flex items-center gap-3 mt-4">
                <button
                  onClick={handleConfirmScrape}
                  className="px-4 py-2 bg-ease-green/10 text-ease-green text-sm rounded-lg hover:bg-ease-green/20 transition-colors"
                >
                  Ja, das ist korrekt
                </button>
                <button
                  onClick={() => setScrapeResult(null)}
                  className="px-4 py-2 bg-white/5 text-gray-400 text-sm rounded-lg hover:bg-white/10 transition-colors"
                >
                  Manuell bearbeiten
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Brand Profile Card */}
      {confirmed && brand && (
        <section className="mb-8">
          <h2 className="text-sm font-medium text-ease-cream mb-4">Brand-Profil</h2>
          <div className="bg-ease-card border border-ease-border rounded-xl p-5 space-y-4">
            {/* Color Swatches */}
            <div className="grid grid-cols-3 gap-4">
              <ColorField
                label="Primaerfarbe"
                value={brand.primary_color || '#000000'}
                onChange={(v) => setBrand({ ...brand, primary_color: v })}
              />
              <ColorField
                label="Sekundaerfarbe"
                value={brand.secondary_color || '#333333'}
                onChange={(v) => setBrand({ ...brand, secondary_color: v })}
              />
              <ColorField
                label="Akzentfarbe"
                value={brand.accent_color || '#d4a853'}
                onChange={(v) => setBrand({ ...brand, accent_color: v })}
              />
            </div>

            {/* Font + Logo */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Schriftart</label>
                <input
                  type="text"
                  value={brand.font_family || ''}
                  onChange={(e) => setBrand({ ...brand, font_family: e.target.value })}
                  className="w-full bg-ease-bg border border-ease-border rounded-lg px-3 py-2 text-sm text-ease-cream placeholder-gray-600 focus:outline-none focus:border-ease-accent transition-colors"
                  placeholder="z.B. Inter, Poppins"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Logo-URL</label>
                <input
                  type="url"
                  value={brand.logo_url || ''}
                  onChange={(e) => setBrand({ ...brand, logo_url: e.target.value })}
                  className="w-full bg-ease-bg border border-ease-border rounded-lg px-3 py-2 text-sm text-ease-cream placeholder-gray-600 focus:outline-none focus:border-ease-accent transition-colors"
                  placeholder="https://..."
                />
              </div>
            </div>

            {brand.logo_url && (
              <div className="pt-2">
                <p className="text-xs text-gray-500 mb-1">Logo-Vorschau</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={brand.logo_url}
                  alt="Logo"
                  className="max-h-16 rounded border border-ease-border bg-white/5 p-2"
                />
              </div>
            )}

            {/* Brand Name + Tagline */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Markenname</label>
                <input
                  type="text"
                  value={brand.brand_name || ''}
                  onChange={(e) => setBrand({ ...brand, brand_name: e.target.value })}
                  className="w-full bg-ease-bg border border-ease-border rounded-lg px-3 py-2 text-sm text-ease-cream focus:outline-none focus:border-ease-accent transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Tagline</label>
                <input
                  type="text"
                  value={brand.tagline || ''}
                  onChange={(e) => setBrand({ ...brand, tagline: e.target.value })}
                  className="w-full bg-ease-bg border border-ease-border rounded-lg px-3 py-2 text-sm text-ease-cream focus:outline-none focus:border-ease-accent transition-colors"
                />
              </div>
            </div>

            {/* Target Audience Summary */}
            <div>
              <label className="text-xs text-gray-500 block mb-1">Zielgruppen-Zusammenfassung</label>
              <textarea
                value={brand.target_audience_summary || ''}
                onChange={(e) => setBrand({ ...brand, target_audience_summary: e.target.value })}
                rows={2}
                className="w-full bg-ease-bg border border-ease-border rounded-lg px-3 py-2 text-sm text-ease-cream focus:outline-none focus:border-ease-accent transition-colors resize-none"
              />
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2.5 bg-ease-accent text-black text-sm font-medium rounded-lg hover:bg-ease-accent/90 transition-colors disabled:opacity-50"
            >
              {saving ? 'Speichert...' : 'Profil speichern'}
            </button>
          </div>
        </section>
      )}

      {/* Brand Guidelines Upload */}
      <section className="mb-8">
        <h2 className="text-sm font-medium text-ease-cream mb-4">Brand Playbook hochladen</h2>
        <div className="bg-ease-card border border-ease-border rounded-xl p-5">
          <div
            className="border-2 border-dashed border-ease-border rounded-xl p-8 text-center hover:border-ease-accent/30 transition-colors cursor-pointer"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            onClick={() => document.getElementById('brand-file-input')?.click()}
          >
            <p className="text-sm text-gray-400 mb-1">PDF oder Bilder hierher ziehen</p>
            <p className="text-xs text-gray-600">oder klicken zum Auswaehlen</p>
            <input
              id="brand-file-input"
              type="file"
              accept=".pdf,image/*"
              multiple
              className="hidden"
              onChange={handleFileDrop}
            />
          </div>

          {uploadedFiles.length > 0 && (
            <div className="mt-4 space-y-2">
              {uploadedFiles.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center justify-between bg-ease-bg rounded-lg px-3 py-2"
                >
                  <span className="text-sm text-ease-cream truncate">{f.name}</span>
                  <button
                    onClick={() => removeFile(f.id)}
                    className="text-xs text-ease-red/70 hover:text-ease-red transition-colors ml-3"
                  >
                    Entfernen
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Target Audience Section */}
      <section className="mb-8">
        <h2 className="text-sm font-medium text-ease-cream mb-4">Zielgruppe</h2>
        <div className="bg-ease-card border border-ease-border rounded-xl p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <AudienceField
              label="Alter"
              value={audience.alter}
              onChange={(v) => setAudience({ ...audience, alter: v })}
              placeholder="z.B. 25-45"
            />
            <AudienceField
              label="Geschlecht"
              value={audience.geschlecht}
              onChange={(v) => setAudience({ ...audience, geschlecht: v })}
              placeholder="z.B. Weiblich, Alle"
            />
          </div>
          <AudienceField
            label="Interessen"
            value={audience.interessen}
            onChange={(v) => setAudience({ ...audience, interessen: v })}
            placeholder="z.B. Gesundheit, Yoga, Ernaehrung"
          />
          <AudienceField
            label="Schmerzpunkte"
            value={audience.schmerzpunkte}
            onChange={(v) => setAudience({ ...audience, schmerzpunkte: v })}
            placeholder="z.B. Stress, Schlafprobleme"
          />
          <AudienceField
            label="Wuensche"
            value={audience.wuensche}
            onChange={(v) => setAudience({ ...audience, wuensche: v })}
            placeholder="z.B. Mehr Energie, besserer Schlaf"
          />
          <button
            onClick={handleSave}
            disabled={saving || !brand}
            className="px-5 py-2.5 bg-ease-accent text-black text-sm font-medium rounded-lg hover:bg-ease-accent/90 transition-colors disabled:opacity-50"
          >
            {saving ? 'Speichert...' : 'Speichern'}
          </button>
        </div>
      </section>
    </div>
  );
}

function ColorField({ label, value, onChange }) {
  return (
    <div>
      <label className="text-xs text-gray-500 block mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded border border-ease-border cursor-pointer bg-transparent"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-ease-bg border border-ease-border rounded-lg px-3 py-1.5 text-xs font-mono text-gray-400 focus:outline-none focus:border-ease-accent transition-colors"
        />
      </div>
    </div>
  );
}

function AudienceField({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="text-xs text-gray-500 block mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-ease-bg border border-ease-border rounded-lg px-3 py-2 text-sm text-ease-cream placeholder-gray-600 focus:outline-none focus:border-ease-accent transition-colors"
      />
    </div>
  );
}
