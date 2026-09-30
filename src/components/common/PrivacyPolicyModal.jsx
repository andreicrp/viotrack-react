import React from 'react';
import { Modal } from './Modal';
import '../../css/privacy-policy.css';

export const PrivacyPolicyModal = ({ isOpen, onClose }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Privacy Policy & Data Protection"
      maxWidth="620px"
    >
      <div className="privacy-content-container">
        {/* Hero Institutional Header */}
        <div className="privacy-hero-banner">
          <h4 className="privacy-hero-title">VioTrack Data Privacy & Student Protection</h4>
          <p className="privacy-hero-subtitle">
            Compliant with Republic Act No. 10173 (Data Privacy Act of 2012) and Department of Education (DepEd) Student Rights Guidelines.
          </p>
        </div>

        {/* Clause 1: Data Collection */}
        <div className="privacy-section-card">
          <div className="privacy-section-header">
            <span className="privacy-section-badge">Section 1</span>
            <h5 className="privacy-section-title">Information We Collect</h5>
          </div>
          <p className="privacy-section-body">
            VioTrack processes official student identification data strictly for educational administration and disciplinary monitoring:
          </p>
          <ul className="privacy-bullet-list">
            <li><strong>Student Identity:</strong> Learner Reference Number (LRN), Full Name, Grade Level, Section, Academic Track, and official badge photo.</li>
            <li><strong>Guardian Credentials:</strong> Parent/Guardian full name, active contact phone numbers, and emergency address.</li>
            <li><strong>Conduct & Disciplinary Records:</strong> Logged infractions, violation category, sanctions, timestamps, and resolution reports.</li>
            <li><strong>Location & QR Data:</strong> Verification timestamps and school campus location logging when QR scanning is executed.</li>
          </ul>
        </div>

        {/* Clause 2: Purpose & SMS Dispatch */}
        <div className="privacy-section-card">
          <div className="privacy-section-header">
            <span className="privacy-section-badge">Section 2</span>
            <h5 className="privacy-section-title">Purpose of Processing & Parent Alerts</h5>
          </div>
          <p className="privacy-section-body">
            Collected data is utilized solely for legitimate institutional purposes:
          </p>
          <ul className="privacy-bullet-list">
            <li>Immediate dispatch of automated SMS notices to parents/guardians regarding logged infractions.</li>
            <li>Tracking repeat offenses and determining appropriate guidance interventions or restorative sanctions.</li>
            <li>Generation of official Certificate of Good Moral Character and student conduct records.</li>
          </ul>
          <div className="privacy-highlight-box">
            Student records are never shared with third parties or advertisers and remain strictly confidential under institutional custody.
          </div>
        </div>

        {/* Clause 3: Access Control & Security */}
        <div className="privacy-section-card">
          <div className="privacy-section-header">
            <span className="privacy-section-badge">Section 3</span>
            <h5 className="privacy-section-title">Security & Role-Based Access Controls</h5>
          </div>
          <p className="privacy-section-body">
            We enforce strict security protocols to prevent unauthorized access or disclosure:
          </p>
          <ul className="privacy-bullet-list">
            <li><strong>Role-Based Access:</strong> Only authenticated school administrators, guidance personnel, and designated class advisers may access relevant records.</li>
            <li><strong>Audit Trails:</strong> All database queries, edits, and record additions are cryptographically logged with user identity and timestamps.</li>
            <li><strong>Encrypted Transmission:</strong> Data transmissions are encrypted via SSL/TLS protocols with secure token authentication.</li>
          </ul>
        </div>

        {/* Clause 4: Data Subject Rights */}
        <div className="privacy-section-card">
          <div className="privacy-section-header">
            <span className="privacy-section-badge">Section 4</span>
            <h5 className="privacy-section-title">Student & Parent Rights</h5>
          </div>
          <p className="privacy-section-body">
            In accordance with the Data Privacy Act, students and their authorized guardians have the right to:
          </p>
          <ul className="privacy-bullet-list">
            <li>Request a copy of the student's disciplinary and attendance history.</li>
            <li>Request correction or rectification of erroneous entries or unjustified records.</li>
            <li>File an appeal or schedule a guidance mediation conference before records are finalized.</li>
          </ul>
        </div>

        {/* DPO Contact Box */}
        <div className="privacy-dpo-box">
          <div className="privacy-dpo-info">
            <span className="privacy-dpo-label">Data Protection Officer (DPO)</span>
            <span className="privacy-dpo-email">privacy@viotrack.edu.ph</span>
          </div>
          <div style={{ fontSize: '11px', color: '#166534', fontWeight: 600 }}>
            Office of Guidance & Student Affairs
          </div>
        </div>
      </div>

      <div className="modal-footer" style={{ padding: '12px 20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
        <button
          type="button"
          className="btn btn-primary"
          onClick={onClose}
          style={{ background: '#07345f', borderColor: '#07345f', minWidth: '120px' }}
        >
          I Understand
        </button>
      </div>
    </Modal>
  );
};
