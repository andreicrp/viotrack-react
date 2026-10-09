import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert } from 'lucide-react';
import '../css/login.css';

export const VerifyStudentPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(`/student-violation/${id}`, { replace: true });
    } else {
      navigate(`/login?redirect=${encodeURIComponent(`/student-violation/${id}`)}&reason=qr_protected`, { replace: true });
    }
  }, [id, isAuthenticated, user, navigate]);

  return (
    <div className="login-body-bg">
      {/* Background Ambient Corner Accents */}
      <div className="login-bg-shape-top-left" />
      <div className="login-bg-shape-bottom-right" />

      <div className="login-content-wrapper">
        {/* Brand Header with Official VioTrack Logo */}
        <div className="login-brand-header">
          <svg
            className="login-brand-logo-svg"
            viewBox="0 0 500 370"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g>
              <circle cx="195" cy="96" r="30" fill="#07345F" />
              <path
                d="M 120 105 Q 108 96 110 110 L 122 206 Q 124 214 132 222 L 235 324 Q 243 332 243 320 L 243 202 Q 243 194 235 188 Z"
                fill="#07345F"
              />
            </g>
            <g>
              <circle cx="305" cy="96" r="30" fill="#07345F" />
              <path
                d="M 380 105 Q 392 96 390 110 L 378 206 Q 376 214 368 222 L 265 324 Q 257 332 257 320 L 257 202 Q 257 194 265 188 Z"
                fill="#0EA5A0"
              />
            </g>
          </svg>

          <h1 className="login-brand-title">VIOTRACK</h1>
          <p className="login-brand-tagline">
            A Student Violation Tracking and Monitoring System
            <span className="login-brand-tagline-sub">Using QR Code and Dashboard</span>
          </p>
        </div>

        {/* Protected Academic QR Code Notice */}
        <div
          className="login-qr-protected-banner"
          style={{
            background: '#eff6ff',
            color: '#1e40af',
            border: '1.5px solid #bfdbfe',
            padding: '14px 16px',
            borderRadius: '14px',
            fontSize: '12.5px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '16px',
            width: '100%',
            boxSizing: 'border-box'
          }}
        >
          <ShieldAlert size={22} className="login-qr-protected-icon" color="#2563eb" style={{ flexShrink: 0 }} />
          <div>
            <div className="login-qr-protected-title" style={{ fontWeight: 700, fontSize: '13px' }}>🔒 Protected Academic QR Code</div>
            <div className="login-qr-protected-subtitle" style={{ fontSize: '11.5px', fontWeight: 500, marginTop: '3px', color: '#3b82f6', lineHeight: 1.4 }}>
              You must sign in to an authorized school faculty or administrator account to scan this student record.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyStudentPage;
