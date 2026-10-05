import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Bug, 
  FileQuestion, 
  Lock, 
  AlertTriangle, 
  ExternalLink, 
  CheckCircle,
  Flame,
  Layers,
  RotateCcw,
  Zap,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { NotFoundPage } from './NotFoundPage';
import { ForbiddenPage } from './ForbiddenPage';
import { ServerErrorPage } from './ServerErrorPage';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { runAll43SecurityChecks } from '../utils/securityAuditor';
import '../css/error-pages.css';

// Component that throws an error on demand
function CrashingBugComponent() {
  throw new Error(
    "🧪 Live ErrorBoundary Verification: Intentional JavaScript runtime exception generated at " + new Date().toLocaleTimeString() + " from the VioTrack Error Sandbox!"
  );
}

// In-sandbox crashing test widget
function LocalizedCrashTester() {
  const [hasCrashed, setHasCrashed] = useState(false);

  return (
    <div style={{ background: '#ffffff', borderRadius: '12px', padding: '16px 18px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Zap size={16} color="#dc2626" />
          <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
            Interactive ErrorBoundary Verification Sandbox
          </span>
        </div>
        <span style={{ fontSize: '11px', fontWeight: 700, background: '#fef2f2', color: '#b91c1c', padding: '2px 8px', borderRadius: '6px' }}>
          Isolated Sandbox
        </span>
      </div>
      <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 12px 0', lineHeight: 1.5 }}>
        Click the button below to render a broken React child component. The ErrorBoundary will intercept the crash right inside this container without unmounting the whole application.
      </p>

      <ErrorBoundary onReset={() => setHasCrashed(false)}>
        {hasCrashed ? (
          <CrashingBugComponent />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
              <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#15803d' }}>
                Component status: Healthy & Running
              </span>
            </div>
            <button
              type="button"
              onClick={() => setHasCrashed(true)}
              style={{
                background: '#dc2626',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '7px 14px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 6px rgba(220, 38, 38, 0.25)'
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = '#b91c1c')}
              onMouseOut={(e) => (e.currentTarget.style.background = '#dc2626')}
            >
              <Flame size={13} />
              <span>Crash Sandbox Component</span>
            </button>
          </div>
        )}
      </ErrorBoundary>
    </div>
  );
}

// 43-Point Security & Compliance Benchmark Test Runner
function SecurityAuditTester() {
  const [auditReport, setAuditReport] = useState(() => runAll43SecurityChecks());
  const [running, setRunning] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState('all');

  const handleRerun = () => {
    setRunning(true);
    setTimeout(() => {
      const report = runAll43SecurityChecks();
      setAuditReport(report);
      setRunning(false);
    }, 250);
  };

  const groups = ['all', ...Array.from(new Set(auditReport.results.map(r => r.group)))];
  const filteredResults = selectedGroup === 'all'
    ? auditReport.results
    : auditReport.results.filter(r => r.group === selectedGroup);

  return (
    <div style={{ background: '#ffffff', borderRadius: '14px', padding: '20px', border: '1px solid #e2e8f0' }}>
      {/* Header Summary Card */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', paddingBottom: '16px', borderBottom: '1px solid #f1f5f9' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={20} color="#10b981" />
            <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
              OWASP & RA 10173 43-Point Automated Security Benchmark
            </h3>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#64748b' }}>
            Real-time compliance suite verifying all 43 security, authentication, encryption, and concurrency checks.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '6px 14px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#059669' }}>
              Score: {auditReport.passedCount} / {auditReport.totalChecks} ({auditReport.score}%)
            </span>
            <span style={{ fontSize: '11px', fontWeight: 700, background: '#10b981', color: '#ffffff', padding: '2px 8px', borderRadius: '20px' }}>
              {auditReport.status}
            </span>
          </div>

          <button
            type="button"
            onClick={handleRerun}
            disabled={running}
            style={{
              background: '#07345f',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: running ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 6px rgba(7, 52, 95, 0.25)'
            }}
          >
            <RefreshCw size={13} className={running ? 'spin-anim' : ''} />
            <span>{running ? 'Verifying...' : 'Re-run 43 Checks'}</span>
          </button>
        </div>
      </div>

      {/* Category Filter Chips */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto', padding: '14px 0', borderBottom: '1px solid #f1f5f9' }}>
        {groups.map(grp => (
          <button
            key={grp}
            type="button"
            onClick={() => setSelectedGroup(grp)}
            style={{
              background: selectedGroup === grp ? '#07345f' : '#f8fafc',
              color: selectedGroup === grp ? '#ffffff' : '#475569',
              border: selectedGroup === grp ? '1px solid #07345f' : '1px solid #e2e8f0',
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '11.5px',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            {grp === 'all' ? `All Checks (${auditReport.totalChecks})` : grp}
          </button>
        ))}
      </div>

      {/* Check Items Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '10px', marginTop: '16px' }}>
        {filteredResults.map(check => (
          <div
            key={check.id}
            style={{
              padding: '12px 14px',
              borderRadius: '10px',
              background: check.passed ? '#f0fdf4' : '#fef2f2',
              border: check.passed ? '1px solid #bbf7d0' : '1px solid #fecaca',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: check.passed ? '#15803d' : '#b91c1c', background: '#ffffff', padding: '1px 6px', borderRadius: '4px', border: '1px solid currentColor' }}>
                  #{check.id}
                </span>
                <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#0f172a' }}>
                  {check.name}
                </span>
              </div>
              <span style={{ fontSize: '11px', fontWeight: 800, color: check.passed ? '#16a34a' : '#dc2626' }}>
                {check.passed ? 'PASSED' : 'FAILED'}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '11px', color: '#64748b', lineHeight: 1.4 }}>
              {check.description}
            </p>
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', marginTop: '2px' }}>
              Category: {check.group}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ErrorTestPage() {
  const [activeTab, setActiveTab] = useState('404');
  const [globalCrash, setGlobalCrash] = useState(false);
  const [isStandalonePreview, setIsStandalonePreview] = useState(false);

  // If user triggers the global application-level crash
  if (globalCrash) {
    return <CrashingBugComponent />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* 1. Header Banner */}
      <div className="page-banner-header">
        <div className="page-banner-info">
          <Bug size={26} color="#0f172a" strokeWidth={2.4} style={{ flexShrink: 0 }} />
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#0f172a', letterSpacing: '-0.02em' }}>
              Error Pages &amp; Boundary Workbench
            </h2>
            <p style={{ margin: '3px 0 0 0', fontSize: '13px', color: '#64748b' }}>
              Interactive test bench to inspect 404, 403, 500 views, and test live React ErrorBoundary recovery.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Control & Trigger Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
        {/* Card 1: 404 Trigger */}
        <div
          onClick={() => { setActiveTab('404'); setIsStandalonePreview(false); }}
          style={{
            background: activeTab === '404' ? '#eff6ff' : '#ffffff',
            border: activeTab === '404' ? '2px solid #2563eb' : '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '12px 14px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: activeTab === '404' ? '0 4px 12px rgba(37,99,235,0.12)' : '0 1px 3px rgba(0,0,0,0.03)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <FileQuestion size={17} color="#2563eb" />
              <span style={{ fontWeight: 800, fontSize: '13.5px', color: '#1e293b' }}>404 Not Found</span>
            </div>
            {activeTab === '404' && <CheckCircle size={14} color="#2563eb" />}
          </div>
          <p style={{ margin: 0, fontSize: '11.5px', color: '#64748b' }}>
            Preview missing route view.
          </p>
          <div style={{ marginTop: '8px' }}>
            <Link
              to="/broken-test-route"
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#2563eb',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                textDecoration: 'none'
              }}
            >
              <span>Test Live URL</span>
              <ExternalLink size={10} />
            </Link>
          </div>
        </div>

        {/* Card 2: 403 Forbidden */}
        <div
          onClick={() => { setActiveTab('403'); setIsStandalonePreview(false); }}
          style={{
            background: activeTab === '403' ? '#fff1f2' : '#ffffff',
            border: activeTab === '403' ? '2px solid #e11d48' : '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '12px 14px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: activeTab === '403' ? '0 4px 12px rgba(225,29,72,0.12)' : '0 1px 3px rgba(0,0,0,0.03)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <Lock size={17} color="#e11d48" />
              <span style={{ fontWeight: 800, fontSize: '13.5px', color: '#1e293b' }}>403 Forbidden</span>
            </div>
            {activeTab === '403' && <CheckCircle size={14} color="#e11d48" />}
          </div>
          <p style={{ margin: 0, fontSize: '11.5px', color: '#64748b' }}>
            Preview access restriction view.
          </p>
          <div style={{ marginTop: '8px' }}>
            <Link
              to="/forbidden"
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#e11d48',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                textDecoration: 'none'
              }}
            >
              <span>Test Live URL</span>
              <ExternalLink size={10} />
            </Link>
          </div>
        </div>

        {/* Card 3: 500 Server Error */}
        <div
          onClick={() => { setActiveTab('500'); setIsStandalonePreview(false); }}
          style={{
            background: activeTab === '500' ? '#fffbeb' : '#ffffff',
            border: activeTab === '500' ? '2px solid #d97706' : '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '12px 14px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: activeTab === '500' ? '0 4px 12px rgba(217,119,6,0.12)' : '0 1px 3px rgba(0,0,0,0.03)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <AlertTriangle size={17} color="#d97706" />
              <span style={{ fontWeight: 800, fontSize: '13.5px', color: '#1e293b' }}>500 Server Error</span>
            </div>
            {activeTab === '500' && <CheckCircle size={14} color="#d97706" />}
          </div>
          <p style={{ margin: 0, fontSize: '11.5px', color: '#64748b' }}>
            Preview diagnostic stack view.
          </p>
          <div style={{ marginTop: '8px' }}>
            <Link
              to="/500"
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#d97706',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                textDecoration: 'none'
              }}
            >
              <span>Test Live URL</span>
              <ExternalLink size={10} />
            </Link>
          </div>
        </div>

        {/* Card 4: 43-Point Security Audit */}
        <div
          onClick={() => { setActiveTab('security'); setIsStandalonePreview(false); }}
          style={{
            background: activeTab === 'security' ? '#ecfdf5' : '#ffffff',
            border: activeTab === 'security' ? '2px solid #10b981' : '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '12px 14px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: activeTab === 'security' ? '0 4px 12px rgba(16,185,129,0.15)' : '0 1px 3px rgba(0,0,0,0.03)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <Sparkles size={17} color="#10b981" />
              <span style={{ fontWeight: 800, fontSize: '13.5px', color: '#065f46' }}>43-Point Security Audit</span>
            </div>
            {activeTab === 'security' && <CheckCircle size={14} color="#10b981" />}
          </div>
          <p style={{ margin: 0, fontSize: '11.5px', color: '#64748b' }}>
            OWASP & RA 10173 automated verification.
          </p>
          <div style={{ marginTop: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span>43 / 43 Automated Checks</span>
            </span>
          </div>
        </div>

        {/* Card 4: Global App Crash Trigger */}
        <div
          style={{
            background: '#ffffff',
            border: '1.5px dashed #f87171',
            borderRadius: '12px',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '4px' }}>
              <Flame size={17} color="#dc2626" />
              <span style={{ fontWeight: 800, fontSize: '13.5px', color: '#dc2626' }}>Global App Crash</span>
            </div>
            <p style={{ margin: 0, fontSize: '11.5px', color: '#64748b' }}>
              Throws an unhandled top-level exception.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setGlobalCrash(true)}
            style={{
              marginTop: '8px',
              background: '#dc2626',
              color: '#ffffff',
              border: 'none',
              borderRadius: '7px',
              padding: '6px 10px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px'
            }}
          >
            <Flame size={12} />
            <span>Trigger Full Crash</span>
          </button>
        </div>
      </div>

      {/* 3. Localized In-Page Crash Sandbox Test */}
      <LocalizedCrashTester />

      {/* 4. Live Embedded Preview Stage */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          overflow: 'hidden'
        }}
      >
        {/* Preview Stage Bar */}
        <div
          style={{
            padding: '10px 16px',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={15} color="#07345f" />
            <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#0f172a' }}>
              Preview: {activeTab === '404' ? '404 Not Found' : activeTab === '403' ? '403 Forbidden' : activeTab === 'security' ? '43-Point Security & Compliance Suite' : '500 Internal Error'}
            </span>
            <span
              style={{
                fontSize: '10.5px',
                fontWeight: 700,
                background: isStandalonePreview ? '#07345f' : '#e2e8f0',
                color: isStandalonePreview ? '#ffffff' : '#475569',
                padding: '2px 7px',
                borderRadius: '5px'
              }}
            >
              {isStandalonePreview ? 'Standalone Mode' : 'Layout Mode'}
            </span>
          </div>

          {activeTab !== 'security' && (
            <button
              type="button"
              onClick={() => setIsStandalonePreview(!isStandalonePreview)}
              style={{
                background: isStandalonePreview ? '#eff6ff' : '#ffffff',
                border: isStandalonePreview ? '1.5px solid #3b82f6' : '1px solid #cbd5e1',
                color: isStandalonePreview ? '#1d4ed8' : '#334155',
                padding: '4.5px 10px',
                borderRadius: '6px',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <RotateCcw size={11} />
              <span>Toggle Standalone Background</span>
            </button>
          )}
        </div>

        {/* Render Active Component */}
        <div style={{ padding: '16px 8px', background: isStandalonePreview ? 'radial-gradient(circle at 50% 35%, #ffffff 0%, #edf3f8 100%)' : '#f8fafc' }}>
          {activeTab === 'security' && <SecurityAuditTester />}
          {activeTab === '404' && <NotFoundPage standalone={isStandalonePreview} />}
          {activeTab === '403' && <ForbiddenPage standalone={isStandalonePreview} />}
          {activeTab === '500' && (
            <ServerErrorPage
              standalone={isStandalonePreview}
              error={new Error("Simulated Database Timeout: Database query connection terminated at /src/services/api.js:84:12")}
              errorInfo={{
                componentStack: `\n    at ErrorTestPage (file:///c:/Users/andre/Downloads/Viotrack_React/src/pages/ErrorTestPage.jsx:42:10)\n    at RenderedRoute (file:///c:/Users/andre/Downloads/Viotrack_React/node_modules/react-router/dist/production/index.mjs:423:15)`
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default ErrorTestPage;
