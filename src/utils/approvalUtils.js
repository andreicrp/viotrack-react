/** @typedef {import('../services/dataService/types').IncidentRecord} IncidentRecord */

/** @param {IncidentRecord} record */
export const getApprovalStatus = (record) => {
  const status = record.status || '';
  const approvalStatus = record.approval_status || '';
  const reporterType = typeof record.reported_by_type === 'string' ? record.reported_by_type : '';
  if (status === 'Under Approval' || approvalStatus === 'Under Approval') return 'Under Approval';
  if (status === 'Rejected' || approvalStatus === 'Rejected') return 'Rejected';
  if (reporterType === 'teacher' && !record.approved_by && status !== 'Resolved') return 'Under Approval';
  if (approvalStatus === 'Approved') return 'Approved';
  return approvalStatus || (status === 'Under Approval' ? 'Under Approval' : 'Approved');
};
