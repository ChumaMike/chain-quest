import { useEffect, useRef } from 'react';

export function useCountdown(active: boolean, onTick: () => void, interval = 1000) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (active) {
      intervalRef.current = setInterval(onTick, interval);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [active, onTick, interval]);
}
