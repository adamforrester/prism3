/**
 * Components, the preview (UI redesign S8.2; owner decisions G2, G5, G7 and G9, all A).
 *
 * WHAT IT SHOWS, in the legacy Style guide's markup (the owner's direction for the domain previews): one section per
 * lever section, headed and described as its lever section is (Q23). **Button**: the button specimen for the previewed
 * mode, small, medium and large, each at its minimum width and widened with icons, in the brand's action colors on its
 * page, with the corner the engine gives a button for the brand's Control shape in that mode (#2049). **Component
 * sets**: every set the engine defines; in the plugin, the set to build is chosen here and built with the build bar's
 * button, which stays in view at the bottom of the preview (C4), and each set says how its last build in this session
 * went. On the web the list is read-only and there is no bar.
 *
 * LEGACY MARKUP IN A LIGHT-PINNED HOST, SPECIMENS ON THE BRAND'S PAGE (plan §9.1), as `preview/shape.ts`: each
 * section's ground is a specimen root painted with the brand's own `background.primary` for the previewed mode, and
 * the section container takes the levers panel's gray (owner decision Q24, `p3-sgsec`).
 *
 * HOW IT REPAINTS: by store subscription only. `brand` and `mode` redraw both sections (the specimen, and each set's
 * spacing at the brand's density). `host` and `host:components` touch only the build's own parts IN PLACE (the Build
 * button's busy state and each set's last result), never the list: the chosen set lives in this module, so no repaint
 * can reset it (#870, the legacy picker's trap), and a verdict never moves the focus a designer has on a radio.
 */
import { currentMode, rp, subscribe, theme } from '../state/store';
import { resolvedModes } from '../state/verdict';
import { brandControlShape } from '../state/shape-input';
import { buttonLayout } from '../state/button-input';
import { componentCatalog } from '../state/component-catalog';
import { leverManifest } from '@prism3/engine/levers';
import { sizeRefPx } from '@prism3/engine/scale';
import { h, hook, pendingLabel, setBusy } from '../shell/dom';
import { BUTTON_DESC, SETS_DESC } from '../shell/pages';
import { modeLabel } from '../shell/preview';
import type { PageLends } from './brand';
import { buttonLayoutSection, type ButtonLayoutCopy } from './sections/index';
import { SG_SURFACES, ground, oppositeOf, palSection, sgContext, type SgRole } from './sections/kit';
import { chosenOf, componentSetsSection, setsView, SETS_COPY, type SetEntryView } from './sections/component-sets';

/** The button specimen's row label (DRAFT, S8.2). */
export const BUTTON_PREVIEW_COPY: ButtonLayoutCopy = {
  row: (size, height, minWidth) => `${size} · ${height}px high · at least ${minWidth}px wide`,
  smaller: ' · small label and icon',
};

/** The set the Build button builds, kept for the session (a repaint, a verdict or a page visit never resets it). */
let chosen: string | null = 'button';

/** The brand's density, by the manifest's option label. */
const densityLabel = (): string => {
  const d = theme.dims.density;
  return (leverManifest.find((l) => l.key === 'density')?.options ?? []).find((o) => String(o.value) === d)?.label ?? d;
};

