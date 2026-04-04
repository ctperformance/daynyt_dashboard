'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, Suspense } from 'react';

function OAuthCompleteInner() {
  const searchParams = useSearchParams();
  const provider = searchParams.get('provider') || '';
  const status = searchParams.get('status') || 'connected';
  const error = searchParams.get('error') || '';

  useEffect(() => {
    const message = {
      type: 'oauth_callback',
      provider,
      status: error ? 'error' : status,
      value: error || provider,
    };

    // Try postMessage to opener
    if (window.opener) {
      window.opener.postMessage(message, window.location.origin);
      setTimeout(() => window.close(), 300);
      return;
    }

    // Fallback: set localStorage flag that the parent can detect
    try {
      localStorage.setItem('oauth_result', JSON.stringify({ ...message, ts: Date.now() }));
    } catch {}

    // If we can't close, redirect to settings
    setTimeout(() => {
      window.location.href = '/dashboard/ease/settings';
    }, 1500);
  }, [provider, status, error]);

  return (
    <div className="min-h-screen bg-ease-bg flex items-center justify-center">
      <div className="text-center">
        <div className="text-ease-accent text-4xl mb-4">&#10003;</div>
        <p className="text-ease-cream text-sm">Verbindung hergestellt.</p>
        <p className="text-gray-500 text-xs mt-2">Dieses Fenster schliesst sich automatisch...</p>
      </div>
    </div>
  );
}

export default function OAuthCompletePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-ease-bg" />}>
      <OAuthCompleteInner />
    </Suspense>
  );
}
