/** The Type preview's Weights and styles section (UI redesign S6.3; #362, S6.1 lifted it out of the legacy Preview
 *  tab's `renderTypePreview` as "Weight roles by face"). Each weight at the number it resolves to in the previewed
 *  mode, and whether each font family the text types use in that mode ships that weight, with an "Ag 123"
 *  specimen per family; then which italic and link styles each text type ships. Availability is advisory.
 *  Read-only. Its heading and description are the Weights and styles lever section's (owner decision Q23).
 *
 *  ONE MODE AT A TIME (owner decision Q66). S6.3 replaced the legacy mode-blind table (owner, 2026-08-01: the base
 *  numbers, with a note naming the weights a mode re-points and the Semantics tab, #2010) with the previewed
 *  mode's numbers and families: switching the mode shows another mode's.
 *  Fixed-width family columns, not `mtbl-fill`: one fill column per family grew the table past its container.
 *
 *  Stamps its root with the shared-section marker (`data-sg-section="weights-by-face"`, `kit.ts`'s header).
 *  WHAT IT IS HANDED. The resolved typography, the mode and the section's copy. Nothing here reads the session. */
import type { Theme } from '@prism3/engine/theme';
import { knownWeightsOf, WEIGHT_NAME } from '../../ui/fonts';
import { TYPE_GROUP_ORDER } from '../../state/type-input';
import { el, hook, palSection, subHead } from './kit';

/** The italic chips' words (owner decision Q6, APPROVED), as the levers name them. */
const ITALIC_WORD = { upright: 'Upright', both: 'Upright + italic', only: 'Italic only' } as const;

export const weightsByFaceSection = (ty: Theme['typography'], mode: string, copy: { title: string; desc: string }): HTMLElement => {
  const wsec = palSection(copy.title, copy.desc);
  wsec.dataset.sgSection = 'weights-by-face';   // the shared-section marker (`kit.ts`'s header)
  const faces: Array<{ name: string; stack: string; roles: string[] }> = [];
  const addFace = (stackArr: string[] | undefined, cat: string): void => {
    if (!stackArr?.length) return;
    const name = stackArr[0].replace(/["']/g, '').trim();
    const found = faces.find((f) => f.name.toLowerCase() === name.toLowerCase());
    if (found) { if (!found.roles.includes(cat)) found.roles.push(cat); return; }
    faces.push({ name, stack: stackArr.join(', '), roles: [cat] });
  };
  for (const f of ty.familiesByMode?.[mode] ?? ty.families) addFace(f.stack, f.group);
  const roles = ty.weightRolesByMode?.[mode] ?? ty.weightRoles;

  const wtbl = el('div', 'mtbl');
  const wscroll = el('div', 'mtbl-scroll');
  const wt = el('table', 'mtbl-tbl');
  const whead = el('thead'), whtr = el('tr');
  wsec.append(subHead('Weights'));
  whtr.append(el('th', 'mtbl-stick', 'Name'), el('th', 'mtbl-mode', 'Weight'));
  for (const f of faces) {
    const th = el('th', 'mtbl-mode');
    th.append(document.createTextNode(f.name));
    th.title = `${f.name} — used by ${f.roles.join(', ')}\n${f.stack}`;
    whtr.append(th);
  }
  whtr.append(el('th', 'mtbl-fill'));
  whead.append(whtr); wt.append(whead);
  const wb = el('tbody');
  for (const w of roles) {
    const tr = hook(el('tr'), 'weights-preview-row');
    tr.dataset.role = w.role;
    const nc = el('td', 'mtbl-stick');
    nc.append(el('span', 'mtbl-name mono', w.role));
    tr.append(nc);
    tr.append(hook(el('td', 'mtbl-mode', `${w.value} ${WEIGHT_NAME[w.value] ?? ''}`.trim()), 'weights-preview-value'));
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
  // The key's ● and ○ each get a span, so the chrome can draw them in its own face (#1993); the words are one string.
  const key = el('p', 'sl-note');
  for (const part of '● ships it · ○ may not (falls back to the nearest) · ? unknown family, not flagged. A specimen that looks identical to the row above it is the fallback showing — that is what ○ predicts.'.split(/([●○])/)) {
    if (part) key.append(part === '●' || part === '○' ? el('span', 'tpw-key', part) : document.createTextNode(part));
  }
  wsec.append(key);
  // Which italic and link styles each text type ships, in the italic chips' words.
  wsec.append(subHead('Italic and link styles'));
  const stbl = el('div', 'mtbl');
  const sscroll = el('div', 'mtbl-scroll');
  const st = el('table', 'mtbl-tbl');
  const shead = el('thead'), shtr = el('tr');
  shtr.append(el('th', 'mtbl-stick', 'Text type'), el('th', 'mtbl-mode', 'Italic'), el('th', 'mtbl-mode', 'Link'), el('th', 'mtbl-fill'));
  shead.append(shtr); st.append(shead);
  const sb = el('tbody');
  for (const g of TYPE_GROUP_ORDER) {
    const comps = ty.composites.filter((c) => c.group === g);
    if (!comps.length) continue;
    const it = comps.some((c) => c.italicDefault) ? 'only' : comps.some((c) => c.italic) ? 'both' : 'upright';
    const tr = hook(el('tr'), 'styles-preview-row');
    tr.dataset.group = g;
    const nc = el('td', 'mtbl-stick');
    nc.append(el('span', 'mtbl-name mono', g));
    tr.append(nc, hook(el('td', 'mtbl-mode', ITALIC_WORD[it]), 'styles-preview-italic'), hook(el('td', 'mtbl-mode', comps.some((c) => c.link) ? 'Yes' : 'No'), 'styles-preview-link'), el('td', 'mtbl-fill'));
    sb.append(tr);
  }
  st.append(sb); sscroll.append(st); stbl.append(sscroll); wsec.append(stbl);
  return wsec;
};
