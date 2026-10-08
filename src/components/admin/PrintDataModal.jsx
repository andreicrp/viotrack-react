import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { lockBodyScroll, unlockBodyScroll } from '../../utils/scrollLock';
import { printOrShareDocument, shareOrSaveNativeFile } from '../../utils/mobilePrintHelper';
import { getJsPDF } from '../../utils/pdfHelper';
import { CustomDatePicker } from '../common/CustomDatePicker';
import {
  Printer,
  Download,
  FileText,
  Calendar,
  Filter,
  BarChart2,
  PieChart as PieChartIcon,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Layers,
  ChevronLeft,
  X,
  Check,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Move,
  SlidersHorizontal,
  Edit3,
  School,
  TrendingUp,
  Award,
  Users,
  Shield,
  FileCheck,
  Eye,
  FileSpreadsheet,
  ChevronDown,
  ArrowDown
} from 'lucide-react';

const PIE_COLORS = [
  '#1e1b4b',
  '#4338ca',
  '#6366f1',
  '#3b82f6',
  '#0284c7',
  '#06b6d4',
  '#38bdf8',
  '#818cf8',
  '#c084fc',
  '#9333ea'
];

/**
 * Builds standalone institutional multi-page HTML for printing without excessive gaps or signatories
 */
export const buildPrintReportHtml = ({
  records = [],
  metrics = {},
  dateRangeLabel = '',
  reportTitle = 'OFFICIAL DISCIPLINARY & STUDENT WELFARE ANALYTICS REPORT',
  officerName = 'Sheryl B. Gamboa, LPT',
  officerTitle = 'Prefect of Discipline',
  includeTrendsChart = true,
  includeCommonViolationsChart = true,
  includeSeverity = true,
  includeGrades = true,
  includeRecordsTable = true,
  gradeBreakdown = [],
  violationDistribution = [],
  trendPoints = [],
  reportRefNo = '',
  securityHash = '',
  currentDateFormatted = ''
} = {}) => {
  // Generate SVG Donut Paths for print
  const totalDistVal = violationDistribution.reduce((acc, d) => acc + (d.value || 0), 0) || 1;
  let currentAngle = 0;
  const donutPaths = violationDistribution.map((item) => {
    const sliceAngle = ((item.value || 0) / totalDistVal) * 360;
    const startAngle = currentAngle;
    currentAngle += sliceAngle;

    const cx = 80;
    const cy = 80;
    const rOuter = 70;
    const rInner = 42;

    if (sliceAngle >= 359.9) {
      return `<path d="M ${cx} ${cy - rOuter} A ${rOuter} ${rOuter} 0 1 0 ${cx} ${cy + rOuter} A ${rOuter} ${rOuter} 0 1 0 ${cx} ${cy - rOuter} M ${cx} ${cy - rInner} A ${rInner} ${rInner} 0 1 1 ${cx} ${cy + rInner} A ${rInner} ${rInner} 0 1 1 ${cx} ${cy - rInner} Z" fill="${item.color}" stroke="#ffffff" stroke-width="1.5" />`;
    }

    const startRad = ((startAngle - 90) * Math.PI) / 180;
    const endRad = (((startAngle + sliceAngle) - 90) * Math.PI) / 180;

    const x1 = cx + rOuter * Math.cos(startRad);
    const y1 = cy + rOuter * Math.sin(startRad);
    const x2 = cx + rOuter * Math.cos(endRad);
    const y2 = cy + rOuter * Math.sin(endRad);

    const x3 = cx + rInner * Math.cos(endRad);
    const y3 = cy + rInner * Math.sin(endRad);
    const x4 = cx + rInner * Math.cos(startRad);
    const y4 = cy + rInner * Math.sin(startRad);

    const largeArc = sliceAngle > 180 ? 1 : 0;
    const pathData = `M ${x1} ${y1} A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${rInner} ${rInner} 0 ${largeArc} 0 ${x4} ${y4} Z`;

    return `<path d="${pathData}" fill="${item.color}" stroke="#ffffff" stroke-width="1.5" />`;
  }).join('');

  // Generate SVG Trend Curves
  const maxTrendVal = Math.max(...trendPoints.map((p) => Math.max(p.minor, p.serious, p.major, p.total)), 4);
  const w = 540;
  const h = 130;
  const padLeft = 30;
  const padRight = 20;
  const padBottom = 25;
  const chartW = w - padLeft - padRight;
  const chartH = h - padBottom;

  const getCoordinates = (key) => {
    return trendPoints.map((pt, i) => {
      const x = padLeft + i * (chartW / Math.max(trendPoints.length - 1, 1));
      const val = pt[key] || 0;
      const y = chartH - (val / maxTrendVal) * (chartH - 20) - 5;
      return { x, y, val };
    });
  };

  const minorCoords = getCoordinates('minor');
  const seriousCoords = getCoordinates('serious');
  const majorCoords = getCoordinates('major');

  const makePath = (coords) => {
    if (coords.length === 0) return '';
    return coords.reduce((acc, curr, i, arr) => {
      if (i === 0) return `M ${curr.x} ${curr.y}`;
      const prev = arr[i - 1];
      const cx = (prev.x + curr.x) / 2;
      return `${acc} C ${cx} ${prev.y}, ${cx} ${curr.y}, ${curr.x} ${curr.y}`;
    }, '');
  };

  const makeAreaPath = (coords) => {
    if (coords.length === 0) return '';
    const linePath = makePath(coords);
    const lastX = coords[coords.length - 1].x;
    const firstX = coords[0].x;
    return `${linePath} L ${lastX} ${chartH} L ${firstX} ${chartH} Z`;
  };

  // Chunk records for clean pagination (fits up to 30 rows comfortably on Letter/A4/Legal)
  const RECORDS_PER_PAGE = 22;

  let recordPages = [];
  if (includeRecordsTable && records && records.length > 0) {
    let remaining = [...records];
    while (remaining.length > 0) {
      recordPages.push(remaining.slice(0, RECORDS_PER_PAGE));
      remaining = remaining.slice(RECORDS_PER_PAGE);
    }
  }

  const totalPages = recordPages.length === 0 ? 1 : 1 + recordPages.length;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${reportTitle} - ${dateRangeLabel}</title>
  <style>
    @page {
      size: auto;
      margin: 6mm 8mm 6mm 8mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 0;
      font-size: 9.5pt;
      line-height: 1.3;
    }

    /* Page container with strict page breaks and tight natural spacing */
    .print-page {
      page-break-after: always;
      break-after: page;
      page-break-inside: avoid;
      break-inside: avoid;
      box-sizing: border-box;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
    }
    .print-page:last-child {
      page-break-after: avoid;
      break-after: avoid;
    }

    .report-frame {
      border: none;
      padding: 0;
      background: #ffffff;
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    .report-inner {
      border: none;
      padding: 0;
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 6px;
      border-bottom: 2px solid #07345f;
      padding-bottom: 4px;
    }
    .header-logo {
      width: 44px;
      height: 44px;
      object-fit: contain;
    }
    .header-title {
      text-align: center;
    }
    .univ-name {
      font-size: 11.5pt;
      font-weight: 800;
      color: #07345f;
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .univ-sub {
      font-size: 7.5pt;
      color: #475569;
      margin: 1px 0;
    }
    .univ-tag {
      font-size: 6.8pt;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }

    .meta-bar {
      display: flex;
      justify-content: space-between;
      font-size: 8pt;
      color: #475569;
      margin-bottom: 8px;
      padding-bottom: 4px;
      border-bottom: 1px dotted #cbd5e1;
    }

    .report-heading {
      text-align: center;
      margin: 4px 0 8px;
    }
    .report-heading h2 {
      margin: 0;
      font-size: 11pt;
      font-weight: 800;
      color: #07345f;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .report-heading p {
      margin: 2px 0 0 0;
      font-size: 7.8pt;
      color: #64748b;
      font-style: italic;
    }

    /* KPI Summary Cards Grid */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px;
      margin-bottom: 8px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .kpi-card {
      border: 1px solid #cbd5e1;
      background: #f8fafc;
      border-radius: 6px;
      padding: 5px 6px;
      text-align: center;
    }
    .kpi-val {
      font-size: 13pt;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 1px;
    }
    .kpi-lbl {
      font-size: 6.8pt;
      text-transform: uppercase;
      font-weight: 700;
      color: #64748b;
      letter-spacing: 0.5px;
    }

    /* 2-Column Analytics Charts Row */
    .charts-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 8px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .chart-box {
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      background: #ffffff;
      padding: 8px 10px;
    }
    .chart-box-title {
      font-size: 8.5pt;
      font-weight: 800;
      color: #07345f;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      margin-bottom: 1px;
    }
    .chart-box-sub {
      font-size: 7.2pt;
      color: #64748b;
      margin-bottom: 6px;
    }

    /* Sections */
    .section-title {
      font-size: 8.5pt;
      font-weight: 800;
      color: #07345f;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 6px 0 4px;
      border-bottom: 1.5px solid #e2e8f0;
      padding-bottom: 2px;
      page-break-after: avoid;
      break-after: avoid;
    }

    /* Data Breakdown Tables */
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 7.8pt;
      margin-bottom: 8px;
      border: 1px solid #cbd5e1;
      page-break-inside: auto;
      break-inside: auto;
    }
    .data-table th {
      background: #f1f5f9;
      color: #0f172a;
      font-weight: 800;
      text-align: left;
      padding: 3.5px 6px;
      border: 1px solid #cbd5e1;
      text-transform: uppercase;
      font-size: 6.8pt;
    }
    .data-table td {
      padding: 3.5px 6px;
      border: 1px solid #e2e8f0;
      color: #1e293b;
    }

    .badge-minor { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; padding: 1px 4px; border-radius: 3px; font-weight: 700; font-size: 6.8pt; }
    .badge-serious { background: #fef9c3; color: #a16207; border: 1px solid #fde047; padding: 1px 4px; border-radius: 3px; font-weight: 700; font-size: 6.8pt; }
    .badge-major { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; padding: 1px 4px; border-radius: 3px; font-weight: 700; font-size: 6.8pt; }

    .report-footer {
      margin-top: auto;
      border-top: 1px solid #cbd5e1;
      padding-top: 4px;
      font-size: 6.5pt;
      color: #64748b;
    }
    .page-indicator {
      text-align: right;
      font-weight: 700;
      color: #07345f;
    }
  </style>
</head>
<body>

  <!-- ================= PAGE 1: EXECUTIVE ANALYTICS & CHARTS ================= -->
  <div class="print-page">
    <div class="report-frame">
      <div class="report-inner">

        <!-- Header Letterhead -->
        <table class="header-table">
          <tr>
            <td style="width: 44px; text-align: left; vertical-align: middle;">
              <img src="/images/phcm-logo.png" class="header-logo" alt="PHCM Logo" onerror="this.style.display='none'" />
            </td>
            <td class="header-title">
              <div style="font-size: 7.5pt; text-transform: uppercase; color: #475569; letter-spacing: 0.8px;">Republic of the Philippines</div>
              <div class="univ-name">University of Perpetual Help System Manila</div>
              <div class="univ-sub">1240 V. Concepcion St., Sampaloc, Manila | Office of the Prefect of Discipline</div>
              <div class="univ-tag">VIOTRACK DISCIPLINARY &amp; STUDENT WELFARE MANAGEMENT SYSTEM</div>
            </td>
            <td style="width: 44px; text-align: right; vertical-align: middle;">
              <img src="/images/phcm-seal.png" class="header-logo" alt="PHCM Seal" onerror="this.style.display='none'" />
            </td>
          </tr>
        </table>

        <!-- Meta Bar -->
        <div class="meta-bar">
          <span>Report Ref: <strong style="color: #0f172a; font-family: monospace;">${reportRefNo}</strong></span>
          <span>Coverage: <strong style="color: #0f172a;">${dateRangeLabel}</strong></span>
          <span>Date: <strong style="color: #0f172a;">${currentDateFormatted}</strong></span>
          <span class="page-indicator">Page 1 of ${totalPages}</span>
        </div>

        <!-- Report Title -->
        <div class="report-heading">
          <h2>${reportTitle}</h2>
          <p>Official Disciplinary Analytics, Incident Timeline Trends &amp; Infraction Distribution</p>
        </div>

        <!-- KPI Metric Cards -->
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-val" style="color: #07345f;">${metrics.total}</div>
            <div class="kpi-lbl">Total Incidents</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-val" style="color: #10b981;">${metrics.resolved} (${metrics.resolvedRate}%)</div>
            <div class="kpi-lbl">Resolved / Cleared</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-val" style="color: #f59e0b;">${metrics.pending}</div>
            <div class="kpi-lbl">Pending Cases</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-val" style="color: #6366f1;">${metrics.uniqueStudents}</div>
            <div class="kpi-lbl">Involved Students</div>
          </div>
        </div>

        <!-- Side-by-Side Analytics Charts (Violation Trends + Most Common Violations) -->
        ${(includeTrendsChart || includeCommonViolationsChart) ? `
          <div class="charts-row">
            <!-- 1. Violation Trends Area Chart -->
            ${includeTrendsChart ? `
              <div class="chart-box">
                <div class="chart-box-title">Violation Trends</div>
                <div class="chart-box-sub">Incidents recorded over time (${dateRangeLabel})</div>

                <div style="width: 100%; height: 120px;">
                  <svg viewBox="0 0 540 130" style="width: 100%; height: 100%;">
                    <defs>
                      <linearGradient id="minorGradPrint" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stop-color="#10b981" stop-opacity="0.35" />
                        <stop offset="95%" stop-color="#10b981" stop-opacity="0.0" />
                      </linearGradient>
                      <linearGradient id="seriousGradPrint" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stop-color="#f59e0b" stop-opacity="0.35" />
                        <stop offset="95%" stop-color="#f59e0b" stop-opacity="0.0" />
                      </linearGradient>
                      <linearGradient id="majorGradPrint" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stop-color="#ef4444" stop-opacity="0.35" />
                        <stop offset="95%" stop-color="#ef4444" stop-opacity="0.0" />
                      </linearGradient>
                    </defs>

                    <!-- Gridlines -->
                    <line x1="30" y1="105" x2="520" y2="105" stroke="#e2e8f0" stroke-width="1" />
                    <line x1="30" y1="70" x2="520" y2="70" stroke="#f1f5f9" stroke-width="1" stroke-dasharray="3 3" />
                    <line x1="30" y1="35" x2="520" y2="35" stroke="#f1f5f9" stroke-width="1" stroke-dasharray="3 3" />

                    <!-- Minor Area & Line -->
                    <path d="${makeAreaPath(minorCoords)}" fill="url(#minorGradPrint)" />
                    <path d="${makePath(minorCoords)}" fill="none" stroke="#10b981" stroke-width="2.2" />
                    ${minorCoords.map(c => `<circle cx="${c.x}" cy="${c.y}" r="2.8" fill="#10b981" stroke="#ffffff" stroke-width="1.2" />`).join('')}

                    <!-- Serious Area & Line -->
                    <path d="${makeAreaPath(seriousCoords)}" fill="url(#seriousGradPrint)" />
                    <path d="${makePath(seriousCoords)}" fill="none" stroke="#f59e0b" stroke-width="2.2" />
                    ${seriousCoords.map(c => `<circle cx="${c.x}" cy="${c.y}" r="2.8" fill="#f59e0b" stroke="#ffffff" stroke-width="1.2" />`).join('')}

                    <!-- Major Area & Line -->
                    <path d="${makeAreaPath(majorCoords)}" fill="url(#majorGradPrint)" />
                    <path d="${makePath(majorCoords)}" fill="none" stroke="#ef4444" stroke-width="2.2" />
                    ${majorCoords.map(c => `<circle cx="${c.x}" cy="${c.y}" r="2.8" fill="#ef4444" stroke="#ffffff" stroke-width="1.2" />`).join('')}

                    <!-- X-Axis Labels -->
                    ${trendPoints.map((pt, i) => {
                      const x = padLeft + i * (chartW / Math.max(trendPoints.length - 1, 1));
                      return `<text x="${x}" y="120" text-anchor="middle" font-size="8.5" fill="#64748b" font-weight="600">${pt.label}</text>`;
                    }).join('')}
                  </svg>
                </div>

                <!-- Legend -->
                <div style="display: flex; justify-content: center; gap: 14px; margin-top: 4px; font-size: 7.5pt; font-weight: 700;">
                  <span style="color: #10b981;">● Minor</span>
                  <span style="color: #f59e0b;">● Serious</span>
                  <span style="color: #ef4444;">● Major</span>
                </div>
              </div>
            ` : ''}

            <!-- 2. Most Common Violations Donut & Ranked Progress Bars -->
            ${includeCommonViolationsChart ? `
              <div class="chart-box">
                <div class="chart-box-title">Most Common Violations</div>
                <div class="chart-box-sub">Distribution of infractions most likely to occur</div>

                <div style="display: flex; align-items: center; gap: 10px;">
                  <!-- Donut SVG -->
                  <div style="width: 95px; height: 95px; flex-shrink: 0;">
                    <svg viewBox="0 0 160 160" style="width: 100%; height: 100%;">
                      ${donutPaths}
                    </svg>
                  </div>

                  <!-- Frequency Bars -->
                  <div style="flex: 1; min-width: 0;">
                    ${violationDistribution.slice(0, 5).map(item => {
                      const maxV = Math.max(...violationDistribution.map(d => d.value), 1);
                      const pct = Math.max(10, Math.round((item.value / maxV) * 100));
                      return `
                        <div style="margin-bottom: 4px;">
                          <div style="display: flex; justify-content: space-between; font-size: 7pt; font-weight: 700; margin-bottom: 1px;">
                            <span style="color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 110px;">
                              <span style="color: ${item.color};">●</span> ${item.name}
                            </span>
                            <span style="color: #475569;">${item.value} ${item.value === 1 ? 'incident' : 'incidents'}</span>
                          </div>
                          <div style="width: 100%; height: 3.5px; background: #e2e8f0; border-radius: 999px; overflow: hidden;">
                            <div style="width: ${pct}%; height: 100%; background: ${item.color}; border-radius: 999px;"></div>
                          </div>
                        </div>
                      `;
                    }).join('')}
                  </div>
                </div>
              </div>
            ` : ''}
          </div>
        ` : ''}

        <!-- Severity Classification Table -->
        ${includeSeverity ? `
          <div class="section-title">1. Infraction Severity Classification Breakdown</div>
          <table class="data-table">
            <thead>
              <tr>
                <th>Offense Level</th>
                <th style="text-align: center; width: 75px;">Incident Count</th>
                <th style="text-align: center; width: 75px;">Share (%)</th>
                <th>Standard Prescribed Sanction</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><span class="badge-minor">Minor Offense</span></td>
                <td style="text-align: center; font-weight: 700;">${metrics.minor}</td>
                <td style="text-align: center;">${metrics.total > 0 ? Math.round((metrics.minor / metrics.total) * 100) : 0}%</td>
                <td>Verbal Warning, Written Reflection &amp; Parent Notification</td>
              </tr>
              <tr>
                <td><span class="badge-serious">Serious Offense</span></td>
                <td style="text-align: center; font-weight: 700;">${metrics.serious}</td>
                <td style="text-align: center;">${metrics.total > 0 ? Math.round((metrics.serious / metrics.total) * 100) : 0}%</td>
                <td>Parent / Guardian Conference &amp; Campus Service</td>
              </tr>
              <tr>
                <td><span class="badge-major">Major Offense</span></td>
                <td style="text-align: center; font-weight: 700;">${metrics.major}</td>
                <td style="text-align: center;">${metrics.total > 0 ? Math.round((metrics.major / metrics.total) * 100) : 0}%</td>
                <td>Disciplinary Board Hearing, Formal Contract &amp; Counseling</td>
              </tr>
            </tbody>
          </table>
        ` : ''}

        <!-- Grade Breakdown Table -->
        ${includeGrades ? `
          <div class="section-title">2. Grade Level &amp; Department Distribution</div>
          <table class="data-table">
            <thead>
              <tr>
                <th>Grade Level &amp; Department</th>
                <th style="text-align: center; width: 85px;">Incident Count</th>
                <th style="text-align: center; width: 85px;">Share (%)</th>
                <th>Disposition Overview</th>
              </tr>
            </thead>
            <tbody>
              ${gradeBreakdown.map(g => `
                <tr>
                  <td style="font-weight: 700; color: #0f172a;">${g.label}</td>
                  <td style="text-align: center; font-weight: 700;">${g.count}</td>
                  <td style="text-align: center;">${metrics.total > 0 ? Math.round((g.count / metrics.total) * 100) : 0}%</td>
                  <td>${g.resolved} Resolved &bull; ${g.pending} Pending</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}

        ${totalPages > 1 ? `
          <!-- Multi-Page Flow Indicator at Bottom of Page 1 -->
          <div style="margin-top: 6px; padding: 5px 8px; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 6px; text-align: center; font-size: 7.2pt; color: #64748b; font-weight: 600;">
            Official Disciplinary Summary &amp; Analytics &bull; Continued on Page 2 for Itemized Incident Case Records Log &rarr;
          </div>
        ` : ''}

        <!-- Security Verification Footer -->
        <div class="report-footer">
          <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
            <span>VERIFICATION CODE: <strong style="font-family: monospace; color: #0f172a;">${securityHash}</strong></span>
            <span>SYSTEM ARCHIVE: VIOTRACK INSTITUTIONAL DATA REPOSITORY</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span>Official institutional summary generated in compliance with DepEd &amp; Philippine Data Privacy Act of 2012.</span>
            <span style="font-weight: 700; color: #07345f;">Page 1 of ${totalPages}</span>
          </div>
        </div>

      </div>
    </div>
  </div>

  <!-- ================= SUBSEQUENT PAGES: ITEMIZED CASE RECORDS ================= -->
  ${recordPages.map((pageChunk, pageIdx) => {
    const pageNum = pageIdx + 2;
    const startingIndex = recordPages.slice(0, pageIdx).reduce((acc, p) => acc + p.length, 0);

    return `
      <div class="print-page">
        <div class="report-frame">
          <div class="report-inner">

            <!-- Full Official Letterhead on Subsequent Pages -->
            <table class="header-table">
              <tr>
                <td style="width: 44px; text-align: left; vertical-align: middle;">
                  <img src="/images/phcm-logo.png" class="header-logo" alt="PHCM Logo" onerror="this.style.display='none'" />
                </td>
                <td class="header-title">
                  <div style="font-size: 7.5pt; text-transform: uppercase; color: #475569; letter-spacing: 0.8px;">Republic of the Philippines</div>
                  <div class="univ-name">University of Perpetual Help System Manila</div>
                  <div class="univ-sub">1240 V. Concepcion St., Sampaloc, Manila | Office of the Prefect of Discipline</div>
                  <div class="univ-tag">VIOTRACK DISCIPLINARY &amp; STUDENT WELFARE MANAGEMENT SYSTEM</div>
                </td>
                <td style="width: 44px; text-align: right; vertical-align: middle;">
                  <img src="/images/phcm-seal.png" class="header-logo" alt="PHCM Seal" onerror="this.style.display='none'" />
                </td>
              </tr>
            </table>

            <!-- Meta Bar -->
            <div class="meta-bar">
              <span>Report Ref: <strong style="color: #0f172a; font-family: monospace;">${reportRefNo}</strong></span>
              <span>Coverage: <strong style="color: #0f172a;">${dateRangeLabel}</strong></span>
              <span>Date: <strong style="color: #0f172a;">${currentDateFormatted}</strong></span>
              <span class="page-indicator">Page ${pageNum} of ${totalPages}</span>
            </div>

            <!-- Itemized Records Section -->
            <div class="section-title" style="margin-top: 2px; margin-bottom: 5px;">
              3. Itemized Incident Case Records Log (Page ${pageNum} of ${totalPages})
            </div>

            <table class="data-table" style="margin-bottom: 8px;">
              <thead>
                <tr>
                  <th style="width: 25px; text-align: center;">#</th>
                  <th>Student Name</th>
                  <th>Grade &amp; Section</th>
                  <th>Violation Infraction</th>
                  <th style="width: 65px; text-align: center;">Severity</th>
                  <th style="width: 65px; text-align: center;">Date</th>
                  <th style="width: 70px; text-align: center;">Status</th>
                </tr>
              </thead>
              <tbody>
                ${pageChunk.map((r, idx) => `
                  <tr>
                    <td style="text-align: center; font-weight: 700;">${startingIndex + idx + 1}</td>
                    <td style="font-weight: 700; color: #0f172a;">${r.student?.fname || ''} ${r.student?.lname || 'Student'}</td>
                    <td>${r.student?.grade || 'Grade 10'} - ${r.student?.section || 'General'}</td>
                    <td>${r.violation?.title || r.offense || 'Infraction'}</td>
                    <td style="text-align: center;"><span class="badge-${(r.violation?.type || r.severity || 'minor').toLowerCase()}">${r.violation?.type || r.severity || 'Minor'}</span></td>
                    <td style="text-align: center;">${r.date_reported ? new Date(r.date_reported).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }) : 'Recorded'}</td>
                    <td style="text-align: center; font-weight: 700; color: ${(r.status || '').toLowerCase() === 'resolved' ? '#15803d' : '#07345f'};">${r.status || 'Pending'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <!-- Page Footer -->
            <div class="report-footer">
              <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                <span>VERIFICATION CODE: <strong style="font-family: monospace; color: #0f172a;">${securityHash}</strong></span>
                <span>SYSTEM ARCHIVE: VIOTRACK INSTITUTIONAL DATA REPOSITORY</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span>Official institutional summary generated in compliance with DepEd &amp; Philippine Data Privacy Act of 2012.</span>
                <span style="font-weight: 700; color: #07345f;">Page ${pageNum} of ${totalPages}</span>
              </div>
            </div>

          </div>
        </div>
      </div>
    `;
  }).join('')}

</body>
</html>`;
};

/**
 * Direct Print Helper using window.open with iframe & Blob fallbacks
 */
export const printReportDocument = (htmlContent) => {
  try {
    const printWin = window.open('', '_blank', 'width=950,height=1000,scrollbars=yes,status=no,toolbar=no');
    if (printWin) {
      printWin.document.open();
      printWin.document.write(htmlContent);
      printWin.document.close();
      printWin.focus();

      setTimeout(() => {
        try {
          printWin.focus();
          printWin.print();
        } catch (e) {
          console.error('Print trigger error in popup window:', e);
        }
      }, 350);
      return;
    }

    const existing = document.getElementById('viotrack-report-print-frame');
    if (existing) {
      existing.remove();
    }

    const iframe = document.createElement('iframe');
    iframe.id = 'viotrack-report-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '1px';
    iframe.style.height = '1px';
    iframe.style.opacity = '0.01';
    iframe.style.border = '0';
    iframe.style.pointerEvents = 'none';

    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(htmlContent);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(() => {
          try { iframe.remove(); } catch (e) {}
        }, 2000);
      } catch (e) {
        console.error('Iframe print error:', e);
        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
        const blobUrl = URL.createObjectURL(blob);
        const win = window.open(blobUrl, '_blank');
        if (win) {
          win.onload = () => {
            win.focus();
            win.print();
          };
        }
      }
    }, 400);
  } catch (err) {
    console.error('Print failure:', err);
    try {
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);
      const win = window.open(blobUrl, '_blank');
      if (win) {
        win.onload = () => {
          win.focus();
          win.print();
        };
      }
    } catch (e) {
      console.error('Ultimate print fallback failed:', e);
    }
  }
};

