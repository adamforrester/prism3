/** The motion specimen (#114, redesigned #292 "trace the curve"; UI redesign S9.1 lifted it from `main.ts`'s
 *  `renderMotionSpecimen`, unchanged in output): one large stage per semantic transition
 *  (default/enter/exit/emphasized) — the ghost line is the easing curve's shape, the dot traces it over the
 *  resolved duration. Motion can't show in the static component preview, so the tempo lever had no payoff;
 *  here it does — the traces re-run on every re-render (i.e. the moment you change the tempo), plus a Replay.
 *  A Playback control uniformly divides all four durations for legibility only: it never changes the
 *  `${ms}ms` label (always the real resolved token value) or the curve shape, and it preserves the ratio
 *  between transitions (exit stays 2× faster than default, etc.) at any speed. `prefers-reduced-motion` is
 *  honored (dot shown at its resting position, no animation), nodding to the engine's derived reduced ramp.
 *  The legacy Motion page draws it; the Depth & motion page (S9.2) will draw the same code.
 *
 *  Stamps its root with the shared-section marker (`data-sg-section="motion-transitions"`, `kit.ts`'s header).
 *  WHAT IT IS HANDED. The resolved motion axis, the mode in view, and the playback state: the divisor the
 *  caller holds (view state, never a token) and what to do when it changes. Nothing here reads the session. */
import type { Theme } from '@prism3/engine/theme';
import { el, palSection, tokenPillBadged, tokenPillWrapping, viewOnly } from './kit';
import { motionStageSvg } from './motion-curves';

/** The playback divisors the select offers, real speed first. */
export const MOTION_SLOWMO_OPTIONS = [1, 2, 4, 8];

export const motionTransitionsSection = (
  mo: Theme['motion'], mode: string,
  playback: { slowmo: number; onSlowmo: (v: number) => void },
): HTMLElement => {
  const motionSlowmo = playback.slowmo;
  // D — reflect the given mode's per-mode tempo (modeLevers.tempo) when it deviates, so the ramp
  // re-runs at the mode's speed here rather than only in the export (the #158 lesson). Duration is the
  // mode-varying part; easing/transitions are tempo-invariant. Falls back to the global ramp.
  const moByMode = mo.motionByMode?.[mode];
  const durOf = (role: string): number => (moByMode?.duration ?? mo.duration)[role] ?? 0;
  const tempoLabel = moByMode?.tempo ?? mo.tempo;
  const wrap = palSection('Motion', `The semantic transitions at tempo '${tempoLabel}' — each stage traces the resolved duration + easing curve. Playback below is a legibility aid only (the ms label is always the real token value); reduce-motion is honored (the engine also derives a reduced ramp).`);
  wrap.dataset.sgSection = 'motion-transitions';   // the shared-section marker (`kit.ts`'s header)

  const toolbar = el('div', 'mo-toolbar');
  const slowmoLabel = el('label', 'mo-slowmo');
  slowmoLabel.append(document.createTextNode('Playback '));
  // View-only: this hands the caller a new divisor, a view variable, and the caller repaints. It edits no
  // token in any mode, so it must not make the specimen read "Editing · All modes" (#574).
  const select = viewOnly(el('select', 'mo-slowmo-sel')) as HTMLSelectElement;
  for (const v of MOTION_SLOWMO_OPTIONS) {
    const opt = el('option', undefined, v === 1 ? 'real speed' : `1/${v}×`) as HTMLOptionElement;
    opt.value = String(v);
    if (v === motionSlowmo) opt.selected = true;
    select.append(opt);
  }
  select.onchange = () => { playback.onSlowmo(Number(select.value) || 1); };
  slowmoLabel.append(select);
  toolbar.append(slowmoLabel);
  wrap.append(toolbar);

  const grid = el('div', 'mo-grid');
  const dots: { el: HTMLElement; anim: string }[] = [];
  for (const t of mo.transitions) {
    const ms = durOf(t.duration);
    const playMs = ms * motionSlowmo;
    const curveBez = mo.easing[t.easing] ?? mo.easing.standard;
    const bez = `cubic-bezier(${curveBez.join(', ')})`;
    const anim = `mo-trace-x ${playMs}ms linear both, mo-trace-y ${playMs}ms ${bez} both`;

    const col = el('div', 'mo-col');
    const stage = el('div', 'mo-stage');
    stage.append(motionStageSvg(curveBez));
    const dot = el('div', 'mo-dot');
    dot.style.animation = anim;
    stage.append(dot);
    dots.push({ el: dot, anim });
    col.append(stage);

    const meta = el('div', 'mo-colmeta');
    meta.append(el('div', 'mo-colname', t.name));
    const metaRow = el('div', 'spec-metarow');
    // The card IS `motion.transition.<name>` and showed only its two PARTS — the composite that binds
    // them was the one token on the card without a pill. Named first, then what it resolves to.
    metaRow.append(tokenPillWrapping(`motion.transition.${t.name}`), el('span', 'mo-meta mono', `${ms}ms · ${t.easing}`), tokenPillBadged(`motion.duration.${t.duration}`), tokenPillBadged(`motion.easing.${t.easing}`));
    meta.append(metaRow);
    if (motionSlowmo > 1) meta.append(el('div', 'mo-playnote mono', `playing at ${playMs}ms (1/${motionSlowmo}×)`));
    meta.append(el('div', 'mo-coldesc', t.desc));
    col.append(meta);
    grid.append(col);
  }
  wrap.append(grid);

  const replay = el('button', 'mo-replay', 'Replay') as HTMLButtonElement;
  // Re-trigger by clearing the animation, forcing a reflow between so the browser restarts the keyframes.
  replay.onclick = () => { for (const d of dots) { d.el.style.animation = 'none'; void d.el.offsetWidth; d.el.style.animation = d.anim; } };
  wrap.append(replay);
  return wrap;
};
