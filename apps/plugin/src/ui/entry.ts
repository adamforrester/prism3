/**
 * The plugin iframe's entry (#110 + the agent link). It IS the shared studio UI — `apps/studio/src/entry.ts`,
 * the studio's own entry, imported whole and unchanged (one UI, no fork) — plus the one plugin-only control that is not part of it:
 * the Agent tile (`agent-link-ui.ts`, T7), which it places in the top bar's `bar-agent` slot (IA-3). Mounted here
 * rather than inside the studio's body, so the web build carries none of it. It also keeps the plugin's Theme choice
 * (below).
 */
// The component catalog, computed from the definitions this bundle carries, provided BEFORE the studio evaluates
// (an import's body runs in import order), so the studio's Components page reads it from its first render (S8.1).
import './component-catalog';
import '../../../studio/src/entry';
import { mountAgentLink } from '../agent-link-ui';
import { initFigmaTheme, restoreFigmaTheme } from '../../../studio/src/shell/theme';
import { initActivityHeight, restoreActivityHeight } from '../../../studio/src/shell/activity';
import type { UiToMain } from '../messages';

/**
 * The chrome's theme (UI redesign S1.2, owner decision F3; the plugin's choice, the owner's top-bar decision of
 * 2026-10-05). The Theme menu offers Match Figma (the default), Light and Dark (`shell/theme.ts`). Match Figma maps
 * Figma's `figma-light` and `figma-dark` classes onto `data-theme`, live: `figma.showUI` passes `themeColors: true`,
 * so Figma marks `<html>` before this runs and swaps the class when the designer changes theme. The choice is kept
 * per person in `figma.clientStorage`, which only the main thread can reach: a choice is posted as `set-theme-pref`,
 * and the main thread answers `ui-ready` with the kept one as `theme-pref` (`../main.ts`).
 */
const postMain = (m: UiToMain): void => parent.postMessage({ pluginMessage: m }, '*');
initFigmaTheme((pref) => postMain({ type: 'set-theme-pref', pref }));
window.addEventListener('message', (e: MessageEvent) => {
  const m = e.data && (e.data as { pluginMessage?: { type?: unknown; pref?: unknown; px?: unknown } }).pluginMessage;
  if (m && m.type === 'theme-pref') restoreFigmaTheme(m.pref);
  if (m && m.type === 'activity-height') restoreActivityHeight(m.px);
});
// The Activity drawer's height (#2176, the owner's AD1), kept the same way: each kept height is posted as
// `set-activity-height`, and the main thread answers `ui-ready` with the kept one as `activity-height`.
initActivityHeight(null, (px) => postMain({ type: 'set-activity-height', px }));

mountAgentLink();
