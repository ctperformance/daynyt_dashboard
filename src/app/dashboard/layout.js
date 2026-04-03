'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, userProjects, isAdmin, isClient, signOut, loading } = useAuth();

  // Extract active project slug from URL
  const pathParts = pathname.split('/');
  const projectSlugFromUrl = pathParts[2] && pathParts[2] !== '' ? pathParts[2] : null;
  const activeProject = userProjects.find((p) => p.slug === projectSlugFromUrl);

  // For client users with exactly one project, auto-redirect
  if (!loading && isClient && userProjects.length === 1 && !projectSlugFromUrl) {
    router.replace(`/dashboard/${userProjects[0].slug}`);
  }

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

        {/* Client/Project Selector - only for admins */}
        {isAdmin && userProjects.length > 0 && (
          <div className="px-3 py-3 border-b border-ease-border">
            <p className="text-[10px] uppercase tracking-wider text-gray-600 px-3 mb-2">Kunden</p>
            {userProjects.map((project) => (
              <Link
                key={project.slug}
                href={`/dashboard/${project.slug}`}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  activeProject?.slug === project.slug
                    ? 'bg-ease-accent/10 text-ease-accent font-medium'
                    : 'text-gray-400 hover:text-ease-cream hover:bg-white/5'
                }`}
              >
                <div className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${
                  activeProject?.slug === project.slug
                    ? 'bg-ease-accent text-black'
                    : 'bg-white/10 text-gray-400'
                }`}>
                  {project.name.charAt(0).toUpperCase()}
                </div>
                {project.name}
              </Link>
            ))}
          </div>
        )}

        {/* Client view - just show their project name */}
        {isClient && activeProject && (
          <div className="px-3 py-3 border-b border-ease-border">
            <p className="text-[10px] uppercase tracking-wider text-gray-600 px-3 mb-2">Projekt</p>
            <div className="flex items-center gap-2.5 px-3 py-2 text-sm text-ease-accent font-medium">
              <div className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold bg-ease-accent text-black">
                {activeProject.name.charAt(0).toUpperCase()}
              </div>
              {activeProject.name}
            </div>
          </div>
        )}

        {/* Channel Nav — only shown when a project is active */}
        {activeProject && <ClientNav projectSlug={activeProject.slug} pathname={pathname} />}

        {/* Spacer */}
        <div className="flex-1" />

        {/* User Info + Sign Out */}
        <div className="px-3 py-4 border-t border-ease-border space-y-2">
          {user && (
            <div className="px-3 py-2">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-7 h-7 rounded-full bg-ease-accent/20 flex items-center justify-center text-xs font-bold text-ease-accent">
                  {(user.email || '?').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-ease-cream truncate">{user.email}</p>
                  <p className="text-[10px] text-gray-600">
                    {isAdmin ? 'Admin' : 'Kunde'}
                  </p>
                </div>
              </div>
              <button
                onClick={signOut}
                className="w-full text-left text-xs text-gray-500 hover:text-ease-red px-0 py-1 transition-colors"
              >
                Abmelden
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        {children}
      </main>
    </div>
  );
}

const NAV_SECTIONS = [
  {
    label: 'Kanaele',
    items: [
      { segment: '', label: 'Uebersicht', icon: '\u229E' },
      { segment: '/quiz', label: 'Quiz', icon: '\u2726' },
      { segment: '/meta', label: 'Meta Ads', icon: '\u25CE' },
      { segment: '/google', label: 'Google Ads', icon: '\u25C9' },
      { segment: '/shopify', label: 'Shopify', icon: '\u2B21' },
      { segment: '/tiktok', label: 'TikTok Ads', icon: '\u266A' },
      { segment: '/snapchat', label: 'Snapchat Ads', icon: '\u25C7' },
      { segment: '/email', label: 'E-Mail', icon: '\u2709' },
      { segment: '/clarity', label: 'Website Analytics', icon: '\u25CE' },
    ],
  },
  {
    label: 'Tools',
    items: [
      { segment: '/ads', label: 'Ads Manager', icon: '\u25B6' },
      { segment: '/creatives', label: 'Ad Creator', icon: '\u270E' },
      { segment: '/brand', label: 'Brand Hub', icon: '\u25C6' },
    ],
  },
  {
    label: 'Konto',
    items: [
      { segment: '/settings', label: 'Einstellungen', icon: '\u2699' },
    ],
  },
];

function ClientNav({ projectSlug, pathname }) {
  const base = `/dashboard/${projectSlug}`;

  function isActive(segment) {
    const full = base + segment;
    if (segment === '') return pathname === base || pathname === base + '/';
    return pathname.startsWith(full);
  }

  return (
    <nav className="px-3 py-3 flex flex-col gap-0.5">
      {NAV_SECTIONS.map((section) => (
        <div key={section.label} className="mb-2">
          <p className="text-[10px] uppercase tracking-wider text-gray-600 px-3 mb-2">
            {section.label}
          </p>
          {section.items.map((item) => (
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
        </div>
      ))}
    </nav>
  );
}
