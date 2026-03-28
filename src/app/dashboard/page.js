'use client';

import Link from 'next/link';

// For now hardcoded — later from DB
const CLIENTS = [
  {
    slug: 'ease',
    name: 'EASE',
    description: 'Nervensystem & Stressmanagement',
    initial: 'E',
    channels: ['Quiz', 'Meta Ads', 'Shopify', 'E-Mail'],
    activeChannels: 1,
  },
];

export default function DashboardHome() {
  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-ease-cream">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Wähle einen Kunden, um die Analytics zu sehen</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CLIENTS.map((client) => (
          <Link
            key={client.slug}
            href={`/dashboard/${client.slug}`}
            className="group bg-ease-card border border-ease-border rounded-xl p-6 hover:border-ease-accent/30 transition-all duration-200"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-ease-accent rounded-xl flex items-center justify-center text-lg font-bold text-black">
                {client.initial}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-ease-cream group-hover:text-ease-accent transition-colors">
                  {client.name}
                </h2>
                <p className="text-xs text-gray-500">{client.description}</p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex gap-2 flex-wrap">
                {client.channels.map((ch, i) => (
                  <span
                    key={ch}
                    className={`text-[11px] px-2 py-0.5 rounded-full ${
                      i < client.activeChannels
                        ? 'bg-ease-green/10 text-ease-green'
                        : 'bg-white/5 text-gray-600'
                    }`}
                  >
                    {ch}
                  </span>
                ))}
              </div>
              <span className="text-gray-600 group-hover:text-ease-accent group-hover:translate-x-1 transition-all text-sm">
                →
              </span>
            </div>
          </Link>
        ))}

        {/* Add Client Placeholder */}
        <div className="border border-dashed border-ease-border rounded-xl p-6 flex items-center justify-center">
          <p className="text-sm text-gray-600">+ Neuen Kunden hinzufügen</p>
        </div>
      </div>
    </div>
  );
}
