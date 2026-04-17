'use client';

import Link from 'next/link';
import { useState, use } from 'react';
import { useAuth } from '@/components/AuthProvider';

export default function SettingsPage({ params }) {
  const { projectSlug } = use(params);
  const { user, userProjects, supabase, isAdmin } = useAuth();
  const [toast, setToast] = useState(null);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(null);

  const project = userProjects.find((p) => p.slug === projectSlug);
  const projectName = project?.name || projectSlug.toUpperCase();
  const projectId = project?.id;

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleUpdateEmail = async (e) => {
    e.preventDefault();
    if (!newEmail) return;
    setSaving('email');
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) showToast('error', error.message);
      else {
        showToast('success', 'Best\u00E4tigungs-E-Mail versendet. Bitte neue Adresse best\u00E4tigen.');
        setNewEmail('');
      }
    } catch {
      showToast('error', 'Fehler beim Aktualisieren der E-Mail.');
    }
    setSaving(null);
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      showToast('error', 'Passwort muss mindestens 8 Zeichen haben.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('error', 'Passw\u00F6rter stimmen nicht \u00FCberein.');
      return;
    }
    setSaving('password');
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) showToast('error', error.message);
      else {
        showToast('success', 'Passwort erfolgreich ge\u00E4ndert.');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch {
      showToast('error', 'Fehler beim \u00C4ndern des Passworts.');
    }
    setSaving(null);
  };

  return (
    <div className="px-8 py-8 max-w-4xl mx-auto w-full">
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl border text-sm font-medium shadow-lg ${
          toast.type === 'success'
            ? 'bg-ease-green/10 border-ease-green/30 text-ease-green'
            : 'bg-ease-red/10 border-ease-red/30 text-ease-red'
        }`}>
          {toast.message}
        </div>
      )}

      <div className="flex items-center gap-2 text-xs mb-2 animate-fade-in">
        <Link href="/dashboard" className="text-ease-muted hover:text-white transition-colors">Dashboard</Link>
        <span className="text-white/20">/</span>
        <Link href={`/dashboard/${projectSlug}`} className="text-ease-muted hover:text-white transition-colors">{projectName}</Link>
        <span className="text-white/20">/</span>
        <span className="text-white font-medium">Einstellungen</span>
      </div>

      <div className="mb-8 animate-fade-in">
        <h1 className="text-2xl font-bold tracking-tight">Einstellungen</h1>
        <p className="text-xs text-ease-muted mt-1">Konto, Sicherheit & Abonnement</p>
      </div>

      {/* Account */}
      <section className="mb-6">
        <h2 className="text-[11px] uppercase tracking-wider text-white/40 mb-3">Konto</h2>
        <div className="glass rounded-2xl divide-y divide-white/[0.04]">
          {/* Email */}
          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-medium text-white">E-Mail-Adresse</p>
                <p className="text-xs text-ease-muted mt-0.5">{user?.email || '\u2014'}</p>
              </div>
            </div>
            <form onSubmit={handleUpdateEmail} className="flex items-center gap-2">
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="neue@email.de"
                className="flex-1 bg-ease-bg border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-ease-accent transition-colors"
              />
              <button
                type="submit"
                disabled={saving === 'email' || !newEmail}
                className="text-xs bg-white/[0.06] hover:bg-white/[0.1] disabled:opacity-30 text-white px-4 py-2 rounded-lg transition-colors"
              >
                {saving === 'email' ? '...' : '\u00C4ndern'}
              </button>
            </form>
          </div>

          {/* Password */}
          <div className="p-5">
            <p className="text-sm font-medium text-white mb-3">Passwort \u00E4ndern</p>
            <form onSubmit={handleUpdatePassword} className="space-y-2">
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Neues Passwort (min. 8 Zeichen)"
                className="w-full bg-ease-bg border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-ease-accent transition-colors"
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Passwort best\u00E4tigen"
                className="w-full bg-ease-bg border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-ease-accent transition-colors"
              />
              <button
                type="submit"
                disabled={saving === 'password' || !newPassword}
                className="text-xs bg-white/[0.06] hover:bg-white/[0.1] disabled:opacity-30 text-white px-4 py-2 rounded-lg transition-colors"
              >
                {saving === 'password' ? '...' : 'Passwort speichern'}
              </button>
            </form>
          </div>

          {/* 2FA */}
          <div className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">Zwei-Faktor-Authentifizierung</p>
              <p className="text-xs text-ease-muted mt-0.5">Extra-Schutz per Authenticator-App</p>
            </div>
            <span className="text-[11px] text-white/40 bg-white/[0.04] px-3 py-1 rounded-full">
              Bald verf\u00FCgbar
            </span>
          </div>
        </div>
      </section>

      {/* Plan & Usage */}
      <section className="mb-6">
        <h2 className="text-[11px] uppercase tracking-wider text-white/40 mb-3">Abonnement & Nutzung</h2>
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-sm font-medium text-white">Aktueller Plan</p>
              <p className="text-xs text-ease-muted mt-0.5">Pro</p>
            </div>
            <span className="text-[11px] text-white/40 bg-white/[0.04] px-3 py-1 rounded-full">
              Upgrade bald verf\u00FCgbar
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <UsageStat label="Projekte" value={userProjects.length} limit="\u221E" />
            <UsageStat label="Integrationen" value="\u2014" limit="unbegrenzt" />
            <UsageStat label="API-Calls (30T)" value="\u2014" limit="\u2014" />
          </div>
        </div>
      </section>

      {/* Project Info */}
      <section className="mb-6">
        <h2 className="text-[11px] uppercase tracking-wider text-white/40 mb-3">Projekt-Info</h2>
        <div className="glass rounded-2xl p-5 space-y-3">
          <InfoRow label="Projekt" value={projectName} />
          <InfoRow label="Slug" value={projectSlug} mono />
          <InfoRow label="Projekt-ID" value={projectId || '\u2014'} mono />
          <InfoRow label="Rolle" value={isAdmin ? 'Admin' : 'Kunde'} />
        </div>
      </section>

      {/* Danger Zone */}
      <section>
        <h2 className="text-[11px] uppercase tracking-wider text-ease-red/60 mb-3">Gefahrenzone</h2>
        <div className="glass rounded-2xl p-5 border border-ease-red/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">Konto l\u00F6schen</p>
              <p className="text-xs text-ease-muted mt-0.5">Unwiderruflich \u2014 alle Daten werden gel\u00F6scht</p>
            </div>
            <span className="text-[11px] text-white/40 bg-white/[0.04] px-3 py-1 rounded-full">
              Bald verf\u00FCgbar
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}

function InfoRow({ label, value, mono }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-ease-muted">{label}</span>
      <span className={`text-sm ${mono ? 'font-mono text-white/60 text-xs' : 'text-white'}`}>{value}</span>
    </div>
  );
}

function UsageStat({ label, value, limit }) {
  return (
    <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl px-4 py-3">
      <p className="text-[10px] uppercase tracking-wider text-white/30 mb-1">{label}</p>
      <p className="text-xl font-semibold text-white">
        {value}
        <span className="text-xs text-white/30 font-normal ml-1">/ {limit}</span>
      </p>
    </div>
  );
}
