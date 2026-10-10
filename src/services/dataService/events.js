import { INITIAL_SCHOOL_EVENTS } from './fixtures.js';
import { supabase, isSupabaseConfigured, smsService, CACHE_CONFIG, _cache, executeWithDeduplication, invalidateCache, getStored, setStored } from './shared.js';

export const eventsMethods = {
  async uploadPhoto(file, folder = 'students') {
      if (isSupabaseConfigured() && file) {
        try {
          const ext = file.name ? file.name.split('.').pop() : 'jpg';
          const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
          const { data, error } = await supabase.storage.from('student-photos').upload(fileName, file, {
            cacheControl: '3600',
            upsert: true
          });
          if (!error && data) {
            const { data: publicUrlData } = supabase.storage.from('student-photos').getPublicUrl(fileName);
            return publicUrlData?.publicUrl || null;
          }
        } catch (err) {
          console.warn('Storage upload error:', err);
        }
      }
      return null;
    },

  async getSchoolEvents(forceRefresh = false) {
    const now = Date.now();
    const cached = _cache.data.school_events;
    const cacheAge = now - _cache.timestamps.school_events;

    if (!forceRefresh && cached && cacheAge < CACHE_CONFIG.FRESH_TTL) {
      return cached;
    }

    if (!forceRefresh && cached && cacheAge < CACHE_CONFIG.STALE_TTL) {
      this.getSchoolEvents(true).catch(() => {});
      return cached;
    }

    return executeWithDeduplication('school_events', async () => {
      let remoteList = null;
      if (isSupabaseConfigured()) {
        try {
          let res = await supabase.from('calendar_events').select('*').order('date', { ascending: true });
          if (res.error && res.error.code === 'PGRST205') {
            res = await supabase.from('school_events').select('*').order('date', { ascending: true });
          }
          if (!res.error && res.data) remoteList = res.data;
        } catch (err) {
          console.warn('Supabase getSchoolEvents error:', err);
        }
      }
      const list = (isSupabaseConfigured() && remoteList !== null)
        ? remoteList
        : getStored('school_events', []);
      _cache.data.school_events = list;
      _cache.timestamps.school_events = Date.now();
      return list;
    });
  },

  async addSchoolEvent(event) {
    let result = null;
    if (isSupabaseConfigured()) {
      try {
        let res = await supabase.from('calendar_events').insert([event]).select();
        if (res.error && res.error.code === 'PGRST205') {
          res = await supabase.from('school_events').insert([event]).select();
        }
        if (!res.error && res.data?.[0]) result = res.data[0];
      } catch (err) {
        console.warn('Supabase addSchoolEvent error:', err);
      }
    }
    const current = getStored('school_events', INITIAL_SCHOOL_EVENTS);
    if (!result) {
      result = {
        id: Date.now(),
        ...event
      };
    }
    const updated = [...current, result];
    setStored('school_events', updated);
    invalidateCache('school_events');
    await this.addActivityLog('Schedule Event', `Added calendar event "${event.title}" on ${event.date}`);
    try {
      window.dispatchEvent(new CustomEvent('viotrack_events_updated', { detail: result }));
    } catch {}
    return result;
  },

  async deleteSchoolEvent(id) {
    if (isSupabaseConfigured()) {
      try {
        let res = await supabase.from('calendar_events').delete().eq('id', id);
        if (res.error && res.error.code === 'PGRST205') {
          await supabase.from('school_events').delete().eq('id', id);
        }
      } catch (err) {
        console.warn('Supabase deleteSchoolEvent error:', err);
      }
    }
    const current = getStored('school_events', INITIAL_SCHOOL_EVENTS);
    const target = current.find(e => e.id === Number(id));
    const title = target ? target.title : `ID #${id}`;
    const updated = current.filter(e => e.id !== Number(id));
    setStored('school_events', updated);
    invalidateCache('school_events');
    await this.addActivityLog('Delete Event', `Removed calendar event "${title}"`);
    try {
      window.dispatchEvent(new CustomEvent('viotrack_events_updated', { detail: { id } }));
    } catch {}
    return true;
  },

  async sendSMS(studentContact, recipientName, studentName, violationTitle, customMessage = null) {
      const result = await smsService.sendSMS({
        recipientNumber: studentContact,
        recipientName,
        studentName,
        violationTitle,
        customMessage
      });

      const logStatus = result.isLive ? (result.success ? 'Live SMS Sent' : 'SMS Failed') : 'SMS Dispatched (Simulated)';
      await this.addActivityLog(
        'SMS Dispatch',
        `Notification (${logStatus}) to ${studentContact} (${recipientName || 'Parent'}) for student ${studentName}`
      );

      return result;
    }
};
