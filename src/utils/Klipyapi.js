// KLIPY API — stickers + clips. GIFs use Tenor.
//
// KLIPY ads appear natively within trending/search/recent responses as items
// with `type: 'ad'`. We MUST pass them through to the UI (and not filter them
// out) for ad delivery + revenue to work. We also pass all required and
// recommended request parameters so KLIPY can target + bill impressions.
const KLIPY_KEY = 'D750DKSQKSBSoCbA8ImbChLBriKeshCoqax2172wm7iy5tQHh3ujjPk5zKnAVzcJ';
const KLIPY_BASE = 'https://api.klipy.com/api/v1';
const TENOR_KEY = 'AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ';
const TENOR_BASE = 'https://tenor.googleapis.com/v2';

// ── Persistent per-user id for KLIPY ──
// KLIPY requires a stable customer_id per end-user for ad targeting + frequency capping.
const getCustomerId = () => {
  try {
    let id = localStorage.getItem('klipy_customer_id');
    if (!id) {
      id = `vergr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem('klipy_customer_id', id);
    }
    return id;
  } catch {
    return 'vergr_anon';
  }
};

// Fresh session id — new per page load
const SESSION_ID = `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const getLocale = () => {
  try {
    const l = (navigator.language || 'en-US').replace('-', '_');
    return l;
  } catch {
    return 'en_US';
  }
};

// Build the common KLIPY param string (required + recommended)
const buildKlipyParams = (extra = '') => {
  const params = new URLSearchParams({
    per_page: '30',
    customer_id: getCustomerId(),
    session_id: SESSION_ID,
    locale: getLocale(),
    content_filter: 'medium',
  });
  return `?${params.toString()}${extra}`;
};

// Stickers have nested file structure: file.hd.webp.url
// Keep ads: they ship with the same shape plus click_url/impression_url.
const mapStickerResults = (data) => {
  const items = data?.data?.data || [];
  return items.map(item => {
    const f = item.file || {};
    const hd = f.hd || f.md || f.sm || {};
    const sm = f.sm || f.xs || f.md || {};
    return {
      id: item.id,
      slug: item.slug,
      title: item.title || '',
      type: item.type, // 'sticker' | 'ad'
      isAd: item.type === 'ad',
      url: hd.webp?.url || hd.gif?.url || hd.png?.url || '',
      preview: sm.webp?.url || sm.gif?.url || sm.png?.url || '',
      width: hd.webp?.width || hd.gif?.width || 200,
      height: hd.webp?.height || hd.gif?.height || 200,
      click_url: item.click_url || item.target_url || null,
      impression_url: item.impression_url || null,
    };
  });
};

// Clips have FLAT file structure: file.mp4 = "url", file.gif = "url"
const mapClipResults = (data) => {
  const items = data?.data?.data || [];
  return items.map(item => {
    const f = item.file || {};
    const meta = item.file_meta || {};
    return {
      id: item.id,
      slug: item.slug,
      title: item.title || '',
      type: item.type, // 'clip' | 'ad'
      isAd: item.type === 'ad',
      url: f.mp4 || f.gif || f.webp || '',
      preview: f.gif || f.webp || f.mp4 || '',
      videoUrl: f.mp4 || '',
      width: meta.mp4?.width || meta.gif?.width || 320,
      height: meta.mp4?.height || meta.gif?.height || 240,
      click_url: item.click_url || item.target_url || null,
      impression_url: item.impression_url || null,
    };
  });
};

const fetchKlipy = async (contentType, endpoint, extra = '') => {
  try {
    const url = `${KLIPY_BASE}/${KLIPY_KEY}/${contentType}/${endpoint}${buildKlipyParams(extra)}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return contentType === 'clips' ? mapClipResults(data) : mapStickerResults(data);
  } catch (err) {
    console.error(`KLIPY ${contentType}/${endpoint} error:`, err);
    return [];
  }
};

// ── KLIPY ad impression tracking ──
// Fire-and-forget pixel ping for when a KLIPY ad becomes visible.
export const trackKlipyImpression = (item) => {
  if (!item?.isAd || !item?.impression_url) return;
  try {
    // Use an Image pixel so the request works cross-origin without CORS.
    const img = new Image();
    img.src = item.impression_url;
  } catch {}
};

// Tenor GIF mapper
const mapTenorResults = (data) => (data?.results || []).map(r => ({
  id: r.id,
  url: r.media_formats?.gif?.url || r.media_formats?.tinygif?.url || '',
  preview: r.media_formats?.tinygif?.url || r.media_formats?.nanogif?.url || '',
  width: r.media_formats?.gif?.dims?.[0] || 200,
  height: r.media_formats?.gif?.dims?.[1] || 200,
  title: r.content_description || '',
}));

const fetchTenor = async (endpoint, params = '') => {
  try {
    const res = await fetch(`${TENOR_BASE}/${endpoint}?key=${TENOR_KEY}&limit=30&media_filter=gif,tinygif${params}`);
    return res.ok ? mapTenorResults(await res.json()) : [];
  } catch { return []; }
};

// GIFs (Tenor)
export const searchGifs = (q) => fetchTenor('search', `&q=${encodeURIComponent(q)}`);
export const getTrendingGifs = () => fetchTenor('featured');

// Stickers (KLIPY — transparent)
export const searchStickers = (q) => fetchKlipy('stickers', 'search', `&q=${encodeURIComponent(q)}`);
export const getTrendingStickers = () => fetchKlipy('stickers', 'trending');

// Clips (KLIPY — video)
export const searchClips = (q) => fetchKlipy('clips', 'search', `&q=${encodeURIComponent(q)}`);
export const getTrendingClips = () => fetchKlipy('clips', 'trending');
