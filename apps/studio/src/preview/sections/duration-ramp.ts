/** The duration ramp, read-only — what Tempo actually scales (UI redesign S9.1, lifted from `main.ts`'s
 *  `renderDurationRamp`, unchanged in output). The legacy Motion page draws it; the Depth & motion page (S9.2)
 *  will draw the same code.
 *
 *  Tempo's whole job is to move this ramp and the page never showed it: 3 of the 6 semantic steps
 *  appeared only as pills inside the transitions specimen, the 9 `duration-ms` primitives they alias
 *  (aurora; harbor: 8) appeared nowhere, and the reduced ramp appeared nowhere at all — while two
 *  separate lines of copy claimed "reduce-motion is derived". A promise made twice and evidenced zero
 *  times.
 *
 *  Reads the GIVEN MODE's re-derived ramp (`motionByMode[mode]`) the same way the transitions specimen does. A
 *  mode can run its own tempo, so reading `motion.duration` directly would print Light's numbers under a
 *  Dark mode bar — the #158 lesson, and the reason this is not simply `theme.motion.duration`.
 *
 *  Stamps its root with the shared-section marker (`data-sg-section="duration-ramp"`, `kit.ts`'s header).
 *  WHAT IT IS HANDED. The resolved motion axis and the mode in view. Nothing here reads the session. */
import { SPIN_ROLE, type Theme } from '@prism3/engine/theme';
import { el, hook, palSection, subHead, tokenPillBadged, tokenPillWrapping } from './kit';

export const durationRampSection = (mo: Theme['motion'], mode: string): HTMLElement => {
  const byMode = mo.motionByMode?.[mode];
  const dur = byMode?.duration ?? mo.duration;
  const reduced = byMode?.durationReduced ?? mo.durationReduced;
  const stagger = byMode?.stagger ?? mo.stagger;
  const tempoLabel = byMode?.tempo ?? mo.tempo;
  const wrap = hook(palSection('Duration ramp',
    `The six semantic durations at tempo '${tempoLabel}', each aliasing a literal ms primitive, beside the reduce-motion ramp the engine derives from it. Read-only — Tempo above scales the whole ladder.`), 'section-duration-ramp');
  wrap.dataset.sgSection = 'duration-ramp';   // the shared-section marker (`kit.ts`'s header)
  // the motion ramp IS a contract table; mo-ramp adds the ms column
  const table = el('table', 'ctable mo-ramp');
  const head = el('tr');
  // Four columns, each header true of its cell. The first cut had two columns both headed "Aliases",
  // and the second of them held `motion.duration-reduced.<name>` — which is the reduced token's OWN
  // path, not something it aliases. A header that is nearly right is worse than a missing one.
  for (const h of ['Step', 'Duration', 'Aliases', 'Reduce-motion']) head.append(el('th', undefined, h));
  table.append(head);
  // The spinner's turn (#1670) rides the duration pair but is not a step of this ramp: it is a loop period,
  // fixed at every tempo, and its reduced value is slower rather than shorter. So it is not a row here.
  for (const name of Object.keys(dur).filter((n) => n !== SPIN_ROLE)) {
    const ms = dur[name], rms = reduced[name];
    const tr = el('tr');
    const nameCell = el('td'); nameCell.append(el('span', 'mo-ramp-name', name), tokenPillBadged(`motion.duration.${name}`));
    const aliasCell = el('td'); aliasCell.append(tokenPillBadged(`motion.duration-ms.${ms}`));
    const redCell = el('td'); redCell.append(el('span', 'mo-ramp-ms mono', `${rms}ms`));
    // 0ms is the eliminated case, not a fast one — say so rather than leaving a bare 0.
    if (rms === 0) redCell.append(el('span', 'mo-ramp-note', 'eliminated'));
    redCell.append(tokenPillBadged(`motion.duration-reduced.${name}`));
    tr.append(nameCell, el('td', 'mono', `${ms}ms`), aliasCell, redCell);
    table.append(tr);
  }
  wrap.append(table);
  const foot = el('div', 'mo-ramp-foot');
  foot.append(el('span', 'mo-ramp-name', 'stagger'), tokenPillBadged('motion.stagger'), el('span', 'mono', `${stagger}ms`),
    el('span', 'mo-ramp-note', 'between staggered siblings'));
  wrap.append(foot);
  // The primitive tier is a UNION across the base tempo and every mode's tempo (tree.ts builds it that
  // way so an alias always lands on a real leaf), so this lists the union — not the current mode's six.
  const msValues = new Set<number>();
  const collect = (m: { duration?: Record<string, number>; durationReduced?: Record<string, number>; stagger?: number } | undefined): void => {
    if (!m) return;
    for (const v of Object.values(m.duration ?? {})) msValues.add(v);
    for (const v of Object.values(m.durationReduced ?? {})) msValues.add(v);
    if (m.stagger !== undefined) msValues.add(m.stagger);
  };
  collect(mo);
  for (const mm of Object.values(mo.motionByMode ?? {})) collect(mm);
  wrap.append(subHead(`Millisecond primitives — ${msValues.size} values`));
  wrap.append(el('p', 'sl-note', 'Literal, not semantic: one invariant leaf per reachable value across every mode’s tempo. A per-mode tempo re-points the alias above; it never re-values one of these.'));
  const prims = el('div', 'mo-ms-strip');
  for (const v of [...msValues].sort((a, b) => a - b)) {
    const chip = el('div', 'mo-ms-chip');
    chip.append(el('span', 'mo-ms-val mono', `${v}ms`), tokenPillWrapping(`motion.duration-ms.${v}`));
    prims.append(chip);
  }
  wrap.append(prims);
  return wrap;
};
