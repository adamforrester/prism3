## (2026-11-07) — `@prism3/css` ships the button, generated from the emission and held to it in a browser (#3408 S2)

**What changed.** A new workspace, `packages/css` (`@prism3/css`, Q87 A): the button as plain HTML and CSS, on
the code POC's integration branch `poc/arm-1`. Engine output doesn't move, so there is no change note.

- **`generate.ts` writes `button.css`** from `out/components/specs.json` and `component-defs.json` (Q96 A): 244
  rules in one cascade layer, `p3`, with `p3-` classes (Q97 A) and `--pds3-…` tokens (Q98 A). States come only from
  native and ARIA attributes. It also writes `demo.html`. Both are committed and `check:generated` fails a stale one.
- **The markup contract** is the package README: each visual prop is the `data-prop-*` mark the adherence scorer
  already reads, and every prop of the def has a row.
- **Four new gates** (CI, `verify.ts`, CONTRIBUTING §3, CLAUDE.md §4, the PR template): `check:generated`;
  `check:raw-values` (the scorer's own R2 and R1, imported); `check:parity` (564 bindings: `specs.json` against what
  Chromium computes, with a unique sentinel per token so each computed value decodes to one token name); and
  `test:browser` (the demo's computed values on light and dark against the DTCG-resolved tokens, focus-visible on
  keyboard only). Each carries mutants that must fail by name.
- **Filed from here:** #3506 (the emission has no radius, stroke width, focus-ring geometry or motion tokens, so the
  generator reads those from the TypeScript defs) and #3507 (the token CSS's `font` shorthand drops
  `textDecoration` and `letterSpacing`).

**The journal starts here.** `docs/poc/arm-1-journal.md` carries S0, S1 and S2: decisions, checks, surprises,
plan changes and effort, with the nine owner decisions S2 left open.

**A trap for whoever re-verifies this.** The parity check loads no real token CSS on purpose. Several tokens
resolve to the same color (the outline border, label and icon at rest), so a value comparison can't see a swap
between them; the sentinels can. And Chromium clamps `font-size` at 10000px, which is why the typography sentinels
sit below it.
