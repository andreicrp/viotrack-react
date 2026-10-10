import { supabase, isSupabaseConfigured } from '../../lib/supabase.js';
import { smsService } from '../smsService.js';
import { broadcastRecordChange, startMutation, endMutation } from '../../utils/dataIntegrity.js';

export { supabase, isSupabaseConfigured, smsService, broadcastRecordChange, startMutation, endMutation };

export const CACHE_CONFIG = {
  FRESH_TTL: 60 * 1000,       // 60 seconds fresh (instant 0ms synchronous hits)
  STALE_TTL: 15 * 60 * 1000,   // 15 minutes stale-while-revalidate window
};

export const _cache = {
  data: {
    students: null,
    violations: null,
    records: null,
    teachers: null,
    advisers: null,
    admins: null,
    activity_logs: null,
    school_events: null,
    dashboard_stats: null
  },
  timestamps: {
    students: 0,
    violations: 0,
    records: 0,
    teachers: 0,
    advisers: 0,
    admins: 0,
    activity_logs: 0,
    school_events: 0,
    dashboard_stats: 0
  },
  inFlightPromises: new Map()
};

// Request Coalescing / In-Flight Deduplication
export const executeWithDeduplication = (key, fetcherFn) => {
  if (_cache.inFlightPromises.has(key)) {
    return _cache.inFlightPromises.get(key);
  }
  const promise = (async () => {
    try {
      return await fetcherFn();
    } finally {
      _cache.inFlightPromises.delete(key);
    }
  })();
  _cache.inFlightPromises.set(key, promise);
  return promise;
};

export const invalidateCache = (key) => {
  if (key) {
    _cache.data[key] = null;
    _cache.timestamps[key] = 0;
    _cache.inFlightPromises.delete(key);
    if (key === 'records' || key === 'students' || key === 'violations') {
      _cache.data.dashboard_stats = null;
      _cache.timestamps.dashboard_stats = 0;
      _cache.inFlightPromises.delete('dashboard_stats');
    }
  } else {
    Object.keys(_cache.data).forEach(k => {
      _cache.data[k] = null;
      _cache.timestamps[k] = 0;
    });
    _cache.inFlightPromises.clear();
  }
};

// Local Storage Safe Helper (Handles Quota Exceeded for 10k+ rows)
export const getStored = (key, fallback) => {
  try {
    const data = localStorage.getItem(`viotrack_${key}`);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
};

export const setStored = (key, val) => {
  try {
    localStorage.setItem(`viotrack_${key}`, JSON.stringify(val));
  } catch (err) {
    console.warn(`LocalStorage quota exceeded or write failed for ${key}, falling back to memory cache:`, err);
  }
};
