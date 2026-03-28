import type { Question, Difficulty } from '../../types';
import QuestionCard from './QuestionCard';

const TIER_STYLES: Record<string, { label: string; color: string; bg: string; border: string }> = {
  easy:   { label: 'EASY',   color: 'text-neon-green',  bg: 'bg-neon-green/10',  border: 'border-neon-green/20' },
  medium: { label: 'MEDIUM', color: 'text-yellow-400',  bg: 'bg-yellow-400/10',  border: 'border-yellow-400/20' },
  boss:   { label: 'BOSS',   color: 'text-neon-pink',   bg: 'bg-neon-pink/10',   border: 'border-neon-pink/20' },
};

interface Props {
  difficulty: Difficulty;
  questions: Question[];
  startIndex: number;
}

export default function QuestionTier({ difficulty, questions, startIndex }: Props) {
  if (questions.length === 0) return null;

  const style = TIER_STYLES[difficulty] ?? TIER_STYLES.easy;
  const sample = questions[0];

  return (
    <div className="space-y-2">
      {/* Tier header */}
      <div className={`flex items-center gap-3 px-3 py-2 rounded-lg ${style.bg} border ${style.border}`}>
        <span className={`font-orbitron font-bold text-sm ${style.color}`}>{style.label}</span>
        <span className="text-slate-500 text-xs">
          {questions.length} question{questions.length > 1 ? 's' : ''} · {sample.timeLimitSec}s timer · {sample.damage} dmg each
        </span>
      </div>

      {/* Question cards */}
      <div className="space-y-1.5 pl-2">
        {questions.map((q, i) => (
          <QuestionCard key={q.id} question={q} index={startIndex + i} />
        ))}
      </div>
    </div>
  );
}
