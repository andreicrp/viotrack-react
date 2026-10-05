import { INITIAL_ADMINS } from './fixtures.js';
import { supabase, isSupabaseConfigured, CACHE_CONFIG, _cache, executeWithDeduplication, invalidateCache, getStored, setStored } from './shared.js';

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
        let list = [];
  
        if (remoteList && remoteList.length > 0) {
          const remoteEmailMap = new Map(remoteList.map(a => [String(a.email || '').toLowerCase(), a]));
          const mergedRemote = remoteList.map(ra => {
            const la = localList.find(l => String(l.email || '').toLowerCase() === String(ra.email || '').toLowerCase() || l.id === ra.id);
            return la ? { ...la, ...ra, password: ra.password || la.password } : ra;
          });
          const extraLocal = localList.filter(la => la.email && !remoteEmailMap.has(String(la.email).toLowerCase()));
          list = [...mergedRemote, ...extraLocal];
        } else {
          list = localList;
        }
  
        _cache.data.admins = list;
        _cache.timestamps.admins = Date.now();
        return list;
      });
    },

  async addAdmin(admin) {
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
          const { data, error } = await supabase.from('admins').insert([supabasePayload]).select();
          if (!error && data?.[0]) {
            result = { ...cleanAdmin, ...data[0] };
          } else if (error) {
            console.warn('Supabase addAdmin notice:', error.message || error);
          }
        } catch (err) {
          console.warn('Supabase addAdmin error:', err);
        }
      }
      const current = getStored('admins', INITIAL_ADMINS);
      if (!result) {
        result = { ...cleanAdmin, id: Date.now(), created_at: new Date().toISOString() };
      }
      const updated = [result, ...current.filter(a => a.email !== cleanAdmin.email)];
      setStored('admins', updated);
      invalidateCache('admins');
      await this.addActivityLog('Add Admin', `Created administrator account for ${cleanAdmin.fname} ${cleanAdmin.lname} (${cleanAdmin.role})`);
      return result;
    },

  async updateAdmin(id, updates) {
      let result = null;
      const cleanUpdates = {};
      const allowed = ['fname', 'mname', 'lname', 'email', 'role', 'position', 'password', 'image'];
      for (const key of allowed) {
        if (updates[key] !== undefined) {
          if (key === 'password' && !String(updates[key]).trim()) {
            // Skip empty password update to prevent wiping existing password
            continue;
          }
          cleanUpdates[key] = updates[key];
        }
      }
  
      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase.from('admins').update(cleanUpdates).eq('id', Number(id)).select();
          if (!error && data?.[0]) result = data[0];
          else if (error) console.error('Supabase updateAdmin error:', error);
        } catch (err) {
          console.warn('Supabase updateAdmin error:', err);
        }
      }
      const current = getStored('admins', INITIAL_ADMINS);
      const updated = current.map(a => (a.id === Number(id) ? { ...a, ...cleanUpdates } : a));
      setStored('admins', updated);
      invalidateCache('admins');
      if (!result) result = updated.find(a => a.id === Number(id));
      await this.addActivityLog('Update Admin', `Updated admin profile for ${updates.fname || ''} ${updates.lname || ''} (${updates.role || 'Admin'})`);
      return result;
    },

  async deleteAdmin(id) {
      if (isSupabaseConfigured()) {
        try {
          const { error } = await supabase.from('admins').delete().eq('id', Number(id));
          if (error) console.error('Supabase deleteAdmin error:', error);
        } catch (err) {
          console.warn('Supabase deleteAdmin error:', err);
        }
      }
      const current = getStored('admins', INITIAL_ADMINS);
      const target = current.find(a => a.id === Number(id));
      const name = target ? `${target.fname} ${target.lname}` : `ID #${id}`;
      const updated = current.filter(a => a.id !== Number(id));
      setStored('admins', updated);
      invalidateCache('admins');
      await this.addActivityLog('Delete Admin', `Removed administrator account for ${name}`);
      return true;
    }
};
