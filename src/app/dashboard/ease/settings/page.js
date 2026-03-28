'use client';

import Link from 'next/link';

const INTEGRATIONS = [
  {
    name: 'Nervensystem-Quiz',
    icon: '✦',
    status: 'connected',
    description: 'Shopify Quiz Webhook',
    detail: 'Letzte Daten: Live',
  },
  {
    name: 'Meta Ads',
    icon: '◎',
    status: 'disconnected',
    description: 'Meta Business Manager API',
    detail: 'Nicht verbunden',
  },
  {
    name: 'Shopify',
    icon: '⬡',
    status: 'disconnected',
    description: 'Shopify Admin API',
    detail: 'Nicht verbunden',
  },
  {
    name: 'E-Mail Marketing',
    icon: '✉',
    status: 'disconnected',
    description: 'Klaviyo / Mailchimp API',
    detail: 'Nicht verbunden',
  },
];

export default function SettingsPage() {
  return (
    <div className="px-8 py-8 max-w-4xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-1">
        <Link href="/dashboard" className="text-gray-500 hover:text-ease-cream transition-colors">Dashboard</Link>
        <span className="text-gray-600">/</span>
        <Link href="/dashboard/ease" className="text-gray-500 hover:text-ease-cream transition-colors">EASE</Link>
        <span className="text-gray-600">/</span>
        <span className="text-ease-cream font-medium">Einstellungen</span>
      </div>

      <div className="mb-8">
        <h1 className="text-xl font-semibold text-ease-cream">Einstellungen</h1>
        <p className="text-xs text-gray-500 mt-0.5">Integrationen & Konfiguration für EASE</p>
      </div>

      {/* Integrations */}
      <div className="mb-8">
        <h2 className="text-sm font-medium text-ease-cream mb-4">Integrationen</h2>
        <div className="flex flex-col gap-3">
          {INTEGRATIONS.map((integration) => (
            <div
              key={integration.name}
              className="bg-ease-card border border-ease-border rounded-xl p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${
                  integration.status === 'connected'
                    ? 'bg-ease-accent/10 text-ease-accent'
                    : 'bg-white/5 text-gray-600'
                }`}>
                  {integration.icon}
                </div>
                <div>
                  <p className="text-sm font-medium text-ease-cream">{integration.name}</p>
                  <p className="text-xs text-gray-500">{integration.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500">{integration.detail}</span>
                {integration.status === 'connected' ? (
                  <span className="flex items-center gap-1.5 text-[11px] text-ease-green bg-ease-green/10 px-2.5 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 bg-ease-green rounded-full" />
                    Verbunden
                  </span>
                ) : (
                  <button className="text-[11px] text-ease-accent bg-ease-accent/10 hover:bg-ease-accent/20 px-3 py-1 rounded-full transition-colors cursor-not-allowed opacity-60">
                    Verbinden
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Project Info */}
      <div>
        <h2 className="text-sm font-medium text-ease-cream mb-4">Projekt-Info</h2>
        <div className="bg-ease-card border border-ease-border rounded-xl p-5 space-y-3">
          <InfoRow label="Kunde" value="EASE" />
          <InfoRow label="Projekt" value="Nervensystem & Stressmanagement" />
          <InfoRow label="Project ID" value={process.env.NEXT_PUBLIC_PROJECT_ID || '—'} mono />
          <InfoRow label="Status" value="Aktiv" />
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-gray-500">{label}</span>
      <span className={`text-sm ${mono ? 'font-mono text-gray-400 text-xs' : 'text-ease-cream'}`}>{value}</span>
    </div>
  );
}
