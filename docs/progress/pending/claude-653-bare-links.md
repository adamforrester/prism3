## (2026-11-18) — `lint-layout-claims` checks bare Markdown links too (#653 A)

**What.** A fourth arm, D, in `packages/engine/lint-layout-claims.ts`. Arm A checked only link and code-span targets
that open with `./` or `../`, so a bare link such as `[x](apps/studio/)` outside a layout region was unchecked. That is
the shape #648 shipped (`[`web/`](web/)`). Arm D reads every `](…)` target in the documents arm A scans and resolves it
the way a renderer does: from the document's own directory, or from the repo root for a leading `/`. It resolves
against `git ls-files`, like the other arms. A dead target fails as `[ARM D]` with the file, line, link and resolved
path.

**Why links and not bare tokens.** The header's limit stays. Treating every bare path-shaped token in prose as a claim
gave 109 false positives, because prose writes root-relative paths. Link syntax has no such doubt: a renderer resolves
it one way. Measured when the arm landed: 112 bare links across 283 scanned documents, 0 dead. So nothing needed fixing
and nothing needed narrowing. The real run has a floor of 50 bare links, so an extractor that stops matching reads as
broken, not clean.

**Not claims.** A URL (any `scheme:`), a fragment-only `#anchor`, a placeholder, a link inside a fence, and link syntax
quoted in a code span. That last one is an example of a link. `./` and `../` targets stay arm A's. The target is
percent-decoded before it resolves, as a renderer does, so a correct `%20` link to a tracked path with a space passes.
Three forms are not read, a stated false-negative limit in the header: reference-style definitions (`[x]: path`), a
target with a title (`[x](path "t")`) and an angle-bracket target. None of the scanned documents uses any of them.

**Checked.**
- Before and after: a bare `[the dashboard](web/)` appended to `CONTRIBUTING.md`, with an untracked `web/` on disk. Main's
  gate is clean. This branch's gate fails as `[ARM D] … CONTRIBUTING.md:2071  web/  →  web`. The untracked `web/` is the
  false-pass path #653 warned about, so the tracked-files resolution is what catches it.
- Self-check, new fixture 6b: #648's exact row is flagged by path and line, and the live and non-claim forms pass.
- Mutations, each failing the self-check by name: resolving from the repo root instead of the document's directory
  ("arm D resolves a bare link from the repo root…"), and not stripping code spans ("arm D reads a non-claim as a bare
  link: web/").
- Review fix: before, a root-relative `%20` link to the tracked `reference/` directory with a space in its name failed as
  dead. After, it passes. The self-check gains a percent-encoded fixture. Dropping the decode fails it as "arm D flags a
  correct percent-encoded link (false positive)". Decoding without the `try` throws `URIError` on the malformed-escape
  fixture.

Gate only, so no `changes/` note.
