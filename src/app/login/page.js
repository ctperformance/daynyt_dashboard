'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (authError) {
        setError(authError.message);
      } else {
        setSent(true);
      }
    } catch (err) {
      setError('Ein unerwarteter Fehler ist aufgetreten.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ease-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-ease-accent rounded-xl flex items-center justify-center text-lg font-bold text-black">
              D
            </div>
            <span className="text-2xl font-semibold text-ease-cream tracking-tight">DAYNYT</span>
          </div>
          <div className="w-12 h-0.5 bg-ease-accent mx-auto rounded-full" />
          <p className="text-sm text-gray-500 mt-3">Marketing Dashboard</p>
        </div>

        {!sent ? (
          /* Login Form */
          <div className="bg-ease-card border border-ease-border rounded-2xl p-6">
            <h1 className="text-lg font-semibold text-ease-cream mb-1">Anmelden</h1>
            <p className="text-sm text-gray-500 mb-6">
              Gib deine E-Mail-Adresse ein, um einen Anmelde-Link zu erhalten.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-xs text-gray-500 mb-1.5">
                  E-Mail-Adresse
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="deine@email.de"
                  required
                  autoFocus
                  className="w-full bg-ease-bg border border-ease-border rounded-xl px-4 py-3 text-sm text-ease-cream placeholder-gray-600 focus:outline-none focus:border-ease-accent transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !email}
                className="w-full bg-ease-accent hover:bg-ease-accent/90 disabled:bg-ease-accent/30 disabled:cursor-not-allowed text-black font-medium text-sm py-3 rounded-xl transition-colors"
              >
                {loading ? 'Wird gesendet...' : 'Anmelde-Link senden'}
              </button>
            </form>

            {/* Error Toast */}
            {error && (
              <div className="mt-4 bg-ease-red/10 border border-ease-red/30 text-ease-red text-sm px-4 py-3 rounded-xl">
                {error}
              </div>
            )}
          </div>
        ) : (
          /* Success State */
          <div className="bg-ease-card border border-ease-border rounded-2xl p-6 text-center">
            <div className="w-14 h-14 bg-ease-green/10 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4">
              ✓
            </div>
            <h2 className="text-lg font-semibold text-ease-cream mb-2">Prüfe dein Postfach</h2>
            <p className="text-sm text-gray-500 mb-4">
              Wir haben einen Anmelde-Link an <span className="text-ease-cream font-medium">{email}</span> gesendet.
              Klicke auf den Link in der E-Mail, um dich anzumelden.
            </p>
            <button
              onClick={() => {
                setSent(false);
                setEmail('');
              }}
              className="text-sm text-ease-accent hover:text-ease-accent/80 transition-colors"
            >
              Andere E-Mail verwenden
            </button>
          </div>
        )}

        <p className="text-center text-xs text-gray-600 mt-6">
          Nur autorisierte Benutzer können sich anmelden.
        </p>
      </div>
    </div>
  );
}
