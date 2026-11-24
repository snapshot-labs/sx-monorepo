// The legal pages' text, rendered at build time (see vite.config.ts).
declare module 'virtual:legal' {
  const pages: Record<'terms' | 'privacy', { html: string; updated: string }>;
  export default pages;
}