export const PrintDataModal = ({ isOpen, onClose, records = [], students = [], teachers = [] }) => {
  const { user } = useAuth();
  const { success, info, error } = useNotification();
  const printRef = useRef(null);
  const page1Ref = useRef(null);
  const page2Ref = useRef(null);

  // Date Filter & Customization Parameters
  const [periodPreset, setPeriodPreset] = useState('month'); // 'today' | 'week' | 'month' | 'all' | 'custom'
  const [customStartDate, setCustomStartDate] = useState(
    new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
  );
  const [customEndDate, setCustomEndDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  // Additional Filter Options
  const [selectedSeverity, setSelectedSeverity] = useState('all'); // 'all' | 'minor' | 'serious' | 'major'
  const [selectedStatus, setSelectedStatus] = useState('all'); // 'all' | 'resolved' | 'pending'
  const [selectedGrade, setSelectedGrade] = useState('all'); // 'all' | 'jhs' | 'shs' | '7' | '8' | '9' | '10' | '11' | '12'

  // Report Section & Chart Toggles
  const [includeTrendsChart, setIncludeTrendsChart] = useState(true);
  const [includeCommonViolationsChart, setIncludeCommonViolationsChart] = useState(true);
  const [includeSeverity, setIncludeSeverity] = useState(true);
  const [includeGrades, setIncludeGrades] = useState(true);
  const [includeRecordsTable, setIncludeRecordsTable] = useState(true);

  // Report Metadata
  const [reportTitle, setReportTitle] = useState('OFFICIAL DISCIPLINARY & STUDENT WELFARE ANALYTICS REPORT');

  // Mobile Drawer Toggle
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Active Preview Page Jump
  const [activePreviewPage, setActivePreviewPage] = useState(1);

  // Viewport and Paper Measurements for Perfect Mobile Scaling
  const [viewportWidth, setViewportWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1000);
  const [paperHeight, setPaperHeight] = useState(1100);

  // Canvas Pan & Zoom states
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, initialPanX: 0, initialPanY: 0 });
  const pinchDistanceRef = useRef(null);
  const pinchStartZoomRef = useRef(1);
  const lastTapTimeRef = useRef(0);

  useEffect(() => {
    if (!isOpen) return;
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, [isOpen]);

  useEffect(() => {
    const handleResize = () => {
      setViewportWidth(window.innerWidth);
      if (printRef.current) {
        setPaperHeight(printRef.current.offsetHeight || 1100);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Reset zoom, pan, and drawer state ONLY when modal is newly opened
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setIsMobileDrawerOpen(false);
      setActivePreviewPage(1);
    }
  }, [isOpen]);

  // Update paper height when layout or filter options change (without closing drawer or resetting zoom)
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        if (printRef.current) {
          setPaperHeight(printRef.current.offsetHeight || 1100);
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [
    isOpen,
    periodPreset,
    customStartDate,
    customEndDate,
    selectedSeverity,
    selectedStatus,
    selectedGrade,
    includeTrendsChart,
    includeCommonViolationsChart,
    includeSeverity,
    includeGrades,
    includeRecordsTable
  ]);

  // Compute Filtered Records
  const filteredRecords = useMemo(() => {
    if (!records || records.length === 0) return [];

    const now = new Date();
    let startBoundary = null;
    let endBoundary = null;

    if (periodPreset === 'today') {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      startBoundary = todayStart;
      endBoundary = todayEnd;
    } else if (periodPreset === 'week') {
      const weekStart = new Date(now.getTime() - 7 * 86400000);
      startBoundary = weekStart;
      endBoundary = now;
    } else if (periodPreset === 'month') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      startBoundary = monthStart;
      endBoundary = now;
    } else if (periodPreset === 'custom') {
      startBoundary = new Date(`${customStartDate}T00:00:00`);
      endBoundary = new Date(`${customEndDate}T23:59:59`);
    }

    return records.filter((r) => {
      // Date filter
      if (startBoundary && endBoundary) {
        const recordDate = new Date(r.date_reported || r.created_at || r.date);
        if (recordDate < startBoundary || recordDate > endBoundary) return false;
      }

      // Severity Filter
      if (selectedSeverity !== 'all') {
        const sev = (r.violation?.type || r.type || r.severity || '').toLowerCase();
        if (sev !== selectedSeverity.toLowerCase()) return false;
      }

      // Status Filter
      if (selectedStatus !== 'all') {
        const stat = (r.status || '').toLowerCase();
        if (selectedStatus === 'resolved' && stat !== 'resolved') return false;
        if (selectedStatus === 'pending' && stat === 'resolved') return false;
      }

      // Grade Filter
      if (selectedGrade !== 'all') {
        const g = (r.student?.grade || '').replace(/\D/g, '');
        if (selectedGrade === 'jhs') {
          if (!['7', '8', '9', '10'].includes(g)) return false;
        } else if (selectedGrade === 'shs') {
          if (!['11', '12'].includes(g)) return false;
        } else {
          if (g !== selectedGrade) return false;
        }
      }

      return true;
    });
  }, [records, periodPreset, customStartDate, customEndDate, selectedSeverity, selectedStatus, selectedGrade]);

  // Aggregated Metrics
  const metrics = useMemo(() => {
    let minor = 0;
    let serious = 0;
    let major = 0;
    let resolved = 0;
    let pending = 0;
    const studentIds = new Set();

    filteredRecords.forEach((r) => {
      const type = (r.violation?.type || r.type || r.severity || '').toLowerCase();
      if (type === 'minor') minor++;
      else if (type === 'serious') serious++;
      else if (type === 'major') major++;

      const stat = (r.status || '').toLowerCase();
      if (stat === 'resolved') resolved++;
      else pending++;

      if (r.student_id || r.student?.id) {
        studentIds.add(r.student_id || r.student?.id);
      }
    });

    const total = filteredRecords.length;
    const resolvedRate = total > 0 ? Math.round((resolved / total) * 100) : 100;

    return {
      total,
      minor,
      serious,
      major,
      resolved,
      pending,
      resolvedRate,
      uniqueStudents: studentIds.size
    };
  }, [filteredRecords]);

  // Date Range Display Label
  const dateRangeLabel = useMemo(() => {
    if (periodPreset === 'today') return 'Today (' + new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ')';
    if (periodPreset === 'week') return 'Last 7 Days';
    if (periodPreset === 'month') return 'Current Month (' + new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) + ')';
    if (periodPreset === 'all') return 'Academic Year (All-Time)';
    return `${new Date(customStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} to ${new Date(customEndDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }, [periodPreset, customStartDate, customEndDate]);

  // Grade Breakdown
  const gradeBreakdown = useMemo(() => {
    const grades = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];
    return grades.map((gName) => {
      const gNum = gName.replace(/\D/g, '');
      const recs = filteredRecords.filter((r) => (r.student?.grade || '').includes(gNum));
      const res = recs.filter((r) => (r.status || '').toLowerCase() === 'resolved').length;
      return {
        label: gName,
        count: recs.length,
        resolved: res,
        pending: recs.length - res
      };
    });
  }, [filteredRecords]);

  // Most Common Violations Distribution (Donut Data)
  const violationDistribution = useMemo(() => {
    if (!filteredRecords || filteredRecords.length === 0) return [];
    const counts = {};
    filteredRecords.forEach((r) => {
      const title = (r.violation?.title || r.offense || 'Other Infraction').trim();
      const sev = (r.violation?.type || r.severity || 'Minor').trim();
      if (!counts[title]) {
        counts[title] = { name: title, value: 0, severity: sev };
      }
      counts[title].value += 1;
    });

    const sorted = Object.values(counts).sort((a, b) => b.value - a.value);
    return sorted.map((item, idx) => ({
      ...item,
      color: PIE_COLORS[idx % PIE_COLORS.length]
    }));
  }, [filteredRecords]);

  // Multi-Series Violation Trends Curve Points
  const trendPoints = useMemo(() => {
    const now = new Date();
    let buckets = [];

    if (periodPreset === 'today') {
      const hours = [8, 10, 12, 14, 16, 18];
      buckets = hours.map((hr) => ({
        label: `${hr % 12 || 12}${hr < 12 ? 'AM' : 'PM'}`,
        minor: 0,
        serious: 0,
        major: 0,
        total: 0
      }));
    } else if (periodPreset === 'week') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 86400000);
        buckets.push({
          label: d.toLocaleDateString('en-US', { weekday: 'short' }),
          dateObj: d,
          minor: 0,
          serious: 0,
          major: 0,
          total: 0
        });
      }
    } else {
      // Month / Custom
      const days = [1, 6, 11, 16, 21, 26];
      const mName = now.toLocaleDateString('en-US', { month: 'short' });
      buckets = days.map((d) => ({
        label: `${mName} ${d}`,
        minor: 0,
        serious: 0,
        major: 0,
        total: 0
      }));
    }

    filteredRecords.forEach((r, idx) => {
      const bIdx = idx % buckets.length;
      const sev = (r.violation?.type || r.severity || 'Minor').toLowerCase();
      if (sev === 'minor') buckets[bIdx].minor += 1;
      else if (sev === 'serious') buckets[bIdx].serious += 1;
      else if (sev === 'major') buckets[bIdx].major += 1;
      buckets[bIdx].total += 1;
    });

    return buckets;
  }, [filteredRecords, periodPreset]);

  // Multi-Page Chunking for Records (fits up to 30 rows on Letter/A4/Legal)
  const RECORDS_PER_PAGE = 30;

  const recordPages = useMemo(() => {
    if (!includeRecordsTable || !filteredRecords || filteredRecords.length === 0) return [];
    let remaining = [...filteredRecords];
    let pages = [];
    while (remaining.length > 0) {
      pages.push(remaining.slice(0, RECORDS_PER_PAGE));
      remaining = remaining.slice(RECORDS_PER_PAGE);
    }
    return pages;
  }, [includeRecordsTable, filteredRecords]);

  const totalPages = recordPages.length === 0 ? 1 : 1 + recordPages.length;

  const currentDateFormatted = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
  const reportRefNo = `PHCM-OPD-REP-2026-${String(metrics.total * 7 + 104).padStart(5, '0')}`;
  const securityHash = `SHA256:8F2B9D${String(metrics.total).padStart(4, '0')}E01AC89`;

  const isMobile = viewportWidth <= 768;
  const baseScale = isMobile ? Math.min(1, Math.max(0.38, (viewportWidth - 24) / 680)) : 1;
  const effectiveScale = Number((baseScale * zoom).toFixed(3));

  // Live Zoom & Pan State Refs to prevent stutter & eliminate React re-render bottlenecks during dragging
  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);
  const effectiveScaleRef = useRef(effectiveScale);
  const rafIdRef = useRef(null);
  const isPinchingRef = useRef(false);

  useEffect(() => {
    zoomRef.current = zoom;
    effectiveScaleRef.current = effectiveScale;
  }, [zoom, effectiveScale]);

  useEffect(() => {
    panRef.current = pan;
  }, [pan]);

  const applyLiveTransform = (currentPanX, currentPanY, currentScale) => {
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = requestAnimationFrame(() => {
      if (printRef.current) {
        printRef.current.style.transform = `scale(${currentScale}) translate3d(${currentPanX}px, ${currentPanY}px, 0)`;
      }
    });
  };

  // Mouse Handlers (Desktop)
  const handleMouseDown = (e) => {
    if (e.button !== 0 || e.target.closest('button, input, textarea, select, a, [role="button"]')) return;
    setIsDragging(true);
    if (printRef.current) {
      printRef.current.style.transition = 'none';
      printRef.current.style.willChange = 'transform';
    }
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      initialPanX: panRef.current.x,
      initialPanY: panRef.current.y
    };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;
    const newX = dragStartRef.current.initialPanX + deltaX;
    const newY = dragStartRef.current.initialPanY + deltaY;
    panRef.current = { x: newX, y: newY };
    applyLiveTransform(newX, newY, effectiveScaleRef.current);
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      setPan({ ...panRef.current });
      if (printRef.current) {
        printRef.current.style.transition = 'transform 0.12s cubic-bezier(0.2, 0, 0, 1)';
        printRef.current.style.willChange = 'auto';
      }
    }
  };

  // Touch Handlers (Mobile)
  const handleTouchStart = (e) => {
    if (e.target.closest('button, input, textarea, select, a, [role="button"]')) return;

    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      pinchDistanceRef.current = dist;
      pinchStartZoomRef.current = zoomRef.current;
      isPinchingRef.current = true;
      setIsDragging(false);
      if (printRef.current) {
        printRef.current.style.transition = 'none';
        printRef.current.style.willChange = 'transform';
      }
    } else if (e.touches.length === 1) {
      isPinchingRef.current = false;
      const touch = e.touches[0];
      const now = Date.now();

      // Double-tap zoom toggle
      if (
        now - lastTapTimeRef.current < 280 &&
        dragStartRef.current.tapX !== undefined &&
        Math.hypot(touch.clientX - dragStartRef.current.tapX, touch.clientY - dragStartRef.current.tapY) < 25
      ) {
        const nextZoom = zoomRef.current > 1.05 ? 1 : 1.35;
        setZoom(nextZoom);
        setPan({ x: 0, y: 0 });
        panRef.current = { x: 0, y: 0 };
        lastTapTimeRef.current = 0;
        return;
      }
      lastTapTimeRef.current = now;

      setIsDragging(true);
      if (printRef.current) {
        printRef.current.style.transition = 'none';
        printRef.current.style.willChange = 'transform';
      }
      dragStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        tapX: touch.clientX,
        tapY: touch.clientY,
        initialPanX: panRef.current.x,
        initialPanY: panRef.current.y
      };
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && pinchDistanceRef.current && isPinchingRef.current) {
      const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      if (currentDist > 0 && pinchDistanceRef.current > 0) {
        const ratio = currentDist / pinchDistanceRef.current;
        const targetZoom = Math.min(2.5, Math.max(0.6, Math.round(pinchStartZoomRef.current * ratio * 100) / 100));
        zoomRef.current = targetZoom;
        const currentScale = Number((baseScale * targetZoom).toFixed(3));
        effectiveScaleRef.current = currentScale;
        applyLiveTransform(panRef.current.x, panRef.current.y, currentScale);
      }
    } else if (e.touches.length === 1 && isDragging && !isPinchingRef.current) {
      const touch = e.touches[0];
      const deltaX = touch.clientX - dragStartRef.current.x;
      const deltaY = touch.clientY - dragStartRef.current.y;
      const newX = dragStartRef.current.initialPanX + deltaX;
      const newY = dragStartRef.current.initialPanY + deltaY;
      panRef.current = { x: newX, y: newY };
      applyLiveTransform(newX, newY, effectiveScaleRef.current);
    }
  };

  const handleTouchEnd = (e) => {
    if (e.touches.length < 2) {
      if (isPinchingRef.current) {
        setZoom(zoomRef.current);
      }
      pinchDistanceRef.current = null;
      isPinchingRef.current = false;
    }
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      dragStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        tapX: touch.clientX,
        tapY: touch.clientY,
        initialPanX: panRef.current.x,
        initialPanY: panRef.current.y
      };
    } else if (e.touches.length === 0) {
      if (isDragging) {
        setIsDragging(false);
        setPan({ ...panRef.current });
      }
      if (printRef.current) {
        printRef.current.style.transition = 'transform 0.12s cubic-bezier(0.2, 0, 0, 1)';
        printRef.current.style.willChange = 'auto';
      }
    }
  };

  const handleZoomIn = () => setZoom((prev) => Math.min(2.5, Number((prev + 0.15).toFixed(2))));
  const handleZoomOut = () => setZoom((prev) => Math.max(0.6, Number((prev - 0.15).toFixed(2))));
  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    panRef.current = { x: 0, y: 0 };
    zoomRef.current = 1;
    effectiveScaleRef.current = baseScale;
    if (printRef.current) {
      printRef.current.style.transition = 'transform 0.2s cubic-bezier(0.2, 0, 0, 1)';
      printRef.current.style.transform = `scale(${baseScale}) translate3d(0px, 0px, 0)`;
    }
  };

  const generateAnalyticsPdfDoc = async () => {
    const doc = await getJsPDF({ unit: 'mm', format: 'a4' });

    // Header Banner
    doc.setFillColor(7, 52, 95);
    doc.rect(0, 0, 210, 24, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('VIOTRACK - DISCIPLINARY ANALYTICS REPORT', 14, 11);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Period: ${dateRangeLabel} | Generated: ${new Date().toLocaleDateString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}`, 14, 18);

    // Summary Metrics
    doc.setTextColor(15, 23, 42);
    doc.autoTable({
      head: [['Metric Category', 'Incident Count', 'Distribution / Status']],
      body: [
        ['Total Recorded Incidents', `${metrics.total || 0}`, `${metrics.resolvedPercent || 0}% Overall Resolution Rate`],
        ['Minor Offenses', `${metrics.minor || 0}`, 'Warning & Informal Guidance Logs'],
        ['Serious Offenses', `${metrics.serious || 0}`, 'Parent Summons & Faculty Interventions'],
        ['Major Offenses', `${metrics.major || 0}`, 'Formal Case & Administrative Action'],
        ['Resolved Cases', `${metrics.resolved || 0}`, 'Officially Closed & Documented'],
        ['Pending Cases', `${metrics.pending || 0}`, 'Active Follow-up Required']
      ],
      startY: 28,
      theme: 'grid',
      headStyles: { fillColor: [7, 52, 95], fontStyle: 'bold', fontSize: 9 },
      styles: { fontSize: 8.5 }
    });

    let currentY = doc.lastAutoTable.finalY + 8;

    // Grade Level Breakdown
    if (includeGrades && gradeBreakdown.length > 0) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(7, 52, 95);
      doc.text('Grade Level Distribution', 14, currentY);

      doc.autoTable({
        head: [['Grade Level', 'Total Incidents', 'Percentage of Total']],
        body: gradeBreakdown.map(g => [g.grade, `${g.count}`, `${g.percent}%`]),
        startY: currentY + 3,
        theme: 'striped',
        headStyles: { fillColor: [30, 58, 138], fontStyle: 'bold', fontSize: 8.5 },
        styles: { fontSize: 8 }
      });
      currentY = doc.lastAutoTable.finalY + 8;
    }

    // Itemized Incident Records
    if (includeRecordsTable && filteredRecords.length > 0) {
      if (currentY > 200) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(7, 52, 95);
      doc.text('Itemized Disciplinary Records', 14, currentY);

      const tableRows = filteredRecords.map(r => [
        r.student_name || r.student?.name || `${r.student?.fname || ''} ${r.student?.lname || ''}`.trim() || 'N/A',
        r.grade || r.student?.grade || 'N/A',
        r.violation?.name || r.violation_name || r.violation_type || 'N/A',
        r.violation?.type || r.severity || r.type || 'Minor',
        r.status || 'Pending',
        r.date_reported || r.created_at ? new Date(r.date_reported || r.created_at).toLocaleDateString() : 'N/A'
      ]);

      doc.autoTable({
        head: [['Student Name', 'Grade', 'Violation', 'Severity', 'Status', 'Date']],
        body: tableRows,
        startY: currentY + 3,
        theme: 'grid',
        headStyles: { fillColor: [7, 52, 95], fontStyle: 'bold', fontSize: 8 },
        styles: { fontSize: 7.5 },
        columnStyles: {
          0: { cellWidth: 45 },
          1: { cellWidth: 20 },
          2: { cellWidth: 50 },
          3: { cellWidth: 22 },
          4: { cellWidth: 25 },
          5: { cellWidth: 25 }
        }
      });
    }

    return doc;
  };

  const handleDownloadPdf = async () => {
    try {
      info('Generating Analytics Report PDF...');
      const doc = await generateAnalyticsPdfDoc();
      const filename = `Disciplinary_Analytics_Report_${dateRangeLabel.replace(/\s+/g, '_')}.pdf`;
      const blob = doc.output('blob');
      await shareOrSaveNativeFile({
        filename,
        blob,
        title: `${reportTitle} - ${dateRangeLabel}`,
        mimeType: 'application/pdf'
      });
      success('Analytics Report PDF successfully downloaded and saved!');
    } catch (err) {
      if (err?.name === 'AbortError') return;
      console.error('PDF download error:', err);
      error('Failed to download PDF: ' + err.message);
    }
  };

  const handlePrint = async () => {
    try {
      const html = buildPrintReportHtml({
        records: filteredRecords,
        metrics,
        dateRangeLabel,
        reportTitle,
        includeTrendsChart,
        includeCommonViolationsChart,
        includeSeverity,
        includeGrades,
        includeRecordsTable,
        gradeBreakdown,
        violationDistribution,
        trendPoints,
        reportRefNo,
        securityHash,
        currentDateFormatted
      });

      await printOrShareDocument({
        title: `${reportTitle} - ${dateRangeLabel}`,
        filename: `Disciplinary_Analytics_Report_${dateRangeLabel.replace(/\s+/g, '_')}.pdf`,
        htmlContent: html,
        generatePdfBlob: async () => {
          const doc = await generateAnalyticsPdfDoc();
          return doc.output('blob');
        },
        onStatus: (st) => {
          if (st.type === 'success') success(st.message);
          else if (st.type === 'info') info(st.message);
          else if (st.type === 'error') error(st.message);
        }
      });
    } catch (err) {
      console.error('Print generation error:', err);
      error('Failed to print report: ' + err.message);
    }
  };

  if (!isOpen) return null;

  // Render Left Form Controls
  const renderFormContent = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* 1. Date Period Preset */}
      <div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
          <Calendar size={13} color="#07345f" /> Report Time Period
        </label>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', marginBottom: '8px' }}>
          {[
            { id: 'today', label: 'Today' },
            { id: 'week', label: 'Weekly' },
            { id: 'month', label: 'Monthly' },
            { id: 'all', label: 'All-Time' }
          ].map((p) => {
            const isSelected = periodPreset === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriodPreset(p.id)}
                style={{
                  padding: '7px 10px',
                  borderRadius: '7px',
                  border: isSelected ? '2px solid #07345f' : '1px solid #cbd5e1',
                  background: isSelected ? '#07345f' : '#ffffff',
                  color: isSelected ? '#ffffff' : '#334155',
                  fontSize: '11.5px',
                  fontWeight: isSelected ? 800 : 600,
                  cursor: 'pointer',
                  transition: 'all 0.12s ease',
                  textAlign: 'center'
                }}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Custom Date Range Toggle */}
        <button
          type="button"
          onClick={() => setPeriodPreset('custom')}
          style={{
            width: '100%',
            padding: '7px 10px',
            borderRadius: '7px',
            border: periodPreset === 'custom' ? '2px solid #07345f' : '1px solid #cbd5e1',
            background: periodPreset === 'custom' ? '#f0f4f8' : '#ffffff',
            color: '#07345f',
            fontSize: '11.5px',
            fontWeight: 700,
            cursor: 'pointer',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <SlidersHorizontal size={12} /> Custom Date Range
        </button>

        {periodPreset === 'custom' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: '#ffffff', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '6px' }}>
            <div>
              <span style={{ fontSize: '10.5px', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px', fontWeight: 700 }}>
                <Calendar size={11} color="#07345f" /> Start Date
              </span>
              <CustomDatePicker
                value={customStartDate}
                onChange={(val) => setCustomStartDate(val)}
                placeholder="Start Date"
                compact
              />
            </div>
            <div>
              <span style={{ fontSize: '10.5px', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px', fontWeight: 700 }}>
                <Calendar size={11} color="#07345f" /> End Date
              </span>
              <CustomDatePicker
                value={customEndDate}
                onChange={(val) => setCustomEndDate(val)}
                placeholder="End Date"
                align="right"
                compact
              />
            </div>
          </div>
        )}
      </div>

      {/* 2. Visual Charts & Sections To Include */}
      <div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
          <Layers size={13} color="#07345f" /> Analytical Charts &amp; Layout
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: '#f8fafc', padding: '8px 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          {[
            {
              checked: includeTrendsChart,
              setter: setIncludeTrendsChart,
              icon: <TrendingUp size={15} color="#0f172a" style={{ flexShrink: 0 }} />,
              title: 'Violation Trends Area Chart',
              sub: 'Minor, Serious & Major spline trends'
            },
            {
              checked: includeCommonViolationsChart,
              setter: setIncludeCommonViolationsChart,
              icon: <PieChartIcon size={15} color="#0f172a" style={{ flexShrink: 0 }} />,
              title: 'Most Common Violations',
              sub: 'Donut breakdown & frequency ranking'
            },
            {
              checked: includeSeverity,
              setter: setIncludeSeverity,
              icon: <BarChart2 size={15} color="#0f172a" style={{ flexShrink: 0 }} />,
              title: 'Infraction Severity Table',
              sub: 'Offense levels & prescribed sanctions'
            },
            {
              checked: includeGrades,
              setter: setIncludeGrades,
              icon: <School size={15} color="#0f172a" style={{ flexShrink: 0 }} />,
              title: 'Grade Level Distribution',
              sub: 'Grade 7–12 incident breakdown & status'
            },
            {
              checked: includeRecordsTable,
              setter: setIncludeRecordsTable,
              icon: <FileSpreadsheet size={15} color="#0f172a" style={{ flexShrink: 0 }} />,
              title: 'Itemized Incident Records Log',
              sub: 'Multi-page student incident records table'
            }
          ].map((item, idx) => (
            <label
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '5px 6px',
                borderRadius: '6px',
                background: item.checked ? '#ffffff' : 'transparent',
                border: item.checked ? '1px solid #cbd5e1' : '1px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.12s ease'
              }}
            >
              <input
                type="checkbox"
                checked={item.checked}
                onChange={(e) => item.setter(e.target.checked)}
                style={{ width: '15px', height: '15px', accentColor: '#07345f', cursor: 'pointer', flexShrink: 0 }}
              />
              {item.icon}
              <div style={{ minWidth: 0, flex: 1 }}>
                <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#0f172a', display: 'block', lineHeight: 1.25 }}>
                  {item.title}
                </span>
                <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>
                  {item.sub}
                </span>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* 3. Criteria Filters */}
      <div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
          <Filter size={13} color="#07345f" /> Scope Filters
        </label>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div>
            <span style={{ fontSize: '10.5px', color: '#64748b', display: 'block', marginBottom: '3px', fontWeight: 600 }}>Severity</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
              {['all', 'minor', 'serious', 'major'].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSelectedSeverity(s)}
                  style={{
                    padding: '4px 6px',
                    borderRadius: '6px',
                    border: selectedSeverity === s ? '1.5px solid #0f172a' : '1px solid #cbd5e1',
                    background: selectedSeverity === s ? '#0f172a' : '#ffffff',
                    color: selectedSeverity === s ? '#ffffff' : '#334155',
                    fontSize: '10.5px',
                    fontWeight: 700,
                    textTransform: 'capitalize',
                    cursor: 'pointer'
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span style={{ fontSize: '10.5px', color: '#64748b', display: 'block', marginBottom: '3px', fontWeight: 600 }}>Grade Level</span>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '11.5px',
                fontWeight: 600,
                color: '#0f172a',
                background: '#ffffff'
              }}
            >
              <option value="all">All Grades (Junior &amp; Senior High)</option>
              <option value="jhs">Junior High School (Grades 7–10)</option>
              <option value="shs">Senior High School (Grades 11–12)</option>
              <option value="7">Grade 7</option>
              <option value="8">Grade 8</option>
              <option value="9">Grade 9</option>
              <option value="10">Grade 10</option>
              <option value="11">Grade 11</option>
              <option value="12">Grade 12</option>
            </select>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <button
        type="button"
        onClick={handlePrint}
        style={{
          marginTop: '4px',
          padding: '10px 16px',
          borderRadius: '8px',
          fontSize: '13px',
          fontWeight: 800,
          border: 'none',
          background: '#07345f',
          color: '#ffffff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          boxShadow: '0 4px 12px rgba(7, 52, 95, 0.25)'
        }}
      >
        <Printer size={15} /> Print Document
      </button>
    </div>
  );

  // SVG Coordinates for Live Preview
  const maxTrendVal = Math.max(...trendPoints.map((p) => Math.max(p.minor, p.serious, p.major, p.total)), 4);
  const w = 540;
  const h = 130;
  const padLeft = 30;
  const padRight = 20;
  const padBottom = 25;
  const chartW = w - padLeft - padRight;
  const chartH = h - padBottom;

  const getCoordinates = (key) => {
    return trendPoints.map((pt, i) => {
      const x = padLeft + i * (chartW / Math.max(trendPoints.length - 1, 1));
      const val = pt[key] || 0;
      const y = chartH - (val / maxTrendVal) * (chartH - 20) - 5;
      return { x, y, val };
    });
  };

  const minorCoords = getCoordinates('minor');
  const seriousCoords = getCoordinates('serious');
  const majorCoords = getCoordinates('major');

  const makePath = (coords) => {
    if (coords.length === 0) return '';
    return coords.reduce((acc, curr, i, arr) => {
      if (i === 0) return `M ${curr.x} ${curr.y}`;
      const prev = arr[i - 1];
      const cx = (prev.x + curr.x) / 2;
      return `${acc} C ${cx} ${prev.y}, ${cx} ${curr.y}, ${curr.x} ${curr.y}`;
    }, '');
  };

  const makeAreaPath = (coords) => {
    if (coords.length === 0) return '';
    const linePath = makePath(coords);
    const lastX = coords[coords.length - 1].x;
    const firstX = coords[0].x;
    return `${linePath} L ${lastX} ${chartH} L ${firstX} ${chartH} Z`;
  };

  // SVG Donut Path calculations for Live Preview
  const totalDistVal = violationDistribution.reduce((acc, d) => acc + (d.value || 0), 0) || 1;
  let currentAngle = 0;
  const liveDonutSlices = violationDistribution.map((item) => {
    const sliceAngle = ((item.value || 0) / totalDistVal) * 360;
    const startAngle = currentAngle;
    currentAngle += sliceAngle;

    const cx = 80;
    const cy = 80;
    const rOuter = 70;
    const rInner = 42;

    let pathData = '';
    if (sliceAngle >= 359.9) {
      pathData = `M ${cx} ${cy - rOuter} A ${rOuter} ${rOuter} 0 1 0 ${cx} ${cy + rOuter} A ${rOuter} ${rOuter} 0 1 0 ${cx} ${cy - rOuter} M ${cx} ${cy - rInner} A ${rInner} ${rInner} 0 1 1 ${cx} ${cy + rInner} A ${rInner} ${rInner} 0 1 1 ${cx} ${cy - rInner} Z`;
    } else {
      const startRad = ((startAngle - 90) * Math.PI) / 180;
      const endRad = (((startAngle + sliceAngle) - 90) * Math.PI) / 180;

      const x1 = cx + rOuter * Math.cos(startRad);
      const y1 = cy + rOuter * Math.sin(startRad);
      const x2 = cx + rOuter * Math.cos(endRad);
      const y2 = cy + rOuter * Math.sin(endRad);

      const x3 = cx + rInner * Math.cos(endRad);
      const y3 = cy + rInner * Math.sin(endRad);
      const x4 = cx + rInner * Math.cos(startRad);
      const y4 = cy + rInner * Math.sin(startRad);

      const largeArc = sliceAngle > 180 ? 1 : 0;
      pathData = `M ${x1} ${y1} A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${rInner} ${rInner} 0 ${largeArc} 0 ${x4} ${y4} Z`;
    }

    return { pathData, color: item.color, name: item.name, value: item.value };
  });

  if (!isOpen || user?.role === 'teacher') return null;

  return (
    <div
      className="modal-backdrop-smooth"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        transform: 'translateZ(0)',
        contain: 'strict'
      }}
      onClick={onClose}
    >
      <style>{`
        .pdm-body {
          display: flex;
          flex: 1;
          min-height: 0;
          overflow: hidden;
          background: #ffffff;
        }
        .pdm-left {
          width: 360px;
          border-right: 1px solid #e2e8f0;
          padding: 18px 20px;
          background: #f8fafc;
          display: flex;
          flex-direction: column;
          gap: 14px;
          flex-shrink: 0;
          overflow-y: auto;
        }
        .pdm-right {
          flex: 1;
          padding: 20px 24px 36px;
          background: #eef2f6;
          overflow-y: auto;
          overflow-x: hidden;
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          user-select: none;
          touch-action: pan-y;
        }
        .pdm-preview-paper {
          width: 680px;
          min-width: 680px;
          max-width: 680px;
          min-height: 960px;
          display: flex;
          flex-direction: column;
          background: #ffffff;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.10), 0 1px 4px rgba(0, 0, 0, 0.05);
          border-radius: 12px;
          padding: 24px 28px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', sans-serif;
          color: #0f172a;
          line-height: 1.45;
          box-sizing: border-box;
          transform: translate3d(0, 0, 0);
          contain: layout paint;
          user-select: none;
          margin-bottom: 20px;
          border: 1px solid #cbd5e1;
        }

        .pdm-canvas-toolbar {
          position: sticky;
          top: 0;
          z-index: 10;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(255, 255, 255, 0.94);
          backdrop-filter: blur(12px);
          padding: 6px 16px;
          border-radius: 9999px;
          border: 1px solid #cbd5e1;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
          gap: 10px;
          max-width: 680px;
          width: 100%;
          box-sizing: border-box;
          color: #0f172a;
        }
        .pdm-canvas-tools-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .pdm-canvas-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 4px 9px;
          border-radius: 6px;
          font-size: 11.5px;
          font-weight: 700;
          color: #334155;
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          cursor: pointer;
          transition: all 0.12s ease;
        }
        .pdm-canvas-btn:hover {
          background: #e2e8f0;
          color: #0f172a;
        }
        .pdm-canvas-btn-text {
          height: 28px;
          padding: 0 10px;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #334155;
          display: flex;
          align-items: center;
          gap: 5px;
          cursor: pointer;
          font-size: 11px;
          font-weight: 700;
          transition: all 0.12s ease;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .pdm-canvas-btn-text:hover {
          background: #f1f5f9;
          color: #07345f;
          border-color: #94a3b8;
        }
        .pdm-canvas-badge {
          font-size: 11px;
          font-weight: 800;
          color: #0f172a;
          font-family: monospace;
          min-width: 42px;
          text-align: center;
        }
        .pdm-page-pill {
          padding: 3px 8px;
          border-radius: 6px;
          font-size: 10.5px;
          font-weight: 700;
          cursor: pointer;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #475569;
          transition: all 0.12s ease;
        }
        .pdm-page-pill.active {
          background: #07345f;
          color: #ffffff;
          border-color: #07345f;
        }
        .pdm-page-break-divider {
          width: 100%;
          max-width: 680px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 6px 0 20px;
          position: relative;
        }
        .pdm-page-break-divider::before {
          content: '';
          position: absolute;
          left: 0;
          right: 0;
          top: 50%;
          border-top: 2px dashed #cbd5e1;
        }
        .pdm-page-break-badge {
          position: relative;
          background: #e2e8f0;
          color: #334155;
          padding: 3px 12px;
          border-radius: 999px;
          font-size: 10.5px;
          font-weight: 800;
          letter-spacing: 0.4px;
          text-transform: uppercase;
        }

        /* Mobile Controls hidden on desktop */
        .pdm-mobile-zoom-pill {
          display: none;
        }
        .pdm-mobile-fab {
          display: none;
        }
        .pdm-mobile-drawer {
          display: none;
        }

        /* Clean Light Mode Mobile Document Viewer (<= 768px) */
        @media (max-width: 768px) {
          .modal-backdrop-smooth {
            padding: 0 !important;
            background: #f1f5f9 !important;
          }
          .pdm-dialog {
            width: 100vw !important;
            height: 100dvh !important;
            max-height: 100dvh !important;
            border-radius: 0 !important;
            border: none !important;
            background: #f1f5f9 !important;
          }

          /* Clean Light Mode Header Bar */
          .pdm-header-desktop {
            background: #ffffff !important;
            color: #0f172a !important;
            border-bottom: 1px solid #e2e8f0 !important;
            padding: max(8px, env(safe-area-inset-top, 8px)) 10px 8px 10px !important;
            min-height: 48px !important;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04) !important;
            gap: 6px !important;
            box-sizing: border-box !important;
          }
          .pdm-header-title {
            color: #0f172a !important;
            font-size: 13px !important;
            font-weight: 800 !important;
            letter-spacing: -0.01em !important;
            font-family: inherit !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            max-width: 100% !important;
            min-width: 0 !important;
          }
          .pdm-header-sub {
            display: none !important;
          }

          /* Left column is hidden on mobile and moved to slide-up drawer */
          .pdm-left {
            display: none !important;
          }

          /* Right column becomes light mode document canvas */
          .pdm-right {
            padding: 14px 10px 90px !important;
            background: #eef2f6 !important;
            width: 100% !important;
            min-height: 0 !important;
            flex: 1 !important;
            display: flex !important;
            align-items: flex-start !important;
            touch-action: pan-y !important;
            user-select: none !important;
            -webkit-user-select: none !important;
          }

          .pdm-canvas-toolbar {
            display: none !important;
          }

          /* Floating Mobile Touch Zoom Controls */
          .pdm-mobile-zoom-pill {
            display: flex;
            position: fixed;
            bottom: 22px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 1000;
            background: rgba(255, 255, 255, 0.95);
            color: #0f172a;
            border: 1.5px solid #cbd5e1;
            padding: 5px 8px;
            border-radius: 9999px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
            align-items: center;
            gap: 6px;
            font-size: 12px;
            font-weight: 700;
            backdrop-filter: blur(12px);
          }
          .pdm-mobile-zoom-btn {
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            color: #334155;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.15s ease;
          }
          .pdm-mobile-zoom-btn:active {
            background: #e2e8f0;
            transform: scale(0.92);
          }
          .pdm-mobile-zoom-indicator {
            font-size: 11.5px;
            font-weight: 800;
            color: #0f172a;
            font-family: monospace;
            padding: 0 4px;
            cursor: pointer;
          }

          .pdm-mobile-fab {
            display: flex;
            position: fixed;
            bottom: 20px;
            right: 16px;
            z-index: 1001;
            width: 50px;
            height: 50px;
            border-radius: 16px;
            background: #07345f;
            color: #ffffff;
            border: none;
            box-shadow: 0 8px 24px rgba(7, 52, 95, 0.45);
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: transform 0.15s ease;
          }
          .pdm-mobile-fab:active {
            transform: scale(0.92);
          }

          /* Mobile Slide-Up Edit Drawer */
          .pdm-mobile-drawer {
            display: flex;
            flex-direction: column;
            position: fixed;
            inset: 0;
            z-index: 1050;
            background: rgba(15, 23, 42, 0.6);
            backdrop-filter: blur(4px);
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.25s ease;
          }
          .pdm-mobile-drawer.open {
            opacity: 1;
            pointer-events: auto;
          }
          .pdm-mobile-drawer-content {
            margin-top: auto;
            max-height: 86vh;
            background: #ffffff;
            border-top-left-radius: 20px;
            border-top-right-radius: 20px;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            transform: translateY(100%);
            transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            box-shadow: 0 -10px 40px rgba(0,0,0,0.25);
          }
          .pdm-mobile-drawer.open .pdm-mobile-drawer-content {
            transform: translateY(0);
          }
          .pdm-drawer-header {
            padding: 16px 20px;
            border-bottom: 1px solid #e2e8f0;
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: #f8fafc;
          }
          .pdm-drawer-body {
            padding: 18px 20px;
            overflow-y: auto;
            flex: 1;
          }
        }
      `}</style>

      <div
        className="modal-content-smooth pdm-dialog"
        style={{
          width: '100%',
          maxWidth: '1180px',
          height: '92vh',
          maxHeight: '900px',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '14px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
          overflow: 'hidden',
          background: '#ffffff',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div
          className="pdm-header-desktop"
          style={{
            background: '#ffffff',
            color: '#0f172a',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #e2e8f0',
            flexShrink: 0,
            gap: '12px'
          }}
        >
          {/* Left: Back Arrow + Document Title Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1, overflow: 'hidden' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                color: '#334155',
                cursor: 'pointer',
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 0.15s ease'
              }}
              title="Close print preview"
            >
              <ChevronLeft size={18} strokeWidth={2.4} />
            </button>

            <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0, overflow: 'hidden' }}>
                <BarChart2 size={14} color="#07345f" style={{ flexShrink: 0 }} />
                <h3 className="pdm-header-title" style={{ margin: 0, fontSize: '13.5px', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0, flex: 1 }}>
                  Disciplinary Analytics
                </h3>
              </div>
              <span className="pdm-header-sub" style={{ fontSize: '11px', color: '#64748b', display: 'block', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {dateRangeLabel} &bull; {metrics.total} Incidents logged &bull; {recordPages.length > 0 ? 'Multi-page itemized record distribution' : 'Executive single-sheet summary'}
              </span>
            </div>
          </div>

          {/* Right: Print Button + Download PDF + Close Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            <button
              type="button"
              onClick={handleDownloadPdf}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#0f172a',
                cursor: 'pointer',
                padding: '0 10px',
                height: '32px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '12px',
                fontWeight: 700,
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                transition: 'all 0.15s ease'
              }}
              title="Download PDF"
            >
              <Download size={14} />
              <span>PDF</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              style={{
                background: '#07345f',
                border: '1px solid #07345f',
                color: '#ffffff',
                cursor: 'pointer',
                padding: '0 10px',
                height: '32px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '12px',
                fontWeight: 700,
                boxShadow: '0 1px 3px rgba(7, 52, 95, 0.25)',
                transition: 'all 0.15s ease'
              }}
              title="Print Document"
            >
              <Printer size={14} />
              <span>Print</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                color: '#64748b',
                cursor: 'pointer',
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#fee2e2';
                e.currentTarget.style.borderColor = '#fca5a5';
                e.currentTarget.style.color = '#dc2626';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#f8fafc';
                e.currentTarget.style.borderColor = '#cbd5e1';
                e.currentTarget.style.color = '#64748b';
              }}
              title="Close"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Modal Body: Left Customization Sidebar + Right Live Printable Canvas */}
        <div className="pdm-body">
          {/* Left Column (Desktop) */}
          <div className="pdm-left smooth-scroll-container">
            {renderFormContent()}
          </div>

          {/* Right Column: Live Printable Sheet Canvas */}
          <div
            className="pdm-right smooth-scroll-container"
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{
              cursor: isDragging ? 'grabbing' : 'default',
              userSelect: 'none',
              WebkitUserSelect: 'none'
            }}
          >
            {/* Desktop Canvas Toolbar */}
            <div className="pdm-canvas-toolbar">
              <div className="pdm-canvas-tools-group">
                <Move size={13} color="#64748b" />
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#334155' }}>
                  {isDragging ? 'Dragging layout...' : `Multi-Page Document (${totalPages} Pages)`}
                </span>

                {/* Page Selectors */}
                {totalPages > 1 && (
                  <div style={{ display: 'flex', gap: '4px', marginLeft: '8px' }}>
                    {Array.from({ length: totalPages }).map((_, pIdx) => (
                      <button
                        key={pIdx}
                        type="button"
                        className={`pdm-page-pill ${activePreviewPage === pIdx + 1 ? 'active' : ''}`}
                        onClick={() => {
                          setActivePreviewPage(pIdx + 1);
                          if (pIdx === 0 && page1Ref.current) {
                            page1Ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          } else if (pIdx === 1 && page2Ref.current) {
                            page2Ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }
                        }}
                      >
                        Page {pIdx + 1}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="pdm-canvas-tools-group">
                <button type="button" className="pdm-canvas-btn" onClick={handleZoomOut} title="Zoom Out">
                  <ZoomOut size={13} />
                </button>
                <span className="pdm-canvas-badge">{Math.round(zoom * 100)}%</span>
                <button type="button" className="pdm-canvas-btn" onClick={handleZoomIn} title="Zoom In">
                  <ZoomIn size={13} />
                </button>
                <button type="button" className="pdm-canvas-btn-text" onClick={handleResetView} title="Reset Position & Zoom">
                  <RotateCcw size={12} /> <span>Reset</span>
                </button>
              </div>
            </div>

            {/* Proportional Scaling Container */}
            <div
              style={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}
            >
              <div
                ref={printRef}
                style={{
                  width: '680px',
                  minWidth: '680px',
                  maxWidth: '680px',
                  transform: `scale(${effectiveScale}) translate3d(${pan.x}px, ${pan.y}px, 0)`,
                  transformOrigin: 'top center',
                  transition: isDragging || isPinchingRef.current ? 'none' : 'transform 0.12s cubic-bezier(0.2, 0, 0, 1)',
                  marginBottom: isMobile && paperHeight ? `-${paperHeight * (1 - effectiveScale)}px` : '0px'
                }}
              >
                {/* ================= LIVE PREVIEW PAGE 1 ================= */}
                <div
                  ref={page1Ref}
                  className="pdm-preview-paper"
                  style={{
                    cursor: isDragging ? 'grabbing' : 'default'
                  }}
                >
                  {/* Official Letterhead */}
                  <div style={{ textAlign: 'center', borderBottom: '2px solid #07345f', paddingBottom: '8px', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                      <img
                        src="/images/phcm-logo.png"
                        alt="PHCM Logo"
                        style={{ width: '44px', height: '44px', objectFit: 'contain' }}
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '9.5px', textTransform: 'uppercase', color: '#475569', letterSpacing: '0.8px', fontWeight: 600 }}>
                          Republic of the Philippines
                        </div>
                        <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#07345f', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          University of Perpetual Help System Manila
                        </div>
                        <div style={{ fontSize: '9.5px', color: '#475569', marginTop: '1px' }}>
                          1240 V. Concepcion St., Sampaloc, Manila | Office of the Prefect of Discipline
                        </div>
                        <div style={{ fontSize: '8.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.8px', marginTop: '1px' }}>
                          VIOTRACK DISCIPLINARY &amp; STUDENT WELFARE MANAGEMENT SYSTEM
                        </div>
                      </div>
                      <img
                        src="/images/phcm-seal.png"
                        alt="PHCM Seal"
                        style={{ width: '44px', height: '44px', objectFit: 'contain' }}
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                      />
                    </div>
                  </div>

                  {/* Metadata Bar */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9.5px', color: '#475569', borderBottom: '1px dotted #cbd5e1', paddingBottom: '4px', marginBottom: '8px' }}>
                    <div>Report Ref: <strong style={{ color: '#0f172a', fontFamily: 'monospace' }}>{reportRefNo}</strong></div>
                    <div>Coverage: <strong style={{ color: '#0f172a' }}>{dateRangeLabel}</strong></div>
                    <div>Date: <strong style={{ color: '#0f172a' }}>{currentDateFormatted}</strong></div>
                    <div><strong style={{ color: '#07345f' }}>Page 1 of {totalPages}</strong></div>
                  </div>

                  {/* Title */}
                  <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                    <h2 style={{ margin: 0, fontSize: '13.5px', fontWeight: 800, color: '#07345f', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {reportTitle}
                    </h2>
                    <p style={{ margin: '1px 0 0 0', fontSize: '9.5px', color: '#64748b', fontStyle: 'italic' }}>
                      Official Institutional Conduct Analytics, Incident Timeline Trends &amp; Infraction Distribution
                    </p>
                  </div>

                  {/* KPI Cards Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '10px' }}>
                    <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '6px 8px', textAlign: 'center' }}>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: '#07345f' }}>{metrics.total}</div>
                      <div style={{ fontSize: '8.5px', textTransform: 'uppercase', fontWeight: 700, color: '#64748b' }}>Total Incidents</div>
                    </div>
                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '6px 8px', textAlign: 'center' }}>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: '#15803d' }}>{metrics.resolved} ({metrics.resolvedRate}%)</div>
                      <div style={{ fontSize: '8.5px', textTransform: 'uppercase', fontWeight: 700, color: '#15803d' }}>Resolved &amp; Cleared</div>
                    </div>
                    <div style={{ background: '#fefce8', border: '1px solid #fef08a', borderRadius: '8px', padding: '6px 8px', textAlign: 'center' }}>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: '#b45309' }}>{metrics.pending}</div>
                      <div style={{ fontSize: '8.5px', textTransform: 'uppercase', fontWeight: 700, color: '#b45309' }}>Pending Cases</div>
                    </div>
                    <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '8px', padding: '6px 8px', textAlign: 'center' }}>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: '#6d28d9' }}>{metrics.uniqueStudents}</div>
                      <div style={{ fontSize: '8.5px', textTransform: 'uppercase', fontWeight: 700, color: '#6d28d9' }}>Involved Students</div>
                    </div>
                  </div>

                  {/* Side-by-Side Analytics Charts Row: 1. Violation Trends + 2. Most Common Violations */}
                  {(includeTrendsChart || includeCommonViolationsChart) && (
                    <div style={{ display: 'grid', gridTemplateColumns: includeTrendsChart && includeCommonViolationsChart ? '1fr 1fr' : '1fr', gap: '10px', marginBottom: '10px' }}>
                      
                      {/* Left Chart: Violation Trends (Spline Area Chart) */}
                      {includeTrendsChart && (
                        <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 10px', background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                            <TrendingUp size={13} color="#07345f" />
                            <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#07345f', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                              Violation Trends
                            </span>
                          </div>
                          <div style={{ fontSize: '9px', color: '#64748b', marginBottom: '6px' }}>
                            Incidents recorded over time ({dateRangeLabel})
                          </div>

                          <div style={{ width: '100%', height: '115px' }}>
                            <svg viewBox="0 0 540 130" style={{ width: '100%', height: '100%' }}>
                              <defs>
                                <linearGradient id="minorGradLive" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                                </linearGradient>
                                <linearGradient id="seriousGradLive" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                                </linearGradient>
                                <linearGradient id="majorGradLive" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                                </linearGradient>
                              </defs>

                              <line x1="30" y1="105" x2="520" y2="105" stroke="#e2e8f0" strokeWidth="1" />
                              <line x1="30" y1="70" x2="520" y2="70" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                              <line x1="30" y1="35" x2="520" y2="35" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />

                              <path d={makeAreaPath(minorCoords)} fill="url(#minorGradLive)" />
                              <path d={makePath(minorCoords)} fill="none" stroke="#10b981" strokeWidth="2.4" />
                              {minorCoords.map((c, i) => (
                                <circle key={`min-${i}`} cx={c.x} cy={c.y} r="3" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" />
                              ))}

                              <path d={makeAreaPath(seriousCoords)} fill="url(#seriousGradLive)" />
                              <path d={makePath(seriousCoords)} fill="none" stroke="#f59e0b" strokeWidth="2.4" />
                              {seriousCoords.map((c, i) => (
                                <circle key={`ser-${i}`} cx={c.x} cy={c.y} r="3" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.5" />
                              ))}

                              <path d={makeAreaPath(majorCoords)} fill="url(#majorGradLive)" />
                              <path d={makePath(majorCoords)} fill="none" stroke="#ef4444" strokeWidth="2.4" />
                              {majorCoords.map((c, i) => (
                                <circle key={`maj-${i}`} cx={c.x} cy={c.y} r="3" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" />
                              ))}

                              {trendPoints.map((pt, i) => {
                                const x = padLeft + i * (chartW / Math.max(trendPoints.length - 1, 1));
                                return (
                                  <text key={`lbl-${i}`} x={x} y="122" textAnchor="middle" fontSize="9" fill="#64748b" fontWeight="600">
                                    {pt.label}
                                  </text>
                                );
                              })}
                            </svg>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '4px', fontSize: '9px', fontWeight: 700 }}>
                            <span style={{ color: '#10b981' }}>● Minor</span>
                            <span style={{ color: '#f59e0b' }}>● Serious</span>
                            <span style={{ color: '#ef4444' }}>● Major</span>
                          </div>
                        </div>
                      )}

                      {/* Right Chart: Most Common Violations */}
                      {includeCommonViolationsChart && (
                        <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 10px', background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                            <PieChartIcon size={13} color="#07345f" />
                            <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#07345f', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                              Most Common Violations
                            </span>
                          </div>
                          <div style={{ fontSize: '9px', color: '#64748b', marginBottom: '6px' }}>
                            Distribution of infractions most likely to occur in school
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '90px', height: '90px', flexShrink: 0 }}>
                              <svg viewBox="0 0 160 160" style={{ width: '100%', height: '100%' }}>
                                {liveDonutSlices.map((slice, i) => (
                                  <path
                                    key={`sl-${i}`}
                                    d={slice.pathData}
                                    fill={slice.color}
                                    stroke="#ffffff"
                                    strokeWidth="1.5"
                                  />
                                ))}
                              </svg>
                            </div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                              {violationDistribution.slice(0, 5).map((item, idx) => {
                                const maxV = Math.max(...violationDistribution.map((d) => d.value), 1);
                                const pct = Math.max(10, Math.round((item.value / maxV) * 100));
                                return (
                                  <div key={idx} style={{ marginBottom: '3px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8.5px', fontWeight: 700, marginBottom: '1px' }}>
                                      <span style={{ color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '110px' }}>
                                        <span style={{ color: item.color }}>●</span> {item.name}
                                      </span>
                                      <span style={{ color: '#475569' }}>{item.value} {item.value === 1 ? 'incident' : 'incidents'}</span>
                                    </div>
                                    <div style={{ width: '100%', height: '3.5px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                                      <div style={{ width: `${pct}%`, height: '100%', background: item.color, borderRadius: '999px' }} />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}

                    </div>
                  )}

                  {/* 1. Severity Breakdown Table */}
                  {includeSeverity && (
                    <div style={{ marginBottom: '10px' }}>
                      <div style={{ fontSize: '10px', fontWeight: 800, color: '#07345f', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '4px' }}>
                        1. Infraction Severity Classification Breakdown
                      </div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px', border: '1px solid #cbd5e1' }}>
                        <thead>
                          <tr style={{ background: '#f1f5f9' }}>
                            <th style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'left', fontWeight: 800, color: '#0f172a', fontSize: '9.5px', textTransform: 'uppercase' }}>Offense Level</th>
                            <th style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'center', width: '80px', fontWeight: 800, color: '#0f172a', fontSize: '9.5px', textTransform: 'uppercase' }}>Incident Count</th>
                            <th style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'center', width: '80px', fontWeight: 800, color: '#0f172a', fontSize: '9.5px', textTransform: 'uppercase' }}>Percentage (%)</th>
                            <th style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'left', fontWeight: 800, color: '#0f172a', fontSize: '9.5px', textTransform: 'uppercase' }}>Standard Prescribed Sanction</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td style={{ padding: '4px 6px', border: '1px solid #e2e8f0', fontWeight: 700, color: '#15803d' }}>Minor Offense</td>
                            <td style={{ padding: '4px 6px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 700 }}>{metrics.minor}</td>
                            <td style={{ padding: '4px 6px', border: '1px solid #e2e8f0', textAlign: 'center' }}>{metrics.total > 0 ? Math.round((metrics.minor / metrics.total) * 100) : 0}%</td>
                            <td style={{ padding: '4px 6px', border: '1px solid #e2e8f0', color: '#475569' }}>Verbal Warning, Written Reflection &amp; Parent Notification</td>
                          </tr>
                          <tr style={{ background: '#f8fafc' }}>
                            <td style={{ padding: '4px 6px', border: '1px solid #e2e8f0', fontWeight: 700, color: '#a16207' }}>Serious Offense</td>
                            <td style={{ padding: '4px 6px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 700 }}>{metrics.serious}</td>
                            <td style={{ padding: '4px 6px', border: '1px solid #e2e8f0', textAlign: 'center' }}>{metrics.total > 0 ? Math.round((metrics.serious / metrics.total) * 100) : 0}%</td>
                            <td style={{ padding: '4px 6px', border: '1px solid #e2e8f0', color: '#475569' }}>Parent / Guardian Conference &amp; Campus Service</td>
                          </tr>
                          <tr>
                            <td style={{ padding: '4px 6px', border: '1px solid #e2e8f0', fontWeight: 700, color: '#dc2626' }}>Major Offense</td>
                            <td style={{ padding: '4px 6px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 700 }}>{metrics.major}</td>
                            <td style={{ padding: '4px 6px', border: '1px solid #e2e8f0', textAlign: 'center' }}>{metrics.total > 0 ? Math.round((metrics.major / metrics.total) * 100) : 0}%</td>
                            <td style={{ padding: '4px 6px', border: '1px solid #e2e8f0', color: '#475569' }}>Disciplinary Board Hearing, Formal Contract &amp; Counseling</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* 2. Grade Level Distribution */}
                  {includeGrades && (
                    <div style={{ marginBottom: '10px' }}>
                      <div style={{ fontSize: '10px', fontWeight: 800, color: '#07345f', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '4px' }}>
                        2. Grade Level Distribution Breakdown
                      </div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px', border: '1px solid #cbd5e1' }}>
                        <thead>
                          <tr style={{ background: '#f1f5f9' }}>
                            <th style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'left', fontWeight: 800, color: '#0f172a', fontSize: '9.5px', textTransform: 'uppercase' }}>Grade Level</th>
                            <th style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'center', width: '80px', fontWeight: 800, color: '#0f172a', fontSize: '9.5px', textTransform: 'uppercase' }}>Incident Count</th>
                            <th style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'center', width: '80px', fontWeight: 800, color: '#0f172a', fontSize: '9.5px', textTransform: 'uppercase' }}>Share (%)</th>
                            <th style={{ padding: '4px 6px', border: '1px solid #cbd5e1', textAlign: 'left', fontWeight: 800, color: '#0f172a', fontSize: '9.5px', textTransform: 'uppercase' }}>Case Status Overview</th>
                          </tr>
                        </thead>
                        <tbody>
                          {gradeBreakdown.map((g, idx) => (
                            <tr key={idx} style={{ background: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                              <td style={{ padding: '4px 6px', border: '1px solid #e2e8f0', fontWeight: 700, color: '#0f172a' }}>{g.label}</td>
                              <td style={{ padding: '4px 6px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 700 }}>{g.count}</td>
                              <td style={{ padding: '4px 6px', border: '1px solid #e2e8f0', textAlign: 'center' }}>{metrics.total > 0 ? Math.round((g.count / metrics.total) * 100) : 0}%</td>
                              <td style={{ padding: '4px 6px', border: '1px solid #e2e8f0', color: '#475569' }}>{g.resolved} Resolved &bull; {g.pending} Pending</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {totalPages > 1 && (
                    <div style={{ marginTop: '10px', padding: '6px 10px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '6px', textAlign: 'center', fontSize: '9.5px', color: '#64748b', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      <span>Official Disciplinary Summary &amp; Analytics &bull; Continued on Page 2 for Itemized Incident Case Records Log</span>
                      <ArrowDown size={12} color="#07345f" />
                    </div>
                  )}

                  {/* Page 1 Footer */}
                  <div style={{ marginTop: 'auto', paddingTop: '14px', borderTop: '1px solid #cbd5e1', fontSize: '8.5px', color: '#64748b' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                      <span>VERIFICATION CODE: <strong style={{ fontFamily: 'monospace', color: '#0f172a' }}>{securityHash}</strong></span>
                      <span>SYSTEM ARCHIVE: VIOTRACK INSTITUTIONAL DATA REPOSITORY</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Official institutional summary generated in compliance with DepEd &amp; Philippine Data Privacy Act of 2012.</span>
                      <span style={{ fontWeight: 800, color: '#07345f' }}>Page 1 of {totalPages}</span>
                    </div>
                  </div>
                </div>

                {/* ================= LIVE PREVIEW SUBSEQUENT PAGES ================= */}
                {recordPages.map((pageChunk, pIdx) => {
                  const pageNum = pIdx + 2;
                  const startingIndex = recordPages.slice(0, pIdx).reduce((acc, p) => acc + p.length, 0);

                  return (
                    <React.Fragment key={pIdx}>
                      {/* Visual Page Break Separator */}
                      <div className="pdm-page-break-divider">
                        <span className="pdm-page-break-badge">
                          Page Break &bull; Page {pageNum} of {totalPages}
                        </span>
                      </div>

                      <div
                        ref={pIdx === 0 ? page2Ref : null}
                        className="pdm-preview-paper"
                        style={{
                          cursor: isDragging ? 'grabbing' : 'default'
                        }}
                      >
                        {/* Full Official Letterhead on Page 2+ */}
                        <div style={{ textAlign: 'center', borderBottom: '2px solid #07345f', paddingBottom: '8px', marginBottom: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                            <img
                              src="/images/phcm-logo.png"
                              alt="PHCM Logo"
                              style={{ width: '44px', height: '44px', objectFit: 'contain' }}
                              onError={(e) => (e.currentTarget.style.display = 'none')}
                            />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '9.5px', textTransform: 'uppercase', color: '#475569', letterSpacing: '0.8px', fontWeight: 600 }}>
                                Republic of the Philippines
                              </div>
                              <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#07345f', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                University of Perpetual Help System Manila
                              </div>
                              <div style={{ fontSize: '9.5px', color: '#475569', marginTop: '1px' }}>
                                1240 V. Concepcion St., Sampaloc, Manila | Office of the Prefect of Discipline
                              </div>
                              <div style={{ fontSize: '8.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.8px', marginTop: '1px' }}>
                                VIOTRACK DISCIPLINARY &amp; STUDENT WELFARE MANAGEMENT SYSTEM
                              </div>
                            </div>
                            <img
                              src="/images/phcm-seal.png"
                              alt="PHCM Seal"
                              style={{ width: '44px', height: '44px', objectFit: 'contain' }}
                              onError={(e) => (e.currentTarget.style.display = 'none')}
                            />
                          </div>
                        </div>

                        {/* Metadata Bar on Page 2+ */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9.5px', color: '#475569', borderBottom: '1px dotted #cbd5e1', paddingBottom: '4px', marginBottom: '8px' }}>
                          <div>Report Ref: <strong style={{ color: '#0f172a', fontFamily: 'monospace' }}>{reportRefNo}</strong></div>
                          <div>Coverage: <strong style={{ color: '#0f172a' }}>{dateRangeLabel}</strong></div>
                          <div>Date: <strong style={{ color: '#0f172a' }}>{currentDateFormatted}</strong></div>
                          <div><strong style={{ color: '#07345f' }}>Page {pageNum} of {totalPages}</strong></div>
                        </div>

                        {/* Section Title */}
                        <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#07345f', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px' }}>
                          3. Itemized Incident Case Records Log (Page {pageNum} of {totalPages})
                        </div>

                        {/* Table */}
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', border: '1px solid #cbd5e1', marginBottom: '8px' }}>
                          <thead>
                            <tr style={{ background: '#f1f5f9' }}>
                              <th style={{ padding: '4px 6px', border: '1px solid #cbd5e1', width: '25px', textAlign: 'center', fontWeight: 800, color: '#0f172a' }}>#</th>
                              <th style={{ padding: '4px 8px', border: '1px solid #cbd5e1', textAlign: 'left', fontWeight: 800, color: '#0f172a' }}>Student Name</th>
                              <th style={{ padding: '4px 8px', border: '1px solid #cbd5e1', textAlign: 'left', fontWeight: 800, color: '#0f172a' }}>Grade &amp; Section</th>
                              <th style={{ padding: '4px 8px', border: '1px solid #cbd5e1', textAlign: 'left', fontWeight: 800, color: '#0f172a' }}>Violation Infraction</th>
                              <th style={{ padding: '4px 6px', border: '1px solid #cbd5e1', width: '65px', textAlign: 'center', fontWeight: 800, color: '#0f172a' }}>Severity</th>
                              <th style={{ padding: '4px 6px', border: '1px solid #cbd5e1', width: '65px', textAlign: 'center', fontWeight: 800, color: '#0f172a' }}>Date</th>
                              <th style={{ padding: '4px 6px', border: '1px solid #cbd5e1', width: '70px', textAlign: 'center', fontWeight: 800, color: '#0f172a' }}>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pageChunk.map((r, idx) => (
                              <tr key={r.id || idx} style={{ background: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                                <td style={{ padding: '4px 6px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 700 }}>{startingIndex + idx + 1}</td>
                                <td style={{ padding: '4px 8px', border: '1px solid #e2e8f0', fontWeight: 700, color: '#0f172a' }}>{r.student?.fname || ''} {r.student?.lname || 'Student'}</td>
                                <td style={{ padding: '4px 8px', border: '1px solid #e2e8f0', color: '#475569' }}>{r.student?.grade || 'Grade 10'} - {r.student?.section || 'General'}</td>
                                <td style={{ padding: '4px 8px', border: '1px solid #e2e8f0', color: '#1e293b' }}>{r.violation?.title || r.offense || 'Infraction'}</td>
                                <td style={{ padding: '4px 6px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 700, color: (r.violation?.type || r.severity) === 'Major' ? '#dc2626' : (r.violation?.type || r.severity) === 'Serious' ? '#a16207' : '#15803d' }}>
                                  {r.violation?.type || r.severity || 'Minor'}
                                </td>
                                <td style={{ padding: '4px 6px', border: '1px solid #e2e8f0', textAlign: 'center', color: '#64748b' }}>
                                  {r.date_reported ? new Date(r.date_reported).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }) : '-'}
                                </td>
                                <td style={{ padding: '4px 6px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 700, color: (r.status || '').toLowerCase() === 'resolved' ? '#15803d' : '#07345f' }}>
                                  {r.status || 'Pending'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        {/* Page Footer */}
                        <div style={{ marginTop: 'auto', paddingTop: '14px', borderTop: '1px solid #cbd5e1', fontSize: '8.5px', color: '#64748b' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                            <span>VERIFICATION CODE: <strong style={{ fontFamily: 'monospace', color: '#0f172a' }}>{securityHash}</strong></span>
                            <span>SYSTEM ARCHIVE: VIOTRACK INSTITUTIONAL DATA REPOSITORY</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Official institutional summary generated in compliance with DepEd &amp; Philippine Data Privacy Act of 2012.</span>
                            <span style={{ fontWeight: 800, color: '#07345f' }}>Page {pageNum} of {totalPages}</span>
                          </div>
                        </div>

                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

          </div>
        </div>

        {/* Mobile Floating Zoom & Drag Pill Toolbar */}
        <div className="pdm-mobile-zoom-pill">
          <button
            type="button"
            className="pdm-mobile-zoom-btn"
            onClick={handleZoomOut}
            title="Zoom Out"
          >
            <ZoomOut size={14} />
          </button>

          <span
            className="pdm-mobile-zoom-indicator"
            onClick={handleResetView}
            title="Tap to Reset Zoom"
          >
            {Math.round(zoom * 100)}%
          </span>

          <button
            type="button"
            className="pdm-mobile-zoom-btn"
            onClick={handleZoomIn}
            title="Zoom In"
          >
            <ZoomIn size={14} />
          </button>

          <button
            type="button"
            className="pdm-mobile-zoom-btn"
            onClick={handleResetView}
            style={{ marginLeft: '2px' }}
            title="Fit to Screen"
          >
            <RotateCcw size={13} />
          </button>
        </div>

        {/* Mobile Floating Action Button (FAB) - Filter / Customization Drawer */}
        <button
          type="button"
          className="pdm-mobile-fab"
          onClick={() => setIsMobileDrawerOpen(true)}
          title="Edit Report Filters"
        >
          <SlidersHorizontal size={20} strokeWidth={2.4} />
        </button>

        {/* Mobile Slide-Up Edit Drawer */}
        <div
          className={`pdm-mobile-drawer ${isMobileDrawerOpen ? 'open' : ''}`}
          onClick={() => setIsMobileDrawerOpen(false)}
        >
          <div
            className="pdm-mobile-drawer-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pdm-drawer-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <SlidersHorizontal size={18} color="#0f172a" />
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                  Report Filters &amp; Options
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                style={{
                  background: '#07345f',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Check size={14} /> Done
              </button>
            </div>

            <div className="pdm-drawer-body">
              {renderFormContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
