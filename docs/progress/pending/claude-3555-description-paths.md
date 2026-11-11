## (2026-11-11) — Token descriptions write token names as code (#3555 Q-MD2)

Part of #3555 (the 2026-11-11 metadata audit), owner decision Q-MD2 A: backtick full token paths at the source, so the
copied `$description`s keep the sidecar schema's `prose` promise that every token name is backticked and resolves.

**Before.** Each brand's sidecar carried 178–180 `$description`s with bare token names ("Bold brand fill — clears 3:1 on
background.secondary", "`space.100` — …", "pair with text.link.* color"). They are copied from the tree (#1623 AI/A-22),
and the sidecar prose gate skipped `$description`. Fifteen per brand backticked a name that is not a path: `body.sm` and
`label.md`, for `type.body.sm` and `type.label.md`.

**The change.**
- `buildTree` ends with one pass over the finished tree: in every `$description` and every per-mode `description`, a
  dotted name that opens with a token family is wrapped in backticks, unless it already sits inside some.
- The five line-box and label-inset sources now write the full `type.*` path.
- One pass replaces about 60 sites in `modes.ts` and `tree.ts` that compose a description, and covers a site added later.
- Whether each quoted name resolves is not the pattern's job. The sidecar gate checks it against the emitted tree.

**Where it shows.** The DTCG trees (canonical, base and overlays) and the five sidecars. Figma descriptions are composed
separately (`figma-description.ts`), so a designer sees no backticks. A Style Dictionary build carries them into its
code comments, where they read as code.

### Gates

- The sidecar truth block's prose arm now reads `$description` with the other prose fields: capitals, each backticked
  path resolving, and no bare name. "CSS" joins its acronym list; the letter-spacing descriptions use it as the term
  it is.
- `lint-description-claims` reads a backticked partner ("4.5:1 on `background.secondary`") the same way as a bare one. A
  new self-check holds both forms. Without it, a lost backtick arm would fall back to the leaf's `against`, and pass
  wherever the two agree.
- Two test literals (`#2266`'s body.xs description, `#3086 G2`'s radio-dot line) now expect the quoted form.

Mutations, each failing by name:
- One `$description` unquoted in the committed sidecar → `sidecar paths: … unquoted background.secondary`.
- The backtick arm dropped from the claims grammar → `self-check: "… on \`background.secondary\`" reads partner none`.
