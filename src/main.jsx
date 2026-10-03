import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

import { runAll43SecurityChecks } from './utils/securityAuditor'

// Globally prevent dragging on text, links, and images
if (typeof window !== 'undefined') {
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
