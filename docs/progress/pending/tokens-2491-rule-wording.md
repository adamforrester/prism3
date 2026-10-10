## (2026-10-10) — Style Dictionary platform gate: the plain-data rule's line says what it checks (#2491 follow-up)

**Status:** test wording only (`packages/tokens/check-platforms.mjs`). No engine change, no artifact moves, no ENGINE
bump, CONTRACT unchanged.

The `[RULE]` line #2491 added said "so no option is a function". The check is wider than that. It compares the config
with its own JSON round trip, which drops a function and an `undefined` and turns a RegExp into `{}`. So it also
fails a RegExp-valued option and an option set to `undefined`. That was found in #2491's review, where a RegExp
mutation failed the line that names only functions. The line and the header now read "no option is code or a non-JSON
value".

Mutations, each from a `wip:` commit, restored with `git checkout --`, each the only failure, exit 1:
- a RegExp option on the Compose file entry (`match: /x/`):
  `✗ [RULE] the platform config is plain data — it survives a JSON round trip unchanged, so no option is code or a non-JSON value`;
- a `fileHeader: () => []` function on the SCSS file options: the same line.
