import { INITIAL_ADMINS } from './fixtures.js';
import { supabase, isSupabaseConfigured, broadcastRecordChange, startMutation, endMutation, CACHE_CONFIG, _cache, executeWithDeduplication, invalidateCache, getStored, setStored } from './shared.js';

export const adminsMethods = {
  async getAdmins(forceRefresh = false) {
    const now = Date.now();
    const cached = _cache.data.admins;
    const cacheAge = now - _cache.timestamps.admins;

    if (!forceRefresh && cached && cacheAge < CACHE_CONFIG.FRESH_TTL) {
      return cached;
    }

    if (!forceRefresh && cached && cacheAge < CACHE_CONFIG.STALE_TTL) {
      this.getAdmins(true).catch(() => {});
      return cached;
    }

    return executeWithDeduplication('admins', async () => {
      let remoteList = null;
      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase.from('admins').select('*');
          if (!error && data && data.length > 0) remoteList = data;
        } catch (e) {
          console.warn('Supabase getAdmins notice:', e);
        }
      }

      const localList = getStored('admins', INITIAL_ADMINS);
      const localMap = new Map(localList.map(a => [String(a.email || a.id).toLowerCase(), a]));
      const list = (isSupabaseConfigured() && remoteList !== null)
        ? remoteList.map(r => {
            const local = localMap.get(String(r.email || r.id).toLowerCase());
            return {
              ...r,
              password: r.password || local?.password || 'Viotrack@2026!'
            };
          })
        : localList;

      _cache.data.admins = list;
      _cache.timestamps.admins = Date.now();
      return list;
    });
  },

  async addAdmin(admin) {
    startMutation();
    try {
      let result = null;
      const cleanAdmin = {
        fname: String(admin.fname || '').trim(),
        mname: String(admin.mname || '').trim(),
        lname: String(admin.lname || '').trim(),
        email: String(admin.email || '').trim().toLowerCase(),
        role: String(admin.role || 'Head Admin').trim(),
        position: String(admin.position || 'Discipline Staff').trim(),
        password: String(admin.password || 'Viotrack@2026!').trim(),
        image: String(admin.image || '').trim()
      };

      if (isSupabaseConfigured()) {
        try {
          const supabasePayload = {
            fname: cleanAdmin.fname,
            lname: cleanAdmin.lname,
            email: cleanAdmin.email,
            password: cleanAdmin.password,
            role: cleanAdmin.role,
            image: cleanAdmin.image
          };

          let toSend = { ...supabasePayload };
          let res = await supabase.from('admins').insert([toSend]).select();

          while (res.error && res.error.code === 'PGRST204') {
            const match = res.error.message?.match(/Could not find the '([^']+)' column/);
            if (match && match[1] && match[1] in toSend) {
              delete toSend[match[1]];
              res = await supabase.from('admins').insert([toSend]).select();
            } else {
              break;
            }
          }

          if (!res.error && res.data?.[0]) {
            result = { ...cleanAdmin, ...res.data[0] };
          } else if (res.error) {
            console.warn('Supabase addAdmin notice:', res.error);
          }
        } catch (err) {
          console.warn('Supabase addAdmin error:', err);
        }
      }

      if (!result) {
        result = { ...cleanAdmin, id: Date.now(), created_at: new Date().toISOString() };
      }

      const current = getStored('admins', INITIAL_ADMINS);
      const updated = [result, ...current.filter(a => a.email !== cleanAdmin.email)];
      setStored('admins', updated);
      invalidateCache('admins');
      if (_cache.data.admins) {
        _cache.data.admins = updated;
      }
      await this.addActivityLog('Add Admin', `Created administrator account for ${cleanAdmin.fname} ${cleanAdmin.lname} (${cleanAdmin.role})`);
      broadcastRecordChange('create', 'admin', result);
      return result;
    } finally {
      endMutation();
    }
  },

  async updateAdmin(id, updates) {
    startMutation();
    try {
      let result = null;
      const cleanUpdates = {};
      const allowed = ['fname', 'mname', 'lname', 'email', 'role', 'position', 'password', 'image'];
      for (const key of allowed) {
        if (updates[key] !== undefined) {
          if (key === 'password' && !String(updates[key]).trim()) {
            continue;
          }
          cleanUpdates[key] = updates[key];
        }
      }

      if (isSupabaseConfigured()) {
        try {
          const allowedSupabaseCols = ['fname', 'lname', 'email', 'role', 'image', 'password'];
          let toSend = {};
          for (const key of allowedSupabaseCols) {
            if (cleanUpdates[key] !== undefined) {
              toSend[key] = cleanUpdates[key];
            }
          }

          const numericId = Number(id);
          const hasNumeric = !isNaN(numericId) && numericId > 0;

          let res;
          if (hasNumeric) {
            res = await supabase.from('admins').update(toSend).eq('id', numericId).select();
          } else {
            res = await supabase.from('admins').update(toSend).eq('email', String(id)).select();
          }

          while (res.error && res.error.code === 'PGRST204') {
            const match = res.error.message?.match(/Could not find the '([^']+)' column/);
            if (match && match[1] && match[1] in toSend) {
              delete toSend[match[1]];
              if (hasNumeric) {
                res = await supabase.from('admins').update(toSend).eq('id', numericId).select();
              } else {
                res = await supabase.from('admins').update(toSend).eq('email', String(id)).select();
              }
            } else {
              break;
            }
          }

          if (!res.error && res.data?.[0]) {
            result = { ...cleanUpdates, ...res.data[0] };
          } else if (res.error) {
            console.warn('Supabase updateAdmin notice:', res.error);
          }
        } catch (err) {
          console.warn('Supabase updateAdmin error:', err);
        }
      }

      const current = getStored('admins', INITIAL_ADMINS);
      const updated = current.map(a => (String(a.id) === String(id) || String(a.email) === String(id) ? { ...a, ...cleanUpdates, ...(result || {}) } : a));
      setStored('admins', updated);
      invalidateCache('admins');
      if (!result) result = updated.find(a => String(a.id) === String(id) || String(a.email) === String(id));
      if (_cache.data.admins) {
        _cache.data.admins = updated;
      }
      await this.addActivityLog('Update Admin', `Updated admin profile for ${updates.fname || ''} ${updates.lname || ''} (${updates.role || 'Admin'})`);
      broadcastRecordChange('update', 'admin', result);
      return result;
    } finally {
      endMutation();
    }
  },

  async deleteAdmin(id) {
    startMutation();
    try {
      const numericId = Number(id);
      const hasNumeric = !isNaN(numericId) && numericId > 0;

      if (isSupabaseConfigured()) {
        try {
          let res;
          if (hasNumeric) {
            res = await supabase.from('admins').delete().eq('id', numericId);
          } else {
            res = await supabase.from('admins').delete().eq('email', String(id));
          }
          if (res?.error) console.warn('Supabase deleteAdmin notice:', res.error);
        } catch (err) {
          console.warn('Supabase deleteAdmin error:', err);
        }
      }
      const current = getStored('admins', INITIAL_ADMINS);
      const target = current.find(a => String(a.id) === String(id) || String(a.email) === String(id));
      const name = target ? `${target.fname} ${target.lname}` : `ID #${id}`;
      const updated = current.filter(a => String(a.id) !== String(id) && String(a.email) !== String(id));
      setStored('admins', updated);
      invalidateCache('admins');
      if (_cache.data.admins) {
        _cache.data.admins = _cache.data.admins.filter(a => String(a.id) !== String(id) && String(a.email) !== String(id));
      }
      await this.addActivityLog('Delete Admin', `Removed administrator account for ${name}`);
      broadcastRecordChange('delete', 'admin', { id });
      return true;
    } finally {
      endMutation();
    }
  }
};
