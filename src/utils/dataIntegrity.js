/**
 * VioTrack Data Integrity & Concurrency Engine
 * Handles double-click prevention, idempotency, cross-tab sync, optimistic locking, and conflict resolution
 */

// ==============================================================================
// 1. SUBMISSION MUTEX & IDEMPOTENCY LOCKS (Double-Click Protection)
// ==============================================================================

const inFlightSubmissions = new Set();
const recentIdempotencyKeys = new Map(); // key -> timestamp

/**
 * Checks and claims an idempotency lock for form submissions
 * Prevents double-clicks, rapid re-submits, and duplicate payload bursts
 */
export const claimSubmissionLock = (lockKey, windowMs = 4000) => {
  const now = Date.now();
  
  // Clean up expired locks
  for (const [key, ts] of recentIdempotencyKeys.entries()) {
    if (now - ts > windowMs) recentIdempotencyKeys.delete(key);
  }

  if (inFlightSubmissions.has(lockKey) || recentIdempotencyKeys.has(lockKey)) {
    return false; // Lock rejected: duplicate in flight or submitted within window
  }

  inFlightSubmissions.add(lockKey);
  recentIdempotencyKeys.set(lockKey, now);
  return true;
};

export const releaseSubmissionLock = (lockKey) => {
  inFlightSubmissions.delete(lockKey);
};

// ==============================================================================
// 2. CROSS-TAB STATE SYNCHRONIZATION (BroadcastChannel)
// ==============================================================================

let syncChannel = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    syncChannel = new BroadcastChannel('viotrack_cross_tab_sync');
  }
} catch (e) {
  syncChannel = null;
}

export const broadcastRecordChange = (action, entityType, entityData) => {
  const payload = {
    action, // 'create' | 'update' | 'delete' | 'resolve'
    entityType, // 'student' | 'record' | 'violation'
    entityData,
    timestamp: Date.now(),
    tabId: Math.random().toString(36).substring(2, 9)
  };

  if (syncChannel) {
    try {
      syncChannel.postMessage(payload);
    } catch (err) {
      console.warn('Cross-tab broadcast error:', err);
    }
  }

  // Also dispatch local window event
  try {
    window.dispatchEvent(new CustomEvent('viotrack_data_updated', { detail: payload }));
  } catch {}
};

export const subscribeCrossTabSync = (callback) => {
  if (!syncChannel) return () => {};

  const handler = (event) => {
    if (event?.data) {
      callback(event.data);
    }
  };

  syncChannel.addEventListener('message', handler);
  return () => {
    syncChannel.removeEventListener('message', handler);
  };
};

// ==============================================================================
// 3. OPTIMISTIC CONCURRENCY CONTROL (Conflict Detection on Stale Records)
// ==============================================================================

/**
 * Validates whether an entity being updated has been modified by another user in the interim
 */
export const checkOptimisticConcurrency = (currentRecord, freshRecord) => {
  if (!freshRecord) {
    return {
      conflict: true,
      reason: 'deleted',
      message: 'This record was deleted by another user. Your changes cannot be saved.'
    };
  }

  if (!currentRecord) return { conflict: false };

  const currentTs = new Date(currentRecord.updated_at || currentRecord.created_at || 0).getTime();
  const freshTs = new Date(freshRecord.updated_at || freshRecord.created_at || 0).getTime();

  const hasStatusChange = !!(currentRecord.status && freshRecord.status && currentRecord.status !== freshRecord.status);
  const hasApprovalChange = !!(currentRecord.approval_status && freshRecord.approval_status && currentRecord.approval_status !== freshRecord.approval_status);
  const isTimeNewer = freshTs > 0 && freshTs > currentTs + 1000;

  if (isTimeNewer || hasStatusChange || hasApprovalChange) {
    return {
      conflict: true,
      reason: 'modified',
      message: 'This record was updated by another administrator while you were editing. Please review the latest details.'
    };
  }

  return { conflict: false };
};

// ==============================================================================
// 4. IN-FLIGHT PAGE REFRESH & UNLOAD WARNING
// ==============================================================================

let activeMutationsCount = 0;

export const startMutation = () => {
  activeMutationsCount += 1;
  if (activeMutationsCount === 1 && typeof window !== 'undefined') {
    window.addEventListener('beforeunload', handleBeforeUnload);
  }
};

export const endMutation = () => {
  activeMutationsCount = Math.max(0, activeMutationsCount - 1);
  if (activeMutationsCount === 0 && typeof window !== 'undefined') {
    window.removeEventListener('beforeunload', handleBeforeUnload);
  }
};

const handleBeforeUnload = (e) => {
  if (activeMutationsCount > 0) {
    e.preventDefault();
    e.returnValue = 'A data submission is currently in progress. Refreshing now may cause incomplete saves.';
    return e.returnValue;
  }
};

// ==============================================================================
// 5. STALE FORM DETECTOR
// ==============================================================================

export const createFormSession = (formName) => {
  const openedAt = Date.now();
  const maxFormAgeMs = 45 * 60 * 1000; // 45 minutes max form age

  return {
    formName,
    openedAt,
    isStale: () => Date.now() - openedAt > maxFormAgeMs,
    getAgeMinutes: () => Math.round((Date.now() - openedAt) / 60000)
  };
};
