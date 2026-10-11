

export const authMethods = {
  getCurrentUser() {
      try {
        const saved = sessionStorage.getItem('viotrack_auth_v3') || localStorage.getItem('viotrack_auth_v3');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed?.name) return parsed;
        }
      } catch {}
      return { name: 'Faculty Member', role: 'teacher' };
    }
};
