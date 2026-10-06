/** The durations, read-only: what Tempo actually scales (UI redesign S9.1 lifted the legacy `renderDurationRamp` here;
 *  S9.2 drew it in the Depth & motion preview's Motion section, owner decisions D7 A and T9).
 *
 *  Three parts. **Durations**: the six semantic steps at the mode's tempo, each with a bar to scale, its token, and its
 *  reduced-motion value; then the stagger between items. **The spinner's turn** (`motion.duration.spin`, #1670) apart
 *  from the steps (T9): it is a loop period, the same at every tempo, and under reduced motion a slower turn rather
 *  than a shorter one, so it is never a row of the table. **Building blocks**: every millisecond value the durations
 *  alias, the union across the brand's tempo and every mode's (tree.ts builds it that way, so an alias always lands on
 *  a real leaf).
 *
 *  Reads the GIVEN MODE's re-derived durations (`motionByMode[mode]`), never `motion.duration` alone: a mode can run its
 *  own tempo, and reading the brand's would print Light's numbers under a Dark preview (the #158 lesson).
 *
 *  Stamps its root with the shared-section marker (`data-sg-section="duration-ramp"`, `kit.ts`'s header).
 *  WHAT IT IS HANDED. The resolved motion axis, the mode in view and the blocks' copy. Nothing here reads the session. */
import { SPIN_ROLE, type Theme } from '@prism3/engine/theme';
import { el, hook, subHead, tokenPillBadged, tokenPillWrapping } from './kit';

export type DurationsCopy = {
  readonly title: string; readonly desc: string;
  readonly head: readonly [string, string, string];
  readonly eliminated: string;
  readonly stagger: string;
  readonly spinTitle: string; readonly spinNote: string; readonly perTurn: (ms: number) => string; readonly reducedTurn: (ms: number) => string;
  readonly blocksTitle: string; readonly blocksDesc: string;
};

export const durationRampSection = (mo: Theme['motion'], mode: string, copy: DurationsCopy): HTMLElement => {
  const byMode = mo.motionByMode?.[mode];
  const dur = byMode?.duration ?? mo.duration;
  const reduced = byMode?.durationReduced ?? mo.durationReduced;
  const stagger = byMode?.stagger ?? mo.stagger;
  const wrap = hook(el('div', 'dm-block'), 'section-duration-ramp');
  wrap.dataset.sgSection = 'duration-ramp';   // the shared-section marker (`kit.ts`'s header)
  wrap.dataset.tempo = byMode?.tempo ?? mo.tempo;
  wrap.append(subHead(copy.title), el('p', 'dm-desc', copy.desc));
  const steps = Object.keys(dur).filter((n) => n !== SPIN_ROLE);
  const longest = Math.max(1, ...steps.map((n) => dur[n]));
  const table = el('table', 'ctable mo-ramp');
  const head = el('tr');
  for (const x of copy.head) head.append(el('th', undefined, x));
  table.append(head);
  for (const name of steps) {
    const ms = dur[name], rms = reduced[name];
    const tr = hook(el('tr'), 'duration-row');
    tr.dataset.step = name;
    const nameCell = el('td'); nameCell.append(el('span', 'mo-ramp-name', name), tokenPillBadged(`motion.duration.${name}`));
    const msCell = el('td', 'mo-ramp-dur');
    const bar = el('span', 'mo-bar');
    bar.style.width = `${Math.round((ms / longest) * 100)}%`;
    msCell.append(el('span', 'mo-ramp-ms mono', `${ms}ms`), bar);
    const redCell = el('td'); redCell.append(el('span', 'mo-ramp-ms mono', `${rms}ms`));
    // 0ms is the eliminated case, not a fast one: say so rather than leaving a bare 0.
    if (rms === 0) redCell.append(el('span', 'mo-ramp-note', copy.eliminated));
    redCell.append(tokenPillBadged(`motion.duration-reduced.${name}`));
    tr.append(nameCell, msCell, redCell);
    table.append(tr);
  }
  wrap.append(table);
  const foot = hook(el('div', 'mo-ramp-foot'), 'duration-stagger');
  foot.append(el('span', 'mo-ramp-name', 'stagger'), tokenPillBadged('motion.stagger'), el('span', 'mono', `${stagger}ms`), el('span', 'mo-ramp-note', copy.stagger));
  wrap.append(foot);
  // T9: the spinner's turn, apart, as a loop.
  if (dur[SPIN_ROLE] !== undefined) {
    const spin = hook(el('div', 'mo-spin'), 'duration-spin');
    const loop = el('span', 'mo-spin-loop');
    loop.setAttribute('aria-hidden', 'true');
    const txt = el('div', 'mo-spin-txt');
    const line = el('div', 'mo-ramp-foot');
    line.append(el('span', 'mo-ramp-name', copy.spinTitle), tokenPillBadged(`motion.duration.${SPIN_ROLE}`), el('span', 'mono', copy.perTurn(dur[SPIN_ROLE])),
      el('span', 'mono', copy.reducedTurn(reduced[SPIN_ROLE])), tokenPillBadged(`motion.duration-reduced.${SPIN_ROLE}`));
    txt.append(line, el('p', 'dm-desc', copy.spinNote));
    spin.append(loop, txt);
    wrap.append(spin);
  }
  const msValues = new Set<number>();
  const collect = (m: { duration?: Record<string, number>; durationReduced?: Record<string, number>; stagger?: number } | undefined): void => {
    if (!m) return;
    for (const v of Object.values(m.duration ?? {})) msValues.add(v);
    for (const v of Object.values(m.durationReduced ?? {})) msValues.add(v);
    if (m.stagger !== undefined) msValues.add(m.stagger);
  };
  collect(mo);
  for (const mm of Object.values(mo.motionByMode ?? {})) collect(mm);
  const blocks = hook(el('div', 'dm-sub'), 'duration-building-blocks');
  blocks.append(subHead(copy.blocksTitle), el('p', 'dm-desc', copy.blocksDesc));
  const prims = el('div', 'mo-ms-strip');
  for (const v of [...msValues].sort((a, b) => a - b)) {
    const chip = el('div', 'mo-ms-chip');
    chip.append(el('span', 'mo-ms-val mono', `${v}ms`), tokenPillWrapping(`motion.duration-ms.${v}`));
    prims.append(chip);
  }
  blocks.append(prims);
  wrap.append(blocks);
  return wrap;
};
