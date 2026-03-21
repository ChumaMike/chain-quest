export const isMobile = () =>
  typeof window !== 'undefined' &&
  ('ontouchstart' in window || window.innerWidth < 768);
