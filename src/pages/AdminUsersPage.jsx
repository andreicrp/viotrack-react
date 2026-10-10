import React, { useState, useEffect, useMemo, useDeferredValue } from 'react';
import { dataService } from '../services/dataService';
import { CustomSelect } from '../components/common/CustomSelect';
import { ViewModeToggle } from '../components/common/ViewModeToggle';
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
  Plus,
  FileText,
  Download
} from 'lucide-react';
import { getJsPDF } from '../utils/pdfHelper';
import { SaveAsModal } from '../components/common/SaveAsModal';

export const AdminUsersPage = () => {
  const { success, error, info } = useNotification();
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'grid'
  const [saveAsModalOpen, setSaveAsModalOpen] = useState(false);
  const [saveAsConfig, setSaveAsConfig] = useState({
    defaultFilename: 'Viotrack_Administrators',
    defaultFormat: 'csv',
    availableFormats: ['csv', 'xlsx', 'pdf'],
    headers: [],
    rows: [],
    generatePdfBlob: null,
    title: 'Save Administrators Directory As'
  });
  const [adminUsers, setAdminUsers] = useState([
    {
      id: 1,
      fname: 'Sheryl',
      mname: 'B.',
      lname: 'Gamboa',
      email: 'admin@phcmanila.edu.ph',
      role: 'Head Admin',
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
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('all'); // 'all' | 'Head Admin' | 'System Admin' | 'Discipline Officer'
  const [selectedIds, setSelectedIds] = useState([]);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Sorting
  const [sortField, setSortField] = useState('name'); // 'name' | 'role' | 'email'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' | 'desc'

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [bulkImportFormat, setBulkImportFormat] = useState('all'); // 'all' | 'pdf' | 'csv'
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    fname: '',
    mname: '',
    lname: '',
    email: '',
    role: 'Head Admin',
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
      const data = await dataService.getAdmins(true);
      if (Array.isArray(data)) {
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
    headAdmins: adminUsers.filter(a => a.role === 'Head Admin' || a.role === 'Super Admin' || a.role === 'System Admin').length,
    superAdmins: adminUsers.filter(a => a.role === 'Head Admin' || a.role === 'Super Admin' || a.role === 'System Admin').length,
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

  const handleDeleteSelected = async () => {
    if (window.confirm(`Are you sure you want to remove ${selectedIds.length} selected administrator(s)?`)) {
      try {
        for (const id of selectedIds) {
          await dataService.deleteAdmin(id);
        }
        setAdminUsers(prev => prev.filter(a => !selectedIds.map(String).includes(String(a.id))));
        setSelectedIds([]);
        success('Selected administrators removed.');
        loadAdmins();
      } catch (err) {
        error('Failed to remove administrators: ' + err.message);
      }
    }
  };

  const handleDeleteSingle = async (id, name) => {
    if (window.confirm(`Are you sure you want to remove admin user: "${name}"?`)) {
      try {
        await dataService.deleteAdmin(id);
        setAdminUsers(prev => prev.filter(a => String(a.id) !== String(id)));
        setSelectedIds(prev => prev.filter(x => String(x) !== String(id)));
        success('Administrator removed successfully.');
        loadAdmins();
      } catch (err) {
        error('Failed to remove administrator: ' + err.message);
      }
    }
  };

  const handleRemoveAdmin = handleDeleteSingle;

  const handleOpenAdd = () => {
    setEditingAdmin(null);
    setFormData({
      fname: '',
      mname: '',
      lname: '',
      email: '',
      role: 'Head Admin',
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
      role: admin.role === 'Super Admin' ? 'Head Admin' : (admin.role || 'Head Admin'),
      position: admin.position || 'Discipline Staff',
      password: '',
      image: admin.image || ''
    });
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.fname.trim() || !formData.lname.trim() || !formData.email.trim()) {
      error('Please fill in all mandatory fields.');
      return;
    }

    try {
      if (editingAdmin) {
        const saved = await dataService.updateAdmin(editingAdmin.id, formData);
        setAdminUsers(adminUsers.map(a => a.id === editingAdmin.id ? (saved || { ...a, ...formData }) : a));
        success(`Updated details for ${formData.fname} ${formData.lname}`);
      } else {
        const newAdmin = await dataService.addAdmin({
          ...formData,
          image: formData.image || ''
        });
        setAdminUsers([newAdmin, ...adminUsers]);
        success(`Created administrator account for ${formData.fname} ${formData.lname}`);
      }
      setIsModalOpen(false);
      loadAdmins();
    } catch (err) {
      error('Failed to save administrator record: ' + err.message);
    }
  };

  // Export via SaveAs
  const handleOpenExportSaveAs = (defaultFormat = 'csv') => {
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

    const generatePdfBlob = async () => {
      const doc = await getJsPDF();
      doc.setFillColor(39, 54, 127);
      doc.rect(0, 0, 210, 24, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('UNIVERSITY OF PERPETUAL HELP SYSTEM MANILA', 14, 11);
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

      return doc.output('blob');
    };

    setSaveAsConfig({
      defaultFilename: `Viotrack_Administrators_${new Date().toISOString().slice(0, 10)}`,
      defaultFormat,
      availableFormats: ['csv', 'xlsx', 'pdf'],
      headers,
      rows,
      generatePdfBlob,
      title: 'Save Administrators Directory As'
    });
    setSaveAsModalOpen(true);
  };

  const deferredSearch = useDeferredValue(searchTerm);

  // Filter & Sort Pipeline
  const filteredAndSorted = useMemo(() => {
    let result = adminUsers.filter(a => {
      // Role Filter
      if (selectedRoleFilter !== 'all') {
        const isTargetHead = selectedRoleFilter === 'Head Admin' || selectedRoleFilter === 'Super Admin';
        const isUserHead = a.role === 'Head Admin' || a.role === 'Super Admin' || a.role === 'System Admin';

        const isTargetDiscipline = selectedRoleFilter === 'Discipline Officer';
        const isUserDiscipline = a.role === 'Discipline Officer' || a.role === 'Admin';

        if (isTargetHead) {
          if (!isUserHead) return false;
        } else if (isTargetDiscipline) {
          if (!isUserDiscipline) return false;
        } else if (a.role !== selectedRoleFilter) {
          return false;
        }
      }

      // Search
      if (deferredSearch.trim()) {
        const query = deferredSearch.toLowerCase();
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
  }, [adminUsers, selectedRoleFilter, deferredSearch, sortField, sortOrder]);

  const totalPages = Math.ceil(filteredAndSorted.length / entriesPerPage) || 1;
  const paginatedAdmins = filteredAndSorted.slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage);

  const renderSortIcon = (field) => {
    if (sortField !== field) {
      return <ArrowUpDown size={13} className="table-sort-icon is-inactive" color="currentColor" style={{ color: 'var(--text-muted, #94a3b8)', marginLeft: 4 }} />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp size={13} className="table-sort-icon is-active" color="currentColor" style={{ color: 'var(--brand-blue, #07345f)', marginLeft: 4 }} />
    ) : (
      <ArrowDown size={13} className="table-sort-icon is-active" color="currentColor" style={{ color: 'var(--brand-blue, #07345f)', marginLeft: 4 }} />
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* 1. Top Banner & Primary Actions */}
      <div className="page-banner-header">
        <div className="page-banner-info">
          <ShieldCheck size={26} strokeWidth={2.4} style={{ flexShrink: 0, color: 'var(--brand-blue, #07345f)' }} />
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: 'var(--text-primary, #0f172a)', letterSpacing: '-0.02em' }}>
              System Administrators
            </h2>
            <p style={{ margin: '3px 0 0 0', fontSize: '13px', color: 'var(--text-muted, #64748b)' }}>
              Configured administrative accounts, system access privileges, security oversight, and credentials.
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="page-banner-actions">
          <div className="page-banner-secondary-group">
            <button
              onClick={() => handleOpenExportSaveAs('pdf')}
              className="page-banner-btn-secondary"
              title="Save As formatted PDF administrator roster"
            >
              <Download size={14} strokeWidth={2.2} /> Export PDF
            </button>

            <button
              onClick={() => handleOpenExportSaveAs('csv')}
              className="page-banner-btn-secondary"
              title="Save As CSV / Excel spreadsheet"
            >
              <FileSpreadsheet size={14} strokeWidth={2.2} /> Export CSV
            </button>

            <button
              onClick={() => {
                setBulkImportFormat('pdf');
                setIsBulkImportOpen(true);
              }}
              className="page-banner-btn-secondary"
              title="Import administrators from PDF document"
            >
              <Upload size={14} strokeWidth={2.2} /> Import PDF
            </button>

            <button
              onClick={() => {
                setBulkImportFormat('csv');
                setIsBulkImportOpen(true);
              }}
              className="page-banner-btn-secondary"
              title="Import administrators from CSV spreadsheet"
            >
              <Upload size={14} strokeWidth={2.2} /> Import CSV
            </button>
          </div>

          <button
            onClick={handleOpenAdd}
            className="page-banner-primary-btn"
          >
            <Plus size={16} strokeWidth={2.5} /> Add Admin User
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: '24px', background: 'var(--bg-surface, #ffffff)', borderRadius: '16px', border: '1px solid var(--border-subtle, #e2e8f0)', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)' }}>
        {/* 2. Stat Filter Cards */}
        <div className="metric-cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          {/* Total Admins */}
          <div
            onClick={() => setSelectedRoleFilter('all')}
            style={{
              background: 'var(--bg-surface, #ffffff)',
              border: selectedRoleFilter === 'all' ? '2px solid var(--brand-blue, #07345f)' : '1.5px solid var(--border-subtle, #cbd5e1)',
              borderRadius: '12px',
              padding: '14px 16px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: selectedRoleFilter === 'all' ? '0 4px 14px rgba(7, 52, 95, 0.10)' : '0 1px 3px rgba(0,0,0,0.02)',
              position: 'relative'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '11.5px', fontWeight: 800, color: 'var(--brand-blue, #07345f)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  TOTAL ADMINS
                </div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary, #0f172a)', margin: '4px 0 2px 0', lineHeight: 1.1 }}>
                  {stats.total}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', fontWeight: 500 }}>
                  System administration users
                </div>
              </div>
              <Users size={20} color="var(--brand-blue, #07345f)" strokeWidth={2} />
            </div>
          </div>

          {/* Head Admins */}
          <div
            onClick={() => setSelectedRoleFilter(selectedRoleFilter === 'Head Admin' ? 'all' : 'Head Admin')}
            style={{
              background: 'var(--bg-surface, #ffffff)',
              border: selectedRoleFilter === 'Head Admin' ? '2px solid var(--brand-blue, #07345f)' : '1.5px solid var(--border-subtle, #cbd5e1)',
              borderRadius: '12px',
              padding: '14px 16px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: selectedRoleFilter === 'Head Admin' ? '0 4px 14px rgba(7, 52, 95, 0.10)' : '0 1px 3px rgba(0,0,0,0.02)',
              position: 'relative'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '11.5px', fontWeight: 800, color: 'var(--brand-blue, #07345f)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  HEAD ADMINS
                </div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary, #0f172a)', margin: '4px 0 2px 0', lineHeight: 1.1 }}>
                  {stats.headAdmins}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', fontWeight: 500 }}>
                  Full executive privileges
                </div>
              </div>
              <Shield size={20} color="var(--brand-blue, #07345f)" strokeWidth={2} />
            </div>
          </div>

          {/* Discipline Officers */}
          <div
            onClick={() => setSelectedRoleFilter(selectedRoleFilter === 'Discipline Officer' ? 'all' : 'Discipline Officer')}
            style={{
              background: 'var(--bg-surface, #ffffff)',
              border: selectedRoleFilter === 'Discipline Officer' ? '2px solid var(--brand-blue, #07345f)' : '1.5px solid var(--border-subtle, #cbd5e1)',
              borderRadius: '12px',
              padding: '14px 16px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: selectedRoleFilter === 'Discipline Officer' ? '0 4px 14px rgba(7, 52, 95, 0.10)' : '0 1px 3px rgba(0,0,0,0.02)',
              position: 'relative'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '11.5px', fontWeight: 800, color: 'var(--brand-blue, #07345f)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  DISCIPLINE OFFICERS
                </div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary, #0f172a)', margin: '4px 0 2px 0', lineHeight: 1.1 }}>
                  {stats.disciplineOfficers}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', fontWeight: 500 }}>
                  Case review & hearings
                </div>
              </div>
              <ShieldCheck size={20} color="var(--brand-blue, #07345f)" strokeWidth={2} />
            </div>
          </div>
        </div>

        {/* 3. Search & Control Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', flexWrap: 'wrap', gap: '12px' }}>
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '0' }}>
            <div style={{ minWidth: '120px', flex: '1' }}>
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

            {/* List / Grid View Toggle */}
            <ViewModeToggle viewMode={viewMode} onChange={setViewMode} />
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
        <div className={`responsive-table-desktop admin-users-table-container ${viewMode === 'grid' ? 'force-hidden' : ''}`} style={{ marginTop: '16px', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0' }}>
                <th style={{ width: 44, textAlign: 'center', padding: '14px 10px' }}>
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={selectedIds.length > 0 && selectedIds.length === filteredAndSorted.length}
                    style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#07345f' }}
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
                  const isSuper = admin.role === 'Head Admin' || admin.role === 'Super Admin' || admin.role === 'System Admin';

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
                          style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#07345f' }}
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
                                background: isSuper ? 'linear-gradient(135deg, #7c3aed 0%, #581c87 100%)' : 'linear-gradient(135deg, #07345f 0%, #0b192c 100%)',
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
                            <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary, #0f172a)', display: 'block' }}>
                              {fullName}
                            </span>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>
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
                            padding: '4px 10px',
                            borderRadius: '20px',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            background: isSuper ? 'rgba(168, 85, 247, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                            color: isSuper ? '#c084fc' : '#38bdf8',
                            border: `1px solid ${isSuper ? 'rgba(168, 85, 247, 0.3)' : 'rgba(56, 189, 248, 0.3)'}`
                          }}
                        >
                          {admin.role === 'Super Admin' ? 'Head Admin' : (admin.role || 'Admin')}
                        </span>
                      </td>

                      {/* Email */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary, #334155)' }}>
                          <Mail size={14} color="var(--text-muted, #94a3b8)" />
                          <span>{admin.email}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                          <button
                            onClick={() => handleOpenEdit(admin)}
                            style={{
                              background: 'var(--bg-surface-elevated, #f8fafc)',
                              color: 'var(--text-secondary, #334155)',
                              border: '1px solid var(--border-subtle, #cbd5e1)',
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
                          >
                            <Edit3 size={13} /> Edit
                          </button>

                          <button
                            onClick={() => handleDeleteSingle(admin.id, fullName)}
                            style={{
                              background: 'var(--bg-surface-elevated, #f8fafc)',
                              color: 'var(--text-muted, #64748b)',
                              border: '1px solid var(--border-subtle, #cbd5e1)',
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
        <div className={`responsive-cards-mobile admin-users-mobile-cards ${viewMode === 'grid' ? 'grid-view' : 'list-view'}`} style={{ marginTop: '16px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '30px 16px', color: '#94a3b8', gridColumn: '1 / -1' }}>
              Loading administrators...
            </div>
          ) : filteredAndSorted.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 16px', color: '#94a3b8', gridColumn: '1 / -1' }}>
              No administrators found matching your filter criteria.
            </div>
          ) : viewMode === 'grid' ? (
            paginatedAdmins.map((admin) => {
              const isChecked = selectedIds.includes(admin.id);
              const fullName = `${admin.fname} ${admin.mname ? admin.mname + ' ' : ''}${admin.lname}`.trim();
              const initials = `${(admin.fname || 'A')[0]}${(admin.lname || 'U')[0]}`;
              const isSuper = admin.role === 'Head Admin' || admin.role === 'Super Admin' || admin.role === 'System Admin';

              return (
                <div
                  key={admin.id}
                  className={`entity-grid-card ${isChecked ? 'is-selected' : ''}`}
                >
                  {/* Top Badges Row */}
                  <div className="entity-grid-top-badges">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleSelect(admin.id)}
                      style={{ cursor: 'pointer', width: '15px', height: '15px', accentColor: '#07345f' }}
                    />
                    <span
                      className={isSuper ? 'badge-purple' : 'badge-blue'}
                      style={{
                        padding: '2px 9px',
                        borderRadius: '20px',
                        fontSize: '10px',
                        fontWeight: 700,
                        background: isSuper ? '#f3e8ff' : '#eff6ff',
                        color: isSuper ? '#7e22ce' : '#1d4ed8',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {admin.role === 'Super Admin' ? 'Head Admin' : (admin.role || 'Admin')}
                    </span>
                  </div>

                  {/* Center Avatar & Info */}
                  {admin.image ? (
                    <img
                      src={admin.image}
                      alt={fullName}
                      className="entity-grid-avatar"
                    />
                  ) : (
                    <div
                      className="entity-grid-avatar"
                      style={{
                        background: isSuper ? 'linear-gradient(135deg, #7c3aed 0%, #581c87 100%)' : 'linear-gradient(135deg, #07345f 0%, #0b192c 100%)',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '15px'
                      }}
                    >
                      {initials}
                    </div>
                  )}

                  <div className="entity-grid-name" title={fullName}>
                    {fullName}
                  </div>

                  <div className="entity-grid-meta">
                    <div className="entity-grid-meta-primary" style={{ fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {admin.position || 'Admin Staff'}
                    </div>
                    <div className="entity-grid-meta-secondary" style={{ color: '#64748b', fontSize: '9.5px', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {admin.email}
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="entity-grid-actions">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(admin)}
                      className="entity-grid-btn"
                      title="Edit Admin Account"
                    >
                      <Edit3 size={11} strokeWidth={2.4} /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSingle(admin.id, fullName)}
                      className="entity-grid-btn is-delete"
                      title="Remove Admin Account"
                      style={{ flex: '0 0 28px', color: '#dc2626', borderColor: '#fecaca', background: '#fef2f2' }}
                    >
                      <Trash2 size={11} strokeWidth={2.4} />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            paginatedAdmins.map((admin) => {
              const isChecked = selectedIds.includes(admin.id);
              const fullName = `${admin.fname} ${admin.mname ? admin.mname + ' ' : ''}${admin.lname}`.trim();
              const initials = `${(admin.fname || 'A')[0]}${(admin.lname || 'U')[0]}`;
              const isSuper = admin.role === 'Head Admin' || admin.role === 'Super Admin' || admin.role === 'System Admin';

              return (
                <div
                  key={admin.id}
                  style={{
                    background: isChecked ? '#f8fafc' : '#ffffff',
                    border: isChecked ? '1.5px solid #07345f' : '1px solid #e2e8f0',
                    borderRadius: '14px',
                    padding: '14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                  }}
                  className={`admin-mobile-list-card${isChecked ? ' is-selected' : ''}`}
                >
                  {/* Top Header: Checkbox + Avatar + Name + Role Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSelect(admin.id)}
                        style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#07345f', flexShrink: 0 }}
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
                            background: isSuper ? 'linear-gradient(135deg, #7c3aed 0%, #581c87 100%)' : 'linear-gradient(135deg, #07345f 0%, #0b192c 100%)',
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
                        <div className="admin-mobile-list-name" style={{ fontWeight: 800, fontSize: '13.5px', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {fullName}
                        </div>
                        <div className="admin-mobile-list-position" style={{ fontSize: '11.5px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
                        background: isSuper ? '#f3e8ff' : '#f0f4f8',
                        color: isSuper ? '#7e22ce' : '#07345f',
                        whiteSpace: 'nowrap',
                        flexShrink: 0
                      }}
                    >
                      {admin.role === 'Super Admin' ? 'Head Admin' : (admin.role || 'Admin')}
                    </span>
                  </div>

                  {/* Middle Row: Email */}
                  <div className="admin-mobile-list-email" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#475569', background: '#f8fafc', padding: '6px 10px', borderRadius: '8px' }}>
                    <Mail size={13} color="#94a3b8" />
                    <span style={{ wordBreak: 'break-all' }}>{admin.email}</span>
                  </div>

                  {/* Actions Row */}
                  <div className="admin-mobile-list-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '4px', borderTop: '1px solid #f1f5f9' }}>
                    <button
                      onClick={() => handleOpenEdit(admin)}
                      className="admin-mobile-action"
                      style={{
                        background: '#f8fafc',
                        color: '#334155',
                        border: '1px solid #cbd5e1',
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
                      className="admin-mobile-action is-delete"
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
        <div className="pagination-footer-responsive table-footer admin-users-mobile-pagination" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '18px', flexWrap: 'wrap', gap: '10px' }}>
          <span style={{ fontSize: '13px', color: '#64748b' }}>
            Showing {filteredAndSorted.length === 0 ? 0 : (currentPage - 1) * entriesPerPage + 1} to{' '}
            {Math.min(currentPage * entriesPerPage, filteredAndSorted.length)} of {filteredAndSorted.length} administrators
          </span>

          <div className="pagination-btn-group" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
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
                aria-current={pageNum === currentPage ? 'page' : undefined}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: pageNum === currentPage ? '#0f172a' : '#ffffff',
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
            background: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3000,
            padding: '20px',
            willChange: 'opacity'
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}
        >
          <div
            style={{
              background: 'var(--bg-surface, #ffffff)',
              borderRadius: '18px',
              width: '100%',
              maxWidth: '540px',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.5)',
              border: '1px solid var(--border-subtle, #e2e8f0)',
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
                borderBottom: '1px solid var(--border-subtle, #f1f5f9)',
                background: 'var(--bg-surface, #ffffff)'
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--text-primary, #0f172a)', letterSpacing: '-0.3px' }}>
                  {editingAdmin ? 'Edit Administrator Details' : 'Add New Administrator'}
                </h3>
                <span style={{ fontSize: '12.5px', color: 'var(--text-muted, #64748b)' }}>
                  Configure credentials, system privileges & profile information
                </span>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle, transparent)',
                  background: 'var(--bg-surface-elevated, #f1f5f9)',
                  color: 'var(--text-muted, #64748b)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s'
                }}
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
                    <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary, #334155)', display: 'block', marginBottom: '6px' }}>
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
                        border: '1.5px solid var(--border-subtle, #cbd5e1)',
                        fontSize: '13.5px',
                        outline: 'none',
                        background: 'var(--bg-input, #ffffff)',
                        color: 'var(--text-primary, #0f172a)'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary, #334155)', display: 'block', marginBottom: '6px' }}>
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
                        border: '1.5px solid var(--border-subtle, #cbd5e1)',
                        fontSize: '13.5px',
                        outline: 'none',
                        background: 'var(--bg-input, #ffffff)',
                        color: 'var(--text-primary, #0f172a)'
                      }}
                    />
                  </div>
                </div>

                {/* Email & Position */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary, #334155)', display: 'block', marginBottom: '6px' }}>
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
                        border: '1.5px solid var(--border-subtle, #cbd5e1)',
                        fontSize: '13.5px',
                        outline: 'none',
                        background: 'var(--bg-input, #ffffff)',
                        color: 'var(--text-primary, #0f172a)'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary, #334155)', display: 'block', marginBottom: '6px' }}>
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
                        border: '1.5px solid var(--border-subtle, #cbd5e1)',
                        fontSize: '13.5px',
                        outline: 'none',
                        background: 'var(--bg-input, #ffffff)',
                        color: 'var(--text-primary, #0f172a)'
                      }}
                    />
                  </div>
                </div>

                {/* Access Role Selection Cards */}
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary, #334155)', display: 'block', marginBottom: '8px' }}>
                    Privilege Role <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    {[
                      { id: 'Head Admin', label: 'Head Admin', sub: 'Full System Access' },
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
                          border: formData.role === r.id ? '2px solid var(--brand-blue, #07345f)' : '1.5px solid var(--border-subtle, #e2e8f0)',
                          background: formData.role === r.id ? 'rgba(56, 189, 248, 0.15)' : 'var(--bg-surface-elevated, #f8fafc)',
                          textAlign: 'center',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <span style={{ fontSize: '12.5px', fontWeight: 800, color: formData.role === r.id ? 'var(--brand-blue, #1e1b4b)' : 'var(--text-primary, #334155)', display: 'block' }}>
                          {r.label}
                        </span>
                        <span style={{ fontSize: '10.5px', color: 'var(--text-muted, #64748b)' }}>{r.sub}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary, #334155)', display: 'block', marginBottom: '6px' }}>
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
                        border: '1.5px solid var(--border-subtle, #cbd5e1)',
                        fontSize: '13.5px',
                        outline: 'none',
                        background: 'var(--bg-input, #ffffff)',
                        color: 'var(--text-primary, #0f172a)'
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
                        color: 'var(--text-muted, #94a3b8)',
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
                  borderTop: '1px solid var(--border-subtle, #f1f5f9)',
                  background: 'var(--bg-surface-elevated, #f8fafc)'
                }}
              >
                <span style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)' }}>
                  <span style={{ color: '#ef4444' }}>*</span> Mandatory fields
                </span>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    style={{
                      padding: '9px 18px',
                      borderRadius: '9px',
                      background: 'var(--bg-surface, #ffffff)',
                      border: '1.5px solid var(--border-subtle, #cbd5e1)',
                      color: 'var(--text-secondary, #475569)',
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
                      background: 'var(--brand-blue, #0f172a)',
                      color: '#ffffff',
                      border: 'none',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 14px rgba(15, 23, 42, 0.3)'
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
        onImported={loadAdmins}
        initialFormat={bulkImportFormat}
      />

      {/* Save As / Export Modal */}
      <SaveAsModal
        isOpen={saveAsModalOpen}
        onClose={() => setSaveAsModalOpen(false)}
        defaultFilename={saveAsConfig.defaultFilename}
        defaultFormat={saveAsConfig.defaultFormat}
        availableFormats={saveAsConfig.availableFormats}
        headers={saveAsConfig.headers}
        rows={saveAsConfig.rows}
        generatePdfBlob={saveAsConfig.generatePdfBlob}
        userEmail={'viotrack.cloud@gmail.com'}
        title={saveAsConfig.title}
      />
    </div>
  );
};

export default AdminUsersPage;
