import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { dataQueryKeys } from '../hooks/dataQueries.js';

export const DataQueryBridge = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const invalidateData = () => {
      void queryClient.invalidateQueries({ queryKey: dataQueryKeys.all });
    };
    const invalidateEvents = () => {
      void queryClient.invalidateQueries({ queryKey: dataQueryKeys.events });
      void queryClient.invalidateQueries({ queryKey: dataQueryKeys.dashboard });
    };

    window.addEventListener('viotrack_data_updated', invalidateData);
    window.addEventListener('viotrack_events_updated', invalidateEvents);
    return () => {
      window.removeEventListener('viotrack_data_updated', invalidateData);
      window.removeEventListener('viotrack_events_updated', invalidateEvents);
    };
  }, [queryClient]);

  return null;
};
