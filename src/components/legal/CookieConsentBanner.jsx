import React, { useState, useEffect } from 'react';
import { ShieldCheck, X, ExternalLink } from 'lucide-react';
import { LegalModal } from './LegalModal';
import '../../css/cookie-banner.css';

export const CookieConsentBanner = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState('cookies');

  useEffect(() => {
    try {
      const consent = localStorage.getItem('viotrack_cookie_consent');
      if (!consent) {
        const timer = setTimeout(() => setIsVisible(true), 900);
        return () => clearTimeout(timer);
      }
    } catch (e) {
      console.warn('LocalStorage error reading consent:', e);
    }
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem('viotrack_cookie_consent', 'acknowledged');
    } catch (e) {
      console.warn('LocalStorage write error:', e);
    }
    setIsVisible(false);
  };

  const handleOpenPolicy = (tab = 'cookies') => {
    setLegalModalTab(tab);
    setIsLegalModalOpen(true);
  };

  if (!isVisible && !isLegalModalOpen) return null;

  return (
    <>
      {isVisible && (
        <aside
          className="cookie-consent-bar"
          role="region"
          aria-label="Data Privacy & Storage Notice"
        >
          <div className="cookie-consent-inner">
            {/* Soft Icon Badge */}
            <div className="cookie-consent-icon-box" aria-hidden="true">
              <ShieldCheck size={18} strokeWidth={2.2} />
            </div>

            {/* Explanatory Text */}
            <div className="cookie-consent-text">
              <div className="cookie-consent-title-row">
                <span className="cookie-consent-title">Essential Storage &amp; Privacy Notice</span>
                <span className="cookie-compliance-pill">RA 10173 Compliant</span>
              </div>
              <p className="cookie-consent-desc">
                VioTrack uses strictly essential browser storage for authenticated sessions and role preferences. We do not use third-party marketing or tracking cookies.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="cookie-consent-actions">
              <button
                type="button"
                className="cookie-btn-learn"
                onClick={() => handleOpenPolicy('cookies')}
              >
                Policies
              </button>
              <button
                type="button"
                className="cookie-btn-accept"
                onClick={handleAccept}
              >
                Acknowledge
              </button>
              <button
                type="button"
                className="cookie-btn-close"
                onClick={handleAccept}
                aria-label="Dismiss storage notice"
                title="Dismiss"
              >
                <X size={15} />
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* Global Legal Modal */}
      <LegalModal
        isOpen={isLegalModalOpen}
        onClose={() => setIsLegalModalOpen(false)}
        initialTab={legalModalTab}
      />
    </>
  );
};

export default CookieConsentBanner;
