// Chat background wallpapers — bg_1 is default for all chats
// Images are 1024x1563. On desktop: auto 100% height + repeat-x to tile without stretching.
export const CHAT_BACKGROUNDS = [
  { id: 'bg_1', name: 'Neon Icons', value: '/backgrounds/static/bg_1.png' },
  { id: 'bg_2', name: 'Gaming Tech', value: '/backgrounds/static/bg_2.png' },
  { id: 'bg_3', name: 'Retro Arcade', value: '/backgrounds/static/bg_3.png' },
  { id: 'bg_4', name: 'Dark Circuit', value: '/backgrounds/static/bg_4.png' },
  { id: 'bg_5', name: 'Pixel Grid', value: '/backgrounds/static/bg_5.png' },
  { id: 'bg_6', name: 'Cyber Night', value: '/backgrounds/static/bg_6.png' },
  { id: 'bg_7', name: 'Galaxy', value: '/backgrounds/static/bg_7.png' },
  { id: 'none', name: 'No Background', value: null },
];

export const BG_CATEGORIES = {
  wallpapers: 'Wallpapers',
  custom: 'Custom Upload',
};

export const getChatBackground = (id) => CHAT_BACKGROUNDS.find(b => b.id === id) || CHAT_BACKGROUNDS[0];

export const getChatBgStyle = (bgId, customImageUrl) => {
  if (customImageUrl) {
    return {
      backgroundImage: `url(${customImageUrl})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundColor: '#07080D',
    };
  }
  const bg = getChatBackground(bgId);
  if (!bg || !bg.value) return { backgroundColor: '#07080D' };
  return {
    backgroundImage: `url(${bg.value})`,
    backgroundSize: 'auto 100%',
    backgroundPosition: 'center center',
    backgroundRepeat: 'repeat-x',
    backgroundColor: '#07080D',
  };
};

export const getBackgroundsByCategory = () => ({
  wallpapers: CHAT_BACKGROUNDS.filter(b => b.value),
});
