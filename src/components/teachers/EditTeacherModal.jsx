import React, { useState, useEffect, useRef } from 'react';
import { GraduationCap, X, Save, Eye, EyeOff, User, Mail, Building, Upload, Camera, Trash2 } from 'lucide-react';
import CustomSelect from '../common/CustomSelect';

export const EditTeacherModal = ({ isOpen, onClose, teacher, onSaved }) => {
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    fname: '',
    mname: '',
    lname: '',
    email: '',
    position: 'Teacher',
    department: 'Junior High Faculty',
    contact: '',
    password: '',
    image: ''
  });

  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (teacher) {
      setFormData({
        fname: teacher.fname || '',
        mname: teacher.mname || '',
        lname: teacher.lname || '',
        email: teacher.email || '',
        position: teacher.position || 'Teacher I',
        department: teacher.department || 'Junior High Faculty',
        contact: teacher.contact || '',
        password: '',
        image: teacher.image || ''
      });
    } else {
      setFormData({
        fname: '',
        mname: '',
        lname: '',
        email: '',
        position: 'Teacher I',
        department: 'Junior High Faculty',
        contact: '',
        password: '',
        image: ''
      });
    }
  }, [teacher, isOpen]);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData(prev => ({ ...prev, image: event.target.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.fname.trim() || !formData.lname.trim() || !formData.email.trim()) {
      return;
    }
    onSaved?.({
      ...teacher,
      ...formData,
      image: formData.image || teacher?.image || ''
    });
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 3000,
        padding: '20px'
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '18px',
          width: '100%',
          maxWidth: '560px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.3)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          animation: 'fadeInUp 0.2s ease-out'
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '20px 24px',
            borderBottom: '1px solid #f1f5f9',
            background: '#ffffff'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '10px',
                background: '#e0e7ff',
                color: '#4338ca',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <GraduationCap size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px' }}>
                {teacher ? 'Edit Faculty Teacher' : 'Add New Faculty Teacher'}
              </h3>
              <span style={{ fontSize: '12.5px', color: '#64748b' }}>
                Teacher credentials, department & advisory profile
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: '8px',
              border: 'none',
              background: '#f1f5f9',
              color: '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s'
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#0f172a'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#64748b'; }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '70vh', overflowY: 'auto' }}>
            
            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleImageChange}
              style={{ display: 'none' }}
            />

            {/* Avatar Preview & Upload Banner */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: '#f8fafc',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img
                  src={
                    formData.image ||
                    (formData.fname
                      ? `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.fname + ' ' + formData.lname)}&background=27367f&color=fff&size=80`
                      : 'https://ui-avatars.com/api/?name=Teacher&background=e2e8f0&color=64748b&size=80')
                  }
                  alt="Faculty Photo"
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: '12px',
                    objectFit: 'cover',
                    border: '2px solid #27367f',
                    flexShrink: 0
                  }}
                />
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>
                    {formData.fname ? `${formData.fname} ${formData.lname}` : 'Faculty Profile Picture'}
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                    JPG, PNG, or WEBP (Max 5MB)
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    background: '#ffffff',
                    color: '#27367f',
                    border: '1.5px solid #cbd5e1',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <Upload size={13} /> Upload Photo
                </button>
                {formData.image && (
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, image: '' }))}
                    style={{
                      background: '#fef2f2',
                      color: '#dc2626',
                      border: '1px solid #fecaca',
                      padding: '6px 10px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                    title="Reset photo"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* First & Last Name */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  First Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Juan"
                  value={formData.fname}
                  onChange={(e) => setFormData({ ...formData, fname: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '9px', border: '1.5px solid #cbd5e1', fontSize: '13.5px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Last Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dela Cruz"
                  value={formData.lname}
                  onChange={(e) => setFormData({ ...formData, lname: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '9px', border: '1.5px solid #cbd5e1', fontSize: '13.5px', outline: 'none' }}
                />
              </div>
            </div>

            {/* Email & Contact */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Institutional Email <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="juan.delacruz@phcmanila.edu.ph"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '9px', border: '1.5px solid #cbd5e1', fontSize: '13.5px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Contact Number
                </label>
                <input
                  type="text"
                  placeholder="09171234567"
                  value={formData.contact}
                  onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '9px', border: '1.5px solid #cbd5e1', fontSize: '13.5px', outline: 'none' }}
                />
              </div>
            </div>

            {/* Academic Position & Department */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Academic Position
                </label>
                <CustomSelect
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  options={[
                    { value: 'Teacher I', label: 'Teacher I' },
                    { value: 'Teacher II', label: 'Teacher II' },
                    { value: 'Teacher III', label: 'Teacher III' },
                    { value: 'Master Teacher I', label: 'Master Teacher I' },
                    { value: 'Master Teacher II', label: 'Master Teacher II' },
                    { value: 'Department Head', label: 'Department Head' },
                  ]}
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Department
                </label>
                <CustomSelect
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  options={[
                    { value: 'Junior High Faculty', label: 'Junior High Faculty' },
                    { value: 'Senior High Faculty', label: 'Senior High Faculty' },
                    { value: 'Science Department', label: 'Science Department' },
                    { value: 'Mathematics Department', label: 'Mathematics Department' },
                    { value: 'English Department', label: 'English Department' },
                    { value: 'Filipino Department', label: 'Filipino Department' },
                    { value: 'MAPEH Department', label: 'MAPEH Department' },
                  ]}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                {teacher ? 'New Password (leave empty to keep current)' : 'Teacher Portal Password *'}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required={!teacher}
                  placeholder={teacher ? '••••••••' : 'Enter portal access password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '9px 38px 9px 12px',
                    borderRadius: '9px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '13.5px',
                    outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer'
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 24px',
              borderTop: '1px solid #f1f5f9',
              background: '#f8fafc'
            }}
          >
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
              <span style={{ color: '#ef4444' }}>*</span> Mandatory fields
            </span>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '9px 18px',
                  borderRadius: '9px',
                  background: '#ffffff',
                  border: '1.5px solid #cbd5e1',
                  color: '#475569',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>

              <button
                type="submit"
                style={{
                  padding: '9px 22px',
                  borderRadius: '9px',
                  background: 'linear-gradient(135deg, #27367f 0%, #1a2557 100%)',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(39, 54, 127, 0.35)'
                }}
              >
                <Save size={16} />
                <span>{teacher ? 'Save Changes' : 'Add Teacher'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
