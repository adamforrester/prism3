## (2026-10-18) — `packages/engine/package.json` no longer claims to track `ENGINE_VERSION` (#1019)

Owner decision on #1019 (triage Q319.2): delete the claim rather than keep it and add a gate. The `"//"` note said "Version tracks ENGINE_VERSION in version.ts" while `"version"` sat at `0.5.0`, 18+ minors behind, with nothing comparing the two.

- **What changed.** The note now says the field is inert: npm requires it, nothing reads it (`@prism3/engine` is consumed by workspace name, and the package has no build, #650), and `ENGINE_VERSION` is the only version that means anything. The `"version": "0.5.0"` value is left alone: it is not a claim once the note stops calling it one, and rewriting it would move the lockfile for no reader.
- **The gate.** `test.ts` reads the note off the file and fails `#1019 packages/engine/package.json claims its version tracks ENGINE_VERSION…` if a "tracks"/"version" pair comes back. The subject is the file's own prose and the pattern is authored here, so mutating either side fails it by name (checked: re-adding the old sentence fails exactly that assertion). It guards the claim, not the number, which is the point of choosing delete over sync.
- **Not touched.** `docs/inventory/surfaces.*` still list the drift; they are a snapshot by their own header. No `ENGINE_VERSION` bump: no committed artifact moves, so there is no engine change note.
