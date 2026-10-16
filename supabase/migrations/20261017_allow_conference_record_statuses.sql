ALTER TABLE records
  DROP CONSTRAINT IF EXISTS records_status_check;

ALTER TABLE records
  ADD CONSTRAINT records_status_check
  CHECK (
    status IN (
      'Pending',
      'Investigation',
      'Resolved',
      'Dismissed',
      'Under Approval',
      'Rejected',
      '1st Conference',
      '2nd Conference',
      '3rd Conference'
    )
  );
