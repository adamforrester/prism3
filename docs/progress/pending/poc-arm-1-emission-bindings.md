## (2026-11-17) — `@prism3/css` reads the component emission's bindings, not the engine's defs (#3408, Q142 A)

**What changed.** On the code POC's integration branch `poc/arm-1`, `main` was merged in, bringing #3839, the emission
that carries corners, strokes, focus rings and motion. `@prism3/css`'s generators now read those four from
`specs.json` and stop importing the engine's TypeScript defs. Engine output doesn't move, so there is no change note.

- **Byte-identical CSS.** All five stylesheets and the demo match the pre-merge output, because no binding changed value.
- **The fields' redlines collapse by state.** #3839 grew their row key by `state`, where the stroke moves at focus.
- **A two-fact residual, `packages/css/residual.ts`:** Button's hit-target floors and the pending spinner's
  replacement rule, which the emission doesn't carry yet (#3917). `generate.ts --check` fails if any other script in
  the package imports the engine. This residual is an owner decision, recorded in `docs/poc/arm-1-journal.md`
  ("Refresh 3").
- **The guard resolves paths.** `generate.ts --check` resolves every import, export-from, dynamic import and
  `require` specifier and fails on any that lands in `packages/engine/` outside `out/`, however it is spelled.
