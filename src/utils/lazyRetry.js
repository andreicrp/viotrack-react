import { lazy } from 'react';

/**
 * Resilient lazy loader for route components.
 * Automatically recovers from chunk loading failures that occur after new deployments
 * by doing a controlled refresh to get the latest assets.
 */
export const lazyRetry = (componentImport) =>
  lazy(async () => {
    const hasRefreshed = sessionStorage.getItem('chunk_reload_retry');

    try {
      const module = await componentImport();
      // Clear flag on successful load
      sessionStorage.removeItem('chunk_reload_retry');
      return { default: module.default || module[Object.keys(module)[0]] };
    } catch (error) {
      console.warn('Dynamic chunk import error encountered:', error);
      const isChunkError =
        error?.message?.includes('dynamically imported module') ||
        error?.message?.includes('Importing a module script failed') ||
        error?.message?.includes('error loading dynamically imported module') ||
        error?.message?.includes('MIME type') ||
        error?.name === 'ChunkLoadError' ||
        error?.name === 'TypeError';

      if (isChunkError && !hasRefreshed) {
        sessionStorage.setItem('chunk_reload_retry', String(Date.now()));
        window.location.reload();
        // Return an unresolved promise to prevent further error bubbling while reloading
        return new Promise(() => {});
      }

      throw error;
    }
  });

export default lazyRetry;
