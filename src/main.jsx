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

  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
