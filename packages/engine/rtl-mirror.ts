/** Prism3 engine — what a component does in right-to-left text, read from its parts' `mirror` fields (#3986).
 *
 *  PURE — no `node:*`, no I/O.
 *
 *  Owner decision Q-RTL1 A, after the knowledge base's position: Figma is not the authority on right-to-left, code
 *  proves it, and the contract documents it. The contract is each part's `mirror` field (`component-schema.ts`),
 *  filled from the def's right-to-left prose and held to it by the #3986 arm in `test.ts`. This module is the field's one
 *  reader for the docs: `rtlNote` is the short "In RTL" note the usage panel and the docs page show.
 *
 *  The note's wording is as drafted, owner-approved 2026-11-18 (#4030, #3986 part 3). Each sentence is one value, in the order the values
 *  are listed, naming the parts that carry it the way the anatomy names them (`partName`).
 */
import type { ComponentDef, Mirror } from './component-schema';
import { MIRRORS } from './component-schema';

/** Each part that declares a `mirror`, by value, in anatomy order. */
export const mirrorParts = (def: ComponentDef): Record<Mirror, string[]> => {
  const out = Object.fromEntries(MIRRORS.map((m) => [m, [] as string[]])) as Record<Mirror, string[]>;
  for (const [id, p] of Object.entries(def.anatomy?.parts ?? {})) if (p.mirror) out[p.mirror].push(id);
  return out;
};

/** A part id as words: `leadingVisual` → `leading visual`. The anatomy's own `partName` capitalizes; a note runs on. */
const words = (id: string): string => id.replace(/^_+/, '').replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase();

/** `a`, `a and b`, `a, b and c`. */
const list = (xs: string[]): string => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

/** `a`, `a or b`, `a, b or c`. */
const either = (xs: string[]): string => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} or ${xs[xs.length - 1]}`);

/** The parts as one subject: a glyph part (`chevronGlyph`) reads as its shape plus "glyph", pluralized together
 *  (`previousGlyph`, `nextGlyph` → "previous and next glyphs"), every other part as its words. */
const subject = (def: ComponentDef, ids: string[]): { text: string; plural: boolean } => {
  const glyphs = ids.filter((id) => def.anatomy?.parts[id]?.kind === 'vector');
  const rest = ids.filter((id) => !glyphs.includes(id));
  const g = glyphs.length ? `${list(glyphs.map((id) => words(id).replace(/ glyph$/, '')))} ${glyphs.length > 1 ? 'glyphs' : 'glyph'}` : '';
  // A lone part named for many (`items`, a code's cells) reads as plural.
  return { text: list([...rest.map(words), ...(g ? [g] : [])]), plural: ids.length > 1 || (glyphs.length === 0 && /s$/.test(ids[0] ?? '')) };
};

/**
 * The "In RTL" note for a def, from its own parts' `mirror` fields, or `undefined` when it declares none. Owner-approved wording.
 *
 *   reverses  → "The layout mirrors: the start edge is on the right."
 *   mirrors   → "The chevron glyph flips to point the other way."
 *   per-glyph → "An icon in the leading visual or trailing visual flips only if it points a direction, such as an arrow."
 *   never     → "The check and dash glyphs do not mirror."
 */
export const rtlNote = (def: ComponentDef): string | undefined => {
  const by = mirrorParts(def);
  const s: string[] = [];
  if (by.reverses.length) s.push('The layout mirrors: the start edge is on the right.');
  if (by.mirrors.length) {
    const x = subject(def, by.mirrors);
    s.push(`The ${x.text} ${x.plural ? 'flip' : 'flips'} to point the other way.`);
  }
  if (by['per-glyph'].length) {
    const ids = by['per-glyph'];
    s.push(def.id === 'icon' ? 'The glyph flips only if it points a direction, such as an arrow.'
      : ids.length === 1 && ids[0] === 'icon' ? 'The icon flips only if it points a direction, such as an arrow.'
        : `An icon in the ${either(ids.map(words))} flips only if it points a direction, such as an arrow.`);
  }
  if (by.never.length) {
    const x = subject(def, by.never);
    s.push(`The ${x.text} ${x.plural ? 'do' : 'does'} not mirror.`);
  }
  return s.length ? s.join(' ') : undefined;
};

/** `def` with `mirror` set on the named parts, for a def a factory builds (`makeTextField`) whose parts it cannot
 *  write inline. Throws on a part the def does not have, so a renamed part cannot drop its field unnoticed. */
export const withMirrors = (def: ComponentDef, mirrors: Record<string, Mirror>): ComponentDef => {
  const anatomy = def.anatomy;
  if (!anatomy) throw new Error(`withMirrors: ${def.id} has no anatomy`);
  const parts = { ...anatomy.parts };
  for (const [id, m] of Object.entries(mirrors)) {
    if (!parts[id]) throw new Error(`withMirrors: ${def.id} has no part '${id}'`);
    parts[id] = { ...parts[id], mirror: m } as typeof parts[string];
  }
  return { ...def, anatomy: { ...anatomy, parts } };
};
