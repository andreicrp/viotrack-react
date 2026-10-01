import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Shield, FileText, Database, Lock, CheckCircle2, AlertCircle, Info, ExternalLink } from 'lucide-react';
import '../../css/legal-modal.css';

export const LegalModal = ({ isOpen, onClose, initialTab = 'privacy' }) => {
  const [activeTab, setActiveTab] = useState(initialTab);

  // Sync tab if initialTab changes when opened
  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Legal & Regulatory Compliance"
      maxWidth="720px"
    >
      <div className="legal-modal-container">
        {/* Navigation Tabs */}
        <div className="legal-tabs-nav" role="tablist" aria-label="Legal Policies Navigation">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'privacy'}
            className={`legal-tab-btn ${activeTab === 'privacy' ? 'active' : ''}`}
            onClick={() => setActiveTab('privacy')}
          >
            <Shield size={15} />
            <span>Privacy Policy (RA 10173)</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'terms'}
            className={`legal-tab-btn ${activeTab === 'terms' ? 'active' : ''}`}
            onClick={() => setActiveTab('terms')}
          >
            <FileText size={15} />
            <span>Terms & Conditions</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'cookies'}
            className={`legal-tab-btn ${activeTab === 'cookies' ? 'active' : ''}`}
            onClick={() => setActiveTab('cookies')}
          >
            <Database size={15} />
            <span>Cookie & Storage Policy</span>
          </button>
        </div>

        {/* Tab Content Panes */}
        <div className="legal-tab-body">
          {/* TAB 1: PRIVACY POLICY */}
          {activeTab === 'privacy' && (
            <div className="legal-pane" tabIndex={0} role="tabpanel" aria-label="Privacy Policy Details">
              <div className="legal-hero-banner">
                <div className="legal-hero-icon-wrap">
                  <Shield size={24} color="#0ea5a0" />
                </div>
                <div>
                  <h4 className="legal-hero-heading">Data Privacy & Student Protection Policy</h4>
                  <p className="legal-hero-sub">
                    In compliance with Republic Act No. 10173 (Data Privacy Act of 2012) and Department of Education (DepEd) Child Protection Guidelines.
                  </p>
                </div>
              </div>

              <div className="legal-section">
                <h5 className="legal-section-title">1. Institutional Controller & Scope</h5>
                <p className="legal-text">
                  VioTrack is an institutional student conduct, attendance, and disciplinary portal. This policy applies to all registered administrators, class advisers, subject teachers, prefects of discipline, and guidance personnel authorized to access the system.
                </p>
              </div>

              <div className="legal-section">
                <h5 className="legal-section-title">2. Personal Data We Collect & Process</h5>
                <p className="legal-text">
                  We adhere to strict data minimization principles and collect only what is essential for official school administration:
                </p>
                <ul className="legal-list">
                  <li><strong>Learner Identification:</strong> 12-Digit Learner Reference Number (LRN), Full Name, Grade Level, Section, and official photo.</li>
                  <li><strong>Guardian Emergency Contacts:</strong> Parent/Guardian Full Name and verified mobile phone number for automated SMS infraction dispatch.</li>
                  <li><strong>Disciplinary & Remediation Records:</strong> Date, category, detailed narrative of incident, assigned restorative action, and Good Moral status.</li>
                  <li><strong>Campus QR & Location Data:</strong> Ephemeral timestamp and campus gate/checkpoint coordinates logged strictly during active student ID QR verification.</li>
                </ul>
              </div>

              <div className="legal-section">
                <h5 className="legal-section-title">3. Lawful Basis & DepEd Compliance</h5>
                <p className="legal-text">
                  Processing is carried out pursuant to the legitimate educational functions of the institution, special parental authority under the Family Code of the Philippines (Arts. 218 & 220), and DepEd Order No. 40, s. 2012 (Child Protection Policy). Student records are strictly confidential and are never shared with external third-party advertisers or commercial entities.
                </p>
              </div>

              <div className="legal-section">
                <h5 className="legal-section-title">4. Rights of Students & Guardians (Data Subjects)</h5>
                <p className="legal-text">
                  Under the Philippine Data Privacy Act of 2012, parents, authorized guardians, and students of legal age hold the right to:
                </p>
                <ul className="legal-list">
                  <li>Be informed of the nature and extent of logged disciplinary incidents.</li>
                  <li>Request certified copies of conduct records or certificates of good moral character.</li>
                  <li>Dispute or request correction of erroneous or unsubstantiated infraction entries.</li>
                  <li>Request confidential guidance counseling mediation before sanctions are finalized.</li>
                </ul>
              </div>

              <div className="legal-dpo-card">
                <div className="legal-dpo-header">
                  <Lock size={16} color="#166534" />
                  <strong>Data Protection Officer (DPO) Contact</strong>
                </div>
                <p className="legal-dpo-text">
                  For privacy inquiries, rights assertions, or record rectifications, please reach out to the Office of Guidance & Student Affairs at <code>privacy@viotrack.edu.ph</code>.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: TERMS AND CONDITIONS */}
          {activeTab === 'terms' && (
            <div className="legal-pane" tabIndex={0} role="tabpanel" aria-label="Terms and Conditions Details">
              <div className="legal-hero-banner">
                <div className="legal-hero-icon-wrap">
                  <FileText size={24} color="#07345f" />
                </div>
                <div>
                  <h4 className="legal-hero-heading">Institutional Terms & Conditions of Use</h4>
                  <p className="legal-hero-sub">
                    Governing rules, administrative ethics, and operational standards for faculty and staff.
                  </p>
                </div>
              </div>

              <div className="legal-section">
                <h5 className="legal-section-title">1. Authorized Access & Credential Integrity</h5>
                <p className="legal-text">
                  Access to VioTrack is granted exclusively to certified faculty, advisers, and school administrators. Users are strictly prohibited from sharing user credentials, leaving unattended open sessions on shared campus computers, or granting unauthorized third parties access to student conduct databases.
                </p>
              </div>

              <div className="legal-section">
                <h5 className="legal-section-title">2. Accuracy & Confidentiality of Infraction Logging</h5>
                <p className="legal-text">
                  All logged violations must represent factual, documented incidents. In accordance with the DepEd Child Protection Policy, student records must not be publicly disclosed, posted on social media, or discussed outside official guidance and disciplinary proceedings.
                </p>
              </div>

              <div className="legal-section">
                <h5 className="legal-section-title">3. Audit Logging & Accountability</h5>
                <p className="legal-text">
                  The system automatically logs administrative actions (including incident reporting, case resolutions, student profile edits, and export generation) with cryptographic user IDs and timestamps to maintain a tamper-evident audit trail.
                </p>
              </div>

              <div className="legal-section">
                <h5 className="legal-section-title">4. Prohibited Conduct</h5>
                <ul className="legal-list">
                  <li>Attempting to bypass role-based security permissions or Row Level Security (RLS) policies.</li>
                  <li>Extracting or mass exporting student records for non-institutional purposes.</li>
                  <li>Entering fraudulent, defamatory, or abusive entries into conduct logs.</li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 3: COOKIE & STORAGE POLICY */}
          {activeTab === 'cookies' && (
            <div className="legal-pane" tabIndex={0} role="tabpanel" aria-label="Cookie and Local Storage Policy">
              <div className="legal-hero-banner">
                <div className="legal-hero-icon-wrap">
                  <Database size={24} color="#3b82f6" />
                </div>
                <div>
                  <h4 className="legal-hero-heading">Cookie & Local Storage Disclosure</h4>
                  <p className="legal-hero-sub">
                    Transparency on browser storage, tracking technologies, and token persistence.
                  </p>
                </div>
              </div>

              <div className="legal-section">
                <h5 className="legal-section-title">1. No Third-Party Tracking or Ad Cookies</h5>
                <div className="legal-badge-notice">
                  <CheckCircle2 size={16} color="#16a34a" />
                  <span><strong>Zero Advertising Trackers:</strong> VioTrack does not utilize marketing cookies, behavioral tracking pixels (e.g. Meta Pixel, Google Ads), or sell telemetry data.</span>
                </div>
              </div>

              <div className="legal-section">
                <h5 className="legal-section-title">2. Strictly Essential Browser Storage</h5>
                <p className="legal-text">
                  VioTrack uses browser <code>localStorage</code> exclusively for essential portal functionalities:
                </p>
                <div className="legal-table-wrap">
                  <table className="legal-table">
                    <thead>
                      <tr>
                        <th>Storage Key</th>
                        <th>Type</th>
                        <th>Purpose</th>
                        <th>Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><code>sb-*-auth-token</code></td>
                        <td>Session Token</td>
                        <td>Maintains encrypted authentication with Supabase API</td>
                        <td>Until Logout</td>
                      </tr>
                      <tr>
                        <td><code>viotrack_active_role</code></td>
                        <td>Preference</td>
                        <td>Stores selected interface view (Admin vs Teacher)</td>
                        <td>Persistent</td>
                      </tr>
                      <tr>
                        <td><code>viotrack_cookie_consent</code></td>
                        <td>Compliance</td>
                        <td>Remembers your acknowledgment of essential storage</td>
                        <td>1 Year</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="legal-section">
                <h5 className="legal-section-title">3. Managing Local Storage</h5>
                <p className="legal-text">
                  You can clear local storage at any time via your browser settings. Note that clearing local storage will require you to log in again upon your next visit.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="legal-modal-footer">
          <div className="legal-footer-info">
            <Info size={14} />
            <span>Last Updated: October 2026 • VioTrack Institutional Conduct Portal</span>
          </div>
          <button
            type="button"
            className="legal-btn-close"
            onClick={onClose}
          >
            I Understand &amp; Agree
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default LegalModal;
