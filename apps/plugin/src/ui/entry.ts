/**
 * The plugin iframe's entry (#110 + the agent link). It IS the shared studio UI — `apps/studio/src/entry.ts`,
 * the studio's own entry, imported whole and unchanged (one UI, no fork) — plus the one plugin-only control that is not part of it:
 * the agent link's temporary chip (`agent-link-ui.ts`). Mounted here rather than inside the studio's body,
 * so the web build carries none of it.
 */
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
