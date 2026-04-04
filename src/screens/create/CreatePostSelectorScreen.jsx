import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLayout } from '../../context/LayoutContext';
import useResponsive from '../../hooks/useResponsive';
import Icon from '../../components/Icon';

const POST_TYPES = [
  { id: 'text', title: 'Text', desc: 'Quick thoughts & updates', icon: 'edit_note', route: '/create/text', iconColor: 'text-brand-cyan' },
  { id: 'photo', title: 'Photo', desc: 'Screenshots & carousel', icon: 'photo_library', route: '/create/photo', iconColor: 'text-brand-violet' },
  { id: 'clip', title: 'Clip', desc: 'Short video moments', icon: 'play_circle', route: '/create/clip', iconColor: 'text-brand-ember' },
  { id: 'article', title: 'Article', desc: 'Guides, blogs & deep dives', icon: 'article', route: '/create/article', iconColor: 'text-brand-pink' },
  { id: 'lfg', title: 'LFG', desc: 'Find players & teams', icon: 'group_add', route: '/create/lfg', iconColor: 'text-brand-gold' },
  { id: 'tierlist', title: 'Tier List', desc: 'Rank & compare anything', icon: 'format_list_numbered', route: '/create/tierlist', iconColor: 'text-brand-violet' },
  { id: 'achievement', title: 'Achievement', desc: 'Showcase your wins', icon: 'emoji_events', route: '/create/achievement', iconColor: 'text-brand-gold' },
  { id: 'poll', title: 'Poll', desc: 'Ask the community', icon: 'bar_chart', route: '/create-poll', iconColor: 'text-brand-pink' },
];

export default function CreatePostSelectorScreen() {
  const navigate = useNavigate();
  const { isDesktop } = useResponsive();
  const { setRightPanel, setContentAlign } = useLayout();

  useEffect(() => {
    setRightPanel(null);
    setContentAlign(isDesktop ? 'left' : 'center');
    return () => { setRightPanel(null); setContentAlign('center'); };
  }, [setRightPanel, setContentAlign, isDesktop]);

  return (
    <div className="min-h-screen pb-24 lg:pb-8">
      <div className="px-5 pt-6 pb-2 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors active:scale-95">
          <Icon name="arrow_back" size={20} />
        </button>
        <div>
          <h1 className="font-syne text-xl font-bold tracking-tight text-text-primary">Create</h1>
          <p className="text-text-muted text-xs mt-0.5">What are you sharing?</p>
        </div>
      </div>
      <div className={`px-4 pt-4 grid gap-3 ${isDesktop ? 'grid-cols-4' : 'grid-cols-2'}`}>
        {POST_TYPES.map((type, i) => (
          <motion.button
            key={type.id}
            onClick={() => navigate(type.route)}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            whileTap={{ scale: 0.96 }}
            className="group relative overflow-hidden rounded-xl border border-white/[0.06] bg-surface-1 p-5 text-left transition-colors hover:bg-surface-2/50">
            <div className={`w-10 h-10 rounded-lg bg-surface-2/60 flex items-center justify-center mb-3 ${type.iconColor}`}>
              <Icon name={type.icon} size={22} />
            </div>
            <h3 className="font-semibold text-text-primary text-sm tracking-tight mb-0.5">{type.title}</h3>
            <p className="text-text-muted text-[11px] leading-relaxed">{type.desc}</p>
          </motion.button>
        ))}
      </div>
      {isDesktop && (
        <div className="px-4 mt-6">
          <button onClick={() => navigate('/create/text')}
            className="w-full flex items-center gap-4 p-4 rounded-xl border border-white/[0.06] bg-surface-1 hover:bg-surface-2/50 transition-colors group">
            <div className="w-9 h-9 rounded-full bg-surface-2/60 flex items-center justify-center text-text-muted group-hover:text-text-secondary transition-colors">
              <Icon name="edit" size={18} />
            </div>
            <span className="text-text-muted text-sm group-hover:text-text-secondary transition-colors">Start typing a quick post...</span>
          </button>
        </div>
      )}
    </div>
  );
}
