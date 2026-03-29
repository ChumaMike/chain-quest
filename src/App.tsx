import { Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useAuthStore } from './store/authStore';
import ErrorBoundary from './components/ErrorBoundary';
import LandingPage from './components/pages/LandingPage';
import AuthPage from './components/pages/AuthPage';
import AvatarCreatorPage from './components/pages/AvatarCreatorPage';
import OpenWorldPage from './components/pages/OpenWorldPage';
import CampaignPage from './components/pages/CampaignPage';
import BattlePage from './components/pages/BattlePage';
import MultiplayerLobbyPage from './components/pages/MultiplayerLobbyPage';
import MultiplayerBattlePage from './components/pages/MultiplayerBattlePage';
import LeaderboardPage from './components/pages/LeaderboardPage';
import ProfilePage from './components/pages/ProfilePage';
import StudyGuidePage from './components/pages/StudyGuidePage';
import DuelPage from './components/pages/DuelPage';
import JumperPage from './components/pages/JumperPage';
import Navbar from './components/ui/Navbar';
import AchievementToast from './components/ui/AchievementToast';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore();
  if (!token) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

export default function App() {
  const { token } = useAuthStore();

  return (
    <div className="min-h-screen bg-dark-900">
      {token && <Navbar />}
      <ErrorBoundary>
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/avatar" element={<ProtectedRoute><AvatarCreatorPage /></ProtectedRoute>} />
            <Route path="/campaign" element={<ProtectedRoute><CampaignPage /></ProtectedRoute>} />
            <Route path="/world" element={<Navigate to="/campaign" replace />} />
            <Route path="/battle/:worldId" element={<ProtectedRoute><BattlePage /></ProtectedRoute>} />
            <Route path="/multiplayer" element={<ProtectedRoute><MultiplayerLobbyPage /></ProtectedRoute>} />
            <Route path="/multiplayer/room/:code" element={<ProtectedRoute><MultiplayerBattlePage /></ProtectedRoute>} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/study" element={<ProtectedRoute><StudyGuidePage /></ProtectedRoute>} />
            <Route path="/game/duel" element={<ProtectedRoute><DuelPage /></ProtectedRoute>} />
            <Route path="/game/jumper" element={<ProtectedRoute><JumperPage /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>
      </ErrorBoundary>
      <AchievementToast />
    </div>
  );
}
