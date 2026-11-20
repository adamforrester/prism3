## (2026-11-18) — A brand id can't write outside the CLI's output directory (#3875)

**What.** `emitTheme` wrote `resolve(outDir, `${theme.id}.tokens.json`)` and five sibling files, and the id was a bare
`string` in the schema with no check in the engine. `id: "../escaped"` put six files one level above `--out`; an id
holding a slash crashed inside `emitTheme` with a raw `ENOENT` stack trace (the call sat outside any `try`); an empty id
wrote `.tokens.json` and its siblings as hidden dotfiles. Treated as a security fix, in three layers:

- `brandTheme` refuses an id that is empty or blank, holds a slash, a backslash or a NUL, or is `.` or `..`. It is the
  choke point every entry path passes through (CLI, MCP, the studio, the plugin). The schema gains the matching
  `pattern` (`^(?!\.{1,2}$)(?=[\s\S]*\S)[^/\\\u0000]+$`), so a file-driven brief stops there first. Review of
  `12ce358d` found the first pattern (`^[^/\\]+$`) let `.`, `..`, a blank id and NUL through; the two layers now
  refuse the same ids.
- `emitTheme` resolves every file name it will write and refuses, before it writes anything, if one would land outside
  its directory. This holds whatever reaches it, including a theme that skipped `brandTheme`.
- The CLI reports a failed write through `fail()`, not as a stack trace.

**Not a slug rule.** The issue's fuller fix, the slug pattern `root` uses, could refuse ids hosts already store: the
studio's own download name only collapses whitespace in the id, so ids with spaces and capitals are expected. This
refuses only what makes an id unsafe as a file name; whether to go further is held for the owner on #3875. The MCP
`export_theme` was never affected: it writes fixed file names under a checked `outDir`. The wording is a draft.

**Measured.** `test.ts` #3875: on main's engine, all 9 arms fail (six ids built cleanly, the schema took `../escaped`,
`emitTheme` wrote four files above its directory, and the CLI printed a raw `EEXIST` stack trace). With the fix all
pass, and `Has Space` still builds. Mutations, each failing by name: the `brandTheme` check disabled fails the six id
arms; the `emitTheme` containment check disabled fails "#3875 emitTheme refuses an id that would write outside its
directory"; the CLI's `try` removed fails "#3875 the CLI reports a failed write through fail(), with no stack trace".
The schema/engine agreement arms (12 ids, both ways): on the first pattern 7 fail; with the fix all pass. Dropping the
`.`/`..` lookahead fails the `.` and `..` arms, dropping NUL fails the two NUL arms, and refusing any leading dot fails
the `...` and `.hidden` accept arms, each by name. Every committed artifact regenerates unchanged.
