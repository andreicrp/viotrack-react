import { INITIAL_VIOLATIONS, INITIAL_RECORDS, INITIAL_STUDENTS } from './fixtures.js';
import { supabase, isSupabaseConfigured, broadcastRecordChange, startMutation, endMutation, CACHE_CONFIG, _cache, executeWithDeduplication, invalidateCache, getStored, setStored } from './shared.js';

export const violationsMethods = {
  /**
   * Read violation categories, using cached values unless refresh is requested.
   * @param {boolean} [forceRefresh=false] Bypass cached results and load again.
   * @returns {Promise<import('./types').ViolationType[]>} Violation categories.
   */
  async getViolations(forceRefresh = false) {
      const now = Date.now();
      const cached = _cache.data.violations;
      const cacheAge = now - _cache.timestamps.violations;

      if (!forceRefresh && cached && cacheAge < CACHE_CONFIG.FRESH_TTL) {
        return cached;
      }

      if (!forceRefresh && cached && cacheAge < CACHE_CONFIG.STALE_TTL) {
        this.getViolations(true).catch(() => {});
        return cached;
      }

      return executeWithDeduplication('violations', async () => {
        let result = null;
        if (isSupabaseConfigured()) {
          const { data, error } = await supabase.from('violations').select('*').order('type', { ascending: true });
          if (!error && data && data.length > 0) result = data;
        }
        if (!result) {
          const stored = getStored('violations', null);
          if (!stored || stored.length < INITIAL_VIOLATIONS.length) {
            setStored('violations', INITIAL_VIOLATIONS);
            result = INITIAL_VIOLATIONS;
          } else {
            result = stored;
          }
        }

        // Remove duplicate categories by numeric ID and normalized title.
        if (Array.isArray(result)) {
          const seenTitles = new Set();
          const seenIds = new Set();
          result = result.filter((violation) => {
            if (!violation) return false;
            const id = Number(violation.id);
            const title = String(violation.title || '').trim().toLowerCase();
            if (id && seenIds.has(id)) return false;
            if (title && seenTitles.has(title)) return false;
            if (id) seenIds.add(id);
            if (title) seenTitles.add(title);
            return true;
          });
        }

        _cache.data.violations = result;
        _cache.timestamps.violations = Date.now();
        return result;
      });
    },

  async addViolationType(violation) {
      const cleanViolation = {
        title: String(violation.title || '').trim(),
        description: String(violation.description || '').trim(),
        type: String(violation.type || 'Minor').trim(),
        default_sanction: String(violation.default_sanction || '').trim()
      };

      // Return the existing row rather than inserting a duplicate category.
      const current = await this.getViolations();
      const normalizedTitle = cleanViolation.title.toLowerCase();
      const existing = current.find((item) => (item.title || '').trim().toLowerCase() === normalizedTitle);
      if (existing) return existing;

      let result = null;

      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase.from('violations').insert([cleanViolation]).select();
          if (!error && data?.[0]) {
            result = data[0];
          } else if (error) {
            console.error('Supabase addViolationType error:', error);
          }
        } catch (err) {
          console.warn('Supabase addViolationType error:', err);
        }
      }
      const currentStored = getStored('violations', INITIAL_VIOLATIONS);
      if (!result) {
        result = { ...cleanViolation, id: Date.now(), created_at: new Date().toISOString() };
      }
      const updated = [
        ...currentStored.filter((item) => (item.title || '').trim().toLowerCase() !== normalizedTitle),
        result
      ];
      setStored('violations', updated);
      invalidateCache('violations');
      await this.addActivityLog('Add Violation Category', `Created category "${cleanViolation.title}" (${cleanViolation.type})`);
      try {
        window.dispatchEvent(new CustomEvent('viotrack_data_updated', { detail: result }));
      } catch {}
      return result;
    },

  async updateViolationType(id, updates) {
      let result = null;
      const cleanUpdates = {};
      const allowed = ['title', 'description', 'type', 'default_sanction'];
      for (const key of allowed) {
        if (updates[key] !== undefined) {
          cleanUpdates[key] = updates[key];
        }
      }

      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase.from('violations').update(cleanUpdates).eq('id', Number(id)).select();
          if (!error && data?.[0]) {
            result = data[0];
          } else if (error) {
            console.error('Supabase updateViolationType error:', error);
          }
        } catch (err) {
          console.warn('Supabase updateViolationType error:', err);
        }
      }
      const current = getStored('violations', INITIAL_VIOLATIONS);
      const updated = current.map(v => (v.id === Number(id) ? { ...v, ...updates } : v));
      setStored('violations', updated);
      if (!result) result = updated.find(v => v.id === Number(id));
      invalidateCache('violations');
      await this.addActivityLog('Update Violation Category', `Updated category "${updates.title || result?.title || '#' + id}" (${updates.type || result?.type || ''})`);
      try {
        window.dispatchEvent(new CustomEvent('viotrack_data_updated', { detail: result }));
      } catch {}
      return result;
    },

  async deleteViolationType(id) {
      if (isSupabaseConfigured()) {
        try {
          const { error } = await supabase.from('violations').delete().eq('id', Number(id));
          if (error) console.error('Supabase deleteViolationType error:', error);
        } catch (err) {
          console.warn('Supabase deleteViolationType error:', err);
        }
      }
      const current = getStored('violations', INITIAL_VIOLATIONS);
      const target = current.find(v => v.id === Number(id));
      const title = target ? target.title : `ID #${id}`;
      const updated = current.filter(v => v.id !== Number(id));
      setStored('violations', updated);
      invalidateCache('violations');
      await this.addActivityLog('Delete Violation Category', `Removed violation category "${title}"`);
      try {
        window.dispatchEvent(new CustomEvent('viotrack_data_updated', { detail: { id } }));
      } catch {}
      return true;
    },

  /**
   * Read incident records with their related student and violation rows.
   * @param {boolean} [forceRefresh=false] Bypass cached results and load again.
   * @returns {Promise<import('./types').IncidentRecord[]>} Incident records.
   */
  async getRecords(forceRefresh = false) {
    const now = Date.now();
    const cached = _cache.data.records;
    const cacheAge = now - _cache.timestamps.records;

    if (!forceRefresh && cached && cacheAge < CACHE_CONFIG.FRESH_TTL) {
      return cached;
    }

    if (!forceRefresh && cached && cacheAge < CACHE_CONFIG.STALE_TTL) {
      this.getRecords(true).catch(() => {});
      return cached;
    }

    return executeWithDeduplication('records', async () => {
      const [students, violations] = await Promise.all([
        this.getStudents(),
        this.getViolations()
      ]);

      const studentMap = new Map();
      INITIAL_STUDENTS.forEach((s) => {
        if (s.id) {
          studentMap.set(Number(s.id), s);
          studentMap.set(String(s.id), s);
        }
        if (s.student_id) studentMap.set(String(s.student_id).trim(), s);
        if (s.lrn) studentMap.set(String(s.lrn).trim(), s);
      });
      students.forEach((s, idx) => {
        if (s.id) {
          studentMap.set(Number(s.id), s);
          studentMap.set(String(s.id), s);
        }
        if (s.student_id) studentMap.set(String(s.student_id).trim(), s);
        if (s.lrn) studentMap.set(String(s.lrn).trim(), s);
        if (!studentMap.has(idx + 1)) {
          studentMap.set(idx + 1, s);
        }
      });
      const violationMap = new Map();
      violations.forEach((v, idx) => {
        if (v.id) {
          violationMap.set(Number(v.id), v);
          violationMap.set(String(v.id), v);
        }
        violationMap.set(idx + 1, v);
      });

      let remoteRecords = null;
      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase
            .from('records')
            .select(`
              *,
              students (*),
              violations (*)
            `)
            .order('id', { ascending: false });
          if (!error && data) {
            remoteRecords = data;
          }
        } catch (err) {
          console.warn('Supabase getRecords error:', err);
        }
      }

      let allRawRecords = [];
      if (remoteRecords && remoteRecords.length > 0) {
        allRawRecords = [...remoteRecords];
        // Only merge locally logged user records (offline creates with timestamp IDs > 1000000000)
        const localRecords = getStored('records', []);
        const remoteIdSet = new Set(remoteRecords.map(r => Number(r.id)));
        localRecords.forEach(lr => {
          const numId = Number(lr.id);
          if (numId > 1000000000 && !remoteIdSet.has(numId)) {
            allRawRecords.push(lr);
          }
        });
      } else {
        allRawRecords = getStored('records', INITIAL_RECORDS);
      }

      let mappedRecords = allRawRecords.map(r => {
        const isTeacher = (r.reported_by_type === 'teacher' || (r.reported_by_name && r.reported_by_name !== 'System Admin' && r.reported_by_name !== 'Sheryl Gamboa' && r.reported_by_name !== 'Head Admin'));

        let resolvedApproval = r.approval_status;
        if (r.status === 'Under Approval') {
          resolvedApproval = 'Under Approval';
        } else if (r.status === 'Rejected') {
          resolvedApproval = 'Rejected';
        } else if (resolvedApproval === 'Under Approval') {
          resolvedApproval = 'Under Approval';
        } else if (resolvedApproval === 'Rejected') {
          resolvedApproval = 'Rejected';
        } else if (!resolvedApproval) {
          if (r.approved_by) {
            resolvedApproval = 'Approved';
          } else if (isTeacher || !r.approved_by) {
            resolvedApproval = 'Under Approval';
          } else {
            resolvedApproval = 'Approved';
          }
        }

        const rawStudent = r.students || r.student;
        let resolvedStudent = (rawStudent && (rawStudent.fname || rawStudent.lname))
          ? rawStudent
          : (studentMap.get(Number(r.student_id)) || studentMap.get(String(r.student_id)) || rawStudent);

        if (!resolvedStudent || (!resolvedStudent.fname && !resolvedStudent.lname)) {
          resolvedStudent = (students || []).find(s => String(s.student_id) === String(r.student_id) || String(s.id) === String(r.student_id))
            || INITIAL_STUDENTS.find(s => String(s.student_id) === String(r.student_id) || String(s.id) === String(r.student_id))
            || INITIAL_STUDENTS[0];
        }

        const sid = String(resolvedStudent.student_id || resolvedStudent.lrn || r.student_id || '109283746101').trim();
        const sImage = (resolvedStudent.image && resolvedStudent.image.trim() !== '')
          ? resolvedStudent.image
          : `https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80`;

        resolvedStudent = {
          ...resolvedStudent,
          student_id: sid,
          lrn: sid,
          image: sImage
        };

        const rawViolation = r.violations || r.violation;
        const resolvedViolation = (rawViolation && rawViolation.title)
          ? rawViolation
          : (violationMap.get(Number(r.violation_id)) || violationMap.get(String(r.violation_id)) || rawViolation);

        return {
          ...r,
          approval_status: resolvedApproval,
          student: resolvedStudent,
          violation: resolvedViolation
        };
      });

      // Automatic Deduplication of Incident Records
      if (Array.isArray(mappedRecords)) {
        const seenIds = new Set();
        mappedRecords = mappedRecords.filter(r => {
          if (!r) return false;
          const id = Number(r.id);
          if (id && seenIds.has(id)) return false;
          if (id) seenIds.add(id);
          return true;
        });
      }

      _cache.data.records = mappedRecords;
      _cache.timestamps.records = Date.now();
      return mappedRecords;
    });
  },

  async addRecord(record) {
      startMutation();
      try {
        let result = null;
        let remarksText = record.remarks || '';
        if (record.lat && record.lng && !remarksText.includes('GPS:')) {
          const gpsNote = ` [GPS: ${Number(record.lat).toFixed(4)}, ${Number(record.lng).toFixed(4)}${record.accuracy ? ` (±${record.accuracy}m)` : ''}]`;
          remarksText = remarksText ? `${remarksText}${gpsNote}` : gpsNote.trim();
        }

        const isTeacherReport = (record.reported_by_type === 'teacher');
        const defaultApprovalStatus = record.approval_status || (isTeacherReport ? 'Under Approval' : 'Approved');

        const cleanRecord = {
          student_id: Number(record.student_id),
          violation_id: Number(record.violation_id),
          reported_by_name: record.reported_by_name || 'System Admin',
          reported_by_type: record.reported_by_type || 'admin',
          date_reported: record.date_reported || new Date().toISOString(),
          status: record.status || (isTeacherReport ? 'Under Approval' : 'Pending'),
          approval_status: defaultApprovalStatus,
          approved_by: record.approved_by || (defaultApprovalStatus === 'Approved' ? (record.reported_by_name || 'Admin') : null),
          approved_at: record.approved_at || (defaultApprovalStatus === 'Approved' ? new Date().toISOString() : null),
          rejection_reason: record.rejection_reason || null,
          rejected_by: record.rejected_by || null,
          rejected_at: record.rejected_at || null,
          sanction: record.sanction || '',
          remarks: remarksText,
          resolution_notes: record.resolution_notes || '',
          resolution_date: record.resolution_date || null,
          sms_notified: Boolean(record.sms_notified)
        };

        if (isSupabaseConfigured()) {
          try {
            const { data, error } = await supabase
              .from('records')
              .insert([cleanRecord])
              .select('*, students (*), violations (*)');
            if (!error && data?.[0]) {
              result = {
                ...data[0],
                student: data[0].students,
                violation: data[0].violations
              };
            } else if (error) {
              console.error('Supabase addRecord insert error:', error);
            }
          } catch (err) {
            console.warn('Supabase addRecord error:', err);
          }
        }

        const current = getStored('records', INITIAL_RECORDS);
        if (!result) {
          result = {
            ...cleanRecord,
            id: Date.now(),
            lat: record.lat,
            lng: record.lng,
            accuracy: record.accuracy
          };
        }

        const updated = [result, ...current];
        setStored('records', updated);
        invalidateCache('records');

        // Identify student & violation details for clear log entry
        let studentLabel = `Student ID #${record.student_id}`;
        try {
          const students = await this.getStudents();
          const matchedStudent = (students || []).find(s => Number(s.id) === Number(record.student_id));
          if (matchedStudent) {
            studentLabel = `${matchedStudent.fname} ${matchedStudent.lname} (${matchedStudent.grade} - ${matchedStudent.section})`;
          }
        } catch {}

        let violationLabel = record.violation_title || `Violation ID #${record.violation_id}`;
        try {
          const violations = await this.getViolations();
          const matchedV = (violations || []).find(v => Number(v.id) === Number(record.violation_id));
          if (matchedV) {
            violationLabel = `${matchedV.title} [${matchedV.type}]`;
          }
        } catch {}

        await this.addActivityLog('Add Violation', `Logged incident "${violationLabel}" for ${studentLabel}`);
        broadcastRecordChange('create', 'record', result);
        return result;
      } finally {
        endMutation();
      }
    },

  async updateRecordStatus(id, { status, resolution_notes, sanction }) {
      startMutation();
      try {
        const isResolved = status === 'Resolved';
        const payload = {
          status,
          resolution_notes: resolution_notes || '',
          sanction: sanction || '',
          resolution_date: isResolved ? new Date().toISOString() : null
        };

        let result = null;
        if (isSupabaseConfigured()) {
          try {
            const { data, error } = await supabase
              .from('records')
              .update(payload)
              .eq('id', Number(id))
              .select('*, students (*), violations (*)');
            if (!error && data?.[0]) {
              result = {
                ...data[0],
                student: data[0].students,
                violation: data[0].violations
              };
            } else if (error) {
              console.error('Supabase updateRecordStatus error:', error);
            }
          } catch (err) {
            console.warn('Supabase updateRecordStatus error:', err);
          }
        }
        const current = getStored('records', INITIAL_RECORDS);
        const updated = current.map(r => (Number(r.id) === Number(id) ? { ...r, ...payload } : r));
        setStored('records', updated);
        invalidateCache('records');
        if (!result) result = updated.find(r => Number(r.id) === Number(id));

        const sanctionSuffix = sanction ? ` | Sanction: ${sanction}` : '';
        await this.addActivityLog('Status Update', `Marked Incident #${id} as "${status}"${sanctionSuffix}`);
        broadcastRecordChange('update', 'record', result);
        return result;
      } finally {
        endMutation();
      }
    },

  async approveRecord(id, { approved_by = 'Head Admin', status = 'Pending', notes = '' } = {}) {
      startMutation();
      try {
        const payload = {
          approval_status: 'Approved',
          status: status || 'Pending',
          approved_by,
          approved_at: new Date().toISOString(),
          rejection_reason: null,
          resolution_notes: notes ? notes : undefined
        };

        let result = null;
        if (isSupabaseConfigured()) {
          try {
            const { data, error } = await supabase
              .from('records')
              .update(payload)
              .eq('id', Number(id))
              .select('*, students (*), violations (*)');
            if (!error && data?.[0]) {
              result = {
                ...data[0],
                student: data[0].students,
                violation: data[0].violations
              };
            }
          } catch (err) {
            console.warn('Supabase approveRecord error:', err);
          }
        }

        const current = getStored('records', INITIAL_RECORDS);
        const updated = current.map(r => (Number(r.id) === Number(id) ? { ...r, ...payload } : r));
        setStored('records', updated);
        invalidateCache('records');
        if (!result) result = updated.find(r => Number(r.id) === Number(id));

        await this.addActivityLog('Approve Violation', `Approved teacher violation report #${id} by ${approved_by}`);
        broadcastRecordChange('update', 'record', result);
        return result;
      } finally {
        endMutation();
      }
    },

  async rejectRecord(id, { rejected_by = 'Head Admin', rejection_reason = 'Disapproved by administration' } = {}) {
      startMutation();
      try {
        const payload = {
          approval_status: 'Rejected',
          status: 'Rejected',
          rejected_by,
          rejected_at: new Date().toISOString(),
          rejection_reason
        };

        let result = null;
        if (isSupabaseConfigured()) {
          try {
            const { data, error } = await supabase
              .from('records')
              .update(payload)
              .eq('id', Number(id))
              .select('*, students (*), violations (*)');
            if (!error && data?.[0]) {
              result = {
                ...data[0],
                student: data[0].students,
                violation: data[0].violations
              };
            }
          } catch (err) {
            console.warn('Supabase rejectRecord error:', err);
          }
        }

        const current = getStored('records', INITIAL_RECORDS);
        const updated = current.map(r => (Number(r.id) === Number(id) ? { ...r, ...payload } : r));
        setStored('records', updated);
        invalidateCache('records');
        if (!result) result = updated.find(r => Number(r.id) === Number(id));

        await this.addActivityLog('Reject Violation', `Rejected teacher violation report #${id} (Reason: ${rejection_reason})`);
        broadcastRecordChange('update', 'record', result);
        return result;
      } finally {
        endMutation();
      }
    },

  async deleteRecord(id) {
      startMutation();
      try {
        if (isSupabaseConfigured()) {
          try {
            const { error } = await supabase.from('records').delete().eq('id', Number(id));
            if (error) console.error('Supabase deleteRecord error:', error);
          } catch (err) {
            console.warn('Supabase deleteRecord error:', err);
          }
        }
        const current = getStored('records', INITIAL_RECORDS);
        const updated = current.filter(r => Number(r.id) !== Number(id));
        setStored('records', updated);
        invalidateCache('records');
        await this.addActivityLog('Delete Record', `Removed violation record #${id}`);
        broadcastRecordChange('delete', 'record', { id });
        return true;
      } finally {
        endMutation();
      }
    },

  /**
   * Filter and page incident records.
   * @param {import('./types').IncidentPageOptions} [options] Status, search, and page options.
   * @returns {Promise<import('./types').PageResult<import('./types').IncidentRecord>>} Page metadata and rows.
   */
  async getRecordsPaginated({ page = 1, limit = 10, status = 'all', approvalStatus = 'all', search = '', dateRange = null } = {}) {
      const allRecords = await this.getRecords();
      const query = String(search || '').toLowerCase().trim();

      let filtered = allRecords;

      if (approvalStatus !== 'all') {
        filtered = filtered.filter(r => (r.approval_status || '').toLowerCase() === approvalStatus.toLowerCase());
      }

      if (status !== 'all') {
        filtered = filtered.filter(r => (r.status || '').toLowerCase() === status.toLowerCase());
      }

      if (query) {
        filtered = filtered.filter(r => {
          const s = r.student;
          const v = r.violation;
          return (
            (s?.fname && s.fname.toLowerCase().includes(query)) ||
            (s?.lname && s.lname.toLowerCase().includes(query)) ||
            (s?.lrn && String(s.lrn).toLowerCase().includes(query)) ||
            (v?.title && v.title.toLowerCase().includes(query)) ||
            (r.remarks && r.remarks.toLowerCase().includes(query))
          );
        });
      }

      const totalCount = filtered.length;
      const totalPages = Math.ceil(totalCount / limit) || 1;
      const startIndex = (page - 1) * limit;
      const paginatedData = filtered.slice(startIndex, startIndex + limit);

      return {
        data: paginatedData,
        totalCount,
        totalPages,
        currentPage: page,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      };
    },

  resetRecordsToDefault() {
      try {
        localStorage.removeItem('viotrack_records');
        invalidateCache('records');
        window.dispatchEvent(new CustomEvent('viotrack_data_updated'));
        return true;
      } catch {
        return false;
      }
    }
};
