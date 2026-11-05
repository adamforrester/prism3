## (2026-11-04) — A gate for contract tokens nothing reads: lint-token-consumers (#3409)

**Status:** a new engine gate, wired into `verify.ts`, `ci.yml`, `CONTRIBUTING.md` §3, `CLAUDE.md` and the PR template.
Owner decision Q33 A. No engine behavior moves and no artifact changes, so no change note is owed; the contract and
`EXECUTOR_REVISION` are untouched.

### What it checks

Every path in `schema/token-contract.json`'s `guaranteed` set is READ, or it is declared unread in the gate's own
register, `UNREAD_BY_DESIGN`, with a reason. Three readers, each scanned live:

- **defs** — any string in any component def, so a `tokens` binding and a code-only binding a def states in prose
  (Dialog's backdrop, `color.scrim.default`) both count.
- **aliases** — a DTCG alias in any committed `out/*.tokens.json` (every brand, every overlay), so a primitive a role
  aliases is read.
- **preview** — `schema/preview-spec.json`, the sample components the plugin and the playground render.

The `.ai.json` metadata and the style-guide pages describe every token, so they are not readers: counting them would
read the contract back to itself (`docs/34` shape 1).

### Why the register is independent (`docs/34`)

The register is authored: a path or a pattern, the COUNT of unread tokens it claims, and the reason. Nothing in it is
read from the contract, a def or an emission. A pattern carries its count so a family cannot quietly absorb a new
unread member (shape 15): `color.inverse.**` claims exactly 120.

### The census (measured 2026-11-04, on main at f029acf3)

621 guaranteed tokens: **381 read** (223 by defs, 163 by aliases, 56 by the preview, with overlaps) and **240
unread**. The register's first contents, 28 entries:

- **225 by design**, families a consumer expects whole: the inverse mirror (120), core ramp, dimension and font-role
  steps (34), the status and brand families' full role sets (17), and scale steps no component uses (motion 13,
  opacity 11, space 6, shadow 4, grid 5, container 2, radius 2, glass 2), plus the label and caption `-link` text
  styles designers set on a text range (5), unused rungs' line boxes (3) and the large caption (1).
- **15 held** as owner questions (below), never deleted.

### Owner questions (held in the register, each passes until answered)

- **Q-TC1** `color.icon.link.visited` — Link's visited state is code only and colors the text; should a standalone
  link's trailing icon take the visited icon color too?
- **Q-TC2** `color.interactive.{primary,neutral,destructive}.fill.focused` — no control paints a fill at focus (focus
  is the ring). Bind one at focus-visible, or keep for consumers?
- **Q-TC3** `color.interactive.destructive.indicator.{rest,hover,pressed}`, `color.interactive.{neutral,destructive}.fill.selected`
  — no neutral or destructive control selects. A matrix kept complete, or a missing control?
- **Q-TC4** `color.text.tertiary`, `color.foreground.tertiary` — no component uses the third step; muted text binds
  secondary. Should a quieter part (helper text, a placeholder) bind it?
- **Q-TC5** `control.size.lg.{inset,track,width}`, `size.xs.height` — rungs no control offers. Add the sizes, or keep
  the rungs for consumers?

### Mutations, each failing by name

- Slider's `size.large.thickness` rebound off `border-width.x-heavy` (its only reader):
  `unclaimed: 'border-width.x-heavy' is in the guaranteed contract and nothing reads it`.
- The `opacity.*` register entry dropped: 11 × `unclaimed: 'opacity.0' …`.
- The `shadow.*` count lowered to 3: `register: 'shadow.*' claims 4 unread token(s) and declares 3`.

### Limits

A def mention counts as a read, so a sentence that says "not X" reads X. The gate proves a name is mentioned, not that
the binding is right. A reason is prose, and review is its only guard.

An alias is a read whoever holds it, so a primitive aliased only by an unread contract token counts as read. Measured
(review of #3434), **13 of the 381 reads** hang only on unread holders: `core.dimension.{5,28,72,80,88,96}` (the
`control.size.lg.*`, `size.xs.height` and `space.900`–`1200` rungs), `core.font.weight.{300,900}`,
`core.font.line-height.{165,175}` and `core.font.letter-spacing.{neg-15,neg-40}` (the font roles' unread ends), and
`core.palette.info.550` (`color.inverse.{text,icon}.info-subtle`). `core.dimension.5` and `.28` hang on Q-TC5's held
tokens. The gate reports this list on every run, measured as a fixed point over the alias graph, and asserts nothing
on it; if a holder leaves the contract, the pinned `core.dimension.*` and `core.font.**` counts fail by name.
