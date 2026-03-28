import type { WorldData } from '../../types';
import WorldHeader from './WorldHeader';
import LearningGoals from './LearningGoals';
import BossCard from './BossCard';
import QuestionTier from './QuestionTier';

interface Props {
  world: WorldData;
  isCompleted: boolean;
  stars?: number;
  currentLevel: number;
}

export default function WorldDetail({ world, isCompleted, stars = 0, currentLevel }: Props) {
  const easy   = world.questions.filter(q => q.difficulty === 'easy');
  const medium = world.questions.filter(q => q.difficulty === 'medium');
  const boss   = world.questions.filter(q => q.difficulty === 'boss');

  return (
    <div className="space-y-5">
      <WorldHeader world={world} isCompleted={isCompleted} stars={stars} currentLevel={currentLevel} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <LearningGoals goals={world.learningGoals} />
        <BossCard boss={world.boss} />
      </div>

      {/* Battle questions by tier */}
      <div className="space-y-1">
        <p className="font-orbitron text-xs text-slate-500 uppercase tracking-widest px-1">
          Battle Questions — {world.questions.length} total
        </p>
      </div>

      <div className="space-y-5">
        <QuestionTier difficulty="easy"   questions={easy}   startIndex={0} />
        <QuestionTier difficulty="medium" questions={medium} startIndex={easy.length} />
        <QuestionTier difficulty="boss"   questions={boss}   startIndex={easy.length + medium.length} />
      </div>
    </div>
  );
}
