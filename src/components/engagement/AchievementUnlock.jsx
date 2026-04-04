import { motion, AnimatePresence } from 'framer-motion';
import Icon from '../Icon';

export default function AchievementUnlock({ show = false, title = 'First Blood', desc = 'Win your first match', icon = '🏆', rarity = 'common', onClose }) {
  const rarityColors = {
    common: { bg: 'bg-surface-1', border: 'border-white/[0.06]' },
    rare: { bg: 'bg-surface-1', border: 'border-blue-500/20' },
    epic: { bg: 'bg-surface-1', border: 'border-brand-violet/20' },
    legendary: { bg: 'bg-surface-1', border: 'border-brand-gold/20' },
  };
  const r = rarityColors[rarity] || rarityColors.common;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -30 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className={`fixed top-14 left-4 right-4 z-50 ${r.bg} border ${r.border} rounded-2xl p-4 shadow-xl shadow-black/20`}
        >
          <div className="flex items-center gap-3">
            <div className="text-2xl shrink-0">{icon}</div>
            <div className="flex-1 min-w-0">
              <p className="text-text-muted text-[10px] font-semibold uppercase tracking-widest">Achievement</p>
              <p className="text-text-primary font-semibold text-sm">{title}</p>
              <p className="text-text-muted text-xs">{desc}</p>
            </div>
            <button onClick={onClose} className="text-text-muted hover:text-text-secondary shrink-0"><Icon name="close" size={16} /></button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
