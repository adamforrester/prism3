/**
 * Prism3 Figma plugin — the COLLISION CHOICE (#1909, owner decision Q112 A): what an apply does with each collision the
 * pre-flight found, once the person has chosen.
 *
 * #1906 built the floor: an apply that would touch content Prism3 did not make is refused before any write, and every
 * collision is named (`preflight.ts`). Q112 A adds the choice on top of it. For each collision the person picks one of:
 *
 *   · SKIP — Prism3 leaves the item alone. It neither writes it nor binds anything to it: an alias, a gradient stop or a
 *     text style that would have pointed at a skipped variable keeps its literal value instead.
 *   · RENAME — Prism3 writes its own item under another name (`renamedOf`), beside the one already there, which is left
 *     alone. References inside the plan follow the new name.
 *
 * "Apply to all" is the panel's: it fills every row with one choice. **Refusal stays the default**: a collision with no
 * choice leaves the plans as they were, so `guardApply` refuses the apply exactly as before. **Nothing is remembered in
 * v1**: the choice rides one `apply-theme` message and is gone after it, so the next apply asks again.
 *
 * PURE: plans in, plans out, nothing read from the file. `runApplyTheme` re-runs the pre-flight over the plans this
 * returns, so a choice that does not clear its collision (a renamed name someone else already holds) is a collision
 * again. With a choice for it too, the plans are resolved again (Rename adds the suffix once more, Skip drops Prism3's
 * item); without one, the apply is refused there, before any write, and the refusal carries the choices already made
 * (`applied`), so the panel posts them back beside the new one and the person is never asked the first again
 * (the review of #3518, finding 1).
 *
 * Per kind:
 *   · COLLECTION — Rename gives every plan that writes it the new name (the color executor's two collections through
 *     `ColorNames`). Skip drops every row in it, then drops each reference to those rows; a skipped color collection is
 *     `null` in `ColorNames`, so the executor neither finds nor creates it.
 *   · VARIABLE (a type mismatch) — Rename renames its row in its own collection and every reference to it. Skip drops
 *     the row and each reference.
 *   References are every field a plan uses to name another variable: color and FLOAT alias targets, the wash's
 *   opacity, mixed-type `aliasByMode`, gradient stops, the glass blur's radius, and a text style's three bound fields.
 *   · STYLE (effect, paint, text) — Rename renames the style. Skip drops it. Grid styles never collide (Q234 A).
 *
 * BY NAME, ACROSS THE FILE: after a collection Rename, the text-style writer and the wash binder look a variable up by
 * name in every local collection (`getLocalVariablesAsync` into a `Map`), so where the person's collection holds a
 * variable of the same name as Prism3's, which one binds is whichever the host lists last. The shim lists Prism3's last;
 * real Figma's order is not checked (the review of #3518, note 3).
 *
 * NOT covered, stated: Prism3's later runs find their collections, variables and styles by name, as the apply does.
 * After a Rename, a component build or an update binds by the usual name, so it finds the item the person kept, not
 * the renamed one. The choice answers this apply alone, which is what Q112 A asks of v1.
 */
import type { WritePlan, FloatCollectionPlan, VarCollectionPlan, StylesPlan, GridStylePlan, TextStylePlan } from '@prism3/engine/write-plan';
import { COLOR_NAMES, type ColorNames, type Conflict } from './preflight';

export type CollisionChoice = 'skip' | 'rename';
/** One choice per collision, keyed by `conflictKey`. */
export type CollisionChoices = Readonly<Record<string, CollisionChoice>>;

/** The seven plans an apply writes, the shape `preflightPlanOf` reads. */
export type ApplyPlans = {
  color: WritePlan;
  float: FloatCollectionPlan[];
  font: VarCollectionPlan[];
  motion: VarCollectionPlan[];
  styles: StylesPlan;
  grid: GridStylePlan;
  text: TextStylePlan;
};

/** A choice map as it arrives over `postMessage`: an object of `skip` / `rename` strings, else not a choice at all. */
export const isChoices = (x: unknown): x is CollisionChoices =>
  !!x && typeof x === 'object' && !Array.isArray(x) && Object.values(x as Record<string, unknown>).every((v) => v === 'skip' || v === 'rename');

