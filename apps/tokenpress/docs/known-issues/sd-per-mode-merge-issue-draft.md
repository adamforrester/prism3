# GitHub issue draft

> Paste the body below into `gh issue create --title "..." --body-file docs/known-issues/sd-per-mode-merge-issue-draft.md` (or strip this header first).

**Title suggestion:**
`Style Dictionary crashes when consuming per-mode export files via default glob source`

**Labels:** `bug`, `interop`, `style-dictionary`, `pre-existing`

---

## Bug

Style Dictionary's default file-glob source crashes with `RangeError: Maximum call stack size exceeded` when fed a multi-mode Token Press export.

## Reproduction

1. Export a multi-mode collection (e.g. typography with `desktop`/`mobile` modes) — get `typography.json` + `typography-desktop.json` + `typography-mobile.json`.
2. Default SD config: `{ "source": ["tokens/**/*.json"], ... }`.
3. Run `style-dictionary build` → crash inside `flattenProperties.js:29`.

## Why it happens

Per-mode files share the same DTCG path (e.g. `nbds.font.size.display.lg`) with different `$value`s. SD's default merge produces collisions and a cyclic resolution chain.

Confirmed by:
- Each individual file builds cleanly in isolation
- Both DTCG and SD-preset exports crash identically (so it's not dimension-format related)
- Curated baseline `npm run test:sd` (no per-mode files) builds cleanly

## Scope

- **Not a v1.7.0 regression.** Issue exists since `9281cfe` (per-mode CSS export feature).
- Affects: any Token Press user with multi-mode collections piping output into SD via glob source.
- Workarounds available (see full writeup in `docs/known-issues/SD-PER-MODE-MERGE.md`).

## Proposed fix

See `docs/known-issues/SD-PER-MODE-MERGE.md` § "Proposed fixes" — recommendation is approach #2 (mode-prefix root for per-mode files).

## References

- Full analysis: `docs/known-issues/SD-PER-MODE-MERGE.md`
- Originating commit: `9281cfe`
- Discovered during: v1.7.0 spec-compliance validation
