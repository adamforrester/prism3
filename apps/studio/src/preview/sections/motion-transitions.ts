/** The four transitions, traced (#114, redesigned #292 "trace the curve"; UI redesign S9.1 lifted the legacy
 *  `renderMotionSpecimen` here, and S9.2 drew it in the Depth & motion preview's Motion section, owner decisions D7 A
 *  and D9 A): one stage per semantic transition (default, enter, exit, emphasized). The ghost line is the curve the
 *  transition's role uses IN THE MODE IN VIEW (`curveOfRole`: the mode's re-point, else the brand's; #2046, which the
 *  legacy specimen and concept v6 both missed by reading the transition's fixed default curve), and the dot traces it
 *  over the mode's duration.
 *
 *  WHEN IT PLAYS is the caller's (`preview/depth.ts`): once after a Motion edit and on Play or Replay, at real speed, and
 *  never by itself under reduced motion. This module draws the dots at rest and hands back `play`. The Slow motion
 *  choice divides playback for legibility only: the `‹ms›ms` label is always the real token value, and the ratio between
 *  transitions holds at any speed. It is view state, held by the caller, and its select is marked view-only (#574): it
 *  edits no token in any mode.
 *
 *  Stamps its root with the shared-section marker (`data-sg-section="motion-transitions"`, `kit.ts`'s header).
 *  WHAT IT IS HANDED. The resolved motion axis, the mode in view, the playback state and the block's copy. Nothing here
 *  reads the session. */
import type { Theme } from '@prism3/engine/theme';
import { el, hook, subHead, tokenPillBadged, tokenPillWrapping, viewOnly } from './kit';
import { curveOfRole, motionStageSvg } from './motion-curves';

/** The playback divisors the Slow motion select offers, real speed first (D9: Off, 1/2, 1/4, 1/8). */
export const MOTION_SLOWMO_OPTIONS = [1, 2, 4, 8];

export type TransitionsCopy = {
  readonly title: string; readonly desc: string;
  readonly play: string; readonly replay: string; readonly slow: string; readonly off: string; readonly reduced: string;
};

export const motionTransitionsSection = (
  mo: Theme['motion'], mode: string,
  playback: { slowmo: number; onSlowmo: (v: number) => void; played: boolean; reduced: boolean; onPlay: () => void },
  copy: TransitionsCopy,
): { node: HTMLElement; play: () => void } => {
  const durOf = (role: string): number => (mo.motionByMode?.[mode]?.duration ?? mo.duration)[role] ?? 0;
  const wrap = hook(el('div', 'dm-block'), 'depth-transitions');
  wrap.dataset.sgSection = 'motion-transitions';   // the shared-section marker (`kit.ts`'s header)
  wrap.append(subHead(copy.title), el('p', 'dm-desc', copy.desc));

  const bar = el('div', 'mo-toolbar');
  const btn = hook(el('button', 'mo-replay', playback.played ? copy.replay : copy.play), 'motion-play') as HTMLButtonElement;
  btn.type = 'button';
  const slowLabel = el('label', 'mo-slowmo');
  slowLabel.append(document.createTextNode(`${copy.slow} `));
  const select = hook(viewOnly(el('select', 'mo-slowmo-sel')), 'motion-slowmo') as HTMLSelectElement;
  for (const v of MOTION_SLOWMO_OPTIONS) {
    const opt = el('option', undefined, v === 1 ? copy.off : `1/${v}`) as HTMLOptionElement;
    opt.value = String(v);
    if (v === playback.slowmo) opt.selected = true;
    select.append(opt);
  }
  select.onchange = () => { playback.onSlowmo(Number(select.value) || 1); };
  slowLabel.append(select);
  bar.append(btn, slowLabel);
  wrap.append(bar);
  if (playback.reduced) wrap.append(hook(el('p', 'dm-desc', copy.reduced), 'motion-reduced'));

  const grid = el('div', 'mo-grid');
  const dots: { el: HTMLElement; anim: string }[] = [];
  for (const t of mo.transitions) {
    const ms = durOf(t.duration);
    const playMs = ms * playback.slowmo;
    const curve = curveOfRole(mo, mode, t.name);
    const curveBez = mo.easing[curve] ?? mo.easing.standard;
    const anim = `mo-trace-x ${playMs}ms linear both, mo-trace-y ${playMs}ms cubic-bezier(${curveBez.join(', ')}) both`;
    const col = hook(el('div', 'mo-col'), 'transition');
    col.dataset.transition = t.name;
    col.dataset.curve = curve;
    const stage = el('div', 'mo-stage');
    stage.append(motionStageSvg(curveBez));
    const dot = hook(el('div', 'mo-dot'), 'transition-dot');
    stage.append(dot);
    dots.push({ el: dot, anim });
    col.append(stage);
    const meta = el('div', 'mo-colmeta');
    meta.append(el('div', 'mo-colname', t.name));
    const row = el('div', 'spec-metarow');
    // The card IS `motion.transition.<name>`: the composite first, then the two parts it binds, the duration and the role.
    row.append(tokenPillWrapping(`motion.transition.${t.name}`), el('span', 'mo-meta mono', `${ms}ms · ${curve}`),
      tokenPillBadged(`motion.duration.${t.duration}`), tokenPillBadged(`motion.easing-role.${t.name}`));
    meta.append(row, el('div', 'mo-coldesc', t.desc));
    col.append(meta);
    grid.append(col);
  }
  wrap.append(grid);
  /** Play every trace once: clear the animation, force a reflow so the browser restarts the keyframes, set it again. */
  const play = (): void => {
    for (const d of dots) { d.el.style.animation = 'none'; void d.el.offsetWidth; d.el.style.animation = d.anim; }
  };
  btn.onclick = () => { playback.onPlay(); play(); btn.textContent = copy.replay; };
  return { node: wrap, play };
};
