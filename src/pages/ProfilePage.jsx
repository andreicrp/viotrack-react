import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import {
  User,
  Mail,
  Phone,
  Shield,
  Lock,
  Camera,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  BadgeCheck,
  Building2,
  Upload,
  Check,
  Fingerprint
} from 'lucide-react';
import '../css/profile.css';

export const ProfilePage = () => {
  const { user, setUser } = useAuth();
  const { success, error } = useNotification();

  // Split name if single field
  const nameParts = (user?.name || 'Sheryl Gamboa').split(' ');
  const initialFirst = nameParts[0] || 'Sheryl';
  const initialLast = nameParts.length > 1 ? nameParts[nameParts.length - 1] : 'Gamboa';
  const initialMiddle = nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : 'B.';

  const [activeTab, setActiveTab] = useState('general'); // 'general' | 'security' | 'permissions'

  const [firstName, setFirstName] = useState(initialFirst);
  const [middleName, setMiddleName] = useState(initialMiddle);
  const [lastName, setLastName] = useState(initialLast);
  const [email, setEmail] = useState(user?.email || 'admin@viotrack.edu');
  const [phone, setPhone] = useState('09171234567');
  const [department, setDepartment] = useState('Prefect of Discipline & Guidance');
  const [employeeId] = useState('ADM-2025-001');
  const [role] = useState(user?.role || 'Admin');
  const [avatar, setAvatar] = useState(user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80');
  const [selectedFileName, setSelectedFileName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Security fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Avatar Presets
  const avatarPresets = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80'
  ];

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        error('Image size exceeds 5MB limit.');
        return;
      }
      setSelectedFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        setAvatar(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const calculatePasswordStrength = (pass) => {
    if (!pass) return 0;
    let score = 0;
    if (pass.length >= 6) score += 25;
    if (pass.length >= 10) score += 25;
    if (/[A-Z]/.test(pass)) score += 25;
    if (/[0-9!@#$%^&*]/.test(pass)) score += 25;
    return score;
  };

  const passwordStrength = calculatePasswordStrength(newPassword);

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    if (newPassword) {
      if (newPassword.length < 6) {
        error('Password must be at least 6 characters long.');
        setIsSaving(false);
        return;
      }
      if (newPassword !== confirmPassword) {
        error('New password and confirm password do not match.');
        setIsSaving(false);
        return;
      }
    }

    setTimeout(() => {
      const fullName = `${firstName} ${middleName ? middleName + ' ' : ''}${lastName}`.trim();
      setUser({
        ...user,
        name: fullName,
        email,
        avatar,
        role
      });

      success('Profile & security credentials updated successfully!');
      setNewPassword('');
      setConfirmPassword('');
      setCurrentPassword('');
      setIsSaving(false);
    }, 500);
  };

  const handleReset = () => {
    if (window.confirm('Discard all unsaved changes and reset form?')) {
      setFirstName(initialFirst);
      setMiddleName(initialMiddle);
      setLastName(initialLast);
      setEmail(user?.email || 'admin@viotrack.edu');
      setAvatar(user?.avatar || avatarPresets[0]);
      setSelectedFileName('');
      setNewPassword('');
      setConfirmPassword('');
      setCurrentPassword('');
    }
  };

  const displayName = `${firstName} ${lastName}`.trim() || user?.name || 'System Admin';

  return (
    <div className="profile-page-container">
      
      {/* 1. Hero Profile Banner Card */}
      <div className="profile-hero-card">
        {/* Cover Banner Image with Gradient */}
        <div className="profile-hero-banner">
          <span className="profile-banner-badge">
            Institutional Account
          </span>

          <div className="profile-banner-status">
            <span className="profile-status-dot" />
            Active Session Verified
          </div>
        </div>

        {/* Profile Info Overlay Row */}
        <div className="profile-hero-content">
          <div className="profile-hero-left">
            {/* Avatar with Ring & Edit Overlay */}
            <div className="profile-avatar-wrap">
              <img
                src={avatar}
                alt={displayName}
                className="profile-avatar-img"
                onError={(e) => {
                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=27367f&color=fff&size=150`;
                }}
              />
              <label
                htmlFor="profileImageUploadHeader"
                className="profile-avatar-edit-btn"
                title="Upload New Photo"
              >
                <Camera size={15} />
                <input
                  type="file"
                  id="profileImageUploadHeader"
                  accept="image/*"
                  onChange={handleImageChange}
                  style={{ display: 'none' }}
                />
              </label>
            </div>

            {/* User Meta Details */}
            <div className="profile-identity-info">
              <div className="profile-identity-title-row">
                <h1 className="profile-name-text">
                  {displayName}
                </h1>
                <BadgeCheck size={20} color="#2563eb" />
              </div>

              <div className="profile-identity-meta-row">
                <span className="profile-role-badge">
                  {role === 'admin' || role === 'Admin' ? 'System Administrator' : 'Faculty Adviser'}
                </span>
                <span className="profile-meta-item">
                  <Mail size={13} color="#94a3b8" /> {email}
                </span>
                <span className="profile-meta-item">
                  <Building2 size={13} color="#94a3b8" /> {department}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Header Action Buttons */}
          <div className="profile-hero-actions">
            <button
              type="button"
              onClick={handleReset}
              className="profile-action-btn secondary"
            >
              <RotateCcw size={14} /> Reset
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="profile-action-btn primary"
            >
              <Save size={14} /> {isSaving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </div>

        {/* Section Navigation Tabs */}
        <div className="profile-tabs-bar">
          {[
            { id: 'general', desktopLabel: 'General & Contact Info', mobileLabel: 'General', icon: User },
            { id: 'security', desktopLabel: 'Security & Password', mobileLabel: 'Security', icon: Lock },
            { id: 'permissions', desktopLabel: 'Role & Permissions', mobileLabel: 'Permissions', icon: Shield }
          ].map(t => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`profile-tab-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={16} />
                <span className="profile-tab-label-desktop">{t.desktopLabel}</span>
                <span className="profile-tab-label-mobile">{t.mobileLabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Main Profile Form Body */}
      <form onSubmit={handleSave}>
        {activeTab === 'general' && (
          <div className="profile-cards-grid">
            
            {/* Left Card: Basic Personal Information */}
            <div className="profile-card">
              <div className="profile-card-header">
                <div className="profile-card-icon">
                  <User size={18} />
                </div>
                <div>
                  <h3 className="profile-card-title">
                    Personal Information
                  </h3>
                  <p className="profile-card-subtitle">
                    Update your official staff identity details
                  </p>
                </div>
              </div>

              <div className="profile-form-row-2col">
                <div className="profile-form-group">
                  <label className="profile-form-label">
                    First Name <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="profile-input"
                  />
                </div>

                <div className="profile-form-group">
                  <label className="profile-form-label">
                    Middle Initial / Name
                  </label>
                  <input
                    type="text"
                    value={middleName}
                    onChange={(e) => setMiddleName(e.target.value)}
                    className="profile-input"
                  />
                </div>
              </div>

              <div className="profile-form-group">
                <label className="profile-form-label">
                  Last Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  className="profile-input"
                />
              </div>

              <div className="profile-form-group">
                <label className="profile-form-label">
                  Institutional Email Address <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div className="profile-input-wrap">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="profile-input with-icon-left"
                  />
                  <Mail size={16} className="profile-input-icon-left" />
                </div>
              </div>

              <div className="profile-form-row-2col">
                <div className="profile-form-group">
                  <label className="profile-form-label">
                    Contact Phone Number
                  </label>
                  <div className="profile-input-wrap">
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="profile-input with-icon-left"
                    />
                    <Phone size={16} className="profile-input-icon-left" />
                  </div>
                </div>

                <div className="profile-form-group">
                  <label className="profile-form-label">
                    Employee / Admin ID
                  </label>
                  <input
                    type="text"
                    value={employeeId}
                    disabled
                    className="profile-input"
                  />
                </div>
              </div>
            </div>

            {/* Right Card: Profile Photo & Presets */}
            <div className="profile-card">
              <div className="profile-card-header">
                <div className="profile-card-icon">
                  <Camera size={18} />
                </div>
                <div>
                  <h3 className="profile-card-title">
                    Profile Photo Management
                  </h3>
                  <p className="profile-card-subtitle">
                    Upload or select a verified staff avatar
                  </p>
                </div>
              </div>

              {/* Upload Drop Area */}
              <div
                className="profile-upload-dropzone"
                onClick={() => document.getElementById('profileImageUploadMain')?.click()}
              >
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#e0e7ff', color: '#27367f', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>
                  <Upload size={20} />
                </div>
                <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>
                  Click to browse and upload image
                </div>
                <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                  PNG, JPG, WEBP up to 5MB
                </div>
                {selectedFileName && (
                  <span style={{ display: 'inline-block', marginTop: '8px', fontSize: '11.5px', fontWeight: 600, color: '#27367f', background: '#eff6ff', padding: '3px 10px', borderRadius: '12px' }}>
                    ✓ {selectedFileName}
                  </span>
                )}
                <input
                  type="file"
                  id="profileImageUploadMain"
                  accept="image/*"
                  onChange={handleImageChange}
                  style={{ display: 'none' }}
                />
              </div>

              {/* Preset Avatars Selection */}
              <div>
                <label className="profile-form-label">
                  Or Choose from Verified Avatar Presets:
                </label>
                <div className="profile-presets-row">
                  {avatarPresets.map((imgUrl, index) => {
                    const isSelected = avatar === imgUrl;
                    return (
                      <div
                        key={index}
                        onClick={() => { setAvatar(imgUrl); setSelectedFileName(''); }}
                        className={`profile-preset-box ${isSelected ? 'selected' : ''}`}
                      >
                        <img src={imgUrl} alt="Preset" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        {isSelected && (
                          <div className="profile-preset-check">
                            <Check size={18} color="#ffffff" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Department Info */}
              <div className="profile-form-group">
                <label className="profile-form-label">
                  Office / Academic Department
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="profile-input"
                />
              </div>
            </div>

          </div>
        )}

        {activeTab === 'security' && (
          <div className="profile-cards-grid">
            
            {/* Password Update Card */}
            <div className="profile-card">
              <div className="profile-card-header">
                <div className="profile-card-icon red">
                  <Lock size={18} />
                </div>
                <div>
                  <h3 className="profile-card-title">
                    Password Credentials
                  </h3>
                  <p className="profile-card-subtitle">
                    Leave blank to keep your current password
                  </p>
                </div>
              </div>

              {/* Info Banner */}
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '10px 12px', fontSize: '12px', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} color="#2563eb" style={{ flexShrink: 0 }} />
                <span>Password should be at least 6 characters long.</span>
              </div>

              {/* Current Password */}
              <div className="profile-form-group">
                <label className="profile-form-label">
                  Current Password
                </label>
                <div className="profile-input-wrap">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password..."
                    className="profile-input with-icon-right"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="profile-input-icon-right-btn"
                  >
                    {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="profile-form-group">
                <label className="profile-form-label">
                  New Password
                </label>
                <div className="profile-input-wrap">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password..."
                    className="profile-input with-icon-right"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="profile-input-icon-right-btn"
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Password Strength Meter */}
                {newPassword && (
                  <div style={{ marginTop: '6px' }}>
                    <div style={{ height: '5px', borderRadius: '4px', background: '#e2e8f0', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${passwordStrength}%`,
                          background: passwordStrength <= 25 ? '#ef4444' : passwordStrength <= 75 ? '#f59e0b' : '#10b981',
                          transition: 'all 0.3s ease'
                        }}
                      />
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: passwordStrength <= 25 ? '#ef4444' : passwordStrength <= 75 ? '#d97706' : '#15803d', marginTop: '3px' }}>
                      Strength: {passwordStrength <= 25 ? 'Weak' : passwordStrength <= 75 ? 'Moderate' : 'Strong Password'}
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="profile-form-group">
                <label className="profile-form-label">
                  Confirm New Password
                </label>
                <div className="profile-input-wrap">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-type new password..."
                    className="profile-input with-icon-right"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="profile-input-icon-right-btn"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Session & Account Security Overview Card */}
            <div className="profile-card">
              <div className="profile-card-header">
                <div className="profile-card-icon">
                  <Fingerprint size={18} />
                </div>
                <div>
                  <h3 className="profile-card-title">
                    Session & Security Audit
                  </h3>
                  <p className="profile-card-subtitle">
                    Active authentication health overview
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 12px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
                  <span style={{ color: '#64748b' }}>Last Login Timestamp:</span>
                  <strong style={{ color: '#0f172a' }}>{new Date().toLocaleDateString()}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 12px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
                  <span style={{ color: '#64748b' }}>Campus Subnet:</span>
                  <strong style={{ color: '#0f172a' }}>192.168.1.104</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 12px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
                  <span style={{ color: '#64748b' }}>Two-Factor Status:</span>
                  <span style={{ color: '#16a34a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={13} /> Active
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 12px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
                  <span style={{ color: '#64748b' }}>Token Status:</span>
                  <strong style={{ color: '#27367f' }}>Valid (8 Hours)</strong>
                </div>
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  Need to log out from all other campus devices?
                </div>
                <button
                  type="button"
                  onClick={() => success('All other remote browser sessions terminated.')}
                  style={{
                    marginTop: '8px',
                    width: '100%',
                    background: '#fef2f2',
                    color: '#dc2626',
                    border: '1px solid #fecaca',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Terminate All Other Active Sessions
                </button>
              </div>
            </div>

          </div>
        )}

        {activeTab === 'permissions' && (
          <div className="profile-card">
            <div className="profile-card-header">
              <div className="profile-card-icon">
                <Shield size={18} />
              </div>
              <div>
                <h3 className="profile-card-title">
                  System Role & Institutional Privileges
                </h3>
                <p className="profile-card-subtitle">
                  Overview of access permissions granted to your account
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
              {[
                { title: 'Student Directory & Records', desc: 'Add, update, search, and export official student masterlist files.' },
                { title: 'QR Disciplinary Tracking', desc: 'Scan student badges and log campus disciplinary infractions.' },
                { title: 'SMS Guardian Dispatcher', desc: 'Send automated real-time SMS notices to registered guardian phone numbers.' },
                { title: 'Case Resolution & Sanctions', desc: 'Render disciplinary verdicts and print incident reports.' },
                { title: 'Faculty & Adviser Registry', desc: 'Assign class sections and manage teacher credentials.' },
                { title: 'Activity & Audit Logging', desc: 'View chronological system audit trails.' }
              ].map((p, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '14px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    background: '#f8fafc',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px'
                  }}
                >
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                    <Check size={15} />
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                      {p.title}
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px', lineHeight: 1.35 }}>
                      {p.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Floating / Sticky Save Footer Action Bar */}
        <div className="profile-bottom-actions-bar">
          <div style={{ fontSize: '12.5px', color: '#64748b' }}>
            All modifications are logged for institutional audit security.
          </div>

          <div style={{ display: 'flex', gap: '10px', width: '100%', maxWidth: '360px' }}>
            <button
              type="button"
              onClick={handleReset}
              className="profile-action-btn secondary"
              style={{ flex: 1 }}
            >
              <RotateCcw size={14} /> Discard
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="profile-action-btn primary"
              style={{ flex: 1.5 }}
            >
              <Save size={15} /> {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </form>

      {/* Footer copyright */}
      <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '12px', marginTop: '6px', paddingBottom: '16px' }}>
        © 2026 VioTrack • Perpetual Help College of Manila. All rights reserved.
      </div>
    </div>
  );
};
