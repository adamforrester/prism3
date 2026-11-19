## (2026-11-18) — Apply Theme's summary names the styles it renamed in place (#1040 A)

**What.** #3596 built the style rename record: when the engine renames a text, effect or gradient style, the plugin
renames the existing style in place before the writer runs, so its layers and library consumers follow it. The pass
returned what it renamed as data (`styleRenames` on Apply Theme's result) and printed nothing. The owner decided (A,
2026-11-18) that a renamed style gets one line in the apply summary, in the style of the existing lines. This adds
`styleRenamedNote` in `apps/plugin/src/rename-styles.ts`, which `main.ts` adds to `renameNotes` beside the variable rename
line it mirrors:

- `N renamed styles migrated in place (layers kept: from→to, from→to, from→to…)`
- singular for one, capped at three pairs like every other clause, and empty when nothing was applied.

**OWNER DECISION — the wording is DRAFT.** Recommended as written, because it uses the same words as the variable line
directly above it ("renamed tokens migrated in place (bindings kept: …)"). A designer who has read one line can read the
other. "Layers kept" replaces "bindings kept", because layers use a style and do not bind it. Alternatives, if the owner
prefers: "N styles renamed in place (layers kept: …)", which is shorter but no longer mirrors the variable line.

**What prints nothing, on purpose.** Only applied renames count. A rename refused as `target-exists` and a client's style
a rule would move (`notOurs`) are still in the data and print no line. The decision covers a renamed style. Whether a
refused one deserves a warning line is a separate question, not built here. The register (`STYLE_RENAMES`) ships empty,
so no real apply prints the line until the first style rule exists. The paste step's report already carried `renamed`
and is unchanged.

**Checked.** `apps/plugin/test-style-renames.ts`: the Apply Theme arm's summary line counts its three applied renames and
not the client's style. Literal arms cover none, refused-only, singular, and the cap. A source arm checks that `main.ts`
passes `styleRenames` into `renameNotes`. Before this change the suite cannot import `styleRenamedNote`. Mutations, each
failing by name: drop the call from `main.ts` ("#1040 summary: the Apply Theme summary includes the style rename line"),
and count unapplied outcomes ("#1040 Apply Theme: the summary line counts the applied renames only", plus two literal
arms). The executor is untouched, so `EXECUTOR_REVISION` stays.

**Guide citations.** The three lines added to `main.ts` move 12 line citations in five guides under `docs/public/guides/`
by +3. `lint-guide-claims.ts` named each one and where its block now sits. Only the line numbers changed: each fingerprint
still matches, and each quoted string is still in its cited line.
