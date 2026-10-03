/**
 * Global Scroll Lock Manager
 * Prevents background body scrolling during open modals
 * Eliminates layout shifts by compensating for scrollbar width
 */

let lockCount = 0;
let previousPaddingRight = '';
let previousOverflow = '';

export const lockBodyScroll = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  lockCount++;
  if (lockCount === 1) {
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    previousPaddingRight = document.body.style.paddingRight || '';
    previousOverflow = document.body.style.overflow || '';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    document.body.style.overflow = 'hidden';
  }
};

export const unlockBodyScroll = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.body.style.overflow = previousOverflow;
    document.body.style.paddingRight = previousPaddingRight;
  }
};
