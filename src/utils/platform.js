/**
 * Platform detection for VERGR
 * Detects whether the app is running in a browser or Tauri desktop shell.
 */

export const isTauri = () => {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
};

export const isDesktopApp = isTauri;

export const getPlatform = () => {
  if (isTauri()) return 'desktop';
  if (/Mobi|Android/i.test(navigator.userAgent)) return 'mobile';
  return 'web';
};
