'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Top-level clients — later this comes from DB
const CLIENTS = [
  { slug: 'ease', name: 'EASE', initial: 'E' },
];

export default function DashboardLayout({ children }) {
  const pathname = usePathname();

  // Detect active client from URL
  const activeClient = CLIENTS.find((c) => pathname.includes(`/dashboard/${c.slug}`));

  return (
    <div className="min-h-screen bg-ease-bg flex">
      {/* Sidebar */}
      <aside className="w-56 border-r border-ease-border flex flex-col shrink-0 sticky top-0 h-screen">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-ease-border">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-ease-accent rounded-lg flex items-center justify-center text-sm font-bold text-black">
              D
            </div>
            <div>
              <span className="text-base font-semibold text-ease-cream">DAYNYT</span>
              <span className="text-xs text-gray-500 block leading-tight">Dashboard</span>
            </div>
          </Link>
        </div>

        {/* Client Selector */}
        <div className="px-3 py-3 border-b border-ease-border">
          <p className="text-[10px] uppercase tracking-wider text-gray-600 px-3 mb-2">Kunden</p>
          {CLIENTS.map((client) => (
            <Link
              key={client.slug}
              href={`/dashboard/${client.slug}`}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                activeClient?.slug === client.slug
                  ? 'bg-ease-accent/10 text-ease-accent font-medium'
                  : 'text-gray-400 hover:text-ease-cream hover:bg-white/5'
              }`}
            >
              <div className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${
                activeClient?.slug === client.slug
                  ? 'bg-ease-accent text-black'
                  : 'bg-white/10 text-gray-400'
              }`}>
                {client.initial}
              </div>
              {client.name}
            </Link>
          ))}
        </div>

        {/* Channel Nav — only shown when a client is active */}
        {activeClient && <ClientNav clientSlug={activeClient.slug} pathname={pathname} />}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Bottom */}
        <div className="px-3 py-4 border-t border-ease-border">
          <Link
            href={activeClient ? `/dashboard/${activeClient.slug}/settings` : '/dashboard'}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-ease-cream hover:bg-white/5 transition-colors"
          >
            <span className="text-base w-5 text-center">&#9881;</span>
            Einstellungen
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        {children}
      </main>
    </div>
  );
}

const CHANNEL_NAV = [
  { segment: '', label: 'Übersicht', icon: '⊞' },
  { segment: '/quiz', label: 'Quiz', icon: '✦' },
  { segment: '/meta', label: 'Meta Ads', icon: '◎' },
  { segment: '/shopify', label: 'Shopify', icon: '⬡' },
  { segment: '/email', label: 'E-Mail', icon: '✉' },
];

function ClientNav({ clientSlug, pathname }) {
  const base = `/dashboard/${clientSlug}`;

  function isActive(segment) {
    const full = base + segment;
    if (segment === '') return pathname === base || pathname === base + '/';
    return pathname.startsWith(full);
  }

  return (
    <nav className="px-3 py-3 flex flex-col gap-0.5">
      <p className="text-[10px] uppercase tracking-wider text-gray-600 px-3 mb-2">Kanäle</p>
      {CHANNEL_NAV.map((item) => (
        <Link
          key={item.segment}
          href={base + item.segment}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
            isActive(item.segment)
              ? 'bg-ease-accent/10 text-ease-accent font-medium'
              : 'text-gray-400 hover:text-ease-cream hover:bg-white/5'
          }`}
        >
          <span className="text-base w-5 text-center">{item.icon}</span>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
