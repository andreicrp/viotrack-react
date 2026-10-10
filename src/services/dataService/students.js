import { INITIAL_STUDENTS } from './fixtures.js';
import { supabase, isSupabaseConfigured, broadcastRecordChange, startMutation, endMutation, CACHE_CONFIG, _cache, executeWithDeduplication, invalidateCache, getStored, setStored } from './shared.js';

export const studentsMethods = {
  /**
   * Read and normalize student rows, using cached values unless refresh is requested.
   * @param {boolean} [forceRefresh=false] Bypass cached results and load again.
   * @returns {Promise<import('./types').Student[]>} Normalized student rows.
   */
  async getStudents(forceRefresh = false) {
      const now = Date.now();
      const cached = _cache.data.students;
      const cacheAge = now - _cache.timestamps.students;

      // 1. Instant Synchronous Cache Hit (Fresh)
      if (!forceRefresh && cached && cacheAge < CACHE_CONFIG.FRESH_TTL) {
        return cached;
      }

      // 2. Stale-While-Revalidate Hit: Return immediately & revalidate in background
      if (!forceRefresh && cached && cacheAge < CACHE_CONFIG.STALE_TTL) {
        // Trigger background silent revalidation without awaiting
        this.getStudents(true).catch(() => {});
        return cached;
      }

      return executeWithDeduplication('students', async () => {
        let remoteList = null;
        if (isSupabaseConfigured()) {
          try {
            const { data, error } = await supabase.from('students').select('*').order('lname', { ascending: true });
            if (!error && Array.isArray(data)) {
              remoteList = data;
            } else {
              // Retry without ordering when the database schema does not support `lname` ordering.
              const fallback = await supabase.from('students').select('*');
              if (!fallback.error && Array.isArray(fallback.data)) {
                remoteList = fallback.data;
              }
            }
          } catch (e) {
            console.warn('Supabase getStudents notice:', e);
          }
        }

        const stored = getStored('students', INITIAL_STUDENTS);
        const storedMap = new Map();
        stored.forEach(s => {
          const sid = String(s.student_id || s.lrn || '').trim();
          if (sid) storedMap.set(sid, s);
        });

        let combinedList = [];
        if (isSupabaseConfigured() && remoteList !== null) {
          const remoteIds = new Set();
          combinedList = remoteList.map(remoteItem => {
            const sid = String(remoteItem.student_id || remoteItem.lrn || '').trim();
            if (sid) remoteIds.add(sid);
            const localItem = storedMap.get(sid) || {};
            return {
              ...localItem,
              ...remoteItem,
              student_id: sid,
              lrn: sid,
              image: remoteItem.image || localItem.image
            };
          });
          // Keep locally-created rows visible until the remote insert succeeds.
          stored.forEach(localItem => {
            const sid = String(localItem.student_id || localItem.lrn || '').trim();
            if (sid && !remoteIds.has(sid)) combinedList.unshift(localItem);
          });
        } else {
          combinedList = stored;
        }

        const processed = combinedList.map(s => {
          const sid = String(s.student_id || s.lrn || '').trim();
          return {
            ...s,
            student_id: sid,
            lrn: sid,
            image: s.image || `https://ui-avatars.com/api/?name=${encodeURIComponent((s.fname || '') + ' ' + (s.lname || ''))}&background=07345f&color=fff&bold=true`
          };
        });

        setStored('students', processed);
        _cache.data.students = processed;
        _cache.timestamps.students = Date.now();
        return processed;
      });
    },

  /**
   * Add a student, retrying inserts after removing unsupported schema columns.
   * @param {import('./types').StudentInput} student Student values to normalize and add.
   * @returns {Promise<import('./types').Student>} The resulting student record.
   */
  async addStudent(student) {
      startMutation();
      try {
        let result = null;
        const studentIdVal = String(student.student_id || student.lrn || '').trim();
        if (!studentIdVal) {
          throw new Error('Student ID is required.');
        }
        const cleanStudent = {
          student_id: studentIdVal,
          lrn: studentIdVal,
          fname: String(student.fname || '').trim(),
          mname: String(student.mname || '').trim(),
          lname: String(student.lname || '').trim(),
          email: String(student.email || '').trim().toLowerCase(),
          grade: String(student.grade || 'Grade 10').trim(),
          track: String(student.track || 'JHS').trim(),
          strand: String(student.strand || 'JHS').trim(),
          section: String(student.section || 'General').trim(),
          academicyear: String(student.academicyear || student.academic_year || '2025-2026').trim(),
          gender: String(student.gender || 'Male').trim(),
          contact: String(student.contact || '').trim(),
          parent_name: String(student.parent_name || '').trim(),
          parent_contact: String(student.parent_contact || '').trim(),
          address: String(student.address || '').trim(),
          password: String(student.password || 'Viotrack@2026!').trim(),
          image: String(student.image || '').trim()
        };

        if (isSupabaseConfigured()) {
          try {
            /** @type {Record<string, unknown>} */
            const supabasePayload = {
              student_id: studentIdVal,
              fname: cleanStudent.fname,
              mname: cleanStudent.mname,
              lname: cleanStudent.lname,
              grade: cleanStudent.grade,
              section: cleanStudent.section,
              academicyear: cleanStudent.academicyear,
              gender: cleanStudent.gender,
              contact: cleanStudent.contact,
              parent_name: cleanStudent.parent_name,
              parent_contact: cleanStudent.parent_contact,
              address: cleanStudent.address,
              image: cleanStudent.image
            };
            const toSend = { ...supabasePayload };
            let res = await supabase.from('students').insert([toSend]).select();
            while (res.error && res.error.code === 'PGRST204') {
              const match = res.error.message?.match(/Could not find the '([^']+)' column/);
              if (match?.[1] && Object.prototype.hasOwnProperty.call(toSend, match[1])) {
                delete toSend[match[1]];
                res = await supabase.from('students').insert([toSend]).select();
              } else {
                break;
              }
            }
            if (res.error) {
              if (res.error.code === '23505' || res.error.message?.includes('duplicate key') || res.error.message?.includes('unique constraint')) {
                throw new Error(`Student ID / LRN "${studentIdVal}" is already registered in the system.`);
              }
              console.warn('Supabase addStudent notice:', res.error);
            } else if (res.data?.[0]) {
              result = { ...cleanStudent, ...res.data[0], student_id: studentIdVal, lrn: studentIdVal };
            }
          } catch (err) {
            if (err.message && err.message.includes('already registered')) throw err;
            console.warn('Supabase addStudent error:', err);
          }
        }
        if (!result) {
          result = { ...cleanStudent, id: Date.now(), created_at: new Date().toISOString() };
        }
        const current = getStored('students', INITIAL_STUDENTS);
        const filtered = current.filter(s => String(s.student_id || s.lrn || '').trim() !== studentIdVal);
        setStored('students', [result, ...filtered]);
        invalidateCache('students');
        invalidateCache('records');
        if (_cache.data.students) {
          _cache.data.students = [result, ..._cache.data.students.filter(s => String(s.student_id || s.lrn || '').trim() !== studentIdVal)];
        }
        await this.addActivityLog('Add Student', `Enrolled student ${cleanStudent.fname} ${cleanStudent.lname} (ID: ${studentIdVal || 'No Student ID'}, ${cleanStudent.grade || ''} ${cleanStudent.section || ''})`);
        broadcastRecordChange('create', 'student', result);
        return result;
      } finally {
        endMutation();
      }
    },

  /**
   * Add roster rows in chunks and synchronize the local student cache.
   * @param {import('./types').StudentInput[]} studentsList Student rows to import.
   * @param {(current: number, total: number) => void} [onProgress] Optional progress callback.
   * @returns {Promise<import('./types').BulkStudentImportResult>} Aggregate import result.
   */
  async bulkAddStudents(studentsList, onProgress) {
      if (!Array.isArray(studentsList) || studentsList.length === 0) return { insertedCount: 0, errors: [] };
      startMutation();
      try {
        const CHUNK_SIZE = 100;
        const cleanStudents = studentsList.map((student, idx) => {
          const studentIdVal = String(student.student_id || student.lrn || `10928374${Math.floor(1000 + Math.random() * 9000)}`).trim();
          return {
            student_id: studentIdVal,
            lrn: studentIdVal,
            fname: String(student.fname || 'Student').trim(),
            mname: String(student.mname || '').trim(),
            lname: String(student.lname || 'Roster').trim(),
            email: String(student.email || '').trim().toLowerCase(),
            grade: String(student.grade || 'Grade 10').trim(),
            track: String(student.track || 'JHS').trim(),
            strand: String(student.strand || 'JHS').trim(),
            section: String(student.section || 'General').trim(),
            academicyear: String(student.academicyear || student.academic_year || '2025-2026').trim(),
            gender: String(student.gender || 'Male').trim(),
            contact: String(student.contact || '').trim(),
            parent_name: String(student.parent_name || '').trim(),
            parent_contact: String(student.parent_contact || '').trim(),
            address: String(student.address || '').trim(),
            password: String(student.password || 'Viotrack@2026!').trim(),
            image: String(student.image || '').trim()
          };
        });

        let totalInserted = 0;
        const total = cleanStudents.length;

        // 1. Supabase batch upsert in chunks
        if (isSupabaseConfigured()) {
          try {
            for (let i = 0; i < total; i += CHUNK_SIZE) {
              const chunk = cleanStudents.slice(i, i + CHUNK_SIZE);
              /** @type {Array<Record<string, unknown>>} */
              let payload = chunk.map(s => ({
                student_id: s.student_id,
                fname: s.fname,
                mname: s.mname,
                lname: s.lname,
                grade: s.grade,
                section: s.section,
                academicyear: s.academicyear,
                gender: s.gender,
                contact: s.contact,
                parent_name: s.parent_name,
                parent_contact: s.parent_contact,
                address: s.address,
                image: s.image
              }));

              let res = await supabase.from('students').insert(payload).select();
              while (res.error && res.error.code === 'PGRST204') {
                const match = res.error.message?.match(/Could not find the '([^']+)' column/);
                if (match?.[1] && payload.some(p => Object.prototype.hasOwnProperty.call(p, match[1]))) {
                  payload = payload.map(p => {
                    const copy = { ...p };
                    delete copy[match[1]];
                    return copy;
                  });
                  res = await supabase.from('students').insert(payload).select();
                } else {
                  break;
                }
              }

              totalInserted += (res.data ? res.data.length : chunk.length);
              if (onProgress) {
                onProgress(Math.min(totalInserted, total), total);
              }
            }
          } catch (err) {
            console.warn('Supabase bulkAddStudents error:', err);
          }
        }

        // 2. LocalStorage Sync
        const current = getStored('students', INITIAL_STUDENTS);
        const existingIdMap = new Map(current.map(s => [String(s.student_id || s.lrn || '').toLowerCase(), s]));
        const newItems = [];
        let nextId = Date.now();

        cleanStudents.forEach(cs => {
          const key = String(cs.student_id || cs.lrn || '').toLowerCase();
          if (existingIdMap.has(key)) {
            const old = existingIdMap.get(key);
            Object.assign(old, cs);
          } else {
            const created = { ...cs, id: nextId++, created_at: new Date().toISOString() };
            newItems.push(created);
            existingIdMap.set(key, created);
          }
        });

        const updatedAll = [...newItems, ...current];
        setStored('students', updatedAll);

        invalidateCache('students');
        invalidateCache('records');
        await this.addActivityLog('Bulk Import', `Bulk imported and enrolled ${total} student records`);
        broadcastRecordChange('create', 'students', { count: total });

        if (onProgress) {
          onProgress(total, total);
        }

        return { insertedCount: total, errors: [] };
      } finally {
        endMutation();
      }
    },

  /**
   * Update a student by database id, student_id, or LRN with schema-compatible retries.
   * @param {string | number} id Database id or student identifier.
   * @param {Partial<import('./types').StudentInput>} updates Fields to update.
   * @returns {Promise<import('./types').Student>} The updated student record.
   */
  async updateStudent(id, updates) {
      startMutation();
      try {
        let result = null;
        const cleanUpdates = {};
        const allowed = ['student_id', 'lrn', 'fname', 'mname', 'lname', 'email', 'grade', 'track', 'strand', 'section', 'academicyear', 'gender', 'contact', 'parent_name', 'parent_contact', 'address', 'password', 'image'];
        for (const key of allowed) {
          if (updates[key] !== undefined) {
            if (key === 'password' && !String(updates[key]).trim()) {
              continue;
            }
            cleanUpdates[key] = updates[key];
          }
        }
        if (updates.student_id && !updates.lrn) cleanUpdates.lrn = updates.student_id;
        if (updates.lrn && !updates.student_id) cleanUpdates.student_id = updates.lrn;

        if (isSupabaseConfigured()) {
          try {
            const allowedSupabaseCols = ['student_id', 'fname', 'mname', 'lname', 'grade', 'section', 'academicyear', 'gender', 'contact', 'parent_name', 'parent_contact', 'address', 'image'];
            /** @type {Record<string, unknown>} */
            const toSend = {};
            for (const key of allowedSupabaseCols) {
              if (cleanUpdates[key] !== undefined) toSend[key] = cleanUpdates[key];
            }
            const numericId = Number(id);
            const hasNumericId = !isNaN(numericId) && numericId > 0;
            let res;
            if (hasNumericId) {
              res = await supabase.from('students').update(toSend).eq('id', numericId).select();
            } else {
              res = await supabase.from('students').update(toSend).eq('student_id', String(id)).select();
            }
            while (res.error && res.error.code === 'PGRST204') {
              const match = res.error.message?.match(/Could not find the '([^']+)' column/);
              if (match?.[1] && Object.prototype.hasOwnProperty.call(toSend, match[1])) {
                delete toSend[match[1]];
                if (hasNumericId) {
                  res = await supabase.from('students').update(toSend).eq('id', numericId).select();
                } else {
                  res = await supabase.from('students').update(toSend).eq('student_id', String(id)).select();
                }
              } else {
                break;
              }
            }
            if (res.error) {
              if (res.error.code === '23505' || res.error.message?.includes('duplicate key') || res.error.message?.includes('unique constraint')) {
                throw new Error(`Student ID / LRN "${cleanUpdates.student_id || id}" is already registered to another student.`);
              }
              console.warn('Supabase updateStudent notice:', res.error);
            } else if (res.data?.[0]) {
              const sid = res.data[0].student_id || res.data[0].lrn || cleanUpdates.student_id || id;
              result = { ...cleanUpdates, ...res.data[0], student_id: sid, lrn: sid };
            }
          } catch (err) {
            if (err.message && err.message.includes('already registered')) throw err;
            console.warn('Supabase updateStudent error:', err);
          }
        }
        const current = getStored('students', INITIAL_STUDENTS);
        const targetLrn = updates.lrn || updates.student_id;
        const updated = current.map(s => {
          const isMatch =
            String(s.id) === String(id) ||
            String(s.student_id) === String(id) ||
            String(s.lrn) === String(id) ||
            (targetLrn && (String(s.lrn) === String(targetLrn) || String(s.student_id) === String(targetLrn)));
          return isMatch ? { ...s, ...cleanUpdates, ...(result || {}) } : s;
        });
        setStored('students', updated);
        if (!result) {
          result = updated.find(s =>
            String(s.id) === String(id) ||
            String(s.student_id) === String(id) ||
            String(s.lrn) === String(id) ||
            (targetLrn && (String(s.lrn) === String(targetLrn) || String(s.student_id) === String(targetLrn)))
          );
        }
        invalidateCache('students');
        invalidateCache('records');
        const name = updates.fname || updates.lname ? `${updates.fname || ''} ${updates.lname || ''}`.trim() : `ID #${id}`;
        await this.addActivityLog('Update Student', `Updated profile information for student ${name}`);
        broadcastRecordChange('update', 'student', result || { id, ...cleanUpdates });
        return result || { id, ...cleanUpdates };
      } finally {
        endMutation();
      }
    },

  /**
   * Delete a student by database id, student_id, or LRN.
   * @param {string | number} id Database id or student identifier.
   * @returns {Promise<boolean>} Whether the local deletion completed.
   */
  async deleteStudent(id) {
      startMutation();
      try {
        if (isSupabaseConfigured()) {
          try {
            const numericId = Number(id);
            if (!isNaN(numericId) && numericId > 0) {
              await supabase.from('students').delete().eq('id', numericId);
            } else {
              const firstAttempt = await supabase.from('students').delete().eq('student_id', id);
              if (firstAttempt.error) {
                await supabase.from('students').delete().eq('lrn', id);
              }
            }
          } catch (err) {
            console.warn('Supabase deleteStudent error:', err);
          }
        }
        const current = getStored('students', INITIAL_STUDENTS);
        const target = current.find(s => String(s.id) === String(id) || String(s.student_id) === String(id) || String(s.lrn) === String(id));
        const name = target ? `${target.fname} ${target.lname}` : `ID #${id}`;
        const updated = current.filter(s => String(s.id) !== String(id) && String(s.student_id) !== String(id) && String(s.lrn) !== String(id));
        setStored('students', updated);
        invalidateCache('students');
        invalidateCache('records');
        await this.addActivityLog('Delete Student', `Removed student record for ${name}`);
        broadcastRecordChange('delete', 'student', { id });
        return true;
      } finally {
        endMutation();
      }
    },

  async getStudentLatestLocation(studentId) {
      if (!studentId) return null;

      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase
            .from('student_locations')
            .select('*')
            .eq('student_id', Number(studentId))
            .order('recorded_at', { ascending: false })
            .limit(1);
          if (!error && data?.[0]) return data[0];
        } catch (err) {
          console.warn('Supabase getStudentLatestLocation error:', err);
        }
      }

      const storedHistory = getStored(`locations_${studentId}`, []);
      if (storedHistory.length > 0) return storedHistory[0];

      // Fallback seed based on student ID
      const seed = Number(studentId) || 1;
      const latOffset = ((seed * 17) % 70 - 35) * 0.0018;
      const lngOffset = ((seed * 23) % 70 - 35) * 0.0022;
      return {
        student_id: Number(studentId),
        latitude: 14.642 + latOffset,
        longitude: 120.985 + lngOffset,
        accuracy_meters: 8 + (seed % 12),
        recorded_at: new Date(Date.now() - (seed % 15) * 60000).toISOString(),
        tracking_status: 'Active',
        reported_by: 'GPS Telemetry'
      };
    },

  async getStudentLocationHistory(studentId, limit = 15) {
      if (!studentId) return [];

      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase
            .from('student_locations')
            .select('*')
            .eq('student_id', Number(studentId))
            .order('recorded_at', { ascending: false })
            .limit(limit);
          if (!error && data) return data;
        } catch (err) {
          console.warn('Supabase getStudentLocationHistory error:', err);
        }
      }

      const stored = getStored(`locations_${studentId}`, []);
      if (stored.length > 0) return stored.slice(0, limit);

      // Initial mock breadcrumbs
      const latest = await this.getStudentLatestLocation(studentId);
      const crumbs = [];
      for (let i = 0; i < 5; i++) {
        crumbs.push({
          id: `crumb_${i}`,
          student_id: Number(studentId),
          latitude: latest.latitude + (i * 0.0004 * (i % 2 === 0 ? 1 : -1)),
          longitude: latest.longitude + (i * 0.0005 * (i % 2 === 0 ? -1 : 1)),
          accuracy_meters: Math.max(5, (latest.accuracy_meters || 10) + i * 2),
          recorded_at: new Date(Date.now() - i * 180000).toISOString(),
          tracking_status: i === 0 ? 'Active' : 'Historical',
          reported_by: 'Device GPS'
        });
      }
      return crumbs;
    },

  async saveStudentLocation(studentId, { latitude, longitude, accuracy_meters, tracking_status = 'Active' }) {
      if (!studentId) throw new Error('Student ID is required');

      const lat = Number(latitude);
      const lng = Number(longitude);
      const acc = Number(accuracy_meters) || 10;

      // Strict Coordinate Validation
      if (isNaN(lat) || lat < -90 || lat > 90) throw new Error('Invalid latitude coordinates');
      if (isNaN(lng) || lng < -180 || lng > 180) throw new Error('Invalid longitude coordinates');
      if (acc < 0) throw new Error('Invalid accuracy range');

      const currentUser = this.getCurrentUser();
      const payload = {
        student_id: Number(studentId),
        latitude: lat,
        longitude: lng,
        accuracy_meters: acc,
        tracking_status: tracking_status,
        recorded_at: new Date().toISOString(),
        reported_by: currentUser.name || 'System'
      };

      let savedResult = null;
      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase.from('student_locations').insert([payload]).select();
          if (!error && data?.[0]) savedResult = data[0];
        } catch (err) {
          console.warn('Supabase saveStudentLocation error:', err);
        }
      }

      // Local storage fallback
      const key = `locations_${studentId}`;
      const history = getStored(key, []);
      const updatedHistory = [{ ...payload, id: Date.now() }, ...history].slice(0, 50);
      setStored(key, updatedHistory);

      try {
        window.dispatchEvent(new CustomEvent('viotrack_location_updated', { detail: payload }));
      } catch {}

      return savedResult || payload;
    },

  /**
   * Filter and page student rows.
   * @param {import('./types').StudentPageOptions} [options] Search, filter, sort, and page options.
   * @returns {Promise<import('./types').PageResult<import('./types').Student>>} Page metadata and rows.
   */
  async getStudentsPaginated({ page = 1, limit = 10, search = '', grade = 'all', section = 'all', sortField = 'grade', sortOrder = 'asc' } = {}) {
      const allStudents = await this.getStudents();
      const query = String(search || '').toLowerCase().trim();

      let filtered = allStudents;
      if (query) {
        filtered = filtered.filter(s =>
          (s.fname && s.fname.toLowerCase().includes(query)) ||
          (s.lname && s.lname.toLowerCase().includes(query)) ||
          (s.lrn && String(s.lrn).toLowerCase().includes(query)) ||
          (s.email && s.email.toLowerCase().includes(query)) ||
          (s.section && s.section.toLowerCase().includes(query))
        );
      }

      if (grade !== 'all') {
        filtered = filtered.filter(s => s.grade === grade);
      }
      if (section !== 'all') {
        filtered = filtered.filter(s => s.section === section);
      }

      // Sort
      filtered = [...filtered].sort((a, b) => {
        let valA = (a[sortField] || '').toString().toLowerCase();
        let valB = (b[sortField] || '').toString().toLowerCase();
        if (sortOrder === 'desc') {
          return valB.localeCompare(valA, undefined, { numeric: true });
        }
        return valA.localeCompare(valB, undefined, { numeric: true });
      });

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
    }
};
