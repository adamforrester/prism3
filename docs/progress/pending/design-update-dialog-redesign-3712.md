## (2026-11-12) — Update file dialog: three redesign directions for the owner's pick (#3712, Q-UD1 A)

This PR is a design exploration and changes no product code. `docs/superpowers/update-dialog-redesign/` holds:

- the audit of the Update file dialog as it stands (every state, string and control, and thirteen hierarchy, spacing
  and alignment problems, each with file:line);
- the Studio container language the owner asked it to match;
- three clickable, self-contained mocks: A Cards on gray, B Decisions first, C Folded step cards.

Each mock covers the owner's 2026-11-12 run (with and without the #3711 Q-UF2 library changes), a clean file, a fresh
file with To add, and the check in progress, in light and dark, with the owner's case also at 380. The PR recommends A
and waits on the owner's pick. Nothing is built into the dialog before it.

### What made the mocks honest

- **The chrome is the build's own.** `build.mjs` calls `buildChromeCss()` from `apps/studio/chrome/esbuild-plugin.mjs`,
  so the mocks carry the shipped `--p3-*` variables, both themes, the embedded faces and all of `chrome.css`, not a copy
  that can drift. A direction's own CSS is held to chrome tokens by the mockups' `scanRaw` and a defined-variable check.
  A raw hex added to a direction's CSS fails the build, naming the file and the value.
- **One indent fixes three of the audit's findings.** Today's sub-lines sit at space-400 (32px), but a tick's label
  text starts at 39px (hairline, the check's space-100 pad, box, gap, space-025). The mocks use one indent measured
  from the label, so every line under a ticked title starts where the title's text does.

### Trap for whoever builds the pick

- The owner's case is self-contradictory unless a choice changes: as opened, every kept set is on Keep, so nothing
  runs and the foot is disabled. The library changes appear only once Overwrite is chosen on a set whose update
  retires members. The mocks show both states. The building PR needs the same two cases in its test.
- `warn-icon` has no declared contrast pair on `levers-bg` (`chrome/spec.mjs`). A warning glyph straight on the gray
  body of A or C would need a new pair. The mocks keep every glyph inside a white card or a `fill-1` inset.
