// SoundManager.ts — Procedural audio using Web Audio API (no files needed)
// All sounds are synthesised on the fly with oscillators.

type SoundType = 'correct' | 'wrong' | 'streakUp' | 'timerUrgent' | 'bossDefeat' | 'levelUp' | 'uiClick' | 'timerTick' | 'hardFork' | 'shieldBlock' | 'bossEnrage' | 'itemUse' | 'achievement';

let audioCtx: AudioContext | null = null;
let muted = localStorage.getItem('cq_muted') === 'true';

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  // Resume if suspended (browser autoplay policy)
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function tone(freq: number, duration: number, type: OscillatorType = 'sine', gain = 0.18, delay = 0) {
  if (muted) return;
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
    gainNode.gain.setValueAtTime(0, ctx.currentTime + delay);
    gainNode.gain.linearRampToValueAtTime(gain, ctx.currentTime + delay + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration + 0.05);
  } catch {}
}

function sweepTone(freqStart: number, freqEnd: number, duration: number, type: OscillatorType = 'sine', gain = 0.18, delay = 0) {
  if (muted) return;
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, ctx.currentTime + delay);
    osc.frequency.linearRampToValueAtTime(freqEnd, ctx.currentTime + delay + duration);
    gainNode.gain.setValueAtTime(0, ctx.currentTime + delay);
    gainNode.gain.linearRampToValueAtTime(gain, ctx.currentTime + delay + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration + 0.05);
  } catch {}
}

const SOUNDS: Record<SoundType, () => void> = {
  correct: () => {
    sweepTone(330, 660, 0.12, 'sine', 0.2);
    tone(660, 0.18, 'sine', 0.12, 0.08);
  },
  wrong: () => {
    sweepTone(300, 120, 0.18, 'sawtooth', 0.15);
    tone(100, 0.12, 'square', 0.08, 0.15);
  },
  streakUp: () => {
    // Rising arpeggio
    const notes = [330, 415, 523, 659];
    notes.forEach((f, i) => tone(f, 0.14, 'sine', 0.18, i * 0.09));
  },
  timerUrgent: () => {
    tone(880, 0.06, 'square', 0.08);
  },
  timerTick: () => {
    tone(440, 0.04, 'square', 0.04);
  },
  bossDefeat: () => {
    // Triumphant chord sweep
    [261, 329, 392, 523].forEach((f, i) => sweepTone(f, f * 1.2, 0.5, 'sine', 0.15, i * 0.06));
    tone(1046, 0.6, 'sine', 0.1, 0.3);
  },
  levelUp: () => {
    const scale = [262, 330, 392, 523, 659, 784];
    scale.forEach((f, i) => tone(f, 0.15, 'sine', 0.18, i * 0.08));
  },
  uiClick: () => {
    tone(1200, 0.03, 'sine', 0.08);
  },
  hardFork: () => {
    sweepTone(200, 400, 0.1, 'sawtooth', 0.2);
    tone(600, 0.12, 'square', 0.12, 0.08);
  },
  shieldBlock: () => {
    sweepTone(500, 800, 0.08, 'sine', 0.2);
    tone(800, 0.15, 'sine', 0.1, 0.06);
  },
  bossEnrage: () => {
    sweepTone(100, 60, 0.3, 'sawtooth', 0.25);
    tone(80, 0.4, 'square', 0.15, 0.2);
    tone(200, 0.3, 'sawtooth', 0.1, 0.35);
  },
  itemUse: () => {
    sweepTone(400, 600, 0.12, 'sine', 0.15);
    tone(800, 0.1, 'sine', 0.1, 0.1);
  },
  achievement: () => {
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => tone(f, 0.18, 'sine', 0.2, i * 0.1));
    tone(1047, 0.4, 'sine', 0.15, 0.45);
  },
};

export function playSound(type: SoundType): void {
  try {
    SOUNDS[type]?.();
  } catch {}
}

export function isMuted(): boolean {
  return muted;
}

export function toggleMute(): boolean {
  muted = !muted;
  localStorage.setItem('cq_muted', String(muted));
  return muted;
}

// Initialise context on first user gesture (browser autoplay policy)
export function initAudio(): void {
  try { getCtx(); } catch {}
}
