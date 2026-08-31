/**
 * Prism3 engine — the authoritative Figma variable-collection order (#1190).
 *
 * The order collections appear in Figma's Variables panel is their CREATION order — Figma lists them
 * as they were made (`createVariableCollection`), and there is no post-creation reorder API. Until
 * #1190 that order was INCIDENTAL: the product of executor call order, plan-array literals, and a
 * hardcoded palette-before-color, with no priority concept and nothing protecting it. A change to any
 * of those three could silently move a collection, and `core`-first was accidental (it was first only
 * because `color` aliases target palette, a data dependency).
 *
 * This list makes the order INTENTIONAL. Its lens is *what a user is most likely to edit or view* —
 * brand face → structure → component detail → set-once — with `core` fixed at the top (it is also
 * required first for the palette→color alias dependency).
 *
 * ── THIS IS THE ORACLE, NOT THE WIRING (read before "simplifying") ────────────────────────────────
 *
 * No emission path reads this list to build its order. Each path (the plugin executor and the CLI
 * paste path) arranges its OWN creation sequence — hand-authored to match this list. `lint-collection-
 * order.ts` runs each path against a recording stub, observes the real `createVariableCollection`
 * sequence, and asserts it equals this list. That separation is deliberate: if this list DROVE the
 * wiring directly (a pre-pass iterating it), the gate would compare the list to itself — `docs/34`
 * shape 17, a tautology that a reorder of the list passes because both sides move together. Keeping
 * the wiring an independent, hand-authored expression is what lets the gate FAIL when a path drifts.
 * So: to change the order, edit this list AND each path's wiring; the gate refuses a half-change.
 *
 * Not collections (Figma Effect/Paint/Text Styles, not variable collections): `shadow`, `gradient`,
 * `text-styles`. `core` is ONE collection holding three name-slices (`core/palette`, `core/dimension`,
 * `core/font`) since #1097 — not three collections.
 */
export const COLLECTION_ORDER = [
  'core',         // 1 — fixed top; also required first (palette→color alias dependency)
  'color',        // 2 — the brand face
  'type-sets',    // 3 — typography
  'space',        // 4 — structure
  'layout',       // 5
  'radius',       // 6
  'size',         // 7
  'control',      // 8 — component detail
  'icon',         // 9
  'border-width', // 10
  'focus',        // 11
  'opacity',      // 12 — set-once
] as const;

export type CollectionName = (typeof COLLECTION_ORDER)[number];

const RANK = new Map<string, number>(COLLECTION_ORDER.map((n, i) => [n, i]));

/**
 * `COLLECTION_ORDER` filtered to the collections a brand actually writes (`present`), in panel order —
 * the ORACLE `lint-collection-order.ts` compares each path's observed creation order against.
 *
 * Throws on a name `COLLECTION_ORDER` does not know, and that throw is the point: a new collection must
 * be given a deliberate place in the list, not left to appear at the end incidentally — which is the
 * exact regression #1190 removes. A brand writing a subset (a collection it does not emit) is fine;
 * an UNKNOWN collection is not.
 */
export const expectedOrder = (present: Iterable<string>): string[] => {
  const set = new Set(present);
  for (const n of set)
    if (!RANK.has(n))
      throw new Error(`collection '${n}' is not in COLLECTION_ORDER — give it a deliberate place in the panel order (#1190), don't let it land at the end`);
  return COLLECTION_ORDER.filter((n) => set.has(n));
};
