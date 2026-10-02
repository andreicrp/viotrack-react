import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dataService } from '../services/dataService';
import {
  ShieldCheck,
  Lock,
  ArrowRight,
  School,
  AlertCircle,
  ShieldAlert,
  KeyRound
} from 'lucide-react';
import '../css/student-id-card.css';

export const VerifyStudentPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [studentExists, setStudentExists] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If the scanning user is already authenticated as faculty/admin, direct them straight to the disciplinary file
    if (isAuthenticated && user) {
      navigate(`/student-violation/${id}?scan=true`, { replace: true });
      return;
    }

    const verifyStudentExistence = async () => {
      try {
        const allStudents = await dataService.getStudents();
        const found = allStudents.some(s => String(s.id) === String(id) || String(s.lrn) === String(id));
        setStudentExists(found);
      } catch (err) {
        console.error('Error verifying student ID pass:', err);
        setStudentExists(false);
      } finally {
        setLoading(false);
      }
    };

    verifyStudentExistence();
  }, [id, isAuthenticated, user, navigate]);

  const handleFacultyLogin = () => {
    navigate(`/login?redirect=${encodeURIComponent(`/student-violation/${id}?scan=true`)}&reason=qr_protected`);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0b192c', color: '#ffffff' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '44px', height: '44px', border: '3px solid rgba(255,255,255,0.2)', borderTopColor: '#38bdf8', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 600, letterSpacing: '0.02em' }}>Verifying Official Security Pass...</span>
        </div>
      </div>
    );
  }

  if (!studentExists) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(145deg, #0b192c 0%, #030712 100%)', padding: '20px 16px' }}>
        <div style={{ background: '#ffffff', maxWidth: '440px', width: '100%', borderRadius: '24px', padding: '36px 24px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <AlertCircle size={36} color="#dc2626" />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>Unrecognized QR Pass</h2>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 24px', lineHeight: 1.5 }}>
            This student QR pass is invalid, expired, or not registered in the institutional registry.
          </p>
          <button
            type="button"
            onClick={() => navigate('/login')}
            style={{ width: '100%', padding: '13px', background: '#07345f', color: '#ffffff', border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '13.5px', cursor: 'pointer' }}
          >
            Go to Portal Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(145deg, #07345f 0%, #031b33 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: '460px', width: '100%', background: '#ffffff', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)' }}>
        
        {/* Top Official Header */}
        <div style={{ background: '#07345f', padding: '22px 24px', color: '#ffffff', textAlign: 'center', borderBottom: '3px solid #0ea5e9' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.12)', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '10px' }}>
            <School size={13} /> Official Student Security Pass
          </div>
          <h1 style={{ fontSize: '19px', fontWeight: 800, margin: '0 0 3px', letterSpacing: '-0.01em' }}>VIOTRACK ACADEMY</h1>
          <p style={{ margin: 0, fontSize: '12px', color: '#93c5fd', fontWeight: 500 }}>Institutional Identification & Record System</p>
        </div>

        {/* Confidential / Restricted Access Notification Body */}
        <div style={{ padding: '28px 24px' }}>
          {/* Security Shield Icon */}
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={{ 
              width: '72px', 
              height: '72px', 
              borderRadius: '50%', 
              background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', 
              border: '2px solid #bfdbfe',
              display: 'inline-flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              boxShadow: '0 10px 20px -5px rgba(37, 99, 235, 0.15)',
              marginBottom: '14px'
            }}>
              <Lock size={34} color="#1d4ed8" />
            </div>
            
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', padding: '4px 12px', borderRadius: '20px', fontSize: '11.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '10px' }}>
              <ShieldAlert size={13} /> Access Restricted
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
              Student Information Protected
            </h2>
            <p style={{ fontSize: '12.5px', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
              This student pass is registered and verified, but information is confidential and not accessible to unauthorized persons.
            </p>
          </div>

          {/* Data Privacy & Compliance Notice Card */}
          <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '16px', padding: '16px', marginBottom: '22px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
              <div style={{ background: '#eff6ff', padding: '8px', borderRadius: '10px', color: '#2563eb', flexShrink: 0 }}>
                <ShieldCheck size={18} />
              </div>
              <div>
                <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#1e293b' }}>
                  Data Privacy Act of 2012 (RA 10173)
                </div>
                <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px', lineHeight: 1.45 }}>
                  In strict compliance with student privacy laws, personal identities, photos, grades, and disciplinary records are completely withheld from public view.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
              <div style={{ background: '#f0fdf4', padding: '8px', borderRadius: '10px', color: '#16a34a', flexShrink: 0 }}>
                <KeyRound size={18} />
              </div>
              <div>
                <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#1e293b' }}>
                  Authorized Personnel Access Only
                </div>
                <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px', lineHeight: 1.45 }}>
                  Only verified teachers, advisers, and school administrators with active institutional credentials can view this student's profile and records.
                </div>
              </div>
            </div>
          </div>

          {/* Action Button to Faculty Portal */}
          <button
            type="button"
            onClick={handleFacultyLogin}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '12px',
              background: '#07345f',
              color: '#ffffff',
              border: 'none',
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(7, 52, 95, 0.3)',
              transition: 'all 0.2s ease'
            }}
          >
            <span>Authorized Faculty & Admin Login</span>
            <ArrowRight size={16} />
          </button>
        </div>

        {/* Card Footer */}
        <div style={{ background: '#f1f5f9', padding: '14px 24px', textAlign: 'center', fontSize: '11px', color: '#64748b', borderTop: '1px solid #e2e8f0' }}>
          🔒 VioTrack Student Monitoring & ID Security Verification System
        </div>
      </div>
    </div>
  );
};

export default VerifyStudentPage;
