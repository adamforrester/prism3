/**
 * The chrome theme (UI redesign S1.2, plan §3.3; owner decisions F3 and D2; the plugin's choice, the owner's top-bar
 * decision of 2026-10-05).
 *
 * `<html data-theme="light|dark|system">` picks which `--p3-*` block applies (the generated blocks in
 * `p3:chrome-css`). Each host offers a choice, kept per person:
 *   · the studio: Light, Dark or System (`system` by default), kept in `localStorage`;
 *   · the plugin: Match Figma (the default: Figma's `figma-light` and `figma-dark` classes on `<html>`, mapped onto
 *     the same attribute, live), Light or Dark. The plugin's iframe has no storage of its own, so the choice is kept
 *     in Figma's per-person `figma.clientStorage` by the main thread: the plugin's UI entry hands this module a
 *     `save` that posts `set-theme-pref`, and passes the main thread's `theme-pref` reply to `restoreFigmaTheme`
 *     (`apps/plugin/src/ui/entry.ts`, `apps/plugin/src/main.ts`).
 *
 * The legacy surfaces are pinned light until each page moves (D2): they carry `data-theme="light"`,
 * which resets the variables and `color-scheme` beneath them, so a legacy field keeps dark UA ink on its
 * light ground (#1031) while the chrome around it is dark.
 */
import { persistThemePref, restoreThemePref, type LocalStore, type ThemePref } from '../persist-local';

export type { ThemePref };
/** The plugin's choice: follow Figma, or a fixed theme. */
export type FigmaThemePref = 'figma' | 'light' | 'dark';
export type ThemeChoice = { readonly pref: ThemePref | FigmaThemePref; readonly label: string; readonly note?: string; readonly glyph: 'sun' | 'moon' | 'system' };

const WEB_CHOICES: readonly ThemeChoice[] = [
  { pref: 'light', label: 'Light', glyph: 'sun' },
  { pref: 'dark', label: 'Dark', glyph: 'moon' },
  { pref: 'system', label: 'System', note: 'follows this device', glyph: 'system' },
];
const FIGMA_CHOICES: readonly ThemeChoice[] = [
  { pref: 'figma', label: 'Match Figma', glyph: 'system' },
  { pref: 'light', label: 'Light', glyph: 'sun' },
  { pref: 'dark', label: 'Dark', glyph: 'moon' },
];
/** The choices this host offers, in menu order. */
export const THEME_CHOICES: readonly ThemeChoice[] = PRISM3_HOST === 'figma' ? FIGMA_CHOICES : WEB_CHOICES;
const FIGMA_PREFS: readonly string[] = FIGMA_CHOICES.map((c) => c.pref);

let pref: ThemePref | FigmaThemePref = PRISM3_HOST === 'figma' ? 'figma' : 'system';
let store: LocalStore | null = null;
let save: ((p: FigmaThemePref) => void) | null = null;
const watchers = new Set<() => void>();

/** The theme the person chose. */
export const themePref = (): ThemePref | FigmaThemePref => pref;
/** The choice this host shows as current. */
export const themeChoice = (): ThemeChoice => THEME_CHOICES.find((c) => c.pref === pref) ?? THEME_CHOICES[0];
/** Repaint when the choice changes from outside a click (the plugin's stored choice arriving). */
export const onThemeChange = (f: () => void): (() => void) => { watchers.add(f); return () => watchers.delete(f); };

/** `data-theme` for the current choice. Match Figma reads Figma's class; with neither class (a browser harness
 *  with no stub) the chrome follows the device. */
const applyChoice = (): void => {
  const cls = document.documentElement.classList;
  const want = pref === 'figma' ? (cls.contains('figma-dark') ? 'dark' : cls.contains('figma-light') ? 'light' : 'system') : pref;
  if (document.documentElement.dataset.theme !== want) document.documentElement.dataset.theme = want;
};

/** Web only: read the stored choice and apply it. Called by the entry before the first render. A null
 *  store (storage blocked) means `system`, and a choice made then lasts for the session. */
export const initTheme = (s: LocalStore | null): void => {
  store = s;
  pref = s ? restoreThemePref(s) : 'system';
  applyChoice();
};

/** Plugin only: follow Figma's theme until a choice says otherwise, live as Figma swaps its class, and keep each
 *  choice through `keep`. */
export const initFigmaTheme = (keep: (p: FigmaThemePref) => void): void => {
  save = keep;
  applyChoice();
  new MutationObserver(applyChoice).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
};

/** Plugin only: the choice the main thread kept, arriving after launch. Anything else is ignored (Match Figma). */
export const restoreFigmaTheme = (p: unknown): void => {
  if (typeof p !== 'string' || !FIGMA_PREFS.includes(p) || p === pref) return;
  pref = p as FigmaThemePref;
  applyChoice();
  for (const f of watchers) f();
};

/** Apply a choice and keep it. */
export const setThemePref = (p: ThemePref | FigmaThemePref): void => {
  pref = p;
  applyChoice();
  if (PRISM3_HOST === 'figma') save?.(p as FigmaThemePref);
  else if (store) persistThemePref(store, p as ThemePref);
};
