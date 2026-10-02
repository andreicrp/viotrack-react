import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dataService } from '../services/dataService';
import {
  Lock,
  ArrowRight,
  School,
  AlertCircle,
  ShieldCheck
} from 'lucide-react';
import '../css/student-id-card.css';

export const VerifyStudentPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [studentExists, setStudentExists] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If the scanning user is already authenticated as faculty/admin, direct them straight to the student file
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
        console.error('Error verifying student pass:', err);
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

  const containerStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100vw',
    height: '100vh',
    height: '100dvh',
    background: '#07345f',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 'max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) max(16px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left))',
    boxSizing: 'border-box',
    overflowY: 'auto',
    zIndex: 99999
  };

  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '36px', height: '36px', border: '3px solid rgba(255,255,255,0.2)', borderTopColor: '#38bdf8', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <span style={{ fontSize: '12px', color: '#93c5fd', fontWeight: 600 }}>Checking Student Pass...</span>
        </div>
      </div>
    );
  }

  if (!studentExists) {
    return (
      <div style={containerStyle}>
        <div style={{ background: '#ffffff', width: '100%', maxWidth: '380px', borderRadius: '20px', padding: '28px 20px', textAlign: 'center', boxShadow: '0 20px 30px rgba(0,0,0,0.35)' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <AlertCircle size={30} color="#dc2626" />
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>Invalid QR Pass</h2>
          <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 20px', lineHeight: 1.45 }}>
            This student pass is unindexed, expired, or not found in the school system.
          </p>
          <button
            type="button"
            onClick={() => navigate('/login')}
            style={{ width: '100%', padding: '12px', background: '#07345f', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
          >
            Go to Portal Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={{ width: '100%', maxWidth: '380px', background: '#ffffff', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)', margin: 'auto' }}>
        
        {/* Simple Header */}
        <div style={{ background: '#07345f', padding: '18px 16px', color: '#ffffff', textAlign: 'center', borderBottom: '3px solid #0ea5e9' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.12)', padding: '3px 10px', borderRadius: '16px', fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
            <School size={12} /> Official Student Pass
          </div>
          <h1 style={{ fontSize: '17px', fontWeight: 800, margin: 0, letterSpacing: '-0.01em' }}>VIOTRACK ACADEMY</h1>
        </div>

        {/* Clean, Simple Mobile Notification */}
        <div style={{ padding: '24px 20px' }}>
          
          {/* Centered Lock Icon & Badge */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '16px' }}>
            <div style={{ 
              width: '60px', 
              height: '60px', 
              borderRadius: '50%', 
              background: '#eff6ff', 
              border: '1.5px solid #bfdbfe',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              marginBottom: '10px'
            }}>
              <Lock size={28} color="#1d4ed8" />
            </div>
            
            <span style={{ display: 'inline-block', color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', padding: '3px 10px', borderRadius: '16px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
              Access Restricted
            </span>
            
            <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
              Student Information Protected
            </h2>
            <p style={{ fontSize: '12px', color: '#64748b', margin: 0, lineHeight: 1.45 }}>
              Student records are confidential under the Data Privacy Act (RA 10173) and inaccessible to public scanners.
            </p>
          </div>

          {/* Simple Info Note */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px 14px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldCheck size={20} color="#0284c7" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '11.5px', color: '#475569', lineHeight: 1.4 }}>
              Authorized faculty and staff must log in to view student records or file reports.
            </span>
          </div>

          {/* Action Button */}
          <button
            type="button"
            onClick={handleFacultyLogin}
            style={{
              width: '100%',
              padding: '13px',
              borderRadius: '10px',
              background: '#07345f',
              color: '#ffffff',
              border: 'none',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(7, 52, 95, 0.25)',
              transition: 'opacity 0.2s ease'
            }}
          >
            <span>Authorized Faculty Login</span>
            <ArrowRight size={15} />
          </button>
        </div>

        {/* Footer */}
        <div style={{ background: '#f8fafc', padding: '12px 16px', textAlign: 'center', fontSize: '10.5px', color: '#94a3b8', borderTop: '1px solid #e2e8f0' }}>
          VioTrack Security System • Encrypted Pass
        </div>
      </div>
    </div>
  );
};

export default VerifyStudentPage;
