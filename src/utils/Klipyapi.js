// KLIPY API — stickers + clips. GIFs use Tenor.
const KLIPY_KEY = 'D750DKSQKSBSoCbA8ImbChLBriKeshCoqax2172wm7iy5tQHh3ujjPk5zKnAVzcJ';
const KLIPY_BASE = 'https://api.klipy.com/api/v1';
const TENOR_KEY = 'AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ';
const TENOR_BASE = 'https://tenor.googleapis.com/v2';

// Stickers have nested file structure: file.hd.webp.url
const mapStickerResults = (data) => {
  const items = data?.data?.data || [];
  return items.filter(i => i.type !== 'ad').map(item => {
    const f = item.file || {};
    const hd = f.hd || f.md || f.sm || {};
    const sm = f.sm || f.xs || f.md || {};
    return {
      id: item.id, slug: item.slug, title: item.title || '', type: item.type,
      url: hd.webp?.url || hd.gif?.url || hd.png?.url || '',
      preview: sm.webp?.url || sm.gif?.url || sm.png?.url || '',
      width: hd.webp?.width || hd.gif?.width || 200,
      height: hd.webp?.height || hd.gif?.height || 200,
    };
  });
};

// Clips have FLAT file structure: file.mp4 = "url", file.gif = "url"
const mapClipResults = (data) => {
  const items = data?.data?.data || [];
  return items.filter(i => i.type !== 'ad').map(item => {
    const f = item.file || {};
    const meta = item.file_meta || {};
    return {
      id: item.id, slug: item.slug, title: item.title || '', type: item.type,
      url: f.mp4 || f.gif || f.webp || '',
      preview: f.gif || f.webp || f.mp4 || '',
      videoUrl: f.mp4 || '',
      width: meta.mp4?.width || meta.gif?.width || 320,
      height: meta.mp4?.height || meta.gif?.height || 240,
    };
  });
};

const fetchKlipy = async (contentType, endpoint, params = '') => {
  try {
    const url = `${KLIPY_BASE}/${KLIPY_KEY}/${contentType}/${endpoint}?per_page=30&customer_id=vergr_user${params}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return contentType === 'clips' ? mapClipResults(data) : mapStickerResults(data);
  } catch (err) {
    console.error(`KLIPY ${contentType}/${endpoint} error:`, err);
    return [];
  }
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
