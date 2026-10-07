import { INITIAL_TEACHERS, INITIAL_ADVISERS } from './fixtures.js';
import { supabase, isSupabaseConfigured, CACHE_CONFIG, _cache, executeWithDeduplication, invalidateCache, getStored, setStored } from './shared.js';

export const teachersMethods = {
  /**
   * Read teacher rows, using cached values unless refresh is requested.
   * @param {boolean} [forceRefresh=false] Bypass cached results and load again.
   * @returns {Promise<import('./types').Teacher[]>} Teacher rows.
   */
  async getTeachers(forceRefresh = false) {
      const now = Date.now();
      const cached = _cache.data.teachers;
      const cacheAge = now - _cache.timestamps.teachers;

      if (!forceRefresh && cached && cacheAge < CACHE_CONFIG.FRESH_TTL) {
        return cached;
      }

      if (!forceRefresh && cached && cacheAge < CACHE_CONFIG.STALE_TTL) {
        this.getTeachers(true).catch(() => {});
        return cached;
      }

      return executeWithDeduplication('teachers', async () => {
        let remoteList = null;
        if (isSupabaseConfigured()) {
          try {
            const { data, error } = await supabase.from('teachers').select('*').order('lname', { ascending: true });
            if (!error && data && data.length > 0) remoteList = data;
          } catch (e) {
            console.warn('Supabase getTeachers notice:', e);
          }
        }

        const list = (isSupabaseConfigured() && remoteList !== null)
          ? remoteList
          : getStored('teachers', []);

        _cache.data.teachers = list;
        _cache.timestamps.teachers = Date.now();
        return list;
      });
    },

  async addTeacher(teacher) {
      let result = null;
      const cleanTeacher = {
        fname: String(teacher.fname || '').trim(),
        mname: String(teacher.mname || '').trim(),
        lname: String(teacher.lname || '').trim(),
        email: String(teacher.email || '').trim().toLowerCase(),
        position: String(teacher.position || 'Teacher').trim(),
        department: String(teacher.department || 'General').trim(),
        contact: String(teacher.contact || '').trim(),
        password: String(teacher.password || 'Viotrack@2026!').trim(),
        image: String(teacher.image || '').trim()
      };

      if (isSupabaseConfigured()) {
        try {
          const supabasePayload = {
            fname: cleanTeacher.fname,
            lname: cleanTeacher.lname,
            email: cleanTeacher.email,
            password: cleanTeacher.password,
            position: cleanTeacher.position,
            department: cleanTeacher.department,
            contact: cleanTeacher.contact,
            image: cleanTeacher.image
          };
          const { data, error } = await supabase.from('teachers').insert([supabasePayload]).select();
          if (!error && data?.[0]) {
            result = { ...cleanTeacher, ...data[0] };
          } else if (error) {
            console.warn('Supabase addTeacher notice:', error.message || error);
          }
        } catch (err) {
          console.warn('Supabase addTeacher error:', err);
        }
      }
      const current = getStored('teachers', INITIAL_TEACHERS);
      if (!result) {
        result = { ...cleanTeacher, id: Date.now(), created_at: new Date().toISOString() };
      }
      const updated = [result, ...current.filter(t => t.email !== cleanTeacher.email)];
      setStored('teachers', updated);
      invalidateCache('teachers');
      invalidateCache('advisers');
      await this.addActivityLog('Add Teacher', `Registered faculty member ${cleanTeacher.fname} ${cleanTeacher.lname} (${cleanTeacher.position}, ${cleanTeacher.department})`);
      return result;
    },

  async updateTeacher(id, updates) {
      let result = null;
      const cleanUpdates = {};
      const allowed = ['fname', 'mname', 'lname', 'email', 'position', 'department', 'contact', 'password', 'image'];
      for (const key of allowed) {
        if (updates[key] !== undefined) {
          if (key === 'password' && !String(updates[key]).trim()) {
            // Skip empty password update to preserve existing password
            continue;
          }
          cleanUpdates[key] = updates[key];
        }
      }

      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase.from('teachers').update(cleanUpdates).eq('id', Number(id)).select();
          if (!error && data?.[0]) result = data[0];
          else if (error) console.error('Supabase updateTeacher error:', error);
        } catch (err) {
          console.warn('Supabase updateTeacher error:', err);
        }
      }
      const current = getStored('teachers', INITIAL_TEACHERS);
      const updated = current.map(t => (t.id === Number(id) ? { ...t, ...cleanUpdates } : t));
      setStored('teachers', updated);
      invalidateCache('teachers');
      invalidateCache('advisers');
      if (!result) result = updated.find(t => t.id === Number(id));
      await this.addActivityLog('Update Teacher', `Updated details for faculty ${updates.fname || ''} ${updates.lname || ''} (#${id})`);
      return result;
    },

  async deleteTeacher(id) {
      if (isSupabaseConfigured()) {
        try {
          const { error } = await supabase.from('teachers').delete().eq('id', Number(id));
          if (error) console.error('Supabase deleteTeacher error:', error);
        } catch (err) {
          console.warn('Supabase deleteTeacher error:', err);
        }
      }
      const current = getStored('teachers', INITIAL_TEACHERS);
      const target = current.find(t => t.id === Number(id));
      const name = target ? `${target.fname} ${target.lname}` : `ID #${id}`;
      const updated = current.filter(t => t.id !== Number(id));
      setStored('teachers', updated);
      invalidateCache('teachers');
      invalidateCache('advisers');
      await this.addActivityLog('Delete Teacher', `Removed faculty member ${name}`);
      return true;
    },

  async getAdvisers(forceRefresh = false) {
      const now = Date.now();
      const cached = _cache.data.advisers;
      const cacheAge = now - _cache.timestamps.advisers;

      if (!forceRefresh && cached && cacheAge < CACHE_CONFIG.FRESH_TTL) {
        return cached;
      }

      if (!forceRefresh && cached && cacheAge < CACHE_CONFIG.STALE_TTL) {
        this.getAdvisers(true).catch(() => {});
        return cached;
      }

      return executeWithDeduplication('advisers', async () => {
        if (isSupabaseConfigured()) {
          const { data, error } = await supabase.from('advisers').select('*, teachers(*)');
          if (!error && data) {
            const mapped = data.map(a => ({
              ...a,
              teacher: a.teachers
            }));
            _cache.data.advisers = mapped;
            _cache.timestamps.advisers = Date.now();
            return mapped;
          }
        }
        const advisers = getStored('advisers', INITIAL_ADVISERS);
        const teachers = await this.getTeachers();
        const teacherMap = new Map(teachers.map(t => [Number(t.id), t]));
        const mapped = advisers.map(a => ({
          ...a,
          teacher: teacherMap.get(Number(a.teacher_id))
        }));
        _cache.data.advisers = mapped;
        _cache.timestamps.advisers = Date.now();
        return mapped;
      });
    },

  async saveAdviserAssignment(teacher_id, grade_level, class_section) {
      const cleanPayload = {
        teacher_id: Number(teacher_id),
        grade_level: String(grade_level).trim(),
        class_section: String(class_section).trim()
      };

      if (isSupabaseConfigured()) {
        try {
          // Delete any existing assignment for this teacher OR this section
          await supabase
            .from('advisers')
            .delete()
            .or(`teacher_id.eq.${cleanPayload.teacher_id},and(grade_level.eq."${cleanPayload.grade_level}",class_section.eq."${cleanPayload.class_section}")`);
          const { error } = await supabase.from('advisers').insert(cleanPayload);
          if (error) console.error('Supabase saveAdviserAssignment error:', error);
        } catch (err) {
          console.warn('Supabase saveAdviserAssignment error:', err);
        }
      }
      let current = getStored('advisers', INITIAL_ADVISERS);
      // Enforce 1:1 rule: remove any prior assignment for this teacher OR for this section
      current = current.filter(a =>
        Number(a.teacher_id) !== Number(teacher_id) &&
        !(
          String(a.grade_level).trim().toLowerCase() === cleanPayload.grade_level.toLowerCase() &&
          String(a.class_section).trim().toLowerCase() === cleanPayload.class_section.toLowerCase()
        )
      );
      current.push({ id: Date.now(), ...cleanPayload, created_at: new Date().toISOString() });
      setStored('advisers', current);
      invalidateCache('advisers');

      let teacherName = `Teacher #${teacher_id}`;
      try {
        const teachers = getStored('teachers', INITIAL_TEACHERS);
        const t = teachers.find(item => item.id === Number(teacher_id));
        if (t) teacherName = `${t.fname} ${t.lname}`;
      } catch {}

      await this.addActivityLog('Adviser Assigned', `Appointed ${teacherName} as adviser for ${grade_level} - ${class_section}`);
      return true;
    },

  async removeAdviser(id) {
      if (isSupabaseConfigured()) {
        try {
          const { error } = await supabase.from('advisers').delete().eq('id', Number(id));
          if (error) console.error('Supabase removeAdviser error:', error);
        } catch (err) {
          console.warn('Supabase removeAdviser error:', err);
        }
      }
      const current = getStored('advisers', INITIAL_ADVISERS);
      const updated = current.filter(a => a.id !== Number(id));
      setStored('advisers', updated);
      invalidateCache('advisers');
      await this.addActivityLog('Adviser Removed', `Removed adviser assignment #${id}`);
      return true;
    }
};
