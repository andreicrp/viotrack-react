import React, { useState, useEffect, useMemo } from 'react';
import { dataService } from '../services/dataService';
import { useNotification } from '../context/NotificationContext';
import { Modal } from '../components/common/Modal';
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock';
import CustomSelect from '../components/common/CustomSelect';
import { ViewModeToggle } from '../components/common/ViewModeToggle';
import { BulkImportViolationsModal } from '../components/violations/BulkImportViolationsModal';
import {
  FolderOpen,
  Plus,
  FileSpreadsheet,
  Upload,
  Download,
  Search,
  Trash2,
  Edit3,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ShieldAlert,
  AlertTriangle,
  ShieldCheck,
  Gavel,
  List,
  CheckSquare,
  Square,
  X,
  FileDown,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Save
} from 'lucide-react';
import { getJsPDF } from '../utils/pdfHelper';
import { parseCsvString, readFileAsText, downloadSampleCsv } from '../utils/csvHelper';
import { SaveAsModal } from '../components/common/SaveAsModal';

export const ViolationTypesPage = () => {
  const { success, error, info } = useNotification();
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'grid'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedSeverityFilter, setSelectedSeverityFilter] = useState('all');
  const [saveAsModalOpen, setSaveAsModalOpen] = useState(false);
  const [saveAsConfig, setSaveAsConfig] = useState({
    defaultFilename: 'Viotrack_Violations_Catalog',
    defaultFormat: 'csv',
    availableFormats: ['csv', 'xlsx', 'pdf'],
    headers: [],
    rows: [],
    generatePdfBlob: null,
    title: 'Save Offenses Catalog As'
  });

  // Sorting state
  const [sortField, setSortField] = useState('title'); // 'title' | 'type' | 'default_sanction'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' | 'desc'

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);

  // Modal for Add/Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingViolation, setEditingViolation] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    type: '',
    description: '',
    default_sanction: ''
  });

  // Modal for Import CSV / PDF
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [bulkImportFormat, setBulkImportFormat] = useState('all'); // 'all' | 'pdf' | 'csv'

  useEffect(() => {
    loadViolations();
  }, []);

  useEffect(() => {
    if (isModalOpen) {
      lockBodyScroll();
      return () => unlockBodyScroll();
    }
  }, [isModalOpen]);

  const loadViolations = async () => {
    setLoading(true);
    try {
      const data = await dataService.getViolations();
      // Ensure each item has default_sanction if not present
      const enriched = (data || []).map(v => ({
        ...v,
        default_sanction: v.default_sanction || (v.type === 'Major' ? 'Disciplinary Board & Suspension' : v.type === 'Serious' ? 'Parent Summons & Counseling' : 'Verbal Warning & Reprimand')
      }));
      setViolations(enriched);
    } catch (err) {
      error('Failed to load violation categories: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Stats calculation
  const stats = {
    total: violations.length,
    major: violations.filter(v => v.type === 'Major').length,
    serious: violations.filter(v => v.type === 'Serious').length,
    minor: violations.filter(v => v.type === 'Minor').length
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

  // Filter & Sort Pipeline
  const filteredAndSorted = useMemo(() => {
    let result = violations.filter(v => {
      // Severity Filter from Stat Cards
      if (selectedSeverityFilter !== 'all' && v.type !== selectedSeverityFilter) {
        return false;
      }
      // Search query
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const titleMatch = (v.title || '').toLowerCase().includes(query);
        const descMatch = (v.description || '').toLowerCase().includes(query);
        const typeMatch = (v.type || '').toLowerCase().includes(query);
        const sanctionMatch = (v.default_sanction || '').toLowerCase().includes(query);
        return titleMatch || descMatch || typeMatch || sanctionMatch;
      }
      return true;
    });

    // Severity hierarchy map for sorting
    const severityWeight = { Major: 3, Serious: 2, Minor: 1 };

    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'title') {
        comparison = (a.title || '').localeCompare(b.title || '');
      } else if (sortField === 'type') {
        const weightA = severityWeight[a.type] || 0;
        const weightB = severityWeight[b.type] || 0;
        comparison = weightA - weightB;
      } else if (sortField === 'default_sanction') {
        comparison = (a.default_sanction || '').localeCompare(b.default_sanction || '');
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [violations, selectedSeverityFilter, searchTerm, sortField, sortOrder]);

  const totalPages = Math.ceil(filteredAndSorted.length / entriesPerPage) || 1;
  const paginated = filteredAndSorted.slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredAndSorted.map(v => v.id));
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
    if (window.confirm(`Are you sure you want to delete ${selectedIds.length} selected violation categories?`)) {
      try {
        for (const id of selectedIds) {
          await dataService.deleteViolationType(id);
        }
        setViolations(violations.filter(v => !selectedIds.includes(v.id)));
        setSelectedIds([]);
        success('Deleted selected violations.');
        loadViolations();
      } catch (err) {
        error('Failed to delete violation types: ' + err.message);
      }
    }
  };

  const handleDeleteSingle = async (id, title) => {
    if (window.confirm(`Are you sure you want to delete violation: "${title}"?`)) {
      try {
        await dataService.deleteViolationType(id);
        setViolations(violations.filter(v => v.id !== id));
        setSelectedIds(prev => prev.filter(x => x !== id));
        success('Violation category removed.');
        loadViolations();
      } catch (err) {
        error('Failed to remove violation category: ' + err.message);
      }
    }
  };

  const handleOpenAdd = () => {
    setEditingViolation(null);
    setFormData({
      title: '',
      type: '',
      description: '',
      default_sanction: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (violation) => {
    setEditingViolation(violation);
    setFormData({
      title: violation.title || '',
      type: violation.type || '',
      description: violation.description || '',
      default_sanction: violation.default_sanction || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      error('Violation title is required');
      return;
    }
    if (!formData.type) {
      error('Please select a violation type (Minor, Serious, or Major)');
      return;
    }

    try {
      if (editingViolation) {
        const saved = await dataService.updateViolationType(editingViolation.id, formData);
        setViolations(violations.map(v => v.id === editingViolation.id ? (saved || { ...v, ...formData }) : v));
        success(`Updated violation: "${formData.title}"`);
      } else {
        const newV = await dataService.addViolationType({
          ...formData,
          default_sanction: formData.default_sanction || (formData.type === 'Major' ? 'Disciplinary Hearing & Suspension' : formData.type === 'Serious' ? 'Parent Summons' : 'Written Warning')
        });
        setViolations([newV, ...violations]);
        success(`Added violation: "${formData.title}"`);
      }
      setIsModalOpen(false);
      loadViolations();
    } catch (err) {
      error('Failed to save violation category: ' + err.message);
    }
  };

  // Import CSV Handler
  const handleImportCsv = async () => {
    if (!importCsvText.trim()) {
      error('Please upload a CSV file or paste offense rows.');
      return;
    }

    try {
      const rows = parseCsvString(importCsvText);
      if (rows.length === 0) throw new Error('No valid CSV rows found.');

      const firstRow = rows[0];
      const hasHeader = firstRow.some(col => 
        ['title', 'offense', 'violation', 'type', 'severity'].includes(col.toLowerCase())
      );
      const dataRows = hasHeader ? rows.slice(1) : rows;

      if (dataRows.length === 0) throw new Error('No offense rows to import.');

      let addedCount = 0;
      const newItems = [];

      for (const parts of dataRows) {
        if (parts[0]?.trim()) {
          const title = parts[0].trim();
          const rawType = (parts[1] || 'Minor').trim();
          const type = ['Major', 'Serious', 'Minor'].find(t => t.toLowerCase() === rawType.toLowerCase()) || 'Minor';
          const description = parts[2]?.trim() || 'Policy infraction from imported handbook.';
          const default_sanction = parts[3]?.trim() || 'Standard handbook sanction';

          const created = await dataService.addViolationType({
            title,
            type,
            description,
            default_sanction
          });
          newItems.push(created);
          addedCount++;
        }
      }

      if (addedCount > 0) {
        setViolations(prev => [...newItems, ...prev]);
        success(`Successfully imported ${addedCount} violation categories!`);
        setIsImportModalOpen(false);
        setImportCsvText('');
      } else {
        error('No valid violation rows found in CSV format.');
      }
    } catch (err) {
      error('Import failed: ' + err.message);
    }
  };

  // Export via SaveAs
  const handleOpenExportSaveAs = (defaultFormat = 'csv') => {
    const headers = ['Title', 'Severity Type', 'Default Sanction', 'Description'];
    const rows = filteredAndSorted.map(v => [
      v.title,
      v.type,
      v.default_sanction || '',
      v.description || ''
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
      doc.text('Student Conduct Manual - Master Violation Offenses Catalog', 14, 18);

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(9);
      doc.text(`Total Configured Offenses: ${filteredAndSorted.length} | Generated: ${new Date().toLocaleDateString()}`, 14, 30);

      const tableData = filteredAndSorted.map(v => [
        v.title,
        v.type,
        v.default_sanction || 'Standard Sanction',
        v.description || 'N/A'
      ]);

      doc.autoTable({
        head: [['Violation Offense Title', 'Severity', 'Default Sanction / Consequence', 'Policy Scope']],
        body: tableData,
        startY: 34,
        theme: 'striped',
        headStyles: { fillColor: [39, 54, 127], fontStyle: 'bold' }
      });

      return doc.output('blob');
    };

    setSaveAsConfig({
      defaultFilename: `Viotrack_Violations_Catalog_${new Date().toISOString().slice(0, 10)}`,
      defaultFormat,
      availableFormats: ['csv', 'xlsx', 'pdf'],
      headers,
      rows,
      generatePdfBlob,
      title: 'Save Offenses Catalog As'
    });
    setSaveAsModalOpen(true);
  };

  // Render sort icon helper
  const renderSortIcon = (field) => {
    if (sortField !== field) {
      return <ArrowUpDown size={13} style={{ color: '#94a3b8', marginLeft: 4 }} />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp size={13} style={{ color: '#07345f', marginLeft: 4 }} />
    ) : (
      <ArrowDown size={13} style={{ color: '#07345f', marginLeft: 4 }} />
    );
  };

  return (
    <div className="violation-types-page" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* 1. Top Banner & Primary Actions */}
      <div className="page-banner-header">
        <div className="page-banner-info">
          <ShieldAlert size={26} strokeWidth={2.4} style={{ flexShrink: 0, color: 'var(--brand-blue, #07345f)' }} />
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: 'var(--text-primary, #0f172a)', letterSpacing: '-0.02em' }}>
              Violation Offenses Catalog
            </h2>
            <p style={{ margin: '3px 0 0 0', fontSize: '13px', color: 'var(--text-muted, #64748b)' }}>
              Student Code of Conduct &amp; Handbook Policies, sanctions, and severity classifications.
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="page-banner-actions">
          <div className="page-banner-secondary-group">
            <button
              onClick={() => handleOpenExportSaveAs('pdf')}
              className="page-banner-btn-secondary"
              title="Save As formatted PDF violation offenses catalog"
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
                setIsImportModalOpen(true);
              }}
              className="page-banner-btn-secondary"
              title="Import violation types from PDF policy handbook"
            >
              <Upload size={14} strokeWidth={2.2} /> Import PDF
            </button>

            <button
              onClick={() => {
                setBulkImportFormat('csv');
                setIsImportModalOpen(true);
              }}
              className="page-banner-btn-secondary"
              title="Import violation types from CSV spreadsheet"
            >
              <Upload size={14} strokeWidth={2.2} /> Import CSV
            </button>
          </div>

          <button
            onClick={handleOpenAdd}
            className="page-banner-primary-btn"
          >
            <Plus size={16} strokeWidth={2.5} /> Add Violation
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: '24px', background: 'var(--bg-surface, #ffffff)', borderRadius: '16px', border: '1px solid var(--border-subtle, #e2e8f0)', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)' }}>
        {/* 2. Four Interactive Stat Filter Cards */}
        <div className="metric-cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          {/* Total Filter Card */}
          <div
            onClick={() => setSelectedSeverityFilter('all')}
            style={{
              background: 'var(--bg-surface, #ffffff)',
              border: selectedSeverityFilter === 'all' ? '2px solid var(--brand-blue, #07345f)' : '1.5px solid var(--border-subtle, #cbd5e1)',
              borderRadius: '12px',
              padding: '14px 16px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: selectedSeverityFilter === 'all' ? '0 4px 14px rgba(7, 52, 95, 0.10)' : '0 1px 3px rgba(0,0,0,0.02)',
              position: 'relative'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '11.5px', fontWeight: 800, color: 'var(--brand-blue, #07345f)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  ALL OFFENSES
                </div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary, #0f172a)', margin: '4px 0 2px 0', lineHeight: 1.1 }}>
                  {stats.total}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', fontWeight: 500 }}>
                  Total catalog categories
                </div>
              </div>
              <List size={20} color="var(--brand-blue, #07345f)" strokeWidth={2} />
            </div>
          </div>

          {/* Minor Filter Card */}
          <div
            onClick={() => setSelectedSeverityFilter(selectedSeverityFilter === 'Minor' ? 'all' : 'Minor')}
            style={{
              background: 'var(--bg-surface, #ffffff)',
              border: selectedSeverityFilter === 'Minor' ? '2px solid var(--brand-blue, #07345f)' : '1.5px solid var(--border-subtle, #cbd5e1)',
              borderRadius: '12px',
              padding: '14px 16px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: selectedSeverityFilter === 'Minor' ? '0 4px 14px rgba(7, 52, 95, 0.10)' : '0 1px 3px rgba(0,0,0,0.02)',
              position: 'relative'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '11.5px', fontWeight: 800, color: 'var(--brand-blue, #07345f)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  MINOR OFFENSES
                </div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary, #0f172a)', margin: '4px 0 2px 0', lineHeight: 1.1 }}>
                  {stats.minor}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', fontWeight: 500 }}>
                  Warnings & compliance
                </div>
              </div>
              <ShieldCheck size={20} color="var(--brand-blue, #07345f)" strokeWidth={2} />
            </div>
          </div>

          {/* Serious Filter Card */}
          <div
            onClick={() => setSelectedSeverityFilter(selectedSeverityFilter === 'Serious' ? 'all' : 'Serious')}
            style={{
              background: 'var(--bg-surface, #ffffff)',
              border: selectedSeverityFilter === 'Serious' ? '2px solid var(--brand-blue, #07345f)' : '1.5px solid var(--border-subtle, #cbd5e1)',
              borderRadius: '12px',
              padding: '14px 16px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: selectedSeverityFilter === 'Serious' ? '0 4px 14px rgba(7, 52, 95, 0.10)' : '0 1px 3px rgba(0,0,0,0.02)',
              position: 'relative'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '11.5px', fontWeight: 800, color: 'var(--brand-blue, #07345f)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  SERIOUS OFFENSES
                </div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary, #0f172a)', margin: '4px 0 2px 0', lineHeight: 1.1 }}>
                  {stats.serious}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', fontWeight: 500 }}>
                  Conferences required
                </div>
              </div>
              <AlertTriangle size={20} color="var(--brand-blue, #07345f)" strokeWidth={2} />
            </div>
          </div>

          {/* Major Filter Card */}
          <div
            onClick={() => setSelectedSeverityFilter(selectedSeverityFilter === 'Major' ? 'all' : 'Major')}
            style={{
              background: 'var(--bg-surface, #ffffff)',
              border: selectedSeverityFilter === 'Major' ? '2px solid var(--brand-blue, #07345f)' : '1.5px solid var(--border-subtle, #cbd5e1)',
              borderRadius: '12px',
              padding: '14px 16px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: selectedSeverityFilter === 'Major' ? '0 4px 14px rgba(7, 52, 95, 0.10)' : '0 1px 3px rgba(0,0,0,0.02)',
              position: 'relative'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '11.5px', fontWeight: 800, color: 'var(--brand-blue, #07345f)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  MAJOR OFFENSES
                </div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary, #0f172a)', margin: '4px 0 2px 0', lineHeight: 1.1 }}>
                  {stats.major}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', fontWeight: 500 }}>
                  Formal hearings
                </div>
              </div>
              <ShieldAlert size={20} color="var(--brand-blue, #07345f)" strokeWidth={2} />
            </div>
          </div>
        </div>

        {/* 3. Search, Filter Controls & Floating Batch Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', flexWrap: 'wrap', gap: '12px' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', minWidth: '280px', flex: '1', maxWidth: '420px' }}>
            <Search size={16} color="var(--text-muted, #94a3b8)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search violation title, sanction, or keyword..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                borderRadius: '9px',
                border: '1.5px solid var(--border-subtle, #e2e8f0)',
                fontSize: '13px',
                background: 'var(--bg-input, #ffffff)',
                outline: 'none',
                color: 'var(--text-primary, #1f2937)'
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

          {/* Controls: Severity Tabs & Sort Menu */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '3px', background: 'var(--bg-surface-elevated, #f1f5f9)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-subtle, transparent)' }}>
              {[
                { id: 'all', label: `All (${stats.total})` },
                { id: 'Major', label: `Major (${stats.major})` },
                { id: 'Serious', label: `Serious (${stats.serious})` },
                { id: 'Minor', label: `Minor (${stats.minor})` }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedSeverityFilter(tab.id)}
                  style={{
                    border: 'none',
                    background: selectedSeverityFilter === tab.id ? 'var(--bg-surface, #ffffff)' : 'transparent',
                    color: selectedSeverityFilter === tab.id ? 'var(--brand-blue, #1e293b)' : 'var(--text-muted, #64748b)',
                    fontWeight: selectedSeverityFilter === tab.id ? 700 : 500,
                    fontSize: '12px',
                    padding: '5px 10px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    boxShadow: selectedSeverityFilter === tab.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div style={{ width: '130px', minWidth: '120px' }}>
              <CustomSelect
                value={entriesPerPage}
                onChange={(e) => {
                  setEntriesPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                options={[
                  { value: 10, label: '10 per page' },
                  { value: 25, label: '25 per page' },
                  { value: 50, label: '50 per page' },
                ]}
                size="sm"
              />
            </div>

            {/* List / Grid View Toggle */}
            <ViewModeToggle viewMode={viewMode} onChange={setViewMode} />
          </div>
        </div>

        {/* Batch Selection Action Bar (Appears when items are selected) */}
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
              gap: '10px',
              animation: 'fadeIn 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563eb' }} />
              {selectedIds.length} offense category(ies) selected
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

        {/* 4. Enhanced Violations Table with Sortable Columns (Desktop View) */}
        <div className={`responsive-table-desktop table-container ${viewMode === 'grid' ? 'force-hidden' : ''}`} style={{ marginTop: '16px', border: '1px solid var(--border-subtle, #e2e8f0)', borderRadius: '12px', overflow: 'hidden' }}>
          <table className="violation-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-surface-elevated, #f8fafc)', borderBottom: '1.5px solid var(--border-subtle, #e2e8f0)' }}>
                <th className="checkbox-col" style={{ width: 44, textAlign: 'center', padding: '14px 10px' }}>
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={selectedIds.length > 0 && selectedIds.length === filteredAndSorted.length}
                    style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--brand-blue, #07345f)' }}
                  />
                </th>

                {/* Sortable Column: Violation Title */}
                <th
                  onClick={() => handleSort('title')}
                  style={{
                    padding: '14px 16px',
                    fontSize: '12px',
                    fontWeight: 800,
                    color: 'var(--text-primary, #334155)',
                    cursor: 'pointer',
                    userSelect: 'none',
                    letterSpacing: '0.04em'
                  }}
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    VIOLATION OFFENSE {renderSortIcon('title')}
                  </div>
                </th>

                {/* Sortable Column: Severity Type */}
                <th
                  onClick={() => handleSort('type')}
                  style={{
                    padding: '14px 16px',
                    fontSize: '12px',
                    fontWeight: 800,
                    color: 'var(--text-primary, #334155)',
                    cursor: 'pointer',
                    userSelect: 'none',
                    letterSpacing: '0.04em',
                    width: '150px'
                  }}
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    SEVERITY {renderSortIcon('type')}
                  </div>
                </th>

                {/* Sortable Column: Sanction */}
                <th
                  onClick={() => handleSort('default_sanction')}
                  style={{
                    padding: '14px 16px',
                    fontSize: '12px',
                    fontWeight: 800,
                    color: 'var(--text-primary, #334155)',
                    cursor: 'pointer',
                    userSelect: 'none',
                    letterSpacing: '0.04em',
                    minWidth: '220px'
                  }}
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    DEFAULT SANCTION / ACTION {renderSortIcon('default_sanction')}
                  </div>
                </th>

                {/* Fixed Action Column */}
                <th
                  style={{
                    padding: '14px 16px',
                    fontSize: '12px',
                    fontWeight: 800,
                    color: 'var(--text-primary, #334155)',
                    textAlign: 'right',
                    letterSpacing: '0.04em',
                    width: '180px'
                  }}
                >
                  ACTIONS
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted, #94a3b8)' }}>
                    Loading handbook offenses...
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted, #94a3b8)' }}>
                    <AlertCircle size={32} color="#cbd5e1" style={{ margin: '0 auto 8px auto', display: 'block' }} />
                    No violation categories found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                paginated.map((v) => {
                  const isChecked = selectedIds.includes(v.id);
                  const isMajor = v.type === 'Major';
                  const isSerious = v.type === 'Serious';

                  return (
                    <tr
                      key={v.id}
                      style={{
                        borderBottom: '1px solid var(--border-subtle, #f1f5f9)',
                        background: isChecked ? 'var(--bg-surface-hover, #f8fafc)' : 'var(--bg-surface, #ffffff)',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      <td className="checkbox-col" style={{ textAlign: 'center', padding: '14px 10px' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelect(v.id)}
                          style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--brand-blue, #07345f)' }}
                        />
                      </td>

                      {/* Title & Description */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary, #0f172a)' }}>
                            {v.title}
                          </span>
                          <span style={{ fontSize: '12.5px', color: 'var(--text-muted, #64748b)', lineHeight: 1.4 }}>
                            {v.description || 'Standard handbook conduct policy infraction.'}
                          </span>
                        </div>
                      </td>

                      {/* Severity Badge */}
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          className={isMajor ? 'badge-major' : isSerious ? 'badge-serious' : 'badge-minor'}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '4px 10px',
                            borderRadius: '20px',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            background: isMajor ? 'rgba(239, 68, 68, 0.15)' : isSerious ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                            color: isMajor ? '#ef4444' : isSerious ? '#f59e0b' : '#10b981'
                          }}
                        >
                          {v.type || 'Minor'}
                        </span>
                      </td>

                      {/* Default Sanction Badge */}
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            fontSize: '12.5px',
                            color: 'var(--text-secondary, #334155)',
                            fontWeight: 600,
                            background: 'var(--bg-surface-elevated, #f8fafc)',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-subtle, #e2e8f0)',
                            display: 'inline-block'
                          }}
                        >
                          {v.default_sanction || '1st Warning / Conference'}
                        </span>
                      </td>

                      {/* Action Buttons (Fixed layout with non-truncated labels) */}
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                          <button
                            onClick={() => handleOpenEdit(v)}
                            style={{
                              background: 'var(--bg-surface-elevated, #f8fafc)',
                              color: 'var(--brand-blue, #07345f)',
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
                            <Edit3 size={13} strokeWidth={2} /> Edit
                          </button>

                          <button
                            onClick={() => handleDeleteSingle(v.id, v.title)}
                            style={{
                              background: '#ffffff',
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
                            onMouseOver={(e) => e.currentTarget.style.background = '#fef2f2'}
                            onMouseOut={(e) => e.currentTarget.style.background = '#ffffff'}
                          >
                            <Trash2 size={13} color="#dc2626" strokeWidth={2} /> Remove
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

        {/* Violations Cards (Mobile View) */}
        <div className={`responsive-cards-mobile ${viewMode === 'grid' ? 'grid-view' : 'list-view'}`} style={{ marginTop: '16px' }}>
          {paginated.length === 0 ? (
            <div style={{ padding: '30px 16px', textAlign: 'center', gridColumn: '1 / -1' }}>
              <AlertCircle size={28} color="#cbd5e1" style={{ margin: '0 auto 8px auto', display: 'block' }} />
              <div style={{ fontSize: '13.5px', color: '#64748b' }}>No offenses found.</div>
            </div>
          ) : viewMode === 'grid' ? (
            paginated.map((v) => {
              const isChecked = selectedIds.includes(v.id);
              const isMajor = v.type === 'Major';
              const isSerious = v.type === 'Serious';

              return (
                <div
                  key={v.id}
                  className={`entity-grid-card ${isChecked ? 'is-selected' : ''}`}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: '16px 18px',
                    borderRadius: '14px',
                    gap: '12px'
                  }}
                >
                  <div>
                    {/* Top Row: Select & Severity */}
                    <div className="entity-grid-top-badges" style={{ marginBottom: '10px' }}>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelect(v.id)}
                          style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#07345f' }}
                        />
                        <span style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8' }}>
                          #{v.id}
                        </span>
                      </label>
                      <span
                        className={isMajor ? 'badge-major' : isSerious ? 'badge-serious' : 'badge-minor'}
                        style={{
                          padding: '3px 10px',
                          borderRadius: '20px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: isMajor ? '#fef2f2' : isSerious ? '#fef9c3' : '#f0fdf4',
                          border: `1px solid ${isMajor ? '#fecaca' : isSerious ? '#fde047' : '#bbf7d0'}`,
                          color: isMajor ? '#dc2626' : isSerious ? '#a16207' : '#15803d',
                          display: 'inline-flex',
                          alignItems: 'center'
                        }}
                      >
                        {v.type || 'Minor'}
                      </span>
                    </div>

                    {/* Middle Offense Hero Header (Icon + Title) */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
                      <div
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: '12px',
                          background: isMajor ? 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)' : isSerious ? 'linear-gradient(135deg, #fef9c3 0%, #fef08a 100%)' : 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                          border: `1px solid ${isMajor ? '#fecaca' : isSerious ? '#fde047' : '#bbf7d0'}`,
                          color: isMajor ? '#dc2626' : isSerious ? '#a16207' : '#15803d',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        {isMajor ? (
                          <ShieldAlert size={20} strokeWidth={2.2} />
                        ) : isSerious ? (
                          <AlertTriangle size={20} strokeWidth={2.2} />
                        ) : (
                          <ShieldCheck size={20} strokeWidth={2.2} />
                        )}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4
                          className="violation-catalog-title"
                          style={{
                            margin: 0,
                            fontSize: '14.5px',
                            fontWeight: 700,
                            color: '#0f172a',
                            lineHeight: 1.35,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}
                          title={v.title}
                        >
                          {v.title}
                        </h4>
                      </div>
                    </div>

                    {/* Meta Details Box */}
                    <div
                      className="violation-catalog-meta"
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        padding: '10px 12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        textAlign: 'left'
                      }}
                    >
                      <div className="violation-catalog-sanction-row" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#475569' }}>
                        <Gavel className="violation-catalog-sanction-icon" size={13} color="#07345f" strokeWidth={2.2} />
                        <span className="violation-catalog-sanction-label" style={{ fontWeight: 600, color: '#64748b' }}>Sanction:</span>
                        <strong className="violation-catalog-sanction-value" style={{ color: '#07345f', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {v.default_sanction || '1st Warning'}
                        </strong>
                      </div>
                      <div
                        className="violation-catalog-description"
                        style={{
                          color: '#64748b',
                          fontSize: '11.5px',
                          lineHeight: 1.45,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}
                      >
                        {v.description || 'Institutional handbook offense guideline.'}
                      </div>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="entity-grid-actions" style={{ marginTop: '12px' }}>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(v)}
                      className="entity-grid-btn"
                      title="Edit Violation Type"
                    >
                      <Edit3 size={13} strokeWidth={2.2} /> Edit Details
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSingle(v.id, v.title)}
                      className="entity-grid-btn"
                      title="Delete Violation Type"
                      style={{ flex: '0 0 34px', color: '#dc2626', borderColor: '#fecaca', background: '#fef2f2' }}
                    >
                      <Trash2 size={13} strokeWidth={2.2} />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            paginated.map((v) => {
              const isChecked = selectedIds.includes(v.id);
              const isMajor = v.type === 'Major';
              const isSerious = v.type === 'Serious';

              return (
                <div
                  key={v.id}
                  className={`violation-catalog-list-card${isChecked ? ' is-selected' : ''}`}
                  style={{
                    background: isChecked ? '#f8fafc' : '#ffffff',
                    border: isChecked ? '1.5px solid #07345f' : '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSelect(v.id)}
                        style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#07345f' }}
                      />
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                        {v.title}
                      </span>
                    </div>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: isMajor ? '#fee2e2' : isSerious ? '#fef3c7' : '#dcfce7',
                        color: isMajor ? '#dc2626' : isSerious ? '#d97706' : '#15803d'
                      }}
                    >
                      {v.type || 'Minor'}
                    </span>
                  </div>

                  <p className="violation-catalog-mobile-description" style={{ margin: 0, fontSize: '12.5px', color: '#64748b', lineHeight: 1.4 }}>
                    {v.description || 'Standard handbook conduct policy infraction.'}
                  </p>

                  <div className="violation-catalog-mobile-sanction" style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: '6px', fontSize: '12px', color: '#334155' }}>
                    Sanction: <strong className="violation-catalog-sanction-value" style={{ color: '#07345f' }}>{v.default_sanction || '1st Warning / Conference'}</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', paddingTop: '4px', borderTop: '1px dashed #e2e8f0' }}>
                    <button
                      onClick={() => handleOpenEdit(v)}
                      style={{
                        background: '#f8fafc',
                        color: '#07345f',
                        border: '1px solid #cbd5e1',
                        padding: '5px 10px',
                        borderRadius: '6px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Edit3 size={12} color="#07345f" strokeWidth={2} /> Edit
                    </button>
                    <button
                      onClick={() => handleDeleteSingle(v.id, v.title)}
                      style={{
                        background: '#ffffff',
                        color: '#dc2626',
                        border: '1px solid #fecaca',
                        padding: '5px 10px',
                        borderRadius: '6px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Trash2 size={12} color="#dc2626" strokeWidth={2} /> Remove
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 5. Pagination Footer */}
        <div className="pagination-footer-responsive table-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '18px', flexWrap: 'wrap', gap: '10px' }}>
          <span style={{ fontSize: '13px', color: '#64748b' }}>
            Showing {filteredAndSorted.length === 0 ? 0 : (currentPage - 1) * entriesPerPage + 1} to{' '}
            {Math.min(currentPage * entriesPerPage, filteredAndSorted.length)} of {filteredAndSorted.length} entries
            {filteredAndSorted.length !== stats.total && ` (filtered from ${stats.total} total offenses)`}
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

      {/* Premium Add / Edit Violation Modal */}
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
              maxWidth: '560px',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.5)',
              border: '1px solid var(--border-subtle, #e2e8f0)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              animation: 'fadeInUp 0.25s ease-out'
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
                  {editingViolation ? 'Edit Violation Offense' : 'Add Violation Offense'}
                </h3>
                <span style={{ fontSize: '12.5px', color: 'var(--text-muted, #64748b)' }}>
                  Configure handbook policy, severity level & default sanction
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
              <div 
                className="smooth-scroll-container"
                style={{ 
                  padding: '22px 24px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '18px', 
                  maxHeight: '70vh', 
                  overflowY: 'auto',
                  WebkitOverflowScrolling: 'touch'
                }}
              >
                {/* Violation Title */}
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary, #334155)', display: 'block', marginBottom: '6px' }}>
                    Violation Title <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Drinking alcohol or possession of prohibited substances"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1.5px solid var(--border-subtle, #cbd5e1)',
                      fontSize: '13.5px',
                      color: 'var(--text-primary, #0f172a)',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                      background: 'var(--bg-input, #ffffff)'
                    }}
                  />
                </div>

                {/* Interactive Severity Selection Cards */}
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary, #334155)', display: 'block', marginBottom: '8px' }}>
                    Severity Classification <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                    {/* Minor Card */}
                    <div
                      onClick={() => setFormData({ ...formData, type: 'Minor' })}
                      style={{
                        padding: '12px 10px',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        border: formData.type === 'Minor' ? '2px solid #16a34a' : '1.5px solid var(--border-subtle, #e2e8f0)',
                        background: formData.type === 'Minor' ? 'rgba(22, 163, 74, 0.15)' : 'var(--bg-surface-elevated, #f8fafc)',
                        textAlign: 'center',
                        transition: 'all 0.15s ease',
                        boxShadow: formData.type === 'Minor' ? '0 4px 12px rgba(22, 163, 74, 0.15)' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '4px' }}>
                        <ShieldCheck size={20} color={formData.type === 'Minor' ? '#16a34a' : '#94a3b8'} />
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: formData.type === 'Minor' ? '#22c55e' : 'var(--text-secondary, #475569)', display: 'block' }}>
                        Minor
                      </span>
                      <span style={{ fontSize: '10.5px', color: 'var(--text-muted, #64748b)' }}>Uniform / ID / Tardy</span>
                    </div>

                    {/* Serious Card */}
                    <div
                      onClick={() => setFormData({ ...formData, type: 'Serious' })}
                      style={{
                        padding: '12px 10px',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        border: formData.type === 'Serious' ? '2px solid #d97706' : '1.5px solid var(--border-subtle, #e2e8f0)',
                        background: formData.type === 'Serious' ? 'rgba(217, 119, 6, 0.15)' : 'var(--bg-surface-elevated, #f8fafc)',
                        textAlign: 'center',
                        transition: 'all 0.15s ease',
                        boxShadow: formData.type === 'Serious' ? '0 4px 12px rgba(217, 119, 6, 0.15)' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '4px' }}>
                        <AlertTriangle size={20} color={formData.type === 'Serious' ? '#d97706' : '#94a3b8'} />
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: formData.type === 'Serious' ? '#f59e0b' : 'var(--text-secondary, #475569)', display: 'block' }}>
                        Serious
                      </span>
                      <span style={{ fontSize: '10.5px', color: 'var(--text-muted, #64748b)' }}>Disruption / Cutting</span>
                    </div>

                    {/* Major Card */}
                    <div
                      onClick={() => setFormData({ ...formData, type: 'Major' })}
                      style={{
                        padding: '12px 10px',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        border: formData.type === 'Major' ? '2px solid #dc2626' : '1.5px solid var(--border-subtle, #e2e8f0)',
                        background: formData.type === 'Major' ? 'rgba(220, 38, 38, 0.15)' : 'var(--bg-surface-elevated, #f8fafc)',
                        textAlign: 'center',
                        transition: 'all 0.15s ease',
                        boxShadow: formData.type === 'Major' ? '0 4px 12px rgba(220, 38, 38, 0.15)' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '4px' }}>
                        <ShieldAlert size={20} color={formData.type === 'Major' ? '#dc2626' : '#94a3b8'} />
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: formData.type === 'Major' ? '#ef4444' : 'var(--text-secondary, #475569)', display: 'block' }}>
                        Major
                      </span>
                      <span style={{ fontSize: '10.5px', color: 'var(--text-muted, #64748b)' }}>Weapons / Violence</span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary, #334155)', display: 'block', marginBottom: '6px' }}>
                    Policy Description & Scope <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Describe specific prohibited conduct, policy clause, and circumstances..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1.5px solid var(--border-subtle, #cbd5e1)',
                      fontSize: '13px',
                      color: 'var(--text-primary, #0f172a)',
                      outline: 'none',
                      resize: 'vertical',
                      background: 'var(--bg-input, #ffffff)'
                    }}
                  />
                </div>

                {/* Default Sanction / Consequence with Preset Chips */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary, #334155)' }}>
                      Default Sanction / Consequence
                    </label>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)' }}>Click presets to autofill:</span>
                  </div>

                  <input
                    type="text"
                    placeholder="e.g. 1st Offense: Written Reprimand & Notice to Parents"
                    value={formData.default_sanction}
                    onChange={(e) => setFormData({ ...formData, default_sanction: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1.5px solid var(--border-subtle, #cbd5e1)',
                      fontSize: '13px',
                      color: 'var(--text-primary, #0f172a)',
                      outline: 'none',
                      background: 'var(--bg-input, #ffffff)'
                    }}
                  />

                  {/* Suggestion Chips */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                    {[
                      'Written Warning & Reprimand',
                      'Parent Conference & Counseling',
                      '1-Day In-School Suspension',
                      '3-Day Suspension & Disciplinary Board',
                      'Community Service (4 hours)'
                    ].map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => setFormData({ ...formData, default_sanction: chip })}
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '3px 9px',
                          borderRadius: '12px',
                          border: '1px solid var(--border-subtle, #e2e8f0)',
                          background: 'var(--bg-surface-elevated, #f8fafc)',
                          color: 'var(--text-secondary, #475569)',
                          cursor: 'pointer',
                          transition: 'all 0.15s'
                        }}
                      >
                        + {chip}
                      </button>
                    ))}
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
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    style={{
                      padding: '9px 22px',
                      borderRadius: '9px',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: '#ffffff',
                      border: 'none',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                      transition: 'all 0.15s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    <Save size={16} />
                    <span>{editingViolation ? 'Save Changes' : 'Save Offense'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* Import CSV Modal */}
      {/* Bulk Import Violations Modal */}
      <BulkImportViolationsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImported={loadViolations}
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
