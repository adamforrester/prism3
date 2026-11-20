## (2026-11-19) — The CLI names every file it writes and every contract that fails (#4153, #4170)

Two gaps in what `cli.ts` tells its reader, grouped because both are the CLI reporting less than it knows.

- **#4153.** The CLI printed `[written]` for `<id>.tokens.json` and `<id>.ai.json` only. `emitTheme` also writes
  `<id>.base.tokens.json` and one `<id>.<mode>.overlay.tokens.json` per mode beyond the base, which is the set
  `skills/prism3-build-ui` rule 3 sends a multi-mode build to. The names come from `overlayModes` on the emitted
  tree, the same call the emitter makes, and `--help` names the pattern.
- **#4170.** A failed contract printed only a count, so the theme skill's fix loop had nothing to key on. Each
  failure is now listed: mode, role, ratio, ground and floor, capped at ten lines and then `… and N more`. The list
  covers the same three kinds `tree.ts` counts into `modeChecks`: a role against its ground, a tier check, and an
  `alsoAgainst` pair. Without all three, a listing could account for fewer failures than the count under it.
  Whether to skip writing the files on failure is left out, as the issue asks. Wording is DRAFT.

**Tests:** `test.ts` arms at the end of the #3875 CLI block. The `#4153` arm reads the output directory as its
oracle, never the CLI's own list. The `#4170` arm runs the issue's brief and requires the listed lines plus
"N more" to equal the printed count. All 3 fail on `main` and pass here. A mutation (two names only, an empty
listing, the old help line) fails all 3 by name.