/** A collision's stable key: its kind, its collection for a variable, and its name. The panel posts choices back by it. */
export const conflictKey = (c: Pick<Conflict, 'kind' | 'name' | 'collection'>): string =>
  c.kind === 'variable' ? `variable:${c.collection ?? ''}:${c.name}` : `${c.kind}:${c.name}`;

/** The name a Rename writes under. DRAFT (#1909): the suffix is the owner's call, listed in the PR for approval. */
export const RENAME_SUFFIX = ' (Prism3)';
export const renamedOf = (name: string): string => `${name}${RENAME_SUFFIX}`;

/** What one resolved apply did with its collisions, for the result line. */
export type ChoiceTally = { skipped: number; renamed: number };

export type Resolution =
  | { ok: true; plans: ApplyPlans; names: ColorNames; tally: ChoiceTally }
  | { ok: false; unchosen: Conflict[] };

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

/**
 * Apply `choices` to `plans` for the collisions `conflicts` lists. Every collision needs a choice; one without leaves
 * the apply refused (`ok: false`, naming each one). A choice for a collision that is not in `conflicts` does nothing.
 * `from` is the color executor's two collection names the plans already carry: the defaults, or what an earlier pass
 * renamed them to (`runApplyTheme` resolves again when a renamed name is itself taken, the review of #3518).
 */
