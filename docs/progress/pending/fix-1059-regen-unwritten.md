## (2026-11-17) — `regen --check` sees a stopped emission in both artifact classes (#1059)

**What.** `regen.ts --check` ages every committed artifact's mtime to the epoch before it regenerates, then requires two
things the byte comparison could not see. Every committed artifact must have been written by some step; one that was not
fails as `stale … (committed; no regen step wrote it)`. In `out/` it joins the existing `removed` list, which until now
could never fire. And every step must have written at least one artifact, or it fails as `silent`. Each step's log line
now says how many files it wrote (`emit-figma (out/figma/**) … ok (117 written)`), not just that it exited 0. A plain
`regen` fails on a silent step too. The three uncommitted exports are held to the same rule, so an old copy left in a
developer's `out/` no longer hides a stopped `emit-component-docs`.

**Why the write, not a fresh directory.** The issue's own correction holds: the schema and engine emitters resolve their
paths from `here`, so there is no directory to redirect, and a fresh-directory tree compare repairs only `out/`. Deleting
the artifacts first fails differently: `icon-glyphs.ts` and `provider-logo-glyphs.ts` are modules that earlier steps
import. A per-step manifest that each emitter reports would be the emitter vouching for itself. The filesystem's record
of a write comes from neither the emitter's code nor the committed bytes. The snapshot already kept the real timestamps
(#2067), and the restore puts them back, so the aging leaves nothing behind.

**Measured.** Clean: 230 committed artifacts, every one written (233 writes, counting the three uncommitted exports).
`process.exit(0)` before `emit-levers.ts`'s write plus a no-op `emit-figma.ts` write loop together, the issue's
two-emitter case: both steps print `WROTE NOTHING` and fail as `silent`, `schema/lever-manifest.json` fails as `stale`,
and all 117 `out/figma/**` files fail as `stale`. Before, both passed as `✓ in sync`. A partial mutant (`emit-figma`
skips every `color*` file, which is also the rename case from the issue's comment) leaves the step `ok (101 written)` and
fails the 16 unwritten files by name, so the artifact arm fires without the step arm.

**Not in scope.** #1064, the prose gates deriving their promise lists from regen's lists, is a different hole: a name
taken off `ENGINE_ARTIFACTS` is no longer an artifact this check answers for. It stays open.
