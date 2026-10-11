import React, { useEffect, useState } from 'react';
import { CheckCircle2, RefreshCw, WifiOff } from 'lucide-react';
import { getOfflineQueue, processOfflineQueue, subscribeToQueue } from '../../services/offlineSyncQueue';

export const NetworkStatusBanner = () => {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [queueLength, setQueueLength] = useState(() => getOfflineQueue().length);
  const [isRetrying, setIsRetrying] = useState(false);
  const [showRestored, setShowRestored] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowRestored(true);
      window.setTimeout(() => setShowRestored(false), 3500);
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => subscribeToQueue((queue) => setQueueLength(queue.length)), []);

  const retry = async () => {
    setIsRetrying(true);
    try {
      await processOfflineQueue();
    } finally {
      setIsRetrying(false);
    }
  };

  if (isOnline && queueLength === 0 && !showRestored) return null;

  if (!isOnline) {
    return (
      <div className="network-status-banner network-status-offline" role="status" aria-live="polite">
        <WifiOff size={17} aria-hidden="true" />
        <span>
          You are offline. Changes will be saved here and synced when connection returns.
          {queueLength > 0 ? ` ${queueLength} pending.` : ''}
        </span>
        <button type="button" onClick={retry} disabled={isRetrying} aria-label="Retry synchronization">
          <RefreshCw size={15} className={isRetrying ? 'is-spinning' : ''} aria-hidden="true" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="network-status-banner network-status-online" role="status" aria-live="polite">
      <CheckCircle2 size={17} aria-hidden="true" />
      <span>Connection restored{queueLength > 0 ? ` — ${queueLength} item${queueLength === 1 ? '' : 's'} waiting to sync.` : '.'}</span>
      {queueLength > 0 && (
        <button type="button" onClick={retry} disabled={isRetrying} aria-label="Sync pending changes now">
          <RefreshCw size={15} className={isRetrying ? 'is-spinning' : ''} aria-hidden="true" />
          Sync now
        </button>
      )}
    </div>
  );
};
