import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Icon from './Icon';

export default function SquadPollComponent({ pollData, onVote }) {
  const [selected, setSelected] = useState(null);
  const [hasVoted, setHasVoted] = useState(false);

  const handleSubmit = () => {
    if (selected === null) return;
    setHasVoted(true);
    if (onVote) onVote(selected);
  };

  return (
    <div className="bg-surface-2 p-4 rounded-2xl rounded-bl-none border border-white/[0.06] w-full max-w-[280px]">
      <div className="flex items-center gap-2 mb-3">
        <Icon name="poll" size={16} className="text-brand-cyan" />
        <p className="font-semibold text-text-primary text-sm">{pollData.question}</p>
      </div>
      
      <div className="space-y-2">
        {(pollData.options || []).map((option, index) => (
          <motion.button
            key={index}
            onClick={() => !hasVoted && setSelected(index)}
            whileTap={!hasVoted ? { scale: 0.97 } : {}}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className={`w-full text-left p-3 rounded-xl text-sm transition-colors border ${
              selected === index 
                ? 'border-brand-cyan bg-brand-cyan/10 text-brand-cyan' 
                : 'border-white/[0.06] bg-bg-dark text-text-primary'
            } ${hasVoted ? 'cursor-default' : 'hover:border-white/[0.12]'}`}
          >
            {option}
          </motion.button>
        ))}
      </div>

      {!hasVoted && (
        <motion.button 
          onClick={handleSubmit}
          disabled={selected === null}
          whileTap={{ scale: 0.95 }}
          className="w-full mt-4 py-2 bg-brand-cyan rounded-lg font-bold text-bg-dark text-xs disabled:opacity-50"
        >
          Cast Vote
        </motion.button>
      )}
      
      {hasVoted && (
        <motion.p
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-text-muted mt-3 text-center">
          Vote recorded
        </motion.p>
      )}
    </div>
  );
}