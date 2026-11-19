## (2026-11-19) — noUncheckedIndexedAccess, stage 6: on in the engine tsconfig, and the studio's first batch (#1182)

The sixth PR of the #1182 lane (owner decision A: the issue closes when the flag is on in the engine and studio tsconfigs).

### The engine tsconfig

`packages/engine/tsconfig.json` had one error left, in `rtl-mirror.ts`, which merged after stage 3 cleaned the rest of its graph. `/s$/.test(ids[0])` became `/s$/.test(ids[0] ?? '')`: `RegExp.test` reads `undefined` as the string `"undefined"`, which doesn't end in `s` either, so the result is the same. With that, the flag is on in the tsconfig, and `typecheck-components.ts`'s main run holds every file of that graph.

The engine's clean list (`NUIA_CLEAN`) and its second tsc run are deleted, as the list's header said the flag stage would do. One assertion replaces its memory: tsc's own resolved view of the tsconfig (`--showConfig`) must have `noUncheckedIndexedAccess: true`, read the way `noEmit` already is. Without it, deleting the line from the tsconfig would pass every gate.

### The studio, first batch

The studio tsconfig reported 352 errors in 78 files. This stage cleans the 22 studio files with one or two errors each (37 errors) and leaves 289. The flag stays off in the studio tsconfig. The 22 files and the new `apps/studio/src/must.ts` are listed under `apps/studio/tsconfig.json` in `NUIA_CLEAN_BY_TSCONFIG`, so they're held clean from this merge.

- **`must`** (`apps/studio/src/must.ts`) is the engine's guard: the value, or a throw that names what was missing. It's used only where the read is an invariant, such as a constant list's first entry, a table built over the same list, or a regex group that always captures. In each case the old code would have thrown a bare TypeError a line later, or carried the `undefined` on.
- **No guard where the type can say it.** `SG_SURFACES` is typed as a non-empty tuple, so `SG_SURFACES[0]` is a `SgSurface`. Button options' `WRITES` is keyed by the `BUTTON_OPTION_KEYS` union, so `WRITES[key]` is defined for every key a chip carries, and the spelling `test-shell-imports.ts` pins is kept. Both are type changes with no runtime change.
- **Equivalent rewrites.** `w[0]` on a non-empty string became `w.charAt(0)`. `Object.keys(m).find((k) => m[k]…)` became `Object.entries(m).find(…)?.[0]`, which visits the same keys in the same order. `build-identity.ts` is import-free by its own header, so its two regex groups are read through `m?.[1] !== undefined` there, not through `must`.

### Proof

Three mutations, each committed against first: deleting the flag from the engine tsconfig fails `typecheck-components.ts` by name ("does not resolve to noUncheckedIndexedAccess: true"). Putting back `ids[0]` in `rtl-mirror.ts` fails its main run with the TS2345 by line. Putting back `w[0]` in `shell/activity.ts` fails the studio clean-list run by line (TS2532).

The new import lines move code the public guides cite by line, so 32 citations in seven guides are re-pointed. Each old line is mapped through this diff's hunks to its new line, and nothing a citation quotes changed, so `lint-guide-claims.ts` matches every fingerprint again.
