import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Question } from '../../types';

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'text-neon-green bg-neon-green/10 border-neon-green/30',
  medium: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  boss: 'text-neon-pink bg-neon-pink/10 border-neon-pink/30',
};

const LETTERS = ['A', 'B', 'C', 'D'];

interface Props {
  question: Question;
  index: number;
}

export default function QuestionCard({ question, index }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-white/10 rounded-lg bg-dark-800 overflow-hidden">
      {/* Collapsed header — always visible */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors"
      >
        <span className="text-slate-600 font-mono text-xs w-4 shrink-0">{index + 1}</span>
        <span className={`text-xs px-2 py-0.5 rounded border font-orbitron shrink-0 ${DIFFICULTY_COLORS[question.difficulty]}`}>
          {question.concept}
        </span>
        <span className="text-slate-300 text-sm flex-1 truncate">{question.text}</span>
        <motion.span
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-slate-500 text-xs shrink-0"
        >
          ▼
        </motion.span>
      </button>

      {/* Expanded content */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 border-t border-white/5 space-y-3">
              {/* Full question text */}
              <p className="text-white font-semibold text-sm">{question.text}</p>

              {/* Answer options */}
              <div className="space-y-1.5">
                {question.options.map((option, i) => {
                  const isCorrect = i === question.correctIndex;
                  return (
                    <div
                      key={i}
                      className={`flex items-start gap-2.5 px-3 py-2 rounded border text-sm ${
                        isCorrect
                          ? 'bg-neon-green/10 border-neon-green/30 text-neon-green'
                          : 'bg-dark-700 border-white/5 text-slate-500'
                      }`}
                    >
                      <span className={`font-orbitron text-xs w-4 shrink-0 mt-0.5 ${isCorrect ? 'text-neon-green' : 'text-slate-600'}`}>
                        {LETTERS[i]}
                      </span>
                      <span className="flex-1">{option}</span>
                      {isCorrect && <span className="text-neon-green text-xs shrink-0">✓</span>}
                    </div>
                  );
                })}
              </div>

              {/* Explanation */}
              <div className="bg-neon-cyan/5 border-l-2 border-neon-cyan/40 px-3 py-2 rounded-r">
                <p className="text-xs font-orbitron text-neon-cyan mb-1">EXPLANATION</p>
                <p className="text-slate-300 text-sm">{question.explanation}</p>
              </div>

              {/* Footer stats */}
              <div className="flex gap-3">
                <span className="text-xs text-slate-500 bg-dark-700 px-2 py-1 rounded border border-white/5">
                  ⚔️ {question.damage} dmg
                </span>
                <span className="text-xs text-slate-500 bg-dark-700 px-2 py-1 rounded border border-white/5">
                  ⏱ {question.timeLimitSec}s
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
