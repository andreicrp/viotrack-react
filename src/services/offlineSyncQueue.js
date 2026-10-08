/**
 * VioTrack Resilient Offline Sync Queue Service
 * Ensures violation records logged during network outages or Supabase downtime
 * are saved locally and synced automatically once internet connection is restored.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';

const QUEUE_STORAGE_KEY = 'viotrack_offline_mutation_queue_v1';
const LISTENERS = new Set();

/**
 * Retrieves the current offline queue from storage.
 * @returns {Array<object>}
 */
export const getOfflineQueue = () => {
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Failed to read offline sync queue:', err);
    return [];
  }
};

/**
 * Saves the offline queue to storage and notifies subscribers.
 * @param {Array<object>} queue
 */
const saveOfflineQueue = (queue) => {
  try {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
    notifyQueueChange(queue);
  } catch (err) {
    console.error('Failed to persist offline sync queue:', err);
  }
};

/**
 * Subscribes a callback to queue mutations.
 * @param {Function} callback
 * @returns {Function} unsubscribe function
 */
export const subscribeToQueue = (callback) => {
  if (typeof callback === 'function') {
    LISTENERS.add(callback);
    callback(getOfflineQueue());
    return () => LISTENERS.delete(callback);
  }
  return () => {};
};

const notifyQueueChange = (queue) => {
  LISTENERS.forEach((cb) => {
    try {
      cb(queue);
    } catch {}
  });
};

/**
 * Enqueues an operation to be synced when online.
 * @param {string} actionType - 'ADD_VIOLATION' | 'UPDATE_VIOLATION' | 'DELETE_VIOLATION'
 * @param {object} payload - The record payload
 * @returns {object} The queued task descriptor
 */
export const enqueueOfflineAction = (actionType, payload) => {
  const queue = getOfflineQueue();
  const task = {
    id: `queue_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    actionType,
    payload,
    enqueuedAt: new Date().toISOString(),
    attempts: 0,
    lastError: null
  };

  queue.push(task);
  saveOfflineQueue(queue);
  return task;
};

/**
 * Processes all pending items in the offline queue against Supabase.
 * @returns {Promise<{ syncedCount: number, failedCount: number }>}
 */
export const processOfflineQueue = async () => {
  if (!navigator.onLine || !isSupabaseConfigured()) {
    return { syncedCount: 0, failedCount: 0 };
  }

  const queue = getOfflineQueue();
  if (queue.length === 0) {
    return { syncedCount: 0, failedCount: 0 };
  }

  const remaining = [];
  let syncedCount = 0;
  let failedCount = 0;

  for (const task of queue) {
    try {
      task.attempts += 1;
      let success = false;

      if (task.actionType === 'ADD_VIOLATION') {
        const { error } = await supabase.from('violations').insert([task.payload]);
        if (!error) success = true;
        else throw error;
      } else if (task.actionType === 'UPDATE_VIOLATION') {
        const { id, ...updates } = task.payload;
        const { error } = await supabase.from('violations').update(updates).eq('id', id);
        if (!error) success = true;
        else throw error;
      } else if (task.actionType === 'DELETE_VIOLATION') {
        const { error } = await supabase.from('violations').delete().eq('id', task.payload.id);
        if (!error) success = true;
        else throw error;
      }

      if (success) {
        syncedCount += 1;
      } else {
        remaining.push(task);
        failedCount += 1;
      }
    } catch (err) {
      console.warn(`[OfflineSync] Task ${task.id} sync failed:`, err);
      task.lastError = err.message || String(err);
      remaining.push(task);
      failedCount += 1;
    }
  }

  saveOfflineQueue(remaining);
  return { syncedCount, failedCount };
};

// Automatic online event listener
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    processOfflineQueue().catch(console.error);
  });
}
