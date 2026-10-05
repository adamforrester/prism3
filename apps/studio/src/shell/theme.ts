/**
 * The chrome theme (UI redesign S1.2, plan §3.3; owner decisions F3 and D2).
 *
 * `<html data-theme="light|dark|system">` picks which `--p3-*` block applies (the generated blocks in
 * `p3:chrome-css`). The studio offers a light / dark / system toggle, `system` by default, kept per
 * viewer in `localStorage`. The plugin has no toggle: its entry maps Figma's `figma-light` and
 * `figma-dark` classes onto the same attribute (`apps/plugin/src/ui/entry.ts`).
 *
 * The legacy surfaces are pinned light until each page moves (D2): they carry `data-theme="light"`,
 * which resets the variables and `color-scheme` beneath them, so a legacy field keeps dark UA ink on its
 * light ground (#1031) while the chrome around it is dark.
 */
import { persistThemePref, restoreThemePref, type LocalStore, type ThemePref } from '../persist-local';

export type { ThemePref };
export const THEME_CHOICES: readonly { readonly pref: ThemePref; readonly label: string; readonly note?: string }[] = [
  { pref: 'light', label: 'Light' },
  { pref: 'dark', label: 'Dark' },
  { pref: 'system', label: 'System', note: 'follows this device' },
];

let pref: ThemePref = 'system';
let store: LocalStore | null = null;

/** The theme the viewer chose. */
export const themePref = (): ThemePref => pref;

/** Web only: read the stored choice and apply it. Called by the entry before the first render. A null
 *  store (storage blocked) means `system`, and a choice made then lasts for the session. */
export const initTheme = (s: LocalStore | null): void => {
  store = s;
  pref = s ? restoreThemePref(s) : 'system';
  document.documentElement.dataset.theme = pref;
};

/** Apply a choice and keep it. */
export const setThemePref = (p: ThemePref): void => {
  pref = p;
  document.documentElement.dataset.theme = p;
  if (store) persistThemePref(store, p);
};
