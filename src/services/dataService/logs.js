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

      if (!forceRefresh && cached && cacheAge < CACHE_CONFIG.STALE_TTL) {
        this.getActivityLogs(true).catch(() => {});
        return cached;
      }

      return executeWithDeduplication('activity_logs', async () => {
        let list = null;
        if (isSupabaseConfigured()) {
          try {
            const { data, error } = await supabase.from('activity_logs').select('*').order('id', { ascending: false }).limit(100);
            if (!error && data && data.length > 0) list = data;
          } catch (err) {
            console.warn('Supabase getActivityLogs error:', err);
          }
        }
        if (!list) list = getStored('activity_logs', INITIAL_LOGS);
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

      // Client subnet / IP address simulation for immutable audit log
      const ipAddress = extraMeta.ip || `192.168.10.${Math.floor(20 + Math.random() * 80)}`;
      const deviceInfo = navigator.userAgent.includes('Windows')
        ? 'Windows 11 / Chrome (Workstation)'
        : (navigator.userAgent.includes('Mobile') ? 'Mobile Terminal (Staff App)' : 'Faculty Workstation');

      // Cryptographic hash simulation for tamper verification
      const rawHashInput = `${auditId}|${finalUserName}|${action}|${details}|${timestamp}`;
      let hash = 0;
      for (let i = 0; i < rawHashInput.length; i++) {
        hash = ((hash << 5) - hash) + rawHashInput.charCodeAt(i);
        hash |= 0;
      }
      const immutableHash = `0x${Math.abs(hash).toString(16).padStart(8, '0')}${Math.random().toString(16).substring(2, 10)}`;

      const newLog = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        audit_id: auditId,
        user_name: finalUserName,
        user_role: finalUserRole,
        action,
        details,
        ip_address: ipAddress,
        device_info: deviceInfo,
        immutable_hash: immutableHash,
        integrity_status: 'VERIFIED',
        created_at: timestamp,
        ...extraMeta
      };

      if (isSupabaseConfigured()) {
        try {
          await supabase.from('activity_logs').insert([newLog]);
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
