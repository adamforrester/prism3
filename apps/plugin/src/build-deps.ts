/**
 * NESTED COMPONENTS BUILD FIRST (#1633) — the dependency pre-build `buildComponents` runs before the def
 * it was asked for.
 *
 * THE FAILURE IT REPLACES. The owner built `button` into a fresh Aurora file and got 72 misses, one per
 * member: `focusRing.nestTarget -> focus-ring (not in this file — build focus-ring FIRST …)`. The advice
 * was right and the plugin could follow it itself: every name a plan nests or swaps to is a def id the
 * catalogue already holds, so "build that one first" is a lookup, not a judgment.
 *
 * WHAT COUNTS AS A DEPENDENCY is read off the PROJECTED PLANS, not off `anatomy.parts[*].nests`: the plan
 * is what the executor resolves, so it is the one list that cannot disagree with the misses it would
 * report. Two node fields name another component:
 *
 *   · `nestTarget` — a def id (`focus-ring`, `checkbox-row`). The set a def builds is named by its id
 *     (`plan.component`), which is why the id IS the name the executor looks up.
 *   · `swapTarget` — a component NAME (`icon/FPO-default-icon`). An `emitAsComponents` def (#1012) builds
 *     one `<id>/<glyph>` component per glyph, so the prefix names the def.
 *
 * A name that maps to no def is left alone — it is the file's to supply (a hand-built component), and the
 * executor's own miss still reports it.
 *
 * PRESENT MEANS WHAT THE EXECUTOR'S LOOKUP SEES: a COMPONENT or a COMPONENT_SET under that exact name,
 * document-wide. A dependency that is present is never rebuilt and never descended into — its own nests
 * were resolved when it was built, and rebuilding an existing set would orphan the instances already
 * placed from it, which is the STALE guard's whole reason (`write-components.ts`). So only what is
 * MISSING is built, and a present-but-stale set keeps reporting STALE exactly as before.
 *
 * WHY A MODULE: `main.ts` calls `figma.showUI` at module scope and cannot be imported by a test (the
 * `brand-def.ts` precedent). Here the whole loop — resolve, order, build, re-check — is importable, and
 * `test-write-components.ts` drives it against the real executor and the host shim.
 */
import type { AnatomyPlan } from '@prism3/engine/anatomy-figma';
import type { ComponentDef } from '@prism3/engine/component-schema';

/** The one host call this module makes — the executor's own criteria search. */
export type DepHost = { root: { findAllWithCriteria(criteria: { types: string[] }): readonly { name?: string }[] } };

type PlanNode = { nestTarget?: string; swapTarget?: string; children?: readonly unknown[] };

/** Every component name the plans nest or swap to, deduplicated, in first-seen order. */
export const planTargets = (plans: readonly AnatomyPlan[]): string[] => {
  const out = new Set<string>();
  const walk = (n: PlanNode): void => {
    if (n.nestTarget) out.add(n.nestTarget);
    if (n.swapTarget) out.add(n.swapTarget);
    for (const c of (n.children ?? []) as PlanNode[]) walk(c);
  };
  for (const p of plans) walk(p.root as unknown as PlanNode);
  return [...out];
};

/** The def that builds `name`, or `undefined` for a name this catalogue does not produce. */
export const defForTarget = (name: string, defs: readonly ComponentDef[]): ComponentDef | undefined =>
  defs.find((d) => d.id === name || (!!d.figmaProperties?.emitAsComponents && name.startsWith(`${d.id}/`)));

/** A snapshot of every COMPONENT and COMPONENT_SET name in the file — one document-wide search. */
export const presentNames = (host: DepHost): Set<string> =>
  new Set(host.root.findAllWithCriteria({ types: ['COMPONENT', 'COMPONENT_SET'] }).map((n) => n.name ?? ''));

export type Dependency = { def: ComponentDef; targets: string[] };

/**
 * The MISSING dependencies of `root`, in build order: every dependency after everything it nests.
 * Recurses only into missing ones (see the header). Throws on a cycle, naming the path — the catalogue
 * should not have one, and building around it would loop or build a parent with misses.
 */
export const missingDependencies = (
  root: ComponentDef,
  ctx: { defs: readonly ComponentDef[]; project: (def: ComponentDef) => AnatomyPlan[]; present: (name: string) => boolean },
): Dependency[] => {
  const order: Dependency[] = [];
  const visit = (def: ComponentDef, path: string[]): void => {
    for (const target of planTargets(ctx.project(def))) {
      const dep = defForTarget(target, ctx.defs);
      if (!dep || dep.id === def.id || ctx.present(target)) continue;
      if (path.includes(dep.id)) throw new Error(`nested components form a cycle: ${[...path, dep.id].join(' → ')}`);
      const seen = order.find((o) => o.def.id === dep.id);
      if (seen) { if (!seen.targets.includes(target)) seen.targets.push(target); continue; }
      visit(dep, [...path, dep.id]);
      order.push({ def: dep, targets: [target] });
    }
  };
  visit(root, [root.id]);
  return order;
};

/** A dependency that did not build. `original` is the original throw, kept so the caller can still read the
 *  partial-write facts (#913) the executor attached to it. */
export class DependencyBuildError extends Error {
  constructor(readonly dependency: string, message: string, readonly original?: unknown) { super(message); }
}

/** What one dependency build reported, for the parent's summary. */
export type BuiltDependency = { id: string; misses: number };

/**
 * Build every missing dependency of `root`, in order, BEFORE `root` itself. Returns what it built.
 *
 * A dependency that throws, is refused by its own `notStandalone`, or builds without producing the name
 * its parent looks up stops here with a `DependencyBuildError` — the parent is not built with misses.
 * `build` is the caller's own one-def build (brand materialization and page placement included), so a
 * dependency lands exactly where and how it would had the designer built it by hand.
 */
export const prebuildDependencies = async (
  root: ComponentDef,
  ctx: {
    defs: readonly ComponentDef[];
    project: (def: ComponentDef) => AnatomyPlan[];
    host: DepHost;
    build: (def: ComponentDef) => Promise<{ misses: readonly string[]; skipped: number }>;
  },
): Promise<BuiltDependency[]> => {
  const before = presentNames(ctx.host);
  const deps = missingDependencies(root, { defs: ctx.defs, project: ctx.project, present: (n) => before.has(n) });
  const built: BuiltDependency[] = [];
  for (const { def, targets } of deps) {
    if (def.figmaProperties?.notStandalone)
      throw new DependencyBuildError(def.id, `${root.id} nests ${def.id}, which cannot be built on its own: ${def.figmaProperties.notStandalone}`);
    let r: { misses: readonly string[]; skipped: number };
    try { r = await ctx.build(def); } catch (e) {
      throw new DependencyBuildError(def.id, `${root.id} nests ${def.id}, and building ${def.id} failed: ${(e as Error)?.message ?? String(e)}`, e);
    }
    const now = presentNames(ctx.host);
    const absent = targets.filter((t) => !now.has(t));
    if (absent.length)
      throw new DependencyBuildError(def.id, `${root.id} nests ${def.id}, but building it did not add ${absent.join(', ')} to this file`);
    built.push({ id: def.id, misses: r.misses.length - r.skipped });
  }
  return built;
};

/** The summary clause naming what was built first — empty when nothing was. */
export const alsoBuiltNote = (built: readonly BuiltDependency[]): string =>
  built.length
    ? `. Also built: ${built.map((b) => (b.misses > 0 ? `${b.id} (${b.misses} misses)` : b.id)).join(', ')}`
    : '';
