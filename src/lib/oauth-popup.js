'use client';

/**
 * Opens an OAuth flow in a centered popup window.
 * The callback page sends a postMessage back and closes itself.
 * Falls back to same-window redirect if popup is blocked.
 */
export function openOAuthPopup(url, { onSuccess, onError } = {}) {
  const width = 600;
  const height = 900;
  const left = window.screenX + (window.outerWidth - width) / 2;
  const top = window.screenY + (window.outerHeight - height) / 2;

  const popup = window.open(
    url,
    'oauth_popup',
    `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
  );

  if (!popup) {
    // Popup blocked — fallback to same-window redirect
    window.location.href = url;
    return;
  }

  // Listen for postMessage from the callback page
  function handleMessage(event) {
    if (event.origin !== window.location.origin) return;
    const data = event.data;
    if (!data || data.type !== 'oauth_callback') return;

    window.removeEventListener('message', handleMessage);
    clearInterval(closedTimer);

    if (data.status === 'connected') {
      onSuccess?.(data.value || data.provider);
    } else if (data.status === 'error') {
      onError?.(data.value || 'unknown_error');
    }
  }

  window.addEventListener('message', handleMessage);

  // Also detect if user manually closes the popup
  const closedTimer = setInterval(() => {
    if (!popup || popup.closed) {
      clearInterval(closedTimer);
      window.removeEventListener('message', handleMessage);
    }
  }, 1000);

  return popup;
}
