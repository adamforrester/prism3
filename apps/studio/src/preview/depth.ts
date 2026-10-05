/**
 * Depth & motion, the preview (UI redesign S9.2; concept v6's V4: one preview holds both topics).
 *
 * WHAT IT SHOWS, in the legacy Style guide's markup (owner direction for the domain previews, as Type's): two sections,
 * each headed and described as the lever section it pairs with (Q23). **Elevation**: the seven shadows, xs to 2xl and
 * `inset` set apart, each a card in the brand's page color with its token and CSS; then the shadow color at full
 * strength and as painted (owner decision D7 A). **Motion**: the six curves with the roles that use each; the
 * durations, with the spinner's turn apart as a loop (T9), the stagger and the millisecond building blocks; springs;
 * and the four transitions traced, with Play or Replay and a Slow motion choice (D7 A, D9 A). All of it in the
 * previewed mode only: the shadows, the shadow color, the curves each role uses and the durations are that mode's.
 *
 * WHEN THE TRACES PLAY (owner decision D9 A): once after any Motion edit, and on Play or Replay, at real speed unless a
 * Slow motion divisor is chosen. A Motion edit is a repaint from the `brand` topic that changes what the traces draw in
 * the same mode (a duration or a role's curve); a mode change, a mount or an Elevation edit plays nothing. With reduced
 * motion on they never play by themselves, and the section says "Reduced motion is on: playing once on request.";
 * Play still plays them once. The Slow motion choice is view state, kept here across repaints, and never written to the
 * brand (#574).
 *
 * LEGACY MARKUP IN A LIGHT-PINNED HOST, SPECIMENS ON THE BRAND'S PAGE (plan §9.1), as `preview/type.ts`: each section's
 * ground is a specimen root painted with the brand's own `background.primary` for the mode the preview shows, and the
 * section container takes the levers panel's gray (owner decision Q24, `p3-sgsec`).
 *
 * HOW IT REPAINTS: by store subscription (`brand`, `mode`), never through a legacy tier. Nothing else moves it but an
 * edit's reveal (QA-B9), which the frame runs: no scroll, no focus, no lever (V1).
 */
import { currentMode, rp, subscribe, theme } from '../state/store';
import { resolvedModes } from '../state/verdict';
import { h, hook } from '../shell/dom';
import { DOMAINS, type PageData } from '../shell/pages';
import { modeLabel } from '../shell/preview';
import {
  curveOfRole, durationRampSection, motionCurvesSection, motionTransitionsSection, shadowRampSection, shadowTintSection, springsSection,
  type DurationsCopy, type TransitionsCopy,
} from './sections/index';
import { SG_SURFACES, ground, oppositeOf, palSection, sgContext, type SgRole } from './sections/kit';

const PAGE = DOMAINS.find((d) => d.id === 'depth') as PageData;
/** A lever section's heading and description, from the page data the levers draw them from (Q23). */
const copyOf = (title: string): { title: string; desc: string } => ({ title, desc: PAGE.sections.find((x) => x.title === title)?.desc ?? '' });

/** The preview's own copy. APPROVED (owner, 2026-10-04) unless marked DRAFT; the DRAFT strings are in the S9.2
 *  fragment's "Copy for owner approval" block. */
export const DEPTH_PREVIEW_COPY = {
  shadowsTitle: 'Shadows',                                            // DRAFT (concept v6's board title)
  color: {
    title: 'Shadow color',                                            // DRAFT
    full: 'Full strength',                                            // DRAFT
    painted: 'As painted, 12%',                                       // DRAFT
    note: 'Shadows paint this color at 10–14% opacity, so the hue reads far subtler than on the swatch.',
  },
  curves: { title: 'Curves', desc: 'The six curves are fixed. Each role picks one.' },   // title DRAFT (concept v6's)
  durations: {
    title: 'Durations',
    desc: 'Each duration at this tempo, and its reduced-motion value.',
    head: ['Step', 'Duration', 'Reduced motion'],                     // DRAFT
    eliminated: 'none',                                               // DRAFT
    stagger: 'Between items that animate one after another.',         // DRAFT
    spinTitle: 'spin',                                                // the token's own name
    spinNote: 'A loop, not a step: the same at every tempo.',
    perTurn: (ms: number) => `${ms}ms per turn`,                       // DRAFT
    reducedTurn: (ms: number) => `reduced ${ms}ms`,                    // DRAFT
    blocksTitle: 'Building blocks',
    blocksDesc: 'Every millisecond value the durations use.',
  } satisfies DurationsCopy,
  springs: { title: 'Springs', desc: 'Physics presets for platforms that animate with springs. Read-only.' },
  transitions: {
    title: 'Transitions',                                             // DRAFT
    desc: 'Each transition traced at this tempo, along the curve its role uses.',   // DRAFT
    play: 'Play', replay: 'Replay', slow: 'Slow motion', off: 'Off',
    reduced: 'Reduced motion is on: playing once on request.',
  } satisfies TransitionsCopy,
} as const;

