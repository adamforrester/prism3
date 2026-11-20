## (2026-11-17) — noUncheckedIndexedAccess, stage 4: anatomy-figma.ts and anatomy-readback.ts clean (#1182)

The fourth PR of the #1182 lane, and the first outside the engine tsconfig's own graph. It fixes the 96 errors the plugin and studio tsconfigs report in the component plan projector (`anatomy-figma.ts`, 77) and the host-truth readback (`anatomy-readback.ts`, 19). The flag stays off until every file each tsconfig reaches is clean.

### The constraint that shaped it: source shipped as text

Five functions in `anatomy-figma.ts` reach the executors as SOURCE: `nestVariantMatch`, `resolveNestMember`, `applyNestOverrides`, `applyNestItemPrefers` and `nestVariantMissAdvice`, shipped through their `…Src` exports. They must close over nothing in the module, so the file's new `must` helper cannot appear in them, and any runtime change would change the payload. Four of them index something (`nestVariantMissAdvice` does not), and each index is read past a length check (`hits.length === 1`, `!named.length`, `keys.length !== 1`, `it.length !== 1`), so they take a type-only `!`. esbuild erases it, and a scratch dump of every `…Src` export is byte-identical to the merge base. The reason is written above each function, outside the body.

### Everything else

- `planSetLayout` folds its `!plans.length` guard into `const plan0 = plans[0]; if (!plan0) throw`, so `plans[0]` reads become `plan0` with the same error.
- The member-name parse keeps its old reading of a pair with no `=` (`undefined`, outside every domain), now with that type spelled out.
- Exclusion matching and property lookups iterate `Object.entries`.
- `settleChunks` and the rest use a local `must` that throws a named error where a bare `TypeError` used to fall.

### Proof, and a trap for whoever re-runs it

`regen --check` is in sync. Against the branch's merge base, the plan diff (3,038 digests), every def object (62) and the five shipped sources are identical. The trap: a plan diff against an OLDER `main` showed `spinner` moving. That was `main` changing `spinner.ts` in between, not this PR. Diff against `git merge-base HEAD origin/main`, never against a snapshot taken earlier in the session.

### Held from here

#3893's clean list can't hold these two files, because `packages/engine/tsconfig.json` doesn't read them. So `typecheck-components.ts` gains a second list, `NUIA_CLEAN_BY_TSCONFIG`, run through `apps/plugin/tsconfig.main.json`, which does read them. It lists `anatomy-figma.ts` and `anatomy-readback.ts`. Each tsconfig is its own run, with the engine list's guards (the flag on, no unplaced diagnostic, every listed file read) plus `noEmit` on. Measured: one `must` removed from `anatomy-figma.ts` passes the gate without the entry and fails it by name with the entry.
