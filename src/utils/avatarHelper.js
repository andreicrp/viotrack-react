/**
 * Offline-Ready SVG Avatar Generator
 * Generates instant, zero-network SVG Data URIs for user and student avatars.
 * Completely immune to network failures, offline modes, or third-party downtime.
 */

const PALETTE = [
  '#07345f', '#1e3a8a', '#0f766e', '#15803d', '#b45309',
  '#be185d', '#6d28d9', '#4338ca', '#0369a1', '#334155'
];

/**
 * Returns a consistent aesthetic background color based on name hash
 */
export const getAvatarColor = (name = '') => {
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % PALETTE.length;
  return PALETTE[index];
};

/**
 * Generates an offline SVG data URI with student initials
 */
export const getInitialsAvatar = (name = '', customBg = null, textColor = '#ffffff') => {
  const cleanName = (name || '').trim();
  const parts = cleanName.split(/\s+/).filter(Boolean);
  const initials = parts.length > 1
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : (cleanName.slice(0, 2) || 'ST').toUpperCase();

  const bg = customBg || getAvatarColor(cleanName);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
  <rect width="100" height="100" rx="50" fill="${bg}"/>
  <text x="50%" y="54%" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="38" font-weight="700" fill="${textColor}" dominant-baseline="middle" text-anchor="middle">${initials}</text>
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

/**
 * Resolves avatar image url with automatic fallback to offline SVG
 */
export const getSafeAvatarUrl = (imageUrl, name = '', customBg = null) => {
  if (imageUrl && typeof imageUrl === 'string') {
    if (imageUrl.startsWith('data:image')) return imageUrl;
    if ((imageUrl.startsWith('http') || imageUrl.startsWith('/')) && !imageUrl.includes('ui-avatars.com')) {
      return imageUrl;
    }
  }
  return getInitialsAvatar(name, customBg);
};

/**
 * Safe image onError handler to attach to <img> tags
 */
export const handleAvatarError = (e, name = '', customBg = null) => {
  const target = e?.currentTarget || e?.target;
  if (!target) return;
  target.onerror = null; // Prevent infinite loop
  target.src = getInitialsAvatar(name, customBg);
};