/** Whether the viewer asked for reduced motion. Read on every paint, so a change applies at the next one. */
const reducedMotion = (): boolean => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** The Slow motion divisor: view state, kept for the session (a page visit never resets it), never a token. */
let slowmo = 1;

/** Mount the Depth & motion preview into `host`. Subscriptions are released through `cleanups`. */
export const mountDepthPreview = (host: HTMLElement, cleanups: (() => void)[]): void => {
  const stack = hook(h('div', 'p3-stack p3-preview-stack'), 'depth-preview');
  const card = hook(h('div', 'p3-legacy-card'), 'depth-style-guide');
  card.dataset.theme = 'light';
  stack.append(card);
  host.replaceChildren(stack);
  /** Whether the traces have played on this visit: Play becomes Replay. */
  let played = false;
  /** What the traces drew last, and in which mode: a change in the same mode is a Motion edit. */
  let lastDrawn: string | null = null;
  let lastMode: string | null = null;
  let play: () => void = () => {};

  const paint = (why: 'mount' | 'brand' | 'mode'): void => {
    const all = resolvedModes(theme);
    const rolesByMode = new Map<string, Record<string, SgRole | undefined>>(all.map((x) => [x.mode as string, x.roles as Record<string, SgRole | undefined>]));
    const cur: string = rolesByMode.has(currentMode) ? currentMode : rp.modes[0];
    const c = sgContext({
      rolesByMode, cur, opp: oppositeOf(cur, rp.modes, (m) => rolesByMode.has(m)), namespace: theme.namespace, modeLabel, badges: false,
      paletteHex: (p, s) => theme.palettes.find((x) => x.palette === p)?.steps.find((x) => x.key === s)?.hex ?? null,
    });
    const page = SG_SURFACES[0];
    const mo = theme.motion;
    const C = DEPTH_PREVIEW_COPY;

    const elev = copyOf('Elevation');
    const e = palSection(elev.title, elev.desc);
    e.append(shadowRampSection(c, rp.shadows, cur, { title: C.shadowsTitle }), shadowTintSection(theme.shadow, cur, C.color));

    const mot = copyOf('Motion');
    const m = palSection(mot.title, mot.desc);
    const reduced = reducedMotion();
    const traces = motionTransitionsSection(mo, cur, {
      slowmo, reduced, played,
      onSlowmo: (v) => { slowmo = v; paint('mode'); },
      onPlay: () => { played = true; },
    }, C.transitions);
    play = traces.play;
    m.append(motionCurvesSection(mo, cur, C.curves), durationRampSection(mo, cur, C.durations), springsSection(mo.spring, C.springs), traces.node);

    const secs = [e, m];
    // Q24: each section's container on the levers panel's gray, as the other previews' are.
    for (const s of secs) s.classList.add('p3-sgsec');
    card.replaceChildren(...secs.map((s) => ground(c, s, page)));

    // D9: a Motion edit plays the traces once, at the chosen speed, unless reduced motion is on.
    const drawn = JSON.stringify([mo.motionByMode?.[cur]?.duration ?? mo.duration, mo.transitions.map((t) => curveOfRole(mo, cur, t.name))]);
    if (why === 'brand' && lastDrawn !== null && lastMode === cur && drawn !== lastDrawn && !reduced) {
      played = true;
      play();
      card.querySelector<HTMLElement>('[data-p3="motion-play"]')!.textContent = C.transitions.replay;
    }
    lastDrawn = drawn;
    lastMode = cur;
  };
  cleanups.push(subscribe('brand', () => paint('brand')), subscribe('mode', () => paint('mode')));
  paint('mount');
};
