import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './css/mobile-accessibility.css'
import App from './App.jsx'

import { runAll43SecurityChecks } from './utils/securityAuditor'

// Globally prevent dragging on text, links, and images
if (typeof window !== 'undefined') {
  // Automatically reload the page when Vite fails to fetch a dynamic chunk (e.g. after a new deployment)
  window.addEventListener('vite:preloadError', (event) => {
    console.warn('Vite dynamic chunk preload failed (new deployment detected). Reloading page...', event);
    const lastReload = parseInt(sessionStorage.getItem('vite_preload_reload') || '0', 10);
    const now = Date.now();
    // Only reload if not reloaded in the last 10 seconds to prevent loops
    if (now - lastReload > 10000) {
      sessionStorage.setItem('vite_preload_reload', String(now));
      window.location.reload();
    }
  });

  window.runSecurityAudit = runAll43SecurityChecks;
  window.addEventListener('dragstart', (e) => {
    if (e.target && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
      e.preventDefault();
      return false;
    }
  }, { capture: true });
}

// Unregister any stale service workers and purge caches
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
    }
  });
  if (typeof caches !== 'undefined') {
    caches.keys().then((keys) => {
      keys.forEach((key) => caches.delete(key));
    });
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
