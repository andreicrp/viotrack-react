import { INITIAL_LOGS } from './fixtures.js';
import { supabase, isSupabaseConfigured, CACHE_CONFIG, _cache, executeWithDeduplication, invalidateCache, getStored, setStored } from './shared.js';

export const logsMethods = {
  async getActivityLogs(forceRefresh = false) {
    const now = Date.now();
    const cached = _cache.data.activity_logs;
    const cacheAge = now - _cache.timestamps.activity_logs;

    if (!forceRefresh && cached && cacheAge < CACHE_CONFIG.FRESH_TTL) {
      return cached;
    }

    return executeWithDeduplication('activity_logs', async () => {
      let remoteList = null;
      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase.from('activity_logs').select('*').order('id', { ascending: false }).limit(100);
          if (!error && data) remoteList = data;
        } catch (err) {
          console.warn('Supabase getActivityLogs error:', err);
        }
      }
      const localList = getStored('activity_logs', []);
      const list = (isSupabaseConfigured() && remoteList !== null)
        ? [...remoteList, ...localList]
          .filter((log, index, entries) => {
            const getKey = item => item.audit_id || item.id
              || `${item.created_at || item.date || ''}|${item.user_name || ''}|${item.action || ''}`;
            return entries.findIndex(item => getKey(item) === getKey(log)) === index;
          })
          .sort((a, b) => {
            const dateA = new Date(a.created_at || a.date || 0).getTime();
            const dateB = new Date(b.created_at || b.date || 0).getTime();
            return dateB - dateA;
          })
          .slice(0, 300)
        : localList;
      _cache.data.activity_logs = list;
      _cache.timestamps.activity_logs = Date.now();
      return list;
    });
  },

  async addActivityLog(action, details, userName, userRole, extraMeta = {}) {
    const activeUser = this.getCurrentUser();
    const finalUserName = userName || activeUser.name || 'System Admin';
    const finalUserRole = userRole || activeUser.role || 'admin';
    const timestamp = new Date().toISOString();
    const auditId = `AUD-${Math.floor(100000 + Math.random() * 900000)}`;

    const newLog = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      audit_id: auditId,
      user_name: finalUserName,
      user_role: finalUserRole,
      action,
      details,
      ip_address: extraMeta.ip || null,
      device_info: extraMeta.device_info || null,
      created_at: timestamp,
      ...extraMeta
    };

    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase.from('activity_logs').insert([newLog]);
        if (error) console.warn('Supabase activity log insert error:', error);
      } catch (err) {
        console.warn('Supabase activity log insert error:', err);
      }
    }
    const current = getStored('activity_logs', INITIAL_LOGS);
    const updated = [newLog, ...current.slice(0, 299)];
    setStored('activity_logs', updated);
    invalidateCache('activity_logs');

    // Notify all active listeners across the app
    try {
      window.dispatchEvent(new CustomEvent('viotrack_activity_logged', { detail: newLog }));
    } catch {}

    return newLog;
  }
};
