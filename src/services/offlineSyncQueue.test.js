import { describe, it, expect, beforeEach } from 'vitest';
import {
  getOfflineQueue,
  enqueueOfflineAction,
  subscribeToQueue
} from './offlineSyncQueue';

// Mock localStorage if in node environment
if (typeof globalThis.localStorage === 'undefined') {
  let store = {};
  globalThis.localStorage = {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, val) => { store[key] = String(val); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; }
  };
}

describe('Offline Sync Queue Service', () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
  });

  it('starts with an empty queue', () => {
    expect(getOfflineQueue()).toEqual([]);
  });

  it('enqueues pending actions into local storage', () => {
    const violationPayload = {
      student_id: '2026-0042',
      offense_name: 'Uniform Violation',
      severity: 'Minor',
      created_at: new Date().toISOString()
    };

    const task = enqueueOfflineAction('ADD_VIOLATION', violationPayload);
    expect(task.id).toBeDefined();
    expect(task.actionType).toBe('ADD_VIOLATION');
    expect(task.payload).toEqual(violationPayload);

    const queue = getOfflineQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].id).toBe(task.id);
  });

  it('notifies subscribers on queue change', () => {
    let observedCount = 0;
    const unsubscribe = subscribeToQueue((queue) => {
      observedCount = queue.length;
    });

    expect(observedCount).toBe(0);

    enqueueOfflineAction('ADD_VIOLATION', { id: 'v1' });
    expect(observedCount).toBe(1);

    enqueueOfflineAction('UPDATE_VIOLATION', { id: 'v1', status: 'Resolved' });
    expect(observedCount).toBe(2);

    unsubscribe();
  });
});
