'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';

export default function DashboardHome() {
  const { user, userProjects, isAdmin, isClient, loading, supabase } = useAuth();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', slug: '' });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);

  // Client with single project: auto-redirect
  useEffect(() => {
    if (!loading && isClient && userProjects.length === 1) {
      router.replace(`/dashboard/${userProjects[0].slug}`);
    }
  }, [loading, isClient, userProjects, router]);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);

    try {
      // Get the user's first organization
      const { data: memberships } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .limit(1);

      if (!memberships || memberships.length === 0) {
        setCreateError('Keine Organisation gefunden.');
        setCreating(false);
        return;
      }

      const orgId = memberships[0].organization_id;

      const { error } = await supabase.from('projects').insert({
        organization_id: orgId,
        name: newProject.name,
        slug: newProject.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      });

      if (error) {
        setCreateError(error.message);
      } else {
        setShowModal(false);
        setNewProject({ name: '', slug: '' });
        // Reload to refresh projects
        window.location.reload();
      }
    } catch {
      setCreateError('Ein Fehler ist aufgetreten.');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="px-8 py-8">
        <div className="text-gray-600 text-sm">Laden...</div>
      </div>
    );
  }

  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-ease-cream">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          {isAdmin
            ? 'Alle Kunden und Projekte im Überblick'
            : 'Wähle ein Projekt, um die Analytics zu sehen'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {userProjects.map((project) => (
          <Link
            key={project.slug}
            href={`/dashboard/${project.slug}`}
            className="group bg-ease-card border border-ease-border rounded-xl p-6 hover:border-ease-accent/30 transition-all duration-200"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-ease-accent rounded-xl flex items-center justify-center text-lg font-bold text-black">
                {project.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-ease-cream group-hover:text-ease-accent transition-colors">
                  {project.name}
                </h2>
                <p className="text-xs text-gray-500">/{project.slug}</p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[11px] text-ease-green bg-ease-green/10 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 bg-ease-green rounded-full" />
                Aktiv
              </span>
              <span className="text-gray-600 group-hover:text-ease-accent group-hover:translate-x-1 transition-all text-sm">
                →
              </span>
            </div>
          </Link>
        ))}

        {/* No projects */}
        {userProjects.length === 0 && (
          <div className="col-span-2 bg-ease-card border border-ease-border rounded-xl p-8 text-center">
            <p className="text-gray-500 text-sm mb-2">Noch keine Projekte vorhanden.</p>
            {isAdmin && (
              <p className="text-gray-600 text-xs">Erstelle dein erstes Projekt um loszulegen.</p>
            )}
          </div>
        )}

        {/* Add Client - Admin only */}
        {isAdmin && (
          <button
            onClick={() => setShowModal(true)}
            className="border border-dashed border-ease-border rounded-xl p-6 flex items-center justify-center hover:border-ease-accent/30 hover:bg-ease-card/50 transition-all cursor-pointer"
          >
            <p className="text-sm text-gray-600 hover:text-ease-cream transition-colors">
              + Neuen Kunden hinzufügen
            </p>
          </button>
        )}
      </div>

      {/* Create Project Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-ease-card border border-ease-border rounded-2xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold text-ease-cream mb-4">Neuen Kunden hinzufügen</h2>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Kundenname</label>
                <input
                  type="text"
                  value={newProject.name}
                  onChange={(e) =>
                    setNewProject({
                      name: e.target.value,
                      slug: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-'),
                    })
                  }
                  placeholder="z.B. EASE"
                  required
                  className="w-full bg-ease-bg border border-ease-border rounded-xl px-4 py-2.5 text-sm text-ease-cream placeholder-gray-600 focus:outline-none focus:border-ease-accent transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Slug (URL)</label>
                <input
                  type="text"
                  value={newProject.slug}
                  onChange={(e) => setNewProject({ ...newProject, slug: e.target.value })}
                  placeholder="ease"
                  required
                  className="w-full bg-ease-bg border border-ease-border rounded-xl px-4 py-2.5 text-sm text-ease-cream font-mono placeholder-gray-600 focus:outline-none focus:border-ease-accent transition-colors"
                />
                <p className="text-[11px] text-gray-600 mt-1">/dashboard/{newProject.slug || '...'}</p>
              </div>

              {createError && (
                <div className="bg-ease-red/10 border border-ease-red/30 text-ease-red text-sm px-4 py-3 rounded-xl">
                  {createError}
                </div>
              )}

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="text-sm text-gray-400 hover:text-ease-cream px-4 py-2 rounded-lg transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="bg-ease-accent hover:bg-ease-accent/90 disabled:bg-ease-accent/30 text-black font-medium text-sm px-5 py-2 rounded-lg transition-colors"
                >
                  {creating ? 'Erstellen...' : 'Erstellen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
