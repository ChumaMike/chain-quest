/**
 * API helpers for web + Capacitor mobile builds.
 *
 * In dev / web-production:  VITE_API_URL is empty → relative paths work via
 *   Vite proxy (dev) or same-origin serving (Railway).
 *
 * In Capacitor mobile builds: set VITE_API_URL to your Railway URL in
 *   .env.production, e.g.  VITE_API_URL=https://your-app.railway.app
 */
export const API_BASE = import.meta.env.VITE_API_URL ?? '';
export const WS_URL   = import.meta.env.VITE_WS_URL   ?? '/';

export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(API_BASE + path, init);
}
