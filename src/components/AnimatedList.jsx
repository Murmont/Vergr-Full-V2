import { motion } from 'framer-motion';

const container = {
  animate: { transition: { staggerChildren: 0.05 } },
};

const item = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

export function AnimatedList({ children, className = '' }) {
  return (
    <motion.div variants={container} initial="initial" animate="animate" className={className}>
      {children}
    </motion.div>
  );
}

export function AnimatedItem({ children, className = '' }) {
  return (
    <motion.div variants={item} className={className}>
      {children}
    </motion.div>
  );
}
