import { useEffect } from 'react';

/**
 * Custom hook for keyboard navigation shortcuts:
 * - '/' : Focus search bar
 * - 'Escape' : Close modals/drawers/popovers
 * - 'n' or 'N' : Trigger new item creation (e.g. Add Violation)
 *
 * @param {object} options
 * @param {function} [options.onNew] Callback for 'n' shortcut (e.g. open Add Violation modal)
 * @param {function} [options.onEscape] Callback for 'Escape' key
 * @param {string} [options.searchSelector] Custom selector for search input
 */
export const useKeyboardShortcuts = ({
  onNew,
  onEscape,
  searchSelector = 'input[type="search"], input[type="text"][placeholder*="Search" i], .search-input, [data-shortcut-search]'
} = {}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      const activeElement = document.activeElement;
      const isInputActive =
        activeElement &&
        (activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          activeElement.tagName === 'SELECT' ||
          activeElement.isContentEditable);

      // 1. 'Escape' Shortcut -> Close modal/drawer
      if (e.key === 'Escape') {
        if (onEscape) {
          onEscape();
        } else {
          // If no custom escape passed, blur active input or close open modal if close button exists
          if (isInputActive) {
            activeElement.blur();
          }
          const closeBtn = document.querySelector('.modal-close, [data-modal-close], .custom-dialog-close');
          if (closeBtn) closeBtn.click();
        }
        return;
      }

      // Do not trigger single-key action shortcuts if user is already typing inside an input
      if (isInputActive) {
        return;
      }

      // 2. '/' Shortcut -> Focus Search input
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        const searchInput = document.querySelector(searchSelector);
        if (searchInput) {
          searchInput.focus();
          if (searchInput.select) searchInput.select();
        }
        return;
      }

      // 3. 'n' or 'N' Shortcut -> Open New item creation (e.g. Add Violation)
      if ((e.key === 'n' || e.key === 'N') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (typeof onNew === 'function') {
          e.preventDefault();
          onNew();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNew, onEscape, searchSelector]);
};

export default useKeyboardShortcuts;
