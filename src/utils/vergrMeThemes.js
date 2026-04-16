export const THEMES = {
  dark: {
    bg:          '#0b0b0d',
    surface:     'rgba(255,255,255,0.055)',
    surfaceHover:'rgba(255,255,255,0.09)',
    text:        '#ffffff',
    textSub:     'rgba(255,255,255,0.45)',
    textMuted:   'rgba(255,255,255,0.22)',
    border:      'rgba(255,255,255,0.07)',
    iconBg:      'rgba(255,255,255,0.06)',
  },
  light: {
    bg:          '#f4f4f0',
    surface:     'rgba(0,0,0,0.055)',
    surfaceHover:'rgba(0,0,0,0.09)',
    text:        '#111111',
    textSub:     'rgba(0,0,0,0.52)',
    textMuted:   'rgba(0,0,0,0.32)',
    border:      'rgba(0,0,0,0.09)',
    iconBg:      'rgba(0,0,0,0.05)',
  },
  glass: {
    bg:          '#0d1117',
    surface:     'rgba(255,255,255,0.07)',
    surfaceHover:'rgba(255,255,255,0.12)',
    text:        '#e6edf3',
    textSub:     'rgba(230,237,243,0.5)',
    textMuted:   'rgba(230,237,243,0.25)',
    border:      'rgba(255,255,255,0.1)',
    iconBg:      'rgba(255,255,255,0.08)',
  },
  midnight: {
    bg:          '#08081a',
    surface:     'rgba(130,100,255,0.09)',
    surfaceHover:'rgba(130,100,255,0.15)',
    text:        '#e8e0ff',
    textSub:     'rgba(200,180,255,0.5)',
    textMuted:   'rgba(200,180,255,0.25)',
    border:      'rgba(130,100,255,0.15)',
    iconBg:      'rgba(130,100,255,0.1)',
  },
  warm: {
    bg:          '#130d08',
    surface:     'rgba(255,160,80,0.08)',
    surfaceHover:'rgba(255,160,80,0.14)',
    text:        '#fff5ee',
    textSub:     'rgba(255,220,180,0.55)',
    textMuted:   'rgba(255,220,180,0.28)',
    border:      'rgba(255,160,80,0.12)',
    iconBg:      'rgba(255,160,80,0.08)',
  },
};

export const BANNER_FN = {
  gradient: (accent, bg) =>
    `linear-gradient(145deg, ${accent}44 0%, ${accent}11 40%, ${bg} 100%)`,
  mesh: (accent, bg) =>
    `radial-gradient(ellipse at 20% 40%, ${accent}30 0%, transparent 55%),
     radial-gradient(ellipse at 80% 60%, ${accent}18 0%, transparent 55%), ${bg}`,
  image: () => null,
  none:  (_, bg) => bg,
};

export const BUTTON_STYLES_FN = {
  card: (accent, t) => ({
    background: t.surface,
    border: `0.5px solid ${t.border}`,
    borderRadius: '12px',
    boxShadow: 'none',
  }),
  pill: (accent, t) => ({
    background: t.surface,
    border: `0.5px solid ${t.border}`,
    borderRadius: '999px',
    boxShadow: 'none',
  }),
  outline: (accent, t) => ({
    background: 'transparent',
    border: `1px solid ${accent}60`,
    borderRadius: '12px',
    boxShadow: 'none',
  }),
  shadow: (accent, t) => ({
    background: t.surface,
    border: 'none',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
  }),
};

export const ACCENT_PRESETS = [
  '#00e5ff', '#a78bfa', '#f472b6',
  '#34d399', '#fb923c', '#f87171', '#facc15',
];

export const SOCIAL_META = {
  instagram: { label: 'IG',  baseUrl: 'https://instagram.com/' },
  x:         { label: '𝕏',  baseUrl: 'https://x.com/' },
  youtube:   { label: 'YT',  baseUrl: 'https://youtube.com/@' },
  tiktok:    { label: 'TT',  baseUrl: 'https://tiktok.com/@' },
  linkedin:  { label: 'in',  baseUrl: 'https://linkedin.com/in/' },
  github:    { label: 'GH',  baseUrl: 'https://github.com/' },
  twitch:    { label: 'Tw',  baseUrl: 'https://twitch.tv/' },
  discord:   { label: 'DC',  baseUrl: 'https://discord.gg/' },
};

export function needsDarkText(hex) {
  if (!hex || hex.length < 7) return false;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 145;
}