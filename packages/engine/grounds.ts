/**
 * Prism3 engine — THE GATE'S DEFINITION OF A GROUND, in a module that can be imported (#988).
 *
 * ── WHY THIS FILE EXISTS AT ALL ─────────────────────────────────────────────────────────────────
 *
 * `groundsOf` lived in `lint-ratio-truth.ts`, which is a SCRIPT: it runs its whole sweep at module
 * scope and calls `process.exit(1)` on failure. Importing anything from it therefore ran a
 * 34,128-ratio sweep, and — the part that motivated the extraction — a failing sweep exited the
 * process **during the import**, so the importer died before running any of its own assertions. The
 * output a reader saw was the gate's banner where the test's should have been: a crash that names no
 * gate, #984's post-mortem shape reached from a new direction.
 *
 * The rule that comes with the split, and it generalises past this one function:
 *
 *     **A gate script and a library are different things, and a file can only be one of them.**
 *
 * Anything another module needs to import belongs on the library side. `modes.ts` was already there,
 * which is the only reason #987 could hold the engine's half of the ground definition at all.
 *
 * ── WHY IT IS NOT MERGED WITH `engineGrounds` ───────────────────────────────────────────────────
 *
 * `modes.ts` has its own `engineGrounds`, and these two must NOT be collapsed into one. They answer
 * the same question for different consumers — the engine's decides what the override layer REFUSES,
 * this one decides what the gate SWEEPS — and #985 forked them for two releases without anyone
 * noticing. Making one call the other would end the divergence by ending the second opinion, which
 * is `docs/34` shape 1 arriving through a refactor rather than through a bad gate.
 *
 * So they stay separate and `test.ts` (a5) asserts they AGREE, both directions. That assertion is
 * what this extraction unblocks: it needs both definitions importable, and until now one of them was
 * welded to a script that would exit the process on its way in.
 *
 * PURE — no `node:*`, no I/O, no top-level work beyond defining a function.
 */
import { brandTheme } from './theme';
import { resolveAllModes } from './modes';

/**
 * Every role some other role is measured against or through, read off a default build (#964).
 *
 * A ground is not only what `against` names. Since #963 a translucent wash names a second role in
 * `legibleFor` — the ink whose legibility its `ratio` reports — and moving THAT desynchronises the
 * wash exactly as moving the ground does. Both edges count, and forgetting the second is how the
 * count in #964's own table came out one short: `text.on-inverse.primary` only became reachable as a
 * ground when #962 repaired the nine `against` strings that had been dangling since #892.
 *
 * ROLE-VALUED ONLY — `ref in roles` filters out the palette-step grounds (`neutral.050`) that some
 * roles are legitimately measured against. `engineGrounds` does NOT filter them, because the refusal
 * it feeds only ever asks about role keys anyway. Any comparison of the two sets has to intersect
 * with the role keys first or it fails on a difference that is not a fork.
 */
export const groundsOf = (theme: ReturnType<typeof brandTheme>): string[] => {
  const light = resolveAllModes(theme).find((m) => m.mode === 'light');
  if (!light) return [];
  const roles = light.roles as Record<string, { against?: string; legibleFor?: string }>;
  const g = new Set<string>();
  for (const r of Object.values(roles)) {
    for (const ref of [r.against, r.legibleFor])
      if (ref && ref !== 'self' && ref in roles) g.add(ref);
  }
  return [...g].sort();
};
