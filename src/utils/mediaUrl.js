// ═══════════════════════════════════════════
// MEDIA URL HELPER — CDN-READY
// ═══════════════════════════════════════════
// When VITE_MEDIA_BASE is set (e.g. https://media.vergr.app), all Storage
// download URLs are rewritten to route through the CDN. Cloudflare caches
// them at the edge — repeat views cost $0 in Firebase egress.
//
// When the env var is empty/missing, the raw firebasestorage URL passes
// through unchanged. This means local dev and pre-domain builds just work.

const MEDIA_BASE = import.meta.env.VITE_MEDIA_BASE || '';
const STORAGE_HOST = 'firebasestorage.googleapis.com';

/**
 * Rewrite a Firebase Storage download URL to route through the CDN.
 *
 * Input:  https://firebasestorage.googleapis.com/v0/b/vergr-44494.firebasestorage.app/o/posts%2Fabc%2Fvideo.mp4?alt=media&token=xyz
 * Output: https://media.vergr.app/v0/b/vergr-44494.firebasestorage.app/o/posts%2Fabc%2Fvideo.mp4?alt=media&token=xyz
 *
 * If the URL is already on the CDN domain, or MEDIA_BASE is unset, returns
 * the original URL unchanged.
 */
export function mediaUrl(url) {
  if (!url || !MEDIA_BASE) return url;

  try {
    // Only rewrite Firebase Storage URLs
    if (typeof url === 'string' && url.includes(STORAGE_HOST)) {
      const parsed = new URL(url);
      const cdnBase = new URL(MEDIA_BASE);
      // Keep the path + query intact, just swap the host
      return `${cdnBase.origin}${parsed.pathname}${parsed.search}`;
    }
  } catch {
    // Malformed URL — return as-is
  }

  return url;
}

/**
 * Batch-rewrite an array of URLs (e.g. post.mediaUrls).
 */
export function mediaUrls(urls) {
  if (!Array.isArray(urls)) return urls;
  return urls.map(mediaUrl);
}

export default mediaUrl;
