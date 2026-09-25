import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../common/Modal';
import { dataService } from '../../services/dataService';
import { useNotification } from '../../context/NotificationContext';
import { UserPlus, Upload, Camera, Trash2, Image as ImageIcon, Check } from 'lucide-react';
import CustomSelect from '../common/CustomSelect';

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

  useEffect(() => {
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
    setFormData(prev => ({ ...prev, image: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.lrn || !formData.fname || !formData.lname) {
      error('Please complete all required fields (LRN, First Name, Last Name).');
      return;
    }

    setLoading(true);
    try {
      if (studentToEdit) {
        const updated = await dataService.updateStudent(studentToEdit.id, formData);
        success(`Student ${formData.fname} ${formData.lname} updated successfully!`);
        onSaved?.(updated);
      } else {
        const created = await dataService.addStudent({
          ...formData,
          image: formData.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(`${formData.fname} ${formData.lname}`)}&background=27367f&color=fff&size=100`
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

  const avatarUrl = formData.image || (formData.fname || formData.lname ? `https://ui-avatars.com/api/?name=${encodeURIComponent(`${formData.fname} ${formData.lname}`)}&background=27367f&color=fff&size=90` : 'https://ui-avatars.com/api/?name=Student&background=e2e8f0&color=64748b&size=90');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={studentToEdit ? 'Edit Student Details' : 'Register New Student'}
      icon={UserPlus}
      maxWidth="720px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ padding: '20px 24px', maxHeight: '72vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
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
              background: 'linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)',
              border: '1.5px solid #e0e7ff',
              borderRadius: '14px',
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '14px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: '240px' }}>
              <div
                style={{ position: 'relative', cursor: 'pointer' }}
                onClick={() => fileInputRef.current?.click()}
                title="Click to change / upload profile photo"
              >
                <img
                  src={avatarUrl}
                  alt="Avatar Preview"
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: '14px',
                    objectFit: 'cover',
                    border: '2px solid #27367f',
                    boxShadow: '0 4px 12px rgba(39, 54, 127, 0.18)',
                    display: 'block'
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    bottom: -4,
                    right: -4,
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: '#27367f',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                  }}
                >
                  <Camera size={12} />
                </div>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {formData.fname || formData.lname ? `${formData.fname} ${formData.mname ? formData.mname[0] + '. ' : ''}${formData.lname}` : 'Student Name Preview'}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  <span>LRN: <strong style={{ color: '#27367f' }}>{formData.lrn || 'Pending Input'}</strong></span>
                  <span>•</span>
                  <span>{formData.grade} - {formData.section || 'Section'}</span>
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
                  color: '#27367f',
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
                onMouseOver={(e) => { e.currentTarget.style.borderColor = '#27367f'; }}
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

          {/* Section 1: Identification & Academic */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#27367f', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#27367f' }} />
              1. Student Identification & Academic Placement
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">
                  Student LRN (12 Digits) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.lrn}
                  onChange={(e) => setFormData({ ...formData, lrn: e.target.value })}
                  placeholder="e.g. 109283746101"
                  maxLength={16}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
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
                <label className="form-label">
                  Class Section <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.section}
                  onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                  placeholder="e.g. Rizal, STEM A"
                  required
                />
              </div>
            </div>
          </div>

          {/* Section 2: Personal Information */}
          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#27367f', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#27367f' }} />
              2. Personal Details
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">
                  First Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.fname}
                  onChange={(e) => setFormData({ ...formData, fname: e.target.value })}
                  placeholder="First name"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Middle Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.mname}
                  onChange={(e) => setFormData({ ...formData, mname: e.target.value })}
                  placeholder="Middle name (optional)"
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Last Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.lname}
                  onChange={(e) => setFormData({ ...formData, lname: e.target.value })}
                  placeholder="Last name"
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginTop: '10px' }}>
              <div className="form-group">
                <label className="form-label">Gender</label>
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
                <label className="form-label">Student Contact Number</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.contact}
                  onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  placeholder="e.g. 09151234567"
                />
              </div>

              <div className="form-group">
                <label className="form-label">School Year</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.academicyear}
                  onChange={(e) => setFormData({ ...formData, academicyear: e.target.value })}
                  placeholder="2025-2026"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Parent / Guardian Info & Photo Upload Area */}
          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#27367f', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#27367f' }} />
                3. Guardian Information (For Automated SMS Alerts)
              </div>
              <span style={{ fontSize: '11px', fontWeight: 700, background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '2px 8px', borderRadius: '10px' }}>
                SMS Gateway Sync
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Parent / Guardian Full Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.parent_name}
                  onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
                  placeholder="e.g. Maria Santos"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Guardian Mobile Number (SMS Alerts)</label>
                <input
                  type="tel"
                  className="form-control"
                  value={formData.parent_contact}
                  onChange={(e) => setFormData({ ...formData, parent_contact: e.target.value })}
                  placeholder="e.g. 09156867789"
                />
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '10px' }}>
              <label className="form-label">Home Residential Address</label>
              <input
                type="text"
                className="form-control"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="House #, Street, Barangay, City / Municipality"
              />
            </div>

            {/* Photo Upload Zone */}
            <div className="form-group" style={{ marginTop: '14px' }}>
              <label className="form-label">Student Profile Picture</label>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${isDragging ? '#27367f' : '#cbd5e1'}`,
                  borderRadius: '12px',
                  padding: '16px 20px',
                  background: isDragging ? '#eef2ff' : '#f8fafc',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: '50%',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#27367f',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
                  }}
                >
                  <Upload size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                    Click to browse or drag & drop student photo
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
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
                  style={{ fontSize: '12px', padding: '7px 11px' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            <UserPlus size={15} />
            {loading ? 'Saving Student...' : studentToEdit ? 'Save Changes' : 'Register Student'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
