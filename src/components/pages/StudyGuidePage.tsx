import { useState } from 'react';
import PageWrapper from '../ui/PageWrapper';
import { WORLDS } from '../../data/curriculum';
import { useGameStore } from '../../store/gameStore';
import WorldList from '../study-guide/WorldList';
import WorldDetail from '../study-guide/WorldDetail';

export default function StudyGuidePage() {
  const { completedWorlds, worldProgress, currentLevel } = useGameStore();
  const [selectedWorldId, setSelectedWorldId] = useState(1);

  const world = WORLDS.find(w => w.id === selectedWorldId)!;
  const progress = worldProgress[selectedWorldId];
  const isCompleted = completedWorlds.includes(selectedWorldId);

  return (
    <PageWrapper>
      <div className="min-h-screen bg-grid pt-16 pb-12 px-4">
        <div className="max-w-6xl mx-auto">

          {/* Page header */}
          <div className="mb-6">
            <h1 className="font-orbitron font-black text-2xl text-white">
              STUDY <span className="text-neon-cyan glow-cyan">GUIDE</span>
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Everything you need to know to win every battle — questions, answers, and explanations for all 16 worlds.
            </p>
          </div>

          {/* Mobile world strip */}
          <div className="md:hidden mb-4">
            <WorldList
              worlds={WORLDS}
              selectedId={selectedWorldId}
              onSelect={setSelectedWorldId}
              completedWorlds={completedWorlds}
              currentLevel={currentLevel}
            />
          </div>

          {/* Desktop two-column layout */}
          <div className="md:grid md:grid-cols-[240px_1fr] md:gap-6">
            {/* Desktop sidebar */}
            <WorldList
              worlds={WORLDS}
              selectedId={selectedWorldId}
              onSelect={setSelectedWorldId}
              completedWorlds={completedWorlds}
              currentLevel={currentLevel}
            />

            {/* World detail */}
            <div>
              <WorldDetail
                world={world}
                isCompleted={isCompleted}
                stars={progress?.stars}
                currentLevel={currentLevel}
              />
            </div>
          </div>

        </div>
      </div>
    </PageWrapper>
  );
}
