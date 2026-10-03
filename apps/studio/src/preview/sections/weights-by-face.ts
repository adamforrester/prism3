/** The Typography Preview tab's "Weight roles by face" section (#362; UI redesign S6.1: lifted out of
 *  `renderTypePreview` in `main.ts` unchanged in output, so the new Type page can draw the same section).
 *  Each weight role at the number it resolves to, and whether each face ships that weight, with an "Ag 123"
 *  specimen per face. Availability is advisory. Read-only.
 *
 *  MODE-BLIND BY DECISION (owner, 2026-08-01): availability is a property of the FACE, not the mode, so the
 *  table shows the base numbers and names any role a mode re-points, rather than a third axis. The face
 *  columns are a union across modes: a face bound only in Dark still ships (or does not ship) these weights.
 *  Fixed-width face columns, not `mtbl-fill`: one fill column per face grew the table past its container.
 *
 *  Stamps its root with the shared-section marker (`data-sg-section="weights-by-face"`, `kit.ts`'s header).
 *  WHAT IT IS HANDED. The resolved typography and the brand's modes. Nothing here reads the session. */
import type { Theme } from '@prism3/engine/theme';
import { knownWeightsOf, WEIGHT_NAME } from '../../ui/fonts';
import { el, palSection } from './kit';

export const weightsByFaceSection = (ty: Theme['typography'], modes: readonly string[]): HTMLElement => {
  const wsec = palSection('Weight roles by font family', 'Each role at the numeric it resolves to, and whether each font family actually ships that weight. Availability is advisory — nothing here is ever blocked. Set the numerics on Semantics.');
  wsec.dataset.sgSection = 'weights-by-face';   // the shared-section marker (`kit.ts`'s header)
  const faces: Array<{ name: string; stack: string; roles: string[] }> = [];
  const addFace = (stackArr: string[] | undefined, cat: string): void => {
    if (!stackArr?.length) return;
    const name = stackArr[0].replace(/["']/g, '').trim();
    const found = faces.find((f) => f.name.toLowerCase() === name.toLowerCase());
    if (found) { if (!found.roles.includes(cat)) found.roles.push(cat); return; }
    faces.push({ name, stack: stackArr.join(', '), roles: [cat] });
  };
  for (const f of ty.families) addFace(f.stack, f.group);
  for (const m of modes) for (const f of ty.familiesByMode?.[m] ?? []) addFace(f.stack, f.group);

  const wtbl = el('div', 'mtbl');
  const wscroll = el('div', 'mtbl-scroll');
  const wt = el('table', 'mtbl-tbl');
  const whead = el('thead'), whtr = el('tr');
  whtr.append(el('th', 'mtbl-stick', 'Role'), el('th', 'mtbl-mode', 'Weight'));
  for (const f of faces) {
    const th = el('th', 'mtbl-mode');
    th.append(document.createTextNode(f.name));
    th.title = `${f.name} — used by ${f.roles.join(', ')}\n${f.stack}`;
    whtr.append(th);
  }
  whtr.append(el('th', 'mtbl-fill'));
  whead.append(whtr); wt.append(whead);
  const wb = el('tbody');
  for (const w of ty.weightRoles) {
    const tr = el('tr');
    const nc = el('td', 'mtbl-stick');
    nc.append(el('span', 'mtbl-name mono', w.role));
    tr.append(nc);
    tr.append(el('td', 'mtbl-mode', `${w.value} ${WEIGHT_NAME[w.value] ?? ''}`.trim()));
    for (const f of faces) {
      const known = knownWeightsOf(f.name);
      const ships = !known ? null : known.includes(w.value);
      const td = el('td', 'mtbl-mode');
      td.append(el('span', 'tpw-mark ' + (ships === null ? 'unknown' : ships ? 'yes' : 'no'), ships === null ? '?' : ships ? '●' : '○'));
      // `Ag 123`, the same specimen the typeface library uses, short enough for a fixed column.
      const samp = el('span', 'mtbl-spec-t tpw-samp', 'Ag 123');
      samp.style.fontWeight = String(w.value);
      samp.style.fontFamily = f.stack;
      td.append(samp);
      td.title = ships === null ? `${f.name} — unknown family, availability cannot be asserted`
        : ships ? `${f.name} ships ${w.value}` : `${f.name} may not ship ${w.value} — falls back to the nearest`;
      tr.append(td);
    }
    tr.append(el('td', 'mtbl-fill'));
    wb.append(tr);
  }
  wt.append(wb); wscroll.append(wt); wtbl.append(wscroll); wsec.append(wtbl);
  wsec.append(el('p', 'sl-note', '● ships it · ○ may not (falls back to the nearest) · ? unknown family, not flagged. A specimen that looks identical to the row above it is the fallback showing — that is what ○ predicts.'));
  // The one fact the mode-blind shape would otherwise swallow: which roles a mode re-points.
  const repointed = ty.weightRoles
    .filter((w) => modes.some((m) => {
      const v = ty.weightRolesByMode?.[m]?.find((x) => x.role === w.role)?.value;
      return v !== undefined && v !== w.value;
    }))
    .map((w) => w.role);
  if (repointed.length)
    wsec.append(el('p', 'sl-note', `Baseline numerics shown. ${repointed.length === 1 ? 'One role is' : `${repointed.length} roles are`} re-pointed in at least one mode (${repointed.join(', ')}) — see Weight roles on the Semantics tab for the per-mode values. Availability itself does not vary by mode.`));
  return wsec;
};
