'use client';

/**
 * Opens an OAuth flow in a centered popup window.
 * The callback redirects to /auth/oauth-complete which sends postMessage
 * and sets localStorage. Both are listened for here.
 */
export function openOAuthPopup(url, { onSuccess, onError } = {}) {
  const width = 600;
  const height = 900;
  const left = window.screenX + (window.outerWidth - width) / 2;
  const top = window.screenY + (window.outerHeight - height) / 2;

  // Clear any old result
  try { localStorage.removeItem('oauth_result'); } catch {}

  const popup = window.open(
    url,
    'oauth_popup',
    `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
  );

  if (!popup) {
    window.location.href = url;
    return;
  }

  let handled = false;

  function finish(status, value) {
    if (handled) return;
    handled = true;
    window.removeEventListener('message', handleMessage);
    window.removeEventListener('storage', handleStorage);
    clearInterval(pollTimer);
    try { localStorage.removeItem('oauth_result'); } catch {}

    if (status === 'error') {
      onError?.(value || 'unknown_error');
    } else {
      onSuccess?.(value);
    }
  }

  // Method 1: postMessage from the oauth-complete page
  function handleMessage(event) {
    if (event.origin !== window.location.origin) return;
    const data = event.data;
    if (!data || data.type !== 'oauth_callback') return;
    finish(data.status, data.value || data.provider);
  }
  window.addEventListener('message', handleMessage);

  // Method 2: localStorage change from the oauth-complete page
  function handleStorage(event) {
    if (event.key !== 'oauth_result' || !event.newValue) return;
    try {
      const data = JSON.parse(event.newValue);
      if (data.type === 'oauth_callback') {
        finish(data.status, data.value || data.provider);
      }
    } catch {}
  }
  window.addEventListener('storage', handleStorage);

  // Method 3: Poll for popup close + localStorage (same-tab won't fire storage event)
  const pollTimer = setInterval(() => {
    // Check localStorage directly (in case storage event didn't fire)
    try {
      const result = localStorage.getItem('oauth_result');
      if (result) {
        const data = JSON.parse(result);
        if (data.type === 'oauth_callback') {
          finish(data.status, data.value || data.provider);
          return;
        }
      }
    } catch {}

    // If popup was closed by user without completing
    if (!popup || popup.closed) {
      if (!handled) {
        clearInterval(pollTimer);
        window.removeEventListener('message', handleMessage);
        window.removeEventListener('storage', handleStorage);
      }
    }
  }, 500);

  return popup;
}
