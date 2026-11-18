---
engine: minor
---
A brand id can no longer write outside the CLI's output directory (#3875, a security fix). The id names every file the CLI writes, and nothing checked it: `id: "../escaped"` wrote six files one level above `--out`, an id holding a slash crashed mid-write with a raw stack trace, and an empty id wrote hidden dotfiles. `brandTheme` now refuses an id that is empty or blank, holds a slash, backslash or NUL, or is `.` or `..`, and the schema refuses the same ids. `emitTheme` refuses to write any file outside its directory, checked before anything is written. The CLI reports a failed write as a readable error. An id that is a safe file name but not a slug still builds. Every committed brand's emission is unchanged.
