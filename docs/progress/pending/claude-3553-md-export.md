## (2026-11-11) — Export's switcher wraps, and its captions align (#3553 M8, M9, batch M-D)

The UI polish review (#3553) found two defects on the Export page.

**M8.** At the plugin's 380 the artifact switcher ("Design tokens | Brand brief | Component specs") was wider than its
column, and "Component specs" ran past the panel's edge (its tab to x=401 in a 368px row). The option rows below it
already wrapped (`.p3-export-oseg { flex-wrap: wrap }`). The switcher now shares that rule, so it draws two tabs and
then one, all inside the column. The orphaned third tab is the shape owner questions Q-UI2 (segmented controls wrapping
to an orphan) and Q-UI11 (one switcher style for Documentation and Export) ask about. This fix removes the overflow and
pre-empts neither answer.

**M9.** Export draws its captions ("You get 4 files", "A few tokens, shaped by these settings", "Import") and its
Import action ("↑ Brand brief…") with the menu's classes. They kept the menu's inner padding (space-150) and sat 12px to
the right of the files, the code and the notes they label: x=707 against 695 at 1280, and x=96 against 84 for Import.
Inside Export, a caption now has no inline padding. The action keeps its own padding and hover fill, and a negative
margin of the same size moves it out, so its label starts at the column's edge.

**Verified.** New test:chrome section `3553-md`, in shard 3. It runs on the plugin at 380 and 1280 and on the web at 1280,
in both themes. It holds that every artifact tab lies inside its column, and that "You get 4 files", "Import" and the
Import action each start where the content they label starts (±0.5px). Mutations, each after a `wip:` commit: the
switcher dropped from the wrap rule fails `#3553 M8 … every artifact tab lies inside its column` at 380. The captions'
padding rule dropped fails `"You get 4 files" starts at the files' edge` and `"Import" starts at its note's edge`. The
action's margin dropped fails `"↑ Brand brief…" starts at its note's edge`.
