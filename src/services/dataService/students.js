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
            if (!error && data) remoteList = data;
          } catch (e) {
            console.warn('Supabase getStudents notice:', e);
          }
        }

        const list = (isSupabaseConfigured() && remoteList !== null)
          ? remoteList
          : getStored('students', []);
        const processed = list.map(s => {
          const sid = String(s.student_id || s.lrn || '').trim();
          return {
            ...s,
            student_id: sid,
            lrn: sid,
            image: s.image || `https://ui-avatars.com/api/?name=${encodeURIComponent((s.fname || '') + ' ' + (s.lname || ''))}&background=07345f&color=fff&bold=true`
          };
        });

        _cache.data.students = processed;
        _cache.timestamps.students = Date.now();
        return processed;
      });
    },

  async addStudent(student) {
      startMutation();
      try {
        let result = null;
        const studentIdVal = String(student.student_id || student.lrn || '').trim();
        const cleanStudent = {
          student_id: studentIdVal,
          lrn: studentIdVal,
          fname: String(student.fname || '').trim(),
          mname: String(student.mname || '').trim(),
          lname: String(student.lname || '').trim(),
          email: String(student.email || '').trim().toLowerCase(),
          grade: String(student.grade || '').trim(),
          track: String(student.track || '').trim(),
          strand: String(student.strand || '').trim(),
          section: String(student.section || '').trim(),
          academicyear: String(student.academicyear || '2025-2026').trim(),
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
            // Try inserting with student_id first, then remove any unsupported schema columns.
            let payload = { ...cleanStudent };
            let res = await supabase.from('students').insert([payload]).select();
            if (res.error && (res.error.message?.includes('column') || res.error.code === '42703')) {
              if (res.error.message?.includes('student_id')) delete payload.student_id;
              if (res.error.message?.includes('lrn')) delete payload.lrn;
              if (res.error.message?.includes('track')) delete payload.track;
              if (res.error.message?.includes('strand')) delete payload.strand;
              if (res.error.message?.includes('academicyear')) delete payload.academicyear;
              res = await supabase.from('students').insert([payload]).select();
            }
            if (!res.error && res.data?.[0]) {
              result = { ...res.data[0], ...cleanStudent, student_id: studentIdVal, lrn: studentIdVal };
            } else if (res.error) {
              console.error('Supabase addStudent error:', res.error);
            }
          } catch (err) {
            console.warn('Supabase addStudent error:', err);
          }
        }
        if (!result) {
          const current = getStored('students', INITIAL_STUDENTS);
          result = { ...cleanStudent, id: Date.now(), created_at: new Date().toISOString() };
          const updated = [result, ...current];
          setStored('students', updated);
        }
        invalidateCache('students');
        invalidateCache('records');
        await this.addActivityLog('Add Student', `Enrolled student ${cleanStudent.fname} ${cleanStudent.lname} (ID: ${studentIdVal || 'No Student ID'}, ${cleanStudent.grade || ''} ${cleanStudent.section || ''})`);
        broadcastRecordChange('create', 'student', result);
        return result;
      } finally {
        endMutation();
      }
    },

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
            academicyear: String(student.academicyear || '2025-2026').trim(),
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
              let payload = chunk.map(s => ({ ...s }));

              let res = await supabase.from('students').insert(payload).select();
                if (res.error && (res.error.message?.includes('column') || res.error.code === '42703')) {
                  if (res.error.message?.includes('student_id')) {
                    payload = payload.map(p => { const { student_id, ...rest } = p; return rest; });
                  } else if (res.error.message?.includes('lrn')) {
                    payload = payload.map(p => { const { lrn, ...rest } = p; return rest; });
                  }
                  if (res.error.message?.includes('track')) {
                    payload = payload.map(p => { const { track, ...rest } = p; return rest; });
                  }
                  if (res.error.message?.includes('strand')) {
                    payload = payload.map(p => { const { strand, ...rest } = p; return rest; });
                  }
                  res = await supabase.from('students').insert(payload).select();
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
        await this.addActivityLog('Bulk Import', `Bulk imported and enrolled ${total} student records via CSV`);
        broadcastRecordChange('create', 'students', { count: total });

        if (onProgress) {
          onProgress(total, total);
        }

        return { insertedCount: total, errors: [] };
      } finally {
        endMutation();
      }
    },

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
            /** @type {Record<string, unknown>} */
            let payload = { ...cleanUpdates };
            const numericId = Number(id);
            const hasNumericId = !isNaN(numericId) && numericId > 0;
            let res;
            if (hasNumericId) {
              res = await supabase.from('students').update(payload).eq('id', numericId).select();
            } else {
              res = await supabase.from('students').update(payload).or(`student_id.eq.${id},lrn.eq.${id}`).select();
            }
            if (res.error && (res.error.message?.includes('column') || res.error.code === '42703')) {
              if (res.error.message?.includes('student_id')) delete payload.student_id;
              if (res.error.message?.includes('lrn')) delete payload.lrn;
              if (res.error.message?.includes('track')) delete payload.track;
              if (res.error.message?.includes('strand')) delete payload.strand;
              if (res.error.message?.includes('academicyear')) delete payload.academicyear;
              if (hasNumericId) {
                res = await supabase.from('students').update(payload).eq('id', numericId).select();
              } else {
                res = await supabase.from('students').update(payload).or(`student_id.eq.${id},lrn.eq.${id}`).select();
              }
            }
            if (!res.error && res.data?.[0]) {
              const sid = res.data[0].student_id || res.data[0].lrn || cleanUpdates.student_id || id;
              result = { ...res.data[0], ...cleanUpdates, student_id: sid, lrn: sid };
            } else if (res.error) {
              console.error('Supabase updateStudent error:', res.error);
            }
          } catch (err) {
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
          return isMatch ? { ...s, ...cleanUpdates } : s;
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

  async deleteStudent(id) {
      startMutation();
      try {
        if (isSupabaseConfigured()) {
          try {
            const numericId = Number(id);
            if (!isNaN(numericId) && numericId > 0) {
              const { error } = await supabase.from('students').delete().eq('id', numericId);
              if (error) console.error('Supabase deleteStudent error:', error);
            } else {
              const { error } = await supabase.from('students').delete().or(`student_id.eq.${id},lrn.eq.${id}`);
              if (error) console.error('Supabase deleteStudent error:', error);
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
