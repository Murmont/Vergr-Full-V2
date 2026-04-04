import { motion, AnimatePresence } from 'framer-motion';
import Icon from './Icon';

const ATTACHMENT_OPTIONS = [
  { id: 'camera', icon: 'photo_camera', label: 'Camera', color: 'text-brand-ember', bg: 'bg-brand-ember/10' },
  { id: 'gallery', icon: 'photo_library', label: 'Gallery', color: 'text-brand-violet', bg: 'bg-brand-violet/10' },
  { id: 'file', icon: 'insert_drive_file', label: 'File', color: 'text-brand-cyan', bg: 'bg-brand-cyan/10' },
  { id: 'music', icon: 'music_note', label: 'Audio', color: 'text-brand-gold', bg: 'bg-brand-gold/10' },
  { id: 'location', icon: 'location_on', label: 'Location', color: 'text-green-400', bg: 'bg-green-400/10' },
  { id: 'contact', icon: 'person', label: 'Contact', color: 'text-brand-pink', bg: 'bg-brand-pink/10' },
  { id: 'wallet', icon: 'paid', label: 'Send Coins', color: 'text-brand-gold', bg: 'bg-brand-gold/10' },
];

export default function AttachmentMenu({
  isOpen, onClose,
  onGallery, onCamera, onFile, onLocation, onContact, onMusic, onWallet,
}) {
  if (!isOpen) return null;

  const handlers = {
    camera: onCamera, gallery: onGallery, file: onFile,
    music: onMusic, location: onLocation, contact: onContact, wallet: onWallet,
  };

  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      {/* Backdrop — visible on mobile only */}
      <div className="absolute inset-0 bg-black/40 lg:bg-transparent" />

      {/* Menu */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-center lg:bottom-16 lg:left-16 lg:right-auto" onClick={e => e.stopPropagation()}>
        <motion.div
          initial={{ y: 20, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 20, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="w-full max-w-md bg-surface-1 rounded-t-2xl border-t border-white/[0.06] lg:rounded-2xl lg:border lg:max-w-[260px] lg:shadow-2xl"
        >
          <div className="flex justify-center pt-2 pb-1 lg:hidden">
            <div className="w-9 h-1 rounded-full bg-white/[0.08]" />
          </div>
          <div className="grid grid-cols-4 lg:grid-cols-3 gap-1 p-3">
            {ATTACHMENT_OPTIONS.map((opt, i) => (
              <motion.button
                key={opt.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.025 }}
                onClick={() => { handlers[opt.id]?.(); onClose(); }}
                className="flex flex-col items-center gap-1.5 py-2.5 rounded-xl hover:bg-surface-2/50 transition-colors active:scale-95"
              >
                <div className={`w-10 h-10 rounded-full ${opt.bg} flex items-center justify-center`}>
                  <Icon name={opt.icon} size={20} className={opt.color} />
                </div>
                <span className="text-[10px] text-text-secondary font-medium">{opt.label}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
