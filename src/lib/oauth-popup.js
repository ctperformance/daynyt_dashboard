'use client';

/**
 * Opens an OAuth flow in a centered popup window.
 * After the OAuth callback redirects to /dashboard/ease/settings?connected=...,
 * the popup detects this and notifies the opener window.
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

  // Poll to detect when popup navigates back to our domain
  const pollTimer = setInterval(() => {
    try {
      if (!popup || popup.closed) {
        clearInterval(pollTimer);
        return;
      }

      // Check if popup has navigated back to our settings page
      if (popup.location.href && popup.location.origin === window.location.origin) {
        const popupUrl = new URL(popup.location.href);
        const connected = popupUrl.searchParams.get('connected');
        const error = popupUrl.searchParams.get('error');

        if (connected) {
          popup.close();
          clearInterval(pollTimer);
          onSuccess?.(connected);
        } else if (error) {
          popup.close();
          clearInterval(pollTimer);
          onError?.(error);
        }
      }
    } catch {
      // Cross-origin — popup is still on external OAuth page, keep polling
    }
  }, 500);

  return popup;
}
