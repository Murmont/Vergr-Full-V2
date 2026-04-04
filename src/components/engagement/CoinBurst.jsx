import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CoinBurst({ amount = 0, trigger = false, onComplete }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!trigger || amount <= 0) return;
    setVisible(true);
    const timer = setTimeout(() => { setVisible(false); onComplete?.(); }, 1800);
    return () => clearTimeout(timer);
  }, [trigger, amount]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="fixed left-1/2 top-[40%] -translate-x-1/2 z-50 pointer-events-none"
        >
          <div className="text-brand-gold text-2xl font-bold font-dmmono">+{amount}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
