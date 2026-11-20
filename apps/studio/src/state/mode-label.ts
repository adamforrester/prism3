/**
 * A mode's name as the Studio shows it. It lives in `state/` rather than the preview header (`shell/preview.ts`, which
 * re-exports it) so a non-DOM module can name a mode the way the mode control does: the removal confirm in
 * `name-refs.ts` says "In Brand B, …", not the slug (#1729, owner decision 2026-11-19).
 */

/** Short mode names, as the legacy mode strip and concept v6 show them. A custom mode shows its own name, read as
 *  words (`customModeLabel`). */
const MODE_LABEL: Record<string, string> = { light: 'Light', dark: 'Dark', 'hc-light': 'HC light', 'hc-dark': 'HC dark', wireframe: 'Wireframe' };
/** A custom mode's slug as the menu shows it (#1729): each hyphen a space, each word capitalized, so the default
 *  theme's `brand-b` reads "Brand B", the name its issue gives it. The slug stays the mode's name everywhere else. */
export const customModeLabel = (m: string): string => m.split('-').filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || m;
export const modeLabel = (m: string): string => MODE_LABEL[m] ?? customModeLabel(m);