export const resolveCollisions = (plans: ApplyPlans, conflicts: readonly Conflict[], choices: CollisionChoices, from: ColorNames = COLOR_NAMES): Resolution => {
  const unchosen = conflicts.filter((c) => choices[conflictKey(c)] !== 'skip' && choices[conflictKey(c)] !== 'rename');
  if (unchosen.length) return { ok: false, unchosen };
  const p = clone(plans);
  const names: ColorNames = { ...from };
  const tally: ChoiceTally = { skipped: 0, renamed: 0 };
  /** Variable renames and skips, applied to every reference once the rows are settled. */
  const renamedVars = new Map<string, string>();
  const skippedVars = new Set<string>();

  // The rows each collection holds, by its planned name. `core` is three plans' rows; `color` is the color plan's.
  const rowsIn = (collection: string): { name: string }[][] => [
    ...(collection === from.core ? [p.color.palette] : []),
    ...(collection === from.color ? [p.color.color.create, p.color.color.aliases] : []),
    ...p.float.filter((c) => c.name === collection).flatMap((c) => [c.create, c.aliases]),
    ...[...p.font, ...p.motion].filter((c) => c.name === collection).map((c) => c.rows),
  ];
  const dropRows = (collection: string, keep: (name: string) => boolean): void => {
    if (collection === from.core) p.color.palette = p.color.palette.filter((r) => keep(r.name));
    if (collection === from.color) {
      p.color.color.create = p.color.color.create.filter((r) => keep(r.name));
      p.color.color.aliases = p.color.color.aliases.filter((r) => keep(r.name));
    }
    for (const c of p.float) if (c.name === collection) { c.create = c.create.filter((r) => keep(r.name)); c.aliases = c.aliases.filter((r) => keep(r.name)); }
    for (const c of [...p.font, ...p.motion]) if (c.name === collection) c.rows = c.rows.filter((r) => keep(r.name));
  };

  // VARIABLES first, by their planned collection, so a collection renamed below still finds its rows.
  for (const c of conflicts) {
    if (c.kind !== 'variable' || c.collection === undefined) continue;
    const choice = choices[conflictKey(c)];
    if (choice === 'skip') { dropRows(c.collection, (n) => n !== c.name); skippedVars.add(c.name); tally.skipped++; continue; }
    const to = renamedOf(c.name);
    for (const rows of rowsIn(c.collection)) for (const r of rows) if (r.name === c.name) r.name = to;
    renamedVars.set(c.name, to);
    tally.renamed++;
  }

  // STYLES.
  const styleLists: Record<string, { name: string }[]> = { 'effect style': p.styles.effects, 'paint style': p.styles.paints, 'text style': p.text };
  for (const c of conflicts) {
    const list = styleLists[c.kind];
    if (!list) continue;
    if (choices[conflictKey(c)] === 'skip') {
      if (c.kind === 'effect style') p.styles.effects = p.styles.effects.filter((r) => r.name !== c.name);
      if (c.kind === 'paint style') p.styles.paints = p.styles.paints.filter((r) => r.name !== c.name);
      if (c.kind === 'text style') p.text = p.text.filter((r) => r.name !== c.name);
      tally.skipped++;
    } else {
      for (const r of list) if (r.name === c.name) r.name = renamedOf(c.name);
      tally.renamed++;
    }
  }

  // COLLECTIONS last.
  for (const c of conflicts) {
    if (c.kind !== 'collection') continue;
    if (choices[conflictKey(c)] === 'skip') {
      for (const rows of rowsIn(c.name)) for (const r of rows) skippedVars.add(r.name);
      dropRows(c.name, () => false);
      p.float = p.float.filter((x) => x.name !== c.name);
      p.font = p.font.filter((x) => x.name !== c.name);
      p.motion = p.motion.filter((x) => x.name !== c.name);
      if (c.name === from.core) names.core = null;
      if (c.name === from.color) names.color = null;
      tally.skipped++;
    } else {
      const to = renamedOf(c.name);
      for (const x of [...p.float, ...p.font, ...p.motion]) if (x.name === c.name) x.name = to;
      if (c.name === from.core) names.core = to;
      if (c.name === from.color) names.color = to;
      tally.renamed++;
    }
  }

  // REFERENCES: every place a plan names another variable follows a rename, and lets go of a skip.
  const ref = (n: string | null): string | null => (n === null ? null : skippedVars.has(n) ? null : renamedVars.get(n) ?? n);
  for (const r of p.color.color.aliases) {
    // A TINTED WASH whose opacity is skipped lets go of its color too (#3556): the executor writes a plain alias for a
    // target with no opacity, so keeping the target bound the wash to the solid fill at 100% over the literal the
    // first pass wrote. Dropped, the mode keeps that literal, the fill at its opacity, as the header promises.
    const washSkipped = (i: number): boolean => { const o = r.opacityByMode?.[i]; return !!o && ref(o.name) === null; };
    r.targetsByMode = r.targetsByMode.map((t, i) => (washSkipped(i) ? null : ref(t)));
    if (r.opacityByMode) r.opacityByMode = r.opacityByMode.map((o) => (o && ref(o.name) !== null ? { ...o, name: ref(o.name)! } : null));
  }
  for (const c of p.float) for (const r of c.aliases) r.targetsByMode = r.targetsByMode.map(ref);
  for (const c of [...p.font, ...p.motion]) for (const r of c.rows) r.aliasByMode = r.aliasByMode.map(ref);
  for (const r of p.styles.paints) for (const st of r.stops) if (st.alias !== null) st.alias = ref(st.alias);
  // The glass blur names its radius variable (`write-styles.ts`): renamed, it follows; skipped, the literal radius stays.
  for (const r of p.styles.effects) r.effects = r.effects.map((e) => {
    if (!('boundVariables' in e)) return e;
    const to = ref(e.boundVariables.radius.name);
    if (to === null) { const { boundVariables: _drop, ...plain } = e; return plain as typeof e; }
    return { ...e, boundVariables: { ...e.boundVariables, radius: { ...e.boundVariables.radius, name: to } } };
  });
  for (const r of p.text) {
    r.fontFamilyVar = ref(r.fontFamilyVar) ?? '';
    r.fontSizeVar = ref(r.fontSizeVar) ?? '';
    r.fontStyleVar = ref(r.fontStyleVar) ?? '';
  }
  return { ok: true, plans: p, names, tally };
};

/** The result line for a resolved apply. DRAFT copy (#1909), listed in the PR for the owner. */
export const choiceNote = (t: ChoiceTally): string | null => {
  if (!t.skipped && !t.renamed) return null;
  const parts = [t.skipped ? `${t.skipped} skipped` : '', t.renamed ? `${t.renamed} renamed` : ''].filter(Boolean);
  return `${t.skipped + t.renamed} collision${t.skipped + t.renamed === 1 ? '' : 's'}: ${parts.join(', ')}`;
};
