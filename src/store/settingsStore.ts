import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ControlMode = 'joystick' | 'tilt';

interface SettingsState {
  controlMode: ControlMode;
  setControlMode: (mode: ControlMode) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      controlMode: 'joystick',
      setControlMode: (mode) => set({ controlMode: mode }),
    }),
    { name: 'chain-quest-settings' }
  )
);
