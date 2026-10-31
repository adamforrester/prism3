// The /docs pages' appearance switch (#3176, Q3176 A): Auto follows the system, Light and Dark pin a theme.
// Loaded in <head> without defer, so a pinned theme is set before the first paint. The colors are docs.css's.
(() => {
  'use strict';
  const KEY = 'p3-docs-theme';
  const root = document.documentElement;
  const store = { get() { try { return localStorage.getItem(KEY); } catch { return null; } }, set(v) { try { v === 'system' ? localStorage.removeItem(KEY) : localStorage.setItem(KEY, v); } catch {} } };
  const apply = (t) => { if (t === 'light' || t === 'dark') root.dataset.theme = t; else delete root.dataset.theme; };
  apply(store.get());
  const wire = () => {
    const buttons = document.querySelectorAll('[data-theme-set]');
    const paint = () => { const t = root.dataset.theme || 'system'; for (const b of buttons) b.setAttribute('aria-pressed', String(b.dataset.themeSet === t)); };
    for (const b of buttons) b.addEventListener('click', () => { apply(b.dataset.themeSet); store.set(b.dataset.themeSet); paint(); });
    paint();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
})();
