/** The Type preview's Faces section (UI redesign S6.2): the face each text type uses in the previewed mode, with
 *  a specimen and whether the face is available, then the brand's typeface library with what uses each face.
 *  It folds the legacy Preview tab's Typefaces table and the read-only facts of the legacy library table, for
 *  one mode at a time (owner decision Q66). Its heading and description are the Faces lever section's (Q23).
 *  Read-only.
 *
 *  Stamps its root with the shared-section marker (`data-sg-section="faces"`, `kit.ts`'s header).
 *  WHAT IT IS HANDED. The section context, the resolved typography, the mode, the section's copy, and how a
 *  face's availability reads on this host (`faceStatus` in `ui/fonts.ts`, bound to the host's font list).
 *  Nothing here reads the session. */
import type { Theme } from '@prism3/engine/theme';
import type { FaceStatus } from '../../ui/fonts';
import { el, hook, palSection, specimen, subHead, tokenPillSpan, type SgCtx } from './kit';

/** The two tables' sub-headings: the levers' own names for the two controls (Q23). DRAFT, as the levers' are. */
export const FACES_BY_TYPE = 'Font family for each text type';
export const FACES_LIBRARY = 'Typeface library';

export const facesSection = (c: SgCtx, ty: Theme['typography'], mode: string, copy: { title: string; desc: string },
  status: (face: string) => FaceStatus): HTMLElement => {
  const sec = palSection(copy.title, copy.desc);
  sec.dataset.sgSection = 'faces';   // the shared-section marker (`kit.ts`'s header)
  const fams = ty.familiesByMode?.[mode] ?? ty.families;
  const table = (heads: readonly string[]): { box: HTMLElement; body: HTMLElement } => {
    const box = el('div', 'mtbl');
    const scroll = el('div', 'mtbl-scroll');
    const t = el('table', 'mtbl-tbl');
    const head = el('thead'), tr = el('tr');
    heads.forEach((x, i) => tr.append(el('th', i === 0 ? 'mtbl-stick' : i === heads.length - 1 ? 'mtbl-fill mtbl-spec' : 'mtbl-mode', x)));
    head.append(tr);
    const body = el('tbody');
    t.append(head, body); scroll.append(t); box.append(scroll);
    return { box, body };
  };
  const statusCell = (face: string): HTMLElement => {
    const st = status(face);
    const td = el('td', 'mtbl-mode');
    // #2103: the status is painted in the brand's own status text role for the mode on screen, as the specimen beside
    // it is painted in text.primary: `text.success` for a face that is there, `text.warning` for one that is not. The
    // engine gates both against the brand's page, which the studio's fixed --ok/--warn could not promise.
    const role = st.ok ? 'text.success' : 'text.warning';
    const stat = c.painted(specimen(el('span', `tf-stat ${st.ok ? 'ok' : 'no'}`, st.label)), role, 'color');
    stat.style.color = c.paint(c.cur, role);
    td.append(stat);
    td.title = st.title;
    return td;
  };

  // Each text type, its token, its face in this mode, whether the face is there, and a specimen in it.
  sec.append(subHead(FACES_BY_TYPE));
  const byType = table(['Token', 'Family', 'Availability', 'Specimen']);
  for (const f of fams) {
    const tr = hook(el('tr'), 'faces-type-row');
    tr.dataset.group = f.group;
    const tc = el('td', 'mtbl-stick');
    tc.append(tokenPillSpan(`font.family.${f.group}`));
    const face = f.stack[0] ?? '';
    const spec = el('td', 'mtbl-fill mtbl-spec');
    const samp = c.painted(specimen(el('span', 'mtbl-spec-t', 'The quick brown fox jumps')), 'text.primary', 'color');
    samp.style.color = c.paint(c.cur, 'text.primary');
    samp.style.fontFamily = f.stack.map((x) => (/^[a-z-]+$/.test(x) ? x : `"${x}"`)).join(', ');
    spec.append(samp);
    tr.append(tc, el('td', 'mtbl-mode', face), statusCell(face), spec);
    byType.body.append(tr);
  }
  sec.append(byType.box);

  // The library: every face, its token, what uses it in this mode, and whether it is there.
  sec.append(subHead(FACES_LIBRARY));
  const lib = table(['Token', 'Family', 'Availability', 'Used by']);
  for (const tf of ty.typefaces) {
    const tr = hook(el('tr'), 'faces-library-row');
    tr.dataset.slug = tf.slug;
    const tc = el('td', 'mtbl-stick');
    tc.append(tokenPillSpan(`font.typeface.${tf.slug}`));
    const used = fams.filter((f) => f.stack[0] === tf.name).map((f) => f.group);
    tr.append(tc, el('td', 'mtbl-mode', tf.name), statusCell(tf.name), el('td', 'mtbl-fill', used.length ? used.join(', ') : '—'));
    lib.body.append(tr);
  }
  sec.append(lib.box);
  return sec;
};
