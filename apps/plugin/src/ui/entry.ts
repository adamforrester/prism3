/**
 * The plugin iframe's entry (#110 + the agent link). It IS the shared studio UI — `apps/studio/src/entry.ts`,
 * the studio's own entry, imported whole and unchanged (one UI, no fork) — plus the one plugin-only control that is not part of it:
 * the Agent chip (`agent-link-ui.ts`), which it places in the top bar's `bar-agent` slot (IA-3). Mounted here
 * rather than inside the studio's body, so the web build carries none of it.
 */
// The component catalog, computed from the definitions this bundle carries, provided BEFORE the studio evaluates
// (an import's body runs in import order), so the studio's Components page reads it from its first render (S8.1).
import './component-catalog';
import '../../../studio/src/entry';
import { mountAgentLink } from '../agent-link-ui';

/**
 * The chrome follows Figma's theme (UI redesign S1.2, plan §3.3; owner decision F3). `figma.showUI` passes
 * `themeColors: true`, so Figma marks `<html>` with `figma-light` or `figma-dark` before this runs and
 * swaps the class live when the designer changes theme. The chrome's variables key off `data-theme`, so
 * the class is mapped onto it now and on every change. With neither class (a browser harness with no
 * stub), the chrome follows the device. The studio's light / dark / system toggle is web only.
 */
const followFigmaTheme = (): void => {
  const cls = document.documentElement.classList;
  const want = cls.contains('figma-dark') ? 'dark' : cls.contains('figma-light') ? 'light' : 'system';
  if (document.documentElement.dataset.theme !== want) document.documentElement.dataset.theme = want;
};
followFigmaTheme();
new MutationObserver(followFigmaTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

mountAgentLink();
