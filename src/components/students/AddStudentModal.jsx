import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../common/Modal';
import { dataService } from '../../services/dataService';
import { useNotification } from '../../context/NotificationContext';
import { UserPlus, Upload, Camera, Trash2, Image as ImageIcon, Check, ShieldCheck } from 'lucide-react';
import CustomSelect from '../common/CustomSelect';
import { getSafeAvatarUrl, handleAvatarError } from '../../utils/avatarHelper';

export const AddStudentModal = ({ isOpen, onClose, studentToEdit = null, onSaved }) => {
  const { success, error } = useNotification();
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const [formData, setFormData] = useState({
    lrn: '',
    fname: '',
    mname: '',
    lname: '',
    grade: 'Grade 10',
    section: 'Rizal',
    academicyear: '2025-2026',
    gender: 'Male',
    contact: '',
    parent_name: '',
    parent_contact: '',
    address: '',
    image: ''
  });

  const [photoFile, setPhotoFile] = useState(null);

  useEffect(() => {
    setPhotoFile(null);
    if (studentToEdit) {
      setFormData({
        lrn: studentToEdit.lrn || '',
        fname: studentToEdit.fname || '',
        mname: studentToEdit.mname || '',
        lname: studentToEdit.lname || '',
        grade: studentToEdit.grade || 'Grade 10',
        section: studentToEdit.section || 'Rizal',
        academicyear: studentToEdit.academicyear || '2025-2026',
        gender: studentToEdit.gender || 'Male',
        contact: studentToEdit.contact || '',
        parent_name: studentToEdit.parent_name || '',
        parent_contact: studentToEdit.parent_contact || '',
        address: studentToEdit.address || '',
        image: studentToEdit.image || ''
      });
    } else {
      setFormData({
        lrn: '',
        fname: '',
        mname: '',
        lname: '',
        grade: 'Grade 10',
        section: 'Rizal',
        academicyear: '2025-2026',
        gender: 'Male',
        contact: '',
        parent_name: '',
        parent_contact: '',
        address: '',
        image: ''
      });
    }
  }, [studentToEdit, isOpen]);

  // Image Upload Handler
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file) => {
    if (!file.type.startsWith('image/')) {
      error('Please select a valid image file (PNG, JPG, JPEG, WEBP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      error('File size exceeds 5MB limit. Please choose a smaller photo.');
      return;
    }

    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setFormData(prev => ({ ...prev, image: event.target.result }));
      success('Profile photo uploaded and preview updated!');
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleRemovePhoto = (e) => {
    e.stopPropagation();
    setPhotoFile(null);
    setFormData(prev => ({ ...prev, image: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.lrn || !formData.fname || !formData.lname) {
      error('Please complete all required fields (Student ID, First Name, Last Name).');
      return;
    }

    setLoading(true);
    try {
      let finalImageUrl = formData.image;
      if (photoFile) {
        const uploadedUrl = await dataService.uploadPhoto(photoFile, 'students');
        if (uploadedUrl) {
          finalImageUrl = uploadedUrl;
        }
      }

      if (studentToEdit) {
        const updated = await dataService.updateStudent(studentToEdit.id, {
          ...formData,
          image: finalImageUrl
        });
        success(`Student ${formData.fname} ${formData.lname} updated successfully!`);
        onSaved?.(updated);
      } else {
        const studentName = `${formData.fname} ${formData.lname}`.trim();
        const created = await dataService.addStudent({
          ...formData,
          image: finalImageUrl || getSafeAvatarUrl(null, studentName || 'Student')
        });
        success(`Student ${formData.fname} ${formData.lname} registered successfully!`);
        onSaved?.(created);
      }
      onClose();
    } catch (err) {
      error('Failed to save student: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const previewName = `${formData.fname} ${formData.lname}`.trim() || 'Student';
  const avatarUrl = getSafeAvatarUrl(formData.image, previewName);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={studentToEdit ? 'Edit Student Details' : 'Register New Student'}
      icon={UserPlus}
      maxWidth="780px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ padding: '20px 24px', maxHeight: '74vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Hidden File Input for Image Upload */}
          <input
            type="file"
            ref={fileInputRef}
            accept="image/png, image/jpeg, image/jpg, image/webp"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />

          {/* Top Live Student Preview Card & Quick Photo Upload */}
          <div
            style={{
              background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
              border: '1.5px solid #e2e8f0',
              borderRadius: '14px',
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '14px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: '220px' }}>
              <div
                style={{ position: 'relative', cursor: 'pointer' }}
                onClick={() => fileInputRef.current?.click()}
                title="Click to change / upload profile photo"
              >
                <img
                  src={avatarUrl}
                  alt="Avatar Preview"
                  onError={(e) => handleAvatarError(e, previewName)}
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: '14px',
                    objectFit: 'cover',
                    border: '2px solid #0f172a',
                    boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)',
                    display: 'block'
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    bottom: -3,
                    right: -3,
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: '#0f172a',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                  }}
                >
                  <Camera size={11} />
                </div>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {formData.fname || formData.lname ? `${formData.fname} ${formData.mname ? formData.mname[0] + '. ' : ''}${formData.lname}` : 'Student Name Preview'}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  <span>Student ID: <strong style={{ color: '#0f172a' }}>{formData.lrn || 'Pending'}</strong></span>
                  <span>•</span>
                  <span>{formData.grade} – {formData.section || 'Section'}</span>
                  <span>•</span>
                  <span>SY {formData.academicyear}</span>
                </div>
              </div>
            </div>

            {/* Quick Photo Upload & Reset Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  background: '#ffffff',
                  color: '#0f172a',
                  border: '1.5px solid #cbd5e1',
                  padding: '7px 13px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  transition: 'all 0.15s'
                }}
                onMouseOver={(e) => { e.currentTarget.style.borderColor = '#0f172a'; }}
                onMouseOut={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; }}
              >
                <Upload size={13} /> Upload Photo
              </button>

              {formData.image && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  style={{
                    background: '#fef2f2',
                    color: '#dc2626',
                    border: '1px solid #fecaca',
                    padding: '7px 10px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title="Remove custom photo and reset to default avatar"
                >
                  <Trash2 size={13} /> Reset
                </button>
              )}
            </div>
          </div>

          {/* Section 1: Identification & Academic Placement */}
          <div>
            <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#0f172a' }} />
              1. Academic Placement
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '12.5px', fontWeight: 700, color: '#1e293b', marginBottom: '5px', display: 'block' }}>
                  Student ID <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.lrn}
                  onChange={(e) => setFormData({ ...formData, lrn: e.target.value })}
                  placeholder="e.g. 109283746101"
                  maxLength={16}
                  required
                  style={{ height: '40px', borderRadius: '9px', border: '1.5px solid #cbd5e1', padding: '0 12px', fontSize: '13px', width: '100%', boxSizing: 'border-box' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '12.5px', fontWeight: 700, color: '#1e293b', marginBottom: '5px', display: 'block' }}>
                  Grade Level <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <CustomSelect
                  value={formData.grade}
                  onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                  options={[
                    { value: 'Grade 7', label: 'Grade 7' },
                    { value: 'Grade 8', label: 'Grade 8' },
                    { value: 'Grade 9', label: 'Grade 9' },
                    { value: 'Grade 10', label: 'Grade 10' },
                    { value: 'Grade 11', label: 'Grade 11' },
                    { value: 'Grade 12', label: 'Grade 12' },
                  ]}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '12.5px', fontWeight: 700, color: '#1e293b', marginBottom: '5px', display: 'block' }}>
                  Class Section <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.section}
                  onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                  placeholder="e.g. Rizal, STEM A"
                  required
                  style={{ height: '40px', borderRadius: '9px', border: '1.5px solid #cbd5e1', padding: '0 12px', fontSize: '13px', width: '100%', boxSizing: 'border-box' }}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Personal Information */}
          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
            <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#0f172a' }} />
              2. Personal Details
            </div>
            
            {/* Row 1: Name Breakdown */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '12.5px', fontWeight: 700, color: '#1e293b', marginBottom: '5px', display: 'block' }}>
                  First Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.fname}
                  onChange={(e) => setFormData({ ...formData, fname: e.target.value })}
                  placeholder="First name"
                  required
                  style={{ height: '40px', borderRadius: '9px', border: '1.5px solid #cbd5e1', padding: '0 12px', fontSize: '13px', width: '100%', boxSizing: 'border-box' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '12.5px', fontWeight: 700, color: '#1e293b', marginBottom: '5px', display: 'block' }}>
                  Middle Name
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.mname}
                  onChange={(e) => setFormData({ ...formData, mname: e.target.value })}
                  placeholder="Middle name (optional)"
                  style={{ height: '40px', borderRadius: '9px', border: '1.5px solid #cbd5e1', padding: '0 12px', fontSize: '13px', width: '100%', boxSizing: 'border-box' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '12.5px', fontWeight: 700, color: '#1e293b', marginBottom: '5px', display: 'block' }}>
                  Last Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.lname}
                  onChange={(e) => setFormData({ ...formData, lname: e.target.value })}
                  placeholder="Last name"
                  required
                  style={{ height: '40px', borderRadius: '9px', border: '1.5px solid #cbd5e1', padding: '0 12px', fontSize: '13px', width: '100%', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* Row 2: Demographics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginTop: '12px' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '12.5px', fontWeight: 700, color: '#1e293b', marginBottom: '5px', display: 'block' }}>
                  Gender
                </label>
                <CustomSelect
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  options={[
                    { value: 'Male', label: 'Male' },
                    { value: 'Female', label: 'Female' },
                  ]}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '12.5px', fontWeight: 700, color: '#1e293b', marginBottom: '5px', display: 'block' }}>
                  Student Contact Number
                </label>
                <input
                  type="tel"
                  className="form-control"
                  value={formData.contact}
                  onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  placeholder="e.g. 09151234567"
                  style={{ height: '40px', borderRadius: '9px', border: '1.5px solid #cbd5e1', padding: '0 12px', fontSize: '13px', width: '100%', boxSizing: 'border-box' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '12.5px', fontWeight: 700, color: '#1e293b', marginBottom: '5px', display: 'block' }}>
                  School Year
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.academicyear}
                  onChange={(e) => setFormData({ ...formData, academicyear: e.target.value })}
                  placeholder="2025-2026"
                  style={{ height: '40px', borderRadius: '9px', border: '1.5px solid #cbd5e1', padding: '0 12px', fontSize: '13px', width: '100%', boxSizing: 'border-box' }}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Guardian Details & Residential Address */}
          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#0f172a' }} />
                3. Guardian & Contact Info
              </div>
              <span style={{ fontSize: '11px', fontWeight: 700, background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '2px 8px', borderRadius: '10px' }}>
                SMS Gateway Sync
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '12.5px', fontWeight: 700, color: '#1e293b', marginBottom: '5px', display: 'block' }}>
                  Parent / Guardian Full Name
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.parent_name}
                  onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
                  placeholder="e.g. Maria Santos"
                  style={{ height: '40px', borderRadius: '9px', border: '1.5px solid #cbd5e1', padding: '0 12px', fontSize: '13px', width: '100%', boxSizing: 'border-box' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '12.5px', fontWeight: 700, color: '#1e293b', marginBottom: '5px', display: 'block' }}>
                  Guardian Mobile Number (SMS Alerts)
                </label>
                <input
                  type="tel"
                  className="form-control"
                  value={formData.parent_contact}
                  onChange={(e) => setFormData({ ...formData, parent_contact: e.target.value })}
                  placeholder="e.g. 09156867789"
                  style={{ height: '40px', borderRadius: '9px', border: '1.5px solid #cbd5e1', padding: '0 12px', fontSize: '13px', width: '100%', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '12px' }}>
              <label className="form-label" style={{ fontSize: '12.5px', fontWeight: 700, color: '#1e293b', marginBottom: '5px', display: 'block' }}>
                Home Residential Address
              </label>
              <input
                type="text"
                className="form-control"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="House #, Street, Barangay, City / Municipality"
                style={{ height: '40px', borderRadius: '9px', border: '1.5px solid #cbd5e1', padding: '0 12px', fontSize: '13px', width: '100%', boxSizing: 'border-box' }}
              />
            </div>

            {/* Photo Upload Zone */}
            <div className="form-group" style={{ marginTop: '14px' }}>
              <label className="form-label" style={{ fontSize: '12.5px', fontWeight: 700, color: '#1e293b', marginBottom: '5px', display: 'block' }}>
                Student Profile Picture
              </label>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${isDragging ? '#0f172a' : '#cbd5e1'}`,
                  borderRadius: '12px',
                  padding: '14px 18px',
                  background: isDragging ? '#f1f5f9' : '#f8fafc',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: '50%',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#0f172a',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
                  }}
                >
                  <Upload size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#0f172a' }}>
                    Click to browse or drag & drop student photo
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>
                    Supports PNG, JPG, JPEG, WEBP (Max 5MB)
                  </div>
                </div>
              </div>

              {/* Or Direct URL Input */}
              <div style={{ marginTop: '8px' }}>
                <input
                  type="text"
                  className="form-control"
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  placeholder="Or paste direct image URL (https://...)"
                  style={{ fontSize: '12px', padding: '8px 12px', height: '36px', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Data Privacy & DepEd Consent Notice */}
        <div
          style={{
            padding: '10px 24px',
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '11.5px',
            color: '#475569',
            lineHeight: 1.45
          }}
        >
          <div
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '6px',
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <ShieldCheck size={14} color="#059669" strokeWidth={2.5} />
          </div>
          <div style={{ flex: 1 }}>
            <span style={{ fontWeight: 700, color: '#0f172a' }}>Data Privacy Consent (RA 10173): </span>
            <span>By registering this student record, you certify that personal and contact details are collected strictly for legitimate academic administration, emergency guardian dispatch, and DepEd conduct records.</span>
          </div>
        </div>

        {/* Modal Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={loading}
            style={{
              padding: '9px 18px',
              borderRadius: '9px',
              fontWeight: 600,
              fontSize: '13px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#0f172a',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{
              padding: '9px 22px',
              borderRadius: '9px',
              fontWeight: 700,
              fontSize: '13px',
              background: '#0f172a',
              color: '#ffffff',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.25)'
            }}
          >
            <UserPlus size={15} />
            {loading ? 'Saving Student...' : studentToEdit ? 'Save Changes' : 'Register Student'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