/** Mount the Components preview into `host`. Subscriptions are released through `cleanups`. */
export const mountComponentsPreview = (hostEl: HTMLElement, cleanups: (() => void)[], lend: PageLends): void => {
  const plugin = PRISM3_HOST === 'figma';
  const stack = hook(h('div', 'p3-stack p3-preview-stack'), 'components-preview');
  const card = hook(h('div', 'p3-legacy-card'), 'components-style-guide');
  card.dataset.theme = 'light';
  stack.append(card);
  // THE BUILD BAR (owner decision C4 A, plugin only): "Build ‹Name›" and its two hints, in the chrome's own controls,
  // after the card and sticky to the bottom of the preview, so it is in view at any scroll position. In the flow, at
  // the end, it never covers the last set: scrolled to the bottom it sits under it. Built once per mount, synced in
  // place, so a host message never moves focus off it. Its hooks are the legacy build row's (`test:verdict`).
  let btn: HTMLButtonElement | null = null;
  if (plugin) {
    const bar = hook(h('div', 'p3-buildbar'), 'components-row');
    btn = hook(h('button', 'p3-btn p3-btn-primary'), 'components-build');
    btn.type = 'button';
    btn.onclick = () => { if (chosen !== null && !lend.sets.busy()) lend.sets.run(chosen); };
    const hints = h('div', 'p3-buildbar-hints');
    hints.append(hook(h('p', 'p3-sub', SETS_COPY.buildHint), 'components-build-hint'), hook(h('p', 'p3-sub', SETS_COPY.orderHint), 'components-order-hint'));
    bar.append(btn, hints);
    stack.append(bar);
  }
  hostEl.replaceChildren(stack);
  let view: SetEntryView[] = [];

  /** The Build button and the last results, from the session, in place (see the header). */
  const syncBuild = (): void => {
    if (!plugin) return;
    view = setsView(componentCatalog(), { density: theme.dims.density, spacePx: sizeRefPx(theme.dims.sizes), plugin, lastOf: lend.sets.lastOf });
    for (const v of view) {
      const n = card.querySelector<HTMLElement>(`[data-p3="component-set"][data-set="${v.id}"] [data-p3="component-set-last"]`);
      if (n && v.last !== null && n.textContent !== v.last) n.textContent = v.last;
    }
    if (!btn) return;
    const name = view.find((v) => v.id === chosen)?.name ?? '';
    const words = `${SETS_COPY.buildSet(name)}\n${SETS_COPY.busy}`;
    if (btn.dataset.words !== words) { btn.dataset.words = words; btn.replaceChildren(pendingLabel(SETS_COPY.buildSet(name), SETS_COPY.busy)); }
    setBusy(btn, lend.sets.busy());
    // Nothing to build (no set offered): the button stays, unavailable, rather than naming no set.
    btn.disabled = chosen === null;
  };

  const paint = (): void => {
    const had = document.activeElement as HTMLElement | null;
    const focusKey = had && card.contains(had) ? had.getAttribute('data-p3') : null;
    const focusValue = had instanceof HTMLInputElement ? had.value : null;
    const all = resolvedModes(theme);
    const rolesByMode = new Map<string, Record<string, SgRole | undefined>>(all.map((x) => [x.mode as string, x.roles as Record<string, SgRole | undefined>]));
    const cur: string = rolesByMode.has(currentMode) ? currentMode : rp.modes[0];
    const c = sgContext({
      rolesByMode, cur, opp: oppositeOf(cur, rp.modes, (m) => rolesByMode.has(m)), namespace: theme.namespace, modeLabel, badges: false,
      paletteHex: (p, s) => theme.palettes.find((x) => x.palette === p)?.steps.find((x) => x.key === s)?.hex ?? null,
    });
    const button = palSection('Button', BUTTON_DESC);
    button.append(buttonLayoutSection(buttonLayout(), theme, c, { shape: brandControlShape(), modes: theme.modes, copy: BUTTON_PREVIEW_COPY }));
    const sets = palSection('Component sets', SETS_DESC);
    view = setsView(componentCatalog(), { density: theme.dims.density, spacePx: sizeRefPx(theme.dims.sizes), plugin, lastOf: lend.sets.lastOf });
    chosen = chosenOf(view, chosen);
    sets.append(componentSetsSection(view, {
      plugin, chosen, densityLabel: densityLabel(),
      onChoose: (id) => { chosen = id; syncBuild(); },
    }));
    const secs = [button, sets];
    // Q24: each section's container on the levers panel's gray, as the other previews' are.
    for (const s of secs) s.classList.add('p3-sgsec');
    card.replaceChildren(...secs.map((s) => ground(c, s, SG_SURFACES[0])));
    syncBuild();
    if (focusKey) {
      const same = [...card.querySelectorAll<HTMLElement>(`[data-p3="${focusKey}"]`)];
      (same.find((n) => n instanceof HTMLInputElement && n.value === focusValue) ?? same[0])?.focus({ preventScroll: true });
    }
  };
  cleanups.push(subscribe('brand', paint), subscribe('mode', paint), subscribe('host', syncBuild), subscribe('host:components', syncBuild));
  paint();
};
