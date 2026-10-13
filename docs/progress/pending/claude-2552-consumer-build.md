## (2026-10-12) — The base + overlay files are the clean consumer set (#2552, owner decision Q250 A)

**What changed.** The conforming projection (`<brand>.base.tokens.json` plus one
`<brand>.<mode>.overlay.tokens.json` per mode) now carries no `$extensions` anywhere: a token holds
`$value`, `$type` and `$description`, and the base no longer carries the generator stamp or the
`decisions` log. `buildOverlaySet(tree)` strips by default and `buildOverlaySet(tree, { metadata: true })`
keeps everything. Studio's and the plugin's "Design tokens" export now downloads this set, one file per
mode, byte-identical to the committed files; "Include build metadata" (internal, off by default, DRAFT
wording) puts the metadata back. The single-file `<brand>.tokens.json` keeps every extension and is no
longer offered by any export. ENGINE minor (change note), CONTRACT unchanged.

**The approach, and the one tried first.** The first cut emitted a separate `out/consumer/` copy beside
the projection. The owner preferred cleaning the projection itself, provided nothing internal read its
`$extensions`. The answer was measured, not reasoned: strip the projection, run the full `verify`, and
read what fails. Four readers did, and each moved to the canonical tree:
- the chrome `[glyphs]` build check read decision notes from the base (`NOTE_TREES`): the full tree only now;
- `lint-description-claims.ts` read each projected leaf's recorded contrast partner: it reads the partner
  from the canonical tree for the same path and mode, and still checks the projection's own prose and value;
- `lint-tool-neutral-prose.ts` promised `decisions[]` in the base: promised in the full tree only;
- `lint-overlay-provenance.ts` (#1257) read provenance from the committed overlays, which no longer carry
  any. Provenance still ships in one place, the internal metadata export, so the gate now builds that
  overlay with `buildOverlay` from the committed canonical tree (the projector is the subject, so it is
  ACTUAL), and EXPECTED stays the canonical tree's own mode entry.
Nothing at runtime in Studio, the plugin, `packages/tokens` or `tools/` read them. The proving config in
`packages/tokens` is untouched: it reads the same files with the same stock config, and still passes.

**Proofs.** All 20 files are byte-identical to `origin/main`'s projection with `$extensions` removed,
checked once by a separate script with its own strip. The durable check is `lint-consumer-build.ts`:
EXTENSIONS, EXTRA-KEY and TOOL-NAME over every key and string, ALIAS against the base, SCOPE from the
canonical trees, and EQUALS, which re-derives each file from the committed canonical tree with a
derivation typed in the gate (DTCG type filter, per-mode value or description change, key order) and
never calls the projector. `test-export-settings.ts` and `test:export-parity` hold the export default in
both hosts against the committed files; `test-smoke.mjs`'s edit-reaches-export checks now read the
overlay for a non-default mode.

**Traps for whoever re-verifies this.**
- A Playwright mismatch in a cloud container (pinned build 1234, installed 1194) can be bridged by a
  scratch `PLAYWRIGHT_BROWSERS_PATH` whose `chromium_headless_shell-1234/chrome-headless-shell-linux64/`
  symlinks the installed headless shell. Under that older browser `lint:live-css` reports
  `font-language-override` lost on seven rules. That comes from the browser, not this change: no
  stylesheet moved.
- The MCP `export_theme` tool still writes the single-file tree as `tokens.json` for an agent. That is
  an agent path, not a client handoff, and it is filed as #2553 rather than widened into this PR.
