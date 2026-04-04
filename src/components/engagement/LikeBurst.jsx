import { motion, AnimatePresence } from 'framer-motion';

export default function LikeBurst({ trigger = false }) {
  return (
    <AnimatePresence>
      {trigger && (
        <motion.div
          initial={{ scale: 0.6, opacity: 0.8 }}
          animate={{ scale: 1.8, opacity: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="absolute inset-0 rounded-full bg-brand-ember/20 pointer-events-none"
        />
      )}
    </AnimatePresence>
  );
}
