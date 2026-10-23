## (2026-10-23) — Style guide group frames are painted by role (#2953)

Owner QA found the Style guide's group frames drawn with `fills: []`, `strokes: []` and radius 0: white on a white
canvas, so the page read as one sheet. The owner's hand-styled reference has every group filled by
`color/foreground/primary`, stroked 1px inside by `color/border/secondary`, radius 2; the standalone Effect styles guide
is unstyled there. This supersedes the transparent group of Q7 A.

- **Where it runs.** Not only in `drawGroup`: in the per-run pass over every group Prism3 drew (the one that refreshes
  titles), partial runs included. That is what paints groups drawn before the fix, which the issue asked for so no
  manual update is needed next time. `drawGroup` itself still clears the host's default white fill.
- **The rule is "bare or nothing".** A group is painted only while it has no fill AND no stroke. Any paint at all is
  read as a designer's, so the master's hand styling survives every later run. It is both roles or neither: painting
  the stroke alone when the fill role is missing would read as a designer's paint to the next run, which would then
  never add the fill. A missing role is named in the run's misses instead.
- **Radius** is set only on a corner that is still 0, so a designer's radius on a bare group is kept. Whether it should
  bind a radius token is held as an owner question on the PR (recommended: keep the literal 2, as the reference has it).
- **Adopted hand-made groups** are not `isOurGroup`, so the pass never sees them.
- **Resolver reused:** the `byTail` role match that `doc-panel.ts`, `doc-block.ts`, `cover-frame.ts` and
  `furniture-templates.ts` each define locally, copied as a local helper again rather than shared, to keep this a
  one-concern change.

Tests: `test-style-guide.ts` §41, with the role names typed as literals. Mutations: dropping the `paintGroup` call fails
"41: a first run paints all 3 group frames" (and two more); dropping the bare check fails "41: a second run leaves a
designer's fill, a designer's stroke and its own paints byte-identical".
