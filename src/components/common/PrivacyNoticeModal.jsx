import React from 'react';
import { ShieldCheck, X, FileText, Lock, Clock, UserCheck, AlertCircle } from 'lucide-react';

/**
 * In-App Privacy & Data-Retention Notice Modal
 * Compliant with Philippine Data Privacy Act of 2012 (RA 10173) & DepEd Child Protection Policy (DO 40, s. 2012)
 */
export const PrivacyNoticeModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="privacy-notice-title"
    >
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h2 id="privacy-notice-title" className="text-lg font-bold text-slate-900 dark:text-white">
                Privacy & Data Retention Notice
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Philippine Data Privacy Act (RA 10173) & DepEd Child Protection Policy Compliance
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 text-blue-800 dark:text-blue-300 flex items-start gap-3 text-xs">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span>
              <strong>Mandatory Notice:</strong> VioTrack handles student disciplinary records, which constitute sensitive personal information under Philippine law. Access is restricted strictly to authorized academic personnel.
            </span>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 mt-0.5">
                <Lock size={16} />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-white text-sm">
                  1. Purpose & Scope of Data Collection
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Disciplinary records, attendance telemetry, and parent conference minutes are processed exclusively for student conduct guidance, institutional security, and remedial intervention.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 mt-0.5">
                <Clock size={16} />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-white text-sm">
                  2. Retention Schedule & Expungement
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  In compliance with statutory guidelines, active violation logs are retained for <strong>five (5) academic years</strong> following graduation or transfer, after which records are permanently expunged or anonymized. Resolved or acquitted infractions are sealed.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 mt-0.5">
                <UserCheck size={16} />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-white text-sm">
                  3. Access Control & Non-Public Disclosure
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Student identification matrices use cryptographic HMAC-SHA256 tokens (`VT2:`). Public scans do not expose confidential violation history. Only authenticated Class Advisers and Prefects of Discipline can inspect student ledgers.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 mt-0.5">
                <FileText size={16} />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-white text-sm">
                  4. Rights of Data Subjects (Students & Guardians)
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Guardians and authorized representatives possess the right to inspect recorded incident summaries, request corrections to clerical errors, and receive formal Parent Summons notices.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors shadow-sm"
          >
            I Understand & Acknowledge
          </button>
        </div>
      </div>
    </div>
  );
};
