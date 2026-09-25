import React, { useState, useEffect, useMemo } from 'react';
import { dataService } from '../services/dataService';
import { CustomSelect } from '../components/common/CustomSelect';
import { BulkImportAdminsModal } from '../components/admin/BulkImportAdminsModal';
import { useNotification } from '../context/NotificationContext';
import { exportToCsv } from '../utils/csvHelper';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserPlus,
  Search,
  Upload,
  FileSpreadsheet,
  Trash2,
  Edit3,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  Lock,
  Mail,
  User,
  Save,
  CheckCircle2,
  Users,
  Eye,
  EyeOff,
  Download
} from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const AdminUsersPage = () => {
  const { success, error, info } = useNotification();
  const [adminUsers, setAdminUsers] = useState([
    {
      id: 1,
      fname: 'Sheryl',
      mname: 'B.',
      lname: 'Gamboa',
      email: 'admin@phcmanila.edu.ph',
      role: 'Super Admin',
      position: 'Head of Student Affairs',
      image: '/images/phcm-logo2.png'
    },
    {
      id: 2,
      fname: 'System',
      mname: '',
      lname: 'Administrator',
      email: 'system.admin@viotrack.local',
      role: 'System Admin',
      position: 'IT & Security Lead',
      image: ''
    },
    {
      id: 3,
      fname: 'Maria',
      mname: 'L.',
      lname: 'Santos',
      email: 'm.santos@phcmanila.edu.ph',
      role: 'Discipline Officer',
      position: 'Guidance & Conduct Officer',
      image: ''
    }
  ]);
  const [loading, setLoading] = useState(false);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('all'); // 'all' | 'Super Admin' | 'System Admin' | 'Discipline Officer'
  const [selectedIds, setSelectedIds] = useState([]);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Sorting
  const [sortField, setSortField] = useState('name'); // 'name' | 'role' | 'email'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' | 'desc'

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    fname: '',
    mname: '',
    lname: '',
    email: '',
    role: 'Admin',
    position: 'Discipline Staff',
    password: '',
    image: ''
  });

  useEffect(() => {
    loadAdmins();
  }, []);

  const loadAdmins = async () => {
    setLoading(true);
    try {
      const data = await dataService.getAdmins();
      if (data && data.length > 0) {
        setAdminUsers(data);
      }
    } catch (err) {
      console.warn('Using default admin list fallback:', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Stats calculation
  const stats = {
    total: adminUsers.length,
    superAdmins: adminUsers.filter(a => a.role === 'Super Admin' || a.role === 'System Admin').length,
    disciplineOfficers: adminUsers.filter(a => a.role === 'Discipline Officer' || a.role === 'Admin').length
  };

  // Sorting Handler
  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredAndSorted.map(a => a.id));
    } else {
      setSelectedIds([]);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleDeleteSelected = () => {
    if (window.confirm(`Are you sure you want to remove ${selectedIds.length} selected administrator(s)?`)) {
      setAdminUsers(adminUsers.filter(a => !selectedIds.includes(a.id)));
      setSelectedIds([]);
      success('Selected administrators removed.');
    }
  };

  const handleDeleteSingle = (id, name) => {
    if (window.confirm(`Are you sure you want to remove admin user: "${name}"?`)) {
      setAdminUsers(adminUsers.filter(a => a.id !== id));
      setSelectedIds(prev => prev.filter(x => x !== id));
      success('Administrator removed successfully.');
    }
  };

  const handleOpenAdd = () => {
    setEditingAdmin(null);
    setFormData({
      fname: '',
      mname: '',
      lname: '',
      email: '',
      role: 'Super Admin',
      position: 'Discipline Officer',
      password: '',
      image: ''
    });
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (admin) => {
    setEditingAdmin(admin);
    setFormData({
      fname: admin.fname || '',
      mname: admin.mname || '',
      lname: admin.lname || '',
      email: admin.email || '',
      role: admin.role || 'Admin',
      position: admin.position || 'Discipline Staff',
      password: '',
      image: admin.image || ''
    });
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.fname.trim() || !formData.lname.trim() || !formData.email.trim()) {
      error('Please fill in all mandatory fields.');
      return;
    }

    if (editingAdmin) {
      setAdminUsers(adminUsers.map(a => a.id === editingAdmin.id ? { ...a, ...formData } : a));
      success(`Updated details for ${formData.fname} ${formData.lname}`);
    } else {
      const newAdmin = {
        id: Date.now(),
        ...formData,
        image: formData.image || ''
      };
      setAdminUsers([newAdmin, ...adminUsers]);
      success(`Created administrator account for ${formData.fname} ${formData.lname}`);
    }
    setIsModalOpen(false);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFillColor(39, 54, 127);
    doc.rect(0, 0, 210, 24, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text('PERPETUAL HELP COLLEGE OF MANILA', 14, 11);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('VioTrack Disciplinary System - Official Administrators Registry', 14, 18);

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(9);
    doc.text(`Total Active Administrators: ${filteredAndSorted.length} | Generated: ${new Date().toLocaleDateString()}`, 14, 30);

    const tableData = filteredAndSorted.map(a => [
      `${a.fname} ${a.mname ? a.mname + ' ' : ''}${a.lname}`.trim(),
      a.role || 'Admin',
      a.position || 'Administrative Officer',
      a.email
    ]);

    doc.autoTable({
      head: [['Administrator Name', 'Privilege Level', 'Department / Role', 'Email Address']],
      body: tableData,
      startY: 34,
      theme: 'striped',
      headStyles: { fillColor: [39, 54, 127], fontStyle: 'bold' }
    });

    doc.save(`Viotrack_Administrators_${Date.now()}.pdf`);
    success('Exported Administrators Registry as PDF!');
  };

  const handleExportCSV = () => {
    try {
      const headers = ['First Name', 'Middle Name', 'Last Name', 'Email', 'Role', 'Position', 'Contact'];
      const rows = filteredAndSorted.map(a => [
        a.fname,
        a.mname || '',
        a.lname,
        a.email,
        a.role || 'Staff',
        a.position || 'Administrative Officer',
        a.contact || 'N/A'
      ]);

      exportToCsv(`Viotrack_Administrators_${Date.now()}`, headers, rows);
      success(`Exported ${rows.length} administrators to CSV!`);
    } catch (err) {
      error('Failed to export CSV: ' + err.message);
    }
  };

  // Filter & Sort Pipeline
  const filteredAndSorted = useMemo(() => {
    let result = adminUsers.filter(a => {
      // Role Filter
      if (selectedRoleFilter !== 'all' && a.role !== selectedRoleFilter) {
        return false;
      }
      // Search
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const fullName = `${a.fname} ${a.mname || ''} ${a.lname}`.toLowerCase();
        const email = (a.email || '').toLowerCase();
        const role = (a.role || '').toLowerCase();
        const pos = (a.position || '').toLowerCase();
        return fullName.includes(query) || email.includes(query) || role.includes(query) || pos.includes(query);
      }
      return true;
    });

    // Sorting
    result.sort((a, b) => {
      let valA = '';
      let valB = '';
      if (sortField === 'name') {
        valA = `${a.fname} ${a.lname}`.toLowerCase();
        valB = `${b.fname} ${b.lname}`.toLowerCase();
      } else if (sortField === 'role') {
        valA = (a.role || '').toLowerCase();
        valB = (b.role || '').toLowerCase();
      } else if (sortField === 'email') {
        valA = (a.email || '').toLowerCase();
        valB = (b.email || '').toLowerCase();
      }
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [adminUsers, selectedRoleFilter, searchTerm, sortField, sortOrder]);

  const totalPages = Math.ceil(filteredAndSorted.length / entriesPerPage) || 1;
  const paginatedAdmins = filteredAndSorted.slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage);

  const renderSortIcon = (field) => {
    if (sortField !== field) {
      return <ArrowUpDown size={13} style={{ color: '#94a3b8', marginLeft: 4 }} />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp size={13} style={{ color: '#27367f', marginLeft: 4 }} />
    ) : (
      <ArrowDown size={13} style={{ color: '#27367f', marginLeft: 4 }} />
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* 1. Top Banner & Primary Actions */}
      <div className="page-banner-header">
        <div className="page-banner-info">
          <div
            style={{
              width: 50,
              height: 50,
              borderRadius: '14px',
              background: 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              flexShrink: 0
            }}
          >
            <ShieldCheck size={26} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '22px', fontWeight: 800, margin: 0, color: '#ffffff', letterSpacing: '-0.02em' }}>
                System Administrators
              </h2>
              <span
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 700,
                  padding: '2.5px 10px',
                  borderRadius: '20px',
                  backdropFilter: 'blur(4px)'
                }}
              >
                {stats.total} Active {stats.total === 1 ? 'Admin' : 'Admins'}
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'rgba(255, 255, 255, 0.85)' }}>
              Configured administrative accounts, system access privileges, security oversight, and credentials.
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="page-banner-actions">
          <div className="page-banner-secondary-group">
            <button
              onClick={handleExportPDF}
              className="page-banner-btn-secondary"
              title="Download formatted PDF administrator roster"
            >
              <Download size={15} /> Export PDF
            </button>

            <button
              onClick={handleExportCSV}
              className="page-banner-btn-secondary"
              title="Download CSV spreadsheet"
            >
              <FileSpreadsheet size={15} /> Export CSV
            </button>

            <button
              onClick={() => setIsBulkImportOpen(true)}
              className="page-banner-btn-secondary"
              title="Import administrators from CSV"
            >
              <Upload size={15} /> Import CSV
            </button>
          </div>

          <button
            onClick={handleOpenAdd}
            className="page-banner-primary-btn"
          >
            <UserPlus size={16} strokeWidth={2.5} /> Add Admin User
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: '24px', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)' }}>
        {/* 2. Stat Filter Cards */}
        <div className="metric-cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          {/* Total Admins */}
          <div
            onClick={() => setSelectedRoleFilter('all')}
            style={{
              background: selectedRoleFilter === 'all' ? '#eff6ff' : '#ffffff',
              border: selectedRoleFilter === 'all' ? '2px solid #2563eb' : '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: selectedRoleFilter === 'all' ? '0 4px 12px rgba(37, 99, 235, 0.15)' : '0 1px 3px rgba(0,0,0,0.02)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: 44, height: 44, borderRadius: '12px', background: '#e0e7ff', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={22} />
              </div>
              <div>
                <span style={{ fontSize: '26px', fontWeight: 800, color: '#1e293b', lineHeight: 1, display: 'block' }}>
                  {stats.total}
                </span>
                <span style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 600 }}>Total Admins</span>
              </div>
            </div>
            {selectedRoleFilter === 'all' && (
              <span style={{ background: '#2563eb', color: '#fff', fontSize: '10px', padding: '2px 7px', borderRadius: '6px', fontWeight: 700 }}>
                Active
              </span>
            )}
          </div>

          {/* Super Admins */}
          <div
            onClick={() => setSelectedRoleFilter(selectedRoleFilter === 'Super Admin' ? 'all' : 'Super Admin')}
            style={{
              background: selectedRoleFilter === 'Super Admin' ? '#fdf4ff' : '#ffffff',
              border: selectedRoleFilter === 'Super Admin' ? '2px solid #a855f7' : '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: selectedRoleFilter === 'Super Admin' ? '0 4px 12px rgba(168, 85, 247, 0.15)' : '0 1px 3px rgba(0,0,0,0.02)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: 44, height: 44, borderRadius: '12px', background: '#f3e8ff', color: '#9333ea', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Shield size={22} />
              </div>
              <div>
                <span style={{ fontSize: '26px', fontWeight: 800, color: '#581c87', lineHeight: 1, display: 'block' }}>
                  {stats.superAdmins}
                </span>
                <span style={{ fontSize: '12.5px', color: '#7e22ce', fontWeight: 600 }}>Super Admins</span>
              </div>
            </div>
            {selectedRoleFilter === 'Super Admin' && (
              <span style={{ background: '#9333ea', color: '#fff', fontSize: '10px', padding: '2px 7px', borderRadius: '6px', fontWeight: 700 }}>
                Filtered
              </span>
            )}
          </div>

          {/* Discipline Officers */}
          <div
            onClick={() => setSelectedRoleFilter(selectedRoleFilter === 'Discipline Officer' ? 'all' : 'Discipline Officer')}
            style={{
              background: selectedRoleFilter === 'Discipline Officer' ? '#f0fdf4' : '#ffffff',
              border: selectedRoleFilter === 'Discipline Officer' ? '2px solid #16a34a' : '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: selectedRoleFilter === 'Discipline Officer' ? '0 4px 12px rgba(22, 163, 74, 0.15)' : '0 1px 3px rgba(0,0,0,0.02)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: 44, height: 44, borderRadius: '12px', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldCheck size={22} />
              </div>
              <div>
                <span style={{ fontSize: '26px', fontWeight: 800, color: '#14532d', lineHeight: 1, display: 'block' }}>
                  {stats.disciplineOfficers}
                </span>
                <span style={{ fontSize: '12.5px', color: '#15803d', fontWeight: 600 }}>Discipline Officers</span>
              </div>
            </div>
            {selectedRoleFilter === 'Discipline Officer' && (
              <span style={{ background: '#16a34a', color: '#fff', fontSize: '10px', padding: '2px 7px', borderRadius: '6px', fontWeight: 700 }}>
                Filtered
              </span>
            )}
          </div>
        </div>

        {/* 3. Search & Control Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '22px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ position: 'relative', minWidth: '280px', flex: '1', maxWidth: '420px' }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search by admin name, email, or role..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                borderRadius: '9px',
                border: '1.5px solid #cbd5e1',
                fontSize: '13px',
                background: '#ffffff',
                outline: 'none',
                color: '#1f2937'
              }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '130px' }}>
            <CustomSelect
              value={entriesPerPage}
              onChange={(e) => {
                setEntriesPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              options={[
                { value: 10, label: '10 per page' },
                { value: 25, label: '25 per page' },
                { value: 50, label: '50 per page' }
              ]}
            />
          </div>
        </div>

        {/* Batch Selection Action Bar */}
        {selectedIds.length > 0 && (
          <div
            style={{
              marginTop: '16px',
              padding: '10px 16px',
              background: '#f8fafc',
              border: '1.5px solid #cbd5e1',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563eb' }} />
              {selectedIds.length} administrator(s) selected
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleDeleteSelected}
                style={{
                  background: '#ef4444',
                  color: '#fff',
                  border: 'none',
                  padding: '6px 14px',
                  borderRadius: '7px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Trash2 size={14} /> Delete Selected
              </button>

              <button
                onClick={() => setSelectedIds([])}
                style={{
                  background: '#ffffff',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  padding: '6px 12px',
                  borderRadius: '7px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Deselect All
              </button>
            </div>
          </div>
        )}

        {/* 4. Table (Desktop View) */}
        <div className="responsive-table-desktop" style={{ marginTop: '16px', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0' }}>
                <th style={{ width: 44, textAlign: 'center', padding: '14px 10px' }}>
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={selectedIds.length > 0 && selectedIds.length === filteredAndSorted.length}
                    style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#27367f' }}
                  />
                </th>

                <th
                  onClick={() => handleSort('name')}
                  style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 800, color: '#334155', cursor: 'pointer', userSelect: 'none', letterSpacing: '0.04em' }}
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    ADMINISTRATOR {renderSortIcon('name')}
                  </div>
                </th>

                <th
                  onClick={() => handleSort('role')}
                  style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 800, color: '#334155', cursor: 'pointer', userSelect: 'none', letterSpacing: '0.04em', width: '200px' }}
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    ROLE & ACCESS {renderSortIcon('role')}
                  </div>
                </th>

                <th
                  onClick={() => handleSort('email')}
                  style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 800, color: '#334155', cursor: 'pointer', userSelect: 'none', letterSpacing: '0.04em' }}
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    INSTITUTIONAL EMAIL {renderSortIcon('email')}
                  </div>
                </th>

                <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 800, color: '#334155', textAlign: 'right', width: '160px', letterSpacing: '0.04em' }}>
                  ACTIONS
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Loading administrators...</td>
                </tr>
              ) : filteredAndSorted.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    No administrators found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedAdmins.map((admin) => {
                  const isChecked = selectedIds.includes(admin.id);
                  const fullName = `${admin.fname} ${admin.mname ? admin.mname + ' ' : ''}${admin.lname}`.trim();
                  const initials = `${(admin.fname || 'A')[0]}${(admin.lname || 'U')[0]}`;
                  const isSuper = admin.role === 'Super Admin' || admin.role === 'System Admin';

                  return (
                    <tr
                      key={admin.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: isChecked ? '#f8fafc' : '#ffffff',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseOver={(e) => { if (!isChecked) e.currentTarget.style.background = '#fafbfc'; }}
                      onMouseOut={(e) => { if (!isChecked) e.currentTarget.style.background = '#ffffff'; }}
                    >
                      <td style={{ textAlign: 'center', padding: '14px 10px' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelect(admin.id)}
                          style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#27367f' }}
                        />
                      </td>

                      {/* Admin Name & Avatar */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          {admin.image ? (
                            <img
                              src={admin.image}
                              alt={fullName}
                              style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #e2e8f0' }}
                            />
                          ) : (
                            <div
                              style={{
                                width: 40,
                                height: 40,
                                borderRadius: '50%',
                                background: isSuper ? 'linear-gradient(135deg, #7c3aed 0%, #581c87 100%)' : 'linear-gradient(135deg, #27367f 0%, #1e2557 100%)',
                                color: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: '13.5px',
                                boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                              }}
                            >
                              {initials}
                            </div>
                          )}
                          <div>
                            <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', display: 'block' }}>
                              {fullName}
                            </span>
                            <span style={{ fontSize: '12px', color: '#64748b' }}>
                              {admin.position || 'Discipline & Admin Personnel'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 10px',
                            borderRadius: '20px',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            background: isSuper ? '#f3e8ff' : '#e0e7ff',
                            color: isSuper ? '#7e22ce' : '#3730a3'
                          }}
                        >
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: isSuper ? '#a855f7' : '#4f46e5' }} />
                          {admin.role || 'Admin'}
                        </span>
                      </td>

                      {/* Email */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#334155' }}>
                          <Mail size={14} color="#94a3b8" />
                          <span>{admin.email}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                          <button
                            onClick={() => handleOpenEdit(admin)}
                            style={{
                              background: '#eff6ff',
                              color: '#2563eb',
                              border: '1px solid #bfdbfe',
                              padding: '6px 12px',
                              borderRadius: '7px',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              transition: 'all 0.15s'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.background = '#dbeafe'}
                            onMouseOut={(e) => e.currentTarget.style.background = '#eff6ff'}
                          >
                            <Edit3 size={13} /> Edit
                          </button>

                          <button
                            onClick={() => handleDeleteSingle(admin.id, fullName)}
                            style={{
                              background: '#fef2f2',
                              color: '#dc2626',
                              border: '1px solid #fecaca',
                              padding: '6px 12px',
                              borderRadius: '7px',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              transition: 'all 0.15s'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.background = '#fee2e2'}
                            onMouseOut={(e) => e.currentTarget.style.background = '#fef2f2'}
                          >
                            <Trash2 size={13} /> Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Admin Cards (Mobile View) */}
        <div className="responsive-cards-mobile" style={{ marginTop: '16px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '30px 16px', color: '#94a3b8' }}>
              Loading administrators...
            </div>
          ) : filteredAndSorted.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 16px', color: '#94a3b8' }}>
              No administrators found matching your filter criteria.
            </div>
          ) : (
            paginatedAdmins.map((admin) => {
              const isChecked = selectedIds.includes(admin.id);
              const fullName = `${admin.fname} ${admin.mname ? admin.mname + ' ' : ''}${admin.lname}`.trim();
              const initials = `${(admin.fname || 'A')[0]}${(admin.lname || 'U')[0]}`;
              const isSuper = admin.role === 'Super Admin' || admin.role === 'System Admin';

              return (
                <div
                  key={admin.id}
                  style={{
                    background: isChecked ? '#f8faff' : '#ffffff',
                    border: isChecked ? '1.5px solid #27367f' : '1px solid #e2e8f0',
                    borderRadius: '14px',
                    padding: '14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                  }}
                >
                  {/* Top Header: Checkbox + Avatar + Name + Role Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSelect(admin.id)}
                        style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#27367f', flexShrink: 0 }}
                      />
                      {admin.image ? (
                        <img
                          src={admin.image}
                          alt={fullName}
                          style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #e2e8f0', flexShrink: 0 }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: '50%',
                            background: isSuper ? 'linear-gradient(135deg, #7c3aed 0%, #581c87 100%)' : 'linear-gradient(135deg, #27367f 0%, #1e2557 100%)',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '13px',
                            flexShrink: 0
                          }}
                        >
                          {initials}
                        </div>
                      )}
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 800, fontSize: '13.5px', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {fullName}
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {admin.position || 'Discipline & Admin Personnel'}
                        </div>
                      </div>
                    </div>

                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: isSuper ? '#f3e8ff' : '#e0e7ff',
                        color: isSuper ? '#7e22ce' : '#3730a3',
                        whiteSpace: 'nowrap',
                        flexShrink: 0
                      }}
                    >
                      {admin.role || 'Admin'}
                    </span>
                  </div>

                  {/* Middle Row: Email */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#475569', background: '#f8fafc', padding: '6px 10px', borderRadius: '8px' }}>
                    <Mail size={13} color="#94a3b8" />
                    <span style={{ wordBreak: 'break-all' }}>{admin.email}</span>
                  </div>

                  {/* Actions Row */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '4px', borderTop: '1px solid #f1f5f9' }}>
                    <button
                      onClick={() => handleOpenEdit(admin)}
                      style={{
                        background: '#eff6ff',
                        color: '#2563eb',
                        border: '1px solid #bfdbfe',
                        padding: '6px 12px',
                        borderRadius: '7px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                    >
                      <Edit3 size={13} /> Edit
                    </button>

                    <button
                      onClick={() => handleDeleteSingle(admin.id, fullName)}
                      style={{
                        background: '#fef2f2',
                        color: '#dc2626',
                        border: '1px solid #fecaca',
                        padding: '6px 12px',
                        borderRadius: '7px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                    >
                      <Trash2 size={13} /> Remove
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 5. Pagination Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '18px', flexWrap: 'wrap', gap: '10px' }}>
          <span style={{ fontSize: '13px', color: '#64748b' }}>
            Showing {filteredAndSorted.length === 0 ? 0 : (currentPage - 1) * entriesPerPage + 1} to{' '}
            {Math.min(currentPage * entriesPerPage, filteredAndSorted.length)} of {filteredAndSorted.length} administrators
          </span>

          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(1)}
              style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: currentPage > 1 ? 'pointer' : 'default', fontSize: '12px' }}
            >
              «
            </button>
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: currentPage > 1 ? 'pointer' : 'default', fontSize: '12px' }}
            >
              ‹
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: pageNum === currentPage ? '#27367f' : '#ffffff',
                  color: pageNum === currentPage ? '#ffffff' : '#334155',
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                {pageNum}
              </button>
            ))}

            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: currentPage < totalPages ? 'pointer' : 'default', fontSize: '12px' }}
            >
              ›
            </button>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(totalPages)}
              style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: currentPage < totalPages ? 'pointer' : 'default', fontSize: '12px' }}
            >
              »
            </button>
          </div>
        </div>
      </div>

      {/* Luxury Add / Edit Admin Modal */}
      {isModalOpen && (
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
          onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '18px',
              width: '100%',
              maxWidth: '540px',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.3)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              animation: 'fadeInUp 0.2s ease-out'
            }}
          >
            {/* Modal Header */}
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
                  <Shield size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px' }}>
                    {editingAdmin ? 'Edit Administrator Details' : 'Add New Administrator'}
                  </h3>
                  <span style={{ fontSize: '12.5px', color: '#64748b' }}>
                    Configure credentials, system privileges & profile information
                  </span>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
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

            {/* Modal Form */}
            <form onSubmit={handleSubmit}>
              <div style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '70vh', overflowY: 'auto' }}>
                {/* Name Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                      First Name <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sheryl"
                      value={formData.fname}
                      onChange={(e) => setFormData({ ...formData, fname: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '9px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '13.5px',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                      Last Name <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Gamboa"
                      value={formData.lname}
                      onChange={(e) => setFormData({ ...formData, lname: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '9px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '13.5px',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>

                {/* Email & Position */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                      Institutional Email <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="admin@phcmanila.edu.ph"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '9px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '13.5px',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                      Department / Title
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Student Affairs Head"
                      value={formData.position}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '9px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '13.5px',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>

                {/* Access Role Selection Cards */}
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '8px' }}>
                    Privilege Role <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    {[
                      { id: 'Super Admin', label: 'Super Admin', sub: 'Full System Access' },
                      { id: 'System Admin', label: 'System Admin', sub: 'IT & Logs Master' },
                      { id: 'Discipline Officer', label: 'Discipline Officer', sub: 'Hearings & Records' }
                    ].map((r) => (
                      <div
                        key={r.id}
                        onClick={() => setFormData({ ...formData, role: r.id })}
                        style={{
                          padding: '10px 8px',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          border: formData.role === r.id ? '2px solid #27367f' : '1.5px solid #e2e8f0',
                          background: formData.role === r.id ? '#e0e7ff' : '#f8fafc',
                          textAlign: 'center',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <span style={{ fontSize: '12.5px', fontWeight: 800, color: formData.role === r.id ? '#1e1b4b' : '#334155', display: 'block' }}>
                          {r.label}
                        </span>
                        <span style={{ fontSize: '10.5px', color: '#64748b' }}>{r.sub}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                    {editingAdmin ? 'New Password (leave empty to keep current)' : 'Account Password *'}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required={!editingAdmin}
                      placeholder={editingAdmin ? '••••••••' : 'Enter secure password'}
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

              {/* Modal Footer */}
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
                    onClick={() => setIsModalOpen(false)}
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
                    <span>{editingAdmin ? 'Save Changes' : 'Create Admin'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Bulk Import Admins Modal */}
      <BulkImportAdminsModal
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        onImported={(newList) => {
          setAdminUsers(prev => [...newList, ...prev]);
        }}
      />
    </div>
  );
};
