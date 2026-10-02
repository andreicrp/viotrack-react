import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dataService } from '../services/dataService';
import {
  ShieldCheck,
  Lock,
  ArrowRight,
  GraduationCap,
  Calendar,
  School,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import '../css/student-id-card.css';

export const VerifyStudentPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If the scanning user is already authenticated as faculty/admin, direct them straight to the disciplinary file
    if (isAuthenticated && user) {
      navigate(`/student-violation/${id}?scan=true`, { replace: true });
      return;
    }

    const fetchStudent = async () => {
      try {
        const allStudents = await dataService.getStudents();
        const found = allStudents.find(s => String(s.id) === String(id) || String(s.lrn) === String(id));
        setStudent(found || null);
      } catch (err) {
        console.error('Error verifying student ID pass:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStudent();
  }, [id, isAuthenticated, user, navigate]);

  const handleFacultyLogin = () => {
    navigate(`/login?redirect=${encodeURIComponent(`/student-violation/${id}?scan=true`)}&reason=qr_protected`);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid #cbd5e1', borderTopColor: '#07345f', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Verifying Official Student ID Pass...</span>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: '16px' }}>
        <div style={{ background: '#ffffff', maxWidth: '440px', width: '100%', borderRadius: '20px', padding: '32px 24px', textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.08)' }}>
          <AlertCircle size={48} color="#ef4444" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>Unrecognized Student QR Pass</h2>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 24px', lineHeight: 1.5 }}>
            This QR code is either invalid, unindexed, or expired. Please contact the guidance office.
          </p>
          <button
            type="button"
            onClick={() => navigate('/login')}
            style={{ width: '100%', padding: '12px', background: '#07345f', color: '#ffffff', border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
          >
            Go to Portal Login
          </button>
        </div>
      </div>
    );
  }

  const fullName = `${student.lname?.toUpperCase()}, ${student.fname} ${student.mname ? student.mname[0] + '.' : ''}`;
  const avatarUrl = student.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(student.fname + ' ' + student.lname)}&background=07345f&color=fff&size=200&bold=true`;

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(145deg, #07345f 0%, #031b33 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 16px', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: '460px', width: '100%', background: '#ffffff', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)' }}>
        
        {/* Top Official School Band */}
        <div style={{ background: '#07345f', padding: '20px 24px', color: '#ffffff', textAlign: 'center', borderBottom: '3px solid #0ea5a0' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.12)', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '8px' }}>
            <School size={13} /> Official Student Pass
          </div>
          <h1 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 2px', letterSpacing: '-0.01em' }}>VIOTRACK ACADEMY</h1>
          <p style={{ margin: 0, fontSize: '12px', opacity: 0.85 }}>Verified Digital Identification Badge</p>
        </div>

        {/* Student Card Body */}
        <div style={{ padding: '24px' }}>
          <div style={{ display: 'flex', gap: '18px', alignItems: 'center', marginBottom: '20px' }}>
            <img
              src={avatarUrl}
              alt={fullName}
              style={{ width: '90px', height: '90px', borderRadius: '18px', objectFit: 'cover', border: '2px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
              onError={(e) => {
                e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(student.fname + ' ' + student.lname)}&background=07345f&color=fff&size=200&bold=true`;
              }}
            />
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#16a34a', background: '#dcfce7', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, marginBottom: '6px' }}>
                <CheckCircle2 size={12} /> Active Enrolled Student
              </div>
              <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>{fullName}</h2>
              <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>
                {student.grade} • Section {student.section}
              </div>
              <div style={{ fontSize: '12px', color: '#07345f', fontWeight: 700, marginTop: '2px' }}>
                LRN: {student.lrn}
              </div>
            </div>
          </div>

          {/* Academic Info Grid */}
          <div style={{ background: '#f8fafc', borderRadius: '14px', padding: '14px', border: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={16} color="#07345f" />
              <div>
                <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>School Year</div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>{student.academicyear || '2025–2026'}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <GraduationCap size={16} color="#07345f" />
              <div>
                <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Program Track</div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>{student.track || 'Academic Strand'}</div>
              </div>
            </div>
          </div>

          {/* RA 10173 Confidentiality & Security Shield */}
          <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: '14px', padding: '14px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <Lock size={18} color="#2563eb" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#1e40af' }}>
                  Disciplinary Records Are Protected
                </div>
                <div style={{ fontSize: '11.5px', color: '#3b82f6', marginTop: '2px', lineHeight: 1.4 }}>
                  In compliance with RA 10173 (Data Privacy Act), confidential violation histories are restricted to authorized faculty and discipline personnel.
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
        <div style={{ background: '#f1f5f9', padding: '12px 24px', textAlign: 'center', fontSize: '11px', color: '#64748b', borderTop: '1px solid #e2e8f0' }}>
          VioTrack Student Monitoring & ID Security Verification System
        </div>
      </div>
    </div>
  );
};

export default VerifyStudentPage;
