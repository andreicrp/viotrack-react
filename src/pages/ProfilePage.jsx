import React, { useState, useEffect } from 'react';
import { customAuth, supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
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
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  BadgeCheck,
  Building2,
  Upload,
  Fingerprint,
  FileText,
  Clock,
  Loader2
} from 'lucide-react';
import { LegalModal } from '../components/legal/LegalModal';
import { evaluatePasswordStrength, validateUploadedFile } from '../utils/security';
import '../css/profile.css';

export const ProfilePage = () => {
  const { user, setUser, logout, lockScreen } = useAuth();
  const { success, error } = useNotification();
  const navigate = useNavigate();

  // Split name if single field
  const nameParts = (user?.name || 'Sheryl Gamboa').trim().split(/\s+/);
  const initialFirst = nameParts[0] || 'Sheryl';
  const initialLast = nameParts.length > 1 ? nameParts[nameParts.length - 1] : 'Gamboa';
  const initialMiddle = nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : 'B.';

  const [activeTab, setActiveTab] = useState('general'); // 'general' | 'security' | 'permissions'
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);

  const [firstName, setFirstName] = useState(initialFirst);
  const [middleName, setMiddleName] = useState(initialMiddle);
  const [lastName, setLastName] = useState(initialLast);
  const [email, setEmail] = useState(user?.email || 'admin@viotrack.edu');
  const [phone, setPhone] = useState(user?.phone || user?.contact || '09171234567');
  const [department, setDepartment] = useState(user?.department || 'Prefect of Discipline & Guidance');
  const [employeeId] = useState(user?.id ? `ADM-2025-00${user.id}` : 'ADM-2025-001');
  const [role] = useState(user?.role || 'Admin');
  const [avatar, setAvatar] = useState(user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80');
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Synchronize state whenever active user updates
  useEffect(() => {
    if (user) {
      const parts = (user.name || '').trim().split(/\s+/);
      if (parts.length > 0 && parts[0]) setFirstName(parts[0]);
      if (parts.length > 1) setLastName(parts[parts.length - 1]);
      if (parts.length > 2) setMiddleName(parts.slice(1, -1).join(' '));
      if (user.email) setEmail(user.email);
      if (user.avatar) setAvatar(user.avatar);
      if (user.department) setDepartment(user.department);
      if (user.phone || user.contact) setPhone(user.phone || user.contact);
    }
  }, [user]);

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
      const val = validateUploadedFile(file, { isImageOnly: true });
      if (!val.valid) {
        error(val.error);
        return;
      }
      setSelectedFile(file);
      setSelectedFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        setAvatar(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const passwordEvaluation = evaluatePasswordStrength(newPassword);
  const passwordStrength = passwordEvaluation.percentage || 0;

  const handleSave = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setIsSaving(true);

    if (newPassword) {
      if (!passwordEvaluation.valid) {
        error('Password does not meet security requirements: ' + passwordEvaluation.errors.join(', '));
        setIsSaving(false);
        return;
      }
      if (newPassword !== confirmPassword) {
        error('New password and confirmation do not match.');
        setIsSaving(false);
        return;
      }

      try {
        await customAuth({
          action: 'change-password',
          currentPassword,
          newPassword
        });
      } catch (err) {
        error(err.message || 'Failed to update password.');
        setIsSaving(false);
        return;
      }
    }

    try {
      let finalAvatarUrl = avatar;

      // 1. If an image file was selected from user disk, upload to Supabase Storage via Edge Function
      if (selectedFile) {
        setIsUploading(true);
        try {
          const fileBase64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(selectedFile);
          });

          const uploadRes = await customAuth({
            action: 'upload-avatar',
            fileBase64,
            fileName: selectedFile.name,
            mimeType: selectedFile.type || 'image/png'
          });

          if (uploadRes?.url) {
            finalAvatarUrl = uploadRes.url;
            setAvatar(finalAvatarUrl);
          }
        } catch (uploadErr) {
          console.warn('Storage upload error, retaining direct avatar representation:', uploadErr);
          if (!finalAvatarUrl || !finalAvatarUrl.startsWith('http')) {
            finalAvatarUrl = avatar;
          }
        } finally {
          setIsUploading(false);
        }
      }

      // 2. Persist profile info to database and refresh session token
      const profileRes = await customAuth({
        action: 'update-profile',
        firstName,
        lastName,
        phone,
        department,
        avatarUrl: finalAvatarUrl
      });

      if (profileRes?.user) {
        setUser(profileRes.user);
        sessionStorage.setItem('viotrack_active_user', JSON.stringify(profileRes.user));
      } else {
        const fullName = `${firstName} ${middleName ? middleName + ' ' : ''}${lastName}`.trim();
        const updatedUser = {
          ...user,
          name: fullName,
          email,
          avatar: finalAvatarUrl,
          department,
          phone
        };
        setUser(updatedUser);
        sessionStorage.setItem('viotrack_active_user', JSON.stringify(updatedUser));
      }

      // 3. Fallback direct update to Supabase tables
      if (supabase && user?.id) {
        try {
          const table = user.role === 'admin' ? 'admins' : 'teachers';
          const directUpdates = {
            fname: firstName,
            lname: lastName,
            image: finalAvatarUrl
          };
          if (user.role === 'teacher') {
            if (phone) directUpdates.contact = phone;
            if (department) directUpdates.department = department;
          }

          await supabase.from(table).update(directUpdates).eq('id', user.id);
        } catch (dbErr) {
          console.warn('Direct database sync notice:', dbErr);
        }
      }

      setSelectedFile(null);
      setSelectedFileName('');
      success('Profile photo and account details updated successfully!');
      setNewPassword('');
      setConfirmPassword('');
      setCurrentPassword('');
    } catch (err) {
      error('Failed to update profile: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSaving(false);
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Discard all unsaved changes and reset form?')) {
      const parts = (user?.name || 'System Administrator').trim().split(/\s+/);
      setFirstName(parts[0] || initialFirst);
      setLastName(parts.length > 1 ? parts[parts.length - 1] : initialLast);
      setMiddleName(parts.length > 2 ? parts.slice(1, -1).join(' ') : initialMiddle);
      setEmail(user?.email || 'admin@viotrack.edu');
      setAvatar(user?.avatar || avatarPresets[0]);
      setSelectedFile(null);
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
        <div className="profile-hero-banner" />

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
              {isSaving ? (
                <>
                  <Loader2 size={14} className="spin-animation" style={{ animation: 'spin 1s linear infinite' }} />
                  {isUploading ? 'Uploading...' : 'Saving...'}
                </>
              ) : (
                <>
                  <Save size={14} /> Save Profile
                </>
              )}
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
                <Upload size={28} color="#07345f" strokeWidth={1.8} style={{ margin: '0 auto 8px', display: 'block' }} />
                <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>
                  Click to browse and upload image
                </div>
                <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                  PNG, JPG, WEBP up to 5MB
                </div>
                {selectedFileName && (
                  <span style={{ display: 'inline-block', marginTop: '8px', fontSize: '11.5px', fontWeight: 600, color: '#07345f', background: '#f0f4f8', padding: '3px 10px', borderRadius: '12px' }}>
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
                        onClick={() => {
                          setAvatar(imgUrl);
                          setSelectedFile(null);
                          setSelectedFileName('');
                        }}
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
              <div className="profile-password-guidance">
                <AlertCircle size={16} aria-hidden="true" />
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

            {/* Workstation Inactivity Auto-Lock Settings Card */}
            <div className="profile-card profile-inactivity-card">
              <div className="profile-card-header">
                <div className="profile-card-icon">
                  <Clock size={18} />
                </div>
                <div>
                  <h3 className="profile-card-title">
                    Workstation Inactivity Auto-Logout
                  </h3>
                  <p className="profile-card-subtitle">
                    Prevent unauthorized student access on unattended faculty workstations
                  </p>
                </div>
              </div>

              <div className="profile-inactivity-content">
                <p className="profile-inactivity-description">
                  Automatically signs out after 30 minutes without keyboard, mouse, or touch activity. This protects student records on unattended devices.
                </p>

                <div className="profile-inactivity-policy">
                  <div className="profile-inactivity-policy-copy">
                    <Shield size={16} />
                    <span>Current policy: automatic sign-out after 30 minutes idle</span>
                  </div>
                  <CheckCircle2 className="profile-inactivity-enabled" size={16} aria-label="Enabled" />
                </div>

                <div className="profile-inactivity-lock">
                  <div className="profile-inactivity-lock-copy">
                    <Shield size={16} />
                    <span>
                      Manual screen lock is also available
                    </span>
                  </div>
                  <button
                    type="button"
                    className="profile-lock-now"
                    onClick={() => {
                      success('Workstation manually locked.');
                      lockScreen();
                    }}
                  >
                    <Lock size={12} /> Lock Now
                  </button>
                </div>
              </div>
            </div>

            {/* Session & Account Security Overview Card */}
            <div className="profile-card profile-security-card">
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

              <div className="profile-security-rows">
                <div className="profile-security-row">
                  <span className="profile-security-label">Last Login Timestamp</span>
                  <strong className="profile-security-value">{new Date().toLocaleDateString()}</strong>
                </div>

                <div className="profile-security-row">
                  <span className="profile-security-label">Campus Subnet</span>
                  <strong className="profile-security-value">192.168.1.104</strong>
                </div>

                <div className="profile-security-row">
                  <span className="profile-security-label">Two-Factor Status</span>
                  <span className="profile-security-value profile-security-status">
                    <CheckCircle2 size={13} /> Active
                  </span>
                </div>

                <div className="profile-security-row">
                  <span className="profile-security-label">Token Status</span>
                  <strong className="profile-security-value profile-token-status">Valid (8 hours)</strong>
                </div>
              </div>

              <div className="profile-security-actions">
                <div className="profile-security-prompt">
                  Sign out of this account on your other campus devices.
                </div>
                <button
                  type="button"
                  className="profile-terminate-sessions"
                  onClick={async () => {
                    await logout('manual', 'global');
                    navigate('/login?logged_out=1');
                  }}
                >
                  Sign out all other sessions
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
                    border: '1px solid var(--border-subtle, #e2e8f0)',
                    background: 'var(--bg-surface-elevated, #f8fafc)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px'
                  }}
                >
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                    <Check size={15} />
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary, #0f172a)' }}>
                      {p.title}
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted, #64748b)', marginTop: '2px', lineHeight: 1.35 }}>
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
              {isSaving ? (
                <>
                  <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                  {isUploading ? 'Uploading...' : 'Saving...'}
                </>
              ) : (
                <>
                  <Save size={15} /> Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Footer links & copyright */}
      <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '12px', marginTop: '8px', paddingBottom: '6px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
        <button
          type="button"
          className="profile-legal-link"
          onClick={() => setIsPrivacyModalOpen(true)}
          style={{
            background: 'none',
            border: 'none',
            color: '#2563eb',
            fontWeight: 700,
            fontSize: '12px',
            cursor: 'pointer',
            textDecoration: 'underline'
          }}
        >
          View Legal &amp; Compliance Center (Privacy Policy, Terms of Service, Cookie &amp; Storage)
        </button>
        <span>VioTrack Student Conduct Portal • DepEd Compliant Academic System</span>
        <span>© 2026 VioTrack. All rights reserved.</span>
      </div>

      <LegalModal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
      />
    </div>
  );
};
