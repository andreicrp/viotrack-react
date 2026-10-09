import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../common/Modal';
import { dataService } from '../../services/dataService';
import { useNotification } from '../../context/NotificationContext';
import { UserPlus, Upload, Camera, Trash2, Image as ImageIcon, Check, ShieldCheck } from 'lucide-react';
import CustomSelect from '../common/CustomSelect';
import { SectionSelect } from '../common/SectionSelect';

const isJHSGrade = (gradeStr) => {
  const num = parseInt((gradeStr || '').replace(/\D/g, ''), 10);
  return num >= 7 && num <= 10;
};

const TRACK_OPTIONS = [
  { value: 'Academic Track', label: 'Academic Track' },
  { value: 'Technical-Vocational-Livelihood (TVL)', label: 'Technical-Vocational-Livelihood (TVL)' },
  { value: 'Sports Track', label: 'Sports Track' },
  { value: 'Arts & Design Track', label: 'Arts & Design Track' }
];

const STRAND_OPTIONS = [
  { value: 'STEM', label: 'STEM - Science, Tech, Engineering & Math' },
  { value: 'ABM', label: 'ABM - Accountancy, Business & Management' },
  { value: 'HUMSS', label: 'HUMSS - Humanities & Social Sciences' },
  { value: 'GAS', label: 'GAS - General Academic Strand' },
  { value: 'TVL - ICT', label: 'TVL - ICT (Computer Systems / Programming)' },
  { value: 'TVL - HE', label: 'TVL - Home Economics (Cookery / Tourism)' },
  { value: 'TVL - IA', label: 'TVL - Industrial Arts (SMAW / Automotive)' },
  { value: 'TVL - AFA', label: 'TVL - Agri-Fishery Arts' },
  { value: 'Sports', label: 'Sports Track' },
  { value: 'Arts & Design', label: 'Arts & Design Track' }
];

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
    track: 'JHS',
    strand: 'JHS',
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
  const [existingStudents, setExistingStudents] = useState([]);
  const [existingAdvisers, setExistingAdvisers] = useState([]);

  useEffect(() => {
    if (isOpen) {
      dataService.getStudents().then(res => setExistingStudents(res || [])).catch(() => {});
      dataService.getAdvisers().then(res => setExistingAdvisers(res || [])).catch(() => {});
    }
  }, [isOpen]);

  useEffect(() => {
    setPhotoFile(null);
    if (studentToEdit) {
      const g = studentToEdit.grade || 'Grade 10';
      const isJHS = isJHSGrade(g);
      setFormData({
        lrn: String(studentToEdit.student_id || studentToEdit.lrn || ''),
        fname: studentToEdit.fname || '',
        mname: studentToEdit.mname || '',
        lname: studentToEdit.lname || '',
        grade: g,
        track: isJHS ? 'JHS' : (studentToEdit.track || 'Academic Track'),
        strand: isJHS ? 'JHS' : (studentToEdit.strand || 'STEM'),
        section: studentToEdit.section || 'Rizal',
        academicyear: studentToEdit.academicyear || studentToEdit.academic_year || '2025-2026',
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
        track: 'JHS',
        strand: 'JHS',
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

  const handleGradeChange = (newGrade) => {
    const isJHS = isJHSGrade(newGrade);
    setFormData(prev => ({
      ...prev,
      grade: newGrade,
      track: isJHS ? 'JHS' : (prev.track === 'JHS' || !prev.track ? 'Academic Track' : prev.track),
      strand: isJHS ? 'JHS' : (prev.strand === 'JHS' || !prev.strand ? 'STEM' : prev.strand)
    }));
  };

  const handleTrackChange = (newTrack) => {
    let defaultStrand = formData.strand;
    if (newTrack.includes('TVL')) {
      if (!formData.strand || !formData.strand.startsWith('TVL')) defaultStrand = 'TVL - ICT';
    } else if (newTrack.includes('Sports')) {
      defaultStrand = 'Sports';
    } else if (newTrack.includes('Arts')) {
      defaultStrand = 'Arts & Design';
    } else {
      if (formData.strand?.startsWith('TVL') || formData.strand === 'Sports' || formData.strand === 'Arts & Design' || formData.strand === 'JHS') {
        defaultStrand = 'STEM';
      }
    }
    setFormData(prev => ({ ...prev, track: newTrack, strand: defaultStrand }));
  };

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
        const studentId = studentToEdit.id !== undefined && studentToEdit.id !== null
          ? studentToEdit.id
          : (studentToEdit.student_id || studentToEdit.lrn);

        const updated = await dataService.updateStudent(studentId, {
          ...formData,
          image: finalImageUrl
        });
        success(`Student ${formData.fname} ${formData.lname} updated successfully!`);
        onSaved?.(updated);
      } else {
        const created = await dataService.addStudent({
          ...formData,
          image: finalImageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(`${formData.fname} ${formData.lname}`)}&background=27367f&color=fff&size=100`
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

  const avatarUrl = formData.image || (formData.fname || formData.lname ? `https://ui-avatars.com/api/?name=${encodeURIComponent(`${formData.fname} ${formData.lname}`)}&background=0f172a&color=fff&size=90` : 'https://ui-avatars.com/api/?name=Student&background=e2e8f0&color=64748b&size=90');
  const isDarkMode = typeof document !== 'undefined' && (document.documentElement.getAttribute('data-theme') === 'dark' || document.body.classList.contains('dark-theme') || document.documentElement.classList.contains('dark'));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={studentToEdit ? 'Edit Student Details' : 'Register New Student'}
      icon={UserPlus}
      maxWidth="780px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <div className="smooth-scroll-container modal-body" style={{ padding: '20px 24px', flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
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
              background: 'var(--bg-surface-elevated, #f8fafc)',
              border: '1.5px solid var(--border-subtle, #e2e8f0)',
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
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: '14px',
                    objectFit: 'cover',
                    border: '2px solid var(--brand-blue, #0f172a)',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
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
                    background: 'var(--brand-blue, #0f172a)',
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
                <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary, #0f172a)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {formData.fname || formData.lname ? `${formData.fname} ${formData.mname ? formData.mname[0] + '. ' : ''}${formData.lname}` : 'Student Name Preview'}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', marginTop: '2px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  <span>Student ID: <strong style={{ color: 'var(--brand-blue, #0f172a)' }}>{formData.lrn || 'Pending'}</strong></span>
                  <span>•</span>
                  <span>{formData.grade} – {formData.section || 'Section'}</span>
                  <span>•</span>
                  <span>{isJHSGrade(formData.grade) ? 'JHS' : (formData.strand || 'SHS')}</span>
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
                  background: 'var(--bg-surface, #ffffff)',
                  color: 'var(--text-primary, #0f172a)',
                  border: '1.5px solid var(--border-subtle, #cbd5e1)',
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
            
            {/* Row 1: Student ID, Grade Level, Class Section */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '12px' }}>
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
                  onChange={(e) => handleGradeChange(e.target.value)}
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
                <SectionSelect
                  grade={formData.grade}
                  value={formData.section}
                  onChange={(val) => setFormData(prev => ({ ...prev, section: val }))}
                  students={existingStudents}
                  advisers={existingAdvisers}
                  placeholder="Select or type section name..."
                  required
                />
              </div>
            </div>

            {/* Row 2: Academic Track & Academic Strand */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '12.5px', fontWeight: 700, color: '#1e293b', marginBottom: '5px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Academic Track <span style={{ color: '#ef4444' }}>*</span></span>
                  {isJHSGrade(formData.grade) && (
                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#0369a1', background: '#eff6ff', padding: '1px 6px', borderRadius: '4px', border: '1px solid #bfdbfe' }}>
                      Auto (JHS)
                    </span>
                  )}
                </label>
                {isJHSGrade(formData.grade) ? (
                  <input
                    type="text"
                    className="form-control"
                    value="JHS"
                    disabled
                    readOnly
                    style={{ height: '40px', borderRadius: '9px', border: '1.5px solid #cbd5e1', padding: '0 12px', fontSize: '13px', width: '100%', boxSizing: 'border-box', background: '#f8fafc', color: '#475569', fontWeight: 700, cursor: 'not-allowed' }}
                  />
                ) : (
                  <CustomSelect
                    value={formData.track}
                    onChange={(e) => handleTrackChange(e.target.value)}
                    options={TRACK_OPTIONS}
                  />
                )}
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '12.5px', fontWeight: 700, color: '#1e293b', marginBottom: '5px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Academic Strand <span style={{ color: '#ef4444' }}>*</span></span>
                  {isJHSGrade(formData.grade) && (
                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#0369a1', background: '#eff6ff', padding: '1px 6px', borderRadius: '4px', border: '1px solid #bfdbfe' }}>
                      Auto (JHS)
                    </span>
                  )}
                </label>
                {isJHSGrade(formData.grade) ? (
                  <input
                    type="text"
                    className="form-control"
                    value="JHS"
                    disabled
                    readOnly
                    style={{ height: '40px', borderRadius: '9px', border: '1.5px solid #cbd5e1', padding: '0 12px', fontSize: '13px', width: '100%', boxSizing: 'border-box', background: '#f8fafc', color: '#475569', fontWeight: 700, cursor: 'not-allowed' }}
                  />
                ) : (
                  <CustomSelect
                    value={formData.strand}
                    onChange={(e) => setFormData(prev => ({ ...prev, strand: e.target.value }))}
                    options={STRAND_OPTIONS}
                  />
                )}
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
              <label className="form-label" style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary, #1e293b)', marginBottom: '5px', display: 'block' }}>
                Student Profile Picture
              </label>
              <div
                className="file-dropzone"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${isDragging ? 'var(--brand-blue, #0f172a)' : 'var(--border-medium, #cbd5e1)'}`,
                  borderRadius: '12px',
                  padding: '14px 18px',
                  background: isDragging ? 'var(--bg-surface-hover, #f1f5f9)' : 'var(--bg-surface-elevated, #f8fafc)',
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
                    background: 'var(--bg-surface, #ffffff)',
                    border: '1px solid var(--border-subtle, #e2e8f0)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--brand-blue, #0f172a)',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
                  }}
                >
                  <Upload size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary, #0f172a)' }}>
                    Click to browse or drag & drop student photo
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', marginTop: '1px' }}>
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
            background: 'var(--bg-surface-elevated, #f8fafc)',
            borderTop: '1px solid var(--border-subtle, #e2e8f0)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '11.5px',
            color: 'var(--text-muted, #475569)',
            lineHeight: 1.45
          }}
        >
          <div
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '6px',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <ShieldCheck size={14} color="#34d399" strokeWidth={2.5} />
          </div>
          <div style={{ flex: 1 }}>
            <span style={{ fontWeight: 700, color: 'var(--text-primary, #0f172a)' }}>Data Privacy Consent (RA 10173): </span>
            <span>By registering this student record, you certify that personal and contact details are collected strictly for legitimate academic administration, emergency guardian dispatch, and DepEd conduct records.</span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="add-modal-footer modal-footer" style={{ flexShrink: 0, padding: '14px 24px', borderTop: '1px solid var(--border-subtle, #e2e8f0)', background: 'var(--bg-surface, #f8fafc)', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-secondary modal-btn-secondary"
            onClick={onClose}
            disabled={loading}
            style={{
              padding: '9px 18px',
              borderRadius: '9px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary modal-btn-primary"
            disabled={loading}
            style={{
              padding: '9px 22px',
              borderRadius: '9px',
              fontWeight: 700,
              fontSize: '13px',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
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
