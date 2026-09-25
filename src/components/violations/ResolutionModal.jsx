import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { dataService } from '../../services/dataService';
import { useNotification } from '../../context/NotificationContext';
import { CheckCircle2, ShieldCheck, FileCheck, Printer, Sparkles, Check } from 'lucide-react';
import CustomSelect from '../common/CustomSelect';
import confetti from 'canvas-confetti';

export const ResolutionModal = ({ isOpen, onClose, record, onUpdated }) => {
  const { success, error } = useNotification();
  const [status, setStatus] = useState(record?.status || 'Resolved');
  const [sanction, setSanction] = useState(record?.sanction || '');
  const [resolutionNotes, setResolutionNotes] = useState(record?.resolution_notes || '');
  const [loading, setLoading] = useState(false);

  if (!record) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updated = await dataService.updateRecordStatus(record.id, {
        status,
        sanction,
        resolution_notes: resolutionNotes
      });

      if (status === 'Resolved') {
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 }
          });
        } catch (e) {}
      }

      success(`Incident #${record.id} updated to "${status}" successfully!`);
      onUpdated?.(updated);
      onClose();
    } catch (err) {
      error('Failed to update resolution: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintResolutionCertificate = () => {
    const printWindow = window.open('', '_blank', 'width=800,height=700');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>VIOTRACK - Disciplinary Resolution Document #${record.id}</title>
        <style>
          body { font-family: 'Times New Roman', serif; padding: 40px; color: #1e293b; line-height: 1.6; }
          .header { text-align: center; border-bottom: 2px solid #27367f; padding-bottom: 15px; margin-bottom: 25px; }
          .title { font-size: 20px; font-weight: bold; color: #27367f; text-transform: uppercase; margin: 0; }
          .subtitle { font-size: 12px; color: #64748b; margin-top: 4px; }
          .card { background: #f8fafc; border: 1px solid #e2e8f0; padding: 18px; border-radius: 8px; margin: 20px 0; }
          .row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
          .signatures { display: flex; justify-content: space-between; margin-top: 60px; }
          .sign-line { width: 220px; border-top: 1px solid #000; text-align: center; font-size: 12px; padding-top: 4px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">Perpetual Help College of Manila</div>
          <div class="subtitle">Disciplinary Board & Guidance Counseling Department</div>
          <div style="font-size: 16px; font-weight: bold; margin-top: 10px; color: #0f172a;">Official Case Resolution Certificate</div>
        </div>

        <p>This certifies that the recorded infraction has undergone formal review and disciplinary resolution under school regulations.</p>

        <div class="card">
          <div class="row"><span><strong>Incident Case ID:</strong> #${record.id}</span> <span><strong>Date Resolved:</strong> ${new Date().toLocaleDateString()}</span></div>
          <div class="row"><span><strong>Student Name:</strong> ${record.student?.fname || ''} ${record.student?.lname || ''}</span> <span><strong>LRN:</strong> ${record.student?.lrn || 'N/A'}</span></div>
          <div class="row"><span><strong>Grade & Section:</strong> ${record.student?.grade || ''} - ${record.student?.section || ''}</span> <span><strong>School Year:</strong> ${record.student?.academicyear || '2025-2026'}</span></div>
          <div class="row"><span><strong>Infraction Recorded:</strong> ${record.violation?.title || 'General Violation'}</span> <span><strong>Severity:</strong> ${record.violation?.type || 'Minor'}</span></div>
          <div class="row"><span><strong>Sanction Rendered:</strong> ${sanction || record.sanction || 'Completed'}</span> <span><strong>Status:</strong> ${status}</span></div>
        </div>

        <div style="margin: 20px 0; font-size: 13px;">
          <strong>Counselor / Prefect Remarks:</strong>
          <p style="background: #fff; border: 1px dashed #cbd5e1; padding: 12px; border-radius: 6px;">
            ${resolutionNotes || 'Case is formally settled and cleared. Student demonstrated cooperation and commitment to school standards.'}
          </p>
        </div>

        <div class="signatures">
          <div class="sign-line">Prefect of Discipline / Adviser</div>
          <div class="sign-line">Parent / Guardian Signature</div>
          <div class="sign-line">Guidance Counselor</div>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Case Resolution - Incident #${record.id}`} icon={FileCheck} maxWidth="580px">
      <form onSubmit={handleSubmit}>
        <div className="modal-body" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Summary Box */}
          <div
            style={{
              background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Student Profile:</span>
              <strong style={{ fontSize: '13.5px', color: '#0f172a' }}>
                {record.student?.fname} {record.student?.lname} ({record.student?.grade} - {record.student?.section})
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Offense Recorded:</span>
              <span style={{ fontSize: '13px', color: '#dc2626', fontWeight: 700 }}>
                {record.violation?.title} ({record.violation?.type || 'Minor'})
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Reported By:</span>
              <span style={{ fontSize: '12.5px', color: '#334155', fontWeight: 500 }}>{record.reported_by_name || 'Faculty / Admin'}</span>
            </div>
          </div>

          {/* Status Selector */}
          <div className="form-group">
            <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px', display: 'block' }}>
              Update Case Resolution Status <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <CustomSelect
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={[
                { value: 'Resolved', label: 'Resolved & Cleared (Case Closed)' },
                { value: 'Investigation', label: 'Under Investigation / Ongoing' },
                { value: 'Pending', label: 'Pending (Open)' },
                { value: 'Escalated', label: 'Escalated to Guidance Office' },
              ]}
            />
          </div>

          {/* Completed Sanction */}
          <div className="form-group">
            <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px', display: 'block' }}>
              Fulfilled Sanction / Remediation Completed
            </label>
            <input
              type="text"
              className="form-control"
              value={sanction}
              onChange={(e) => setSanction(e.target.value)}
              placeholder="e.g. Completed 1-hour community service, Signed behavior undertaking"
              style={{ height: '40px', borderRadius: '10px', fontSize: '13px' }}
            />
          </div>

          {/* Counselor / Prefect Notes */}
          <div className="form-group">
            <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px', display: 'block' }}>
              Counseling Notes & Official Resolution Summary
            </label>
            <textarea
              className="form-control"
              rows={3}
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="Document student reflection, counseling outcomes, or guardian agreement..."
              style={{ borderRadius: '10px', fontSize: '13px', padding: '10px 12px' }}
            />
          </div>

        </div>

        <div className="modal-footer" style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            type="button"
            onClick={handlePrintResolutionCertificate}
            style={{
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              color: '#334155',
              padding: '9px 14px',
              borderRadius: '10px',
              fontWeight: 600,
              fontSize: '12.5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Printer size={15} /> Print Resolution Certificate
          </button>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              style={{ borderRadius: '10px', padding: '9px 18px', fontWeight: 600, fontSize: '13px' }}
            >
              Close
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{
                background: '#10b981',
                borderRadius: '10px',
                padding: '9px 20px',
                fontWeight: 700,
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)'
              }}
            >
              <Check size={16} />
              {loading ? 'Saving...' : 'Save Resolution'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
