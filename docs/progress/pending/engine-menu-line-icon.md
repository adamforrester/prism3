## (2026-10-12) — The hamburger joins the icon set as `menu` (Q253 A)

**Done.** Remix Icon's `menu-line`, three 2px bars, is the 45th name in the shared icon set, as `menu`: the plain
noun, like `home` and `search`. The owner's SVG was titled `menu-fill`; in Remix the two are the same path, so the
glyph is the same either way. It is normalized like every other source (`fill="currentColor"` on the path, the 24px
artboard). Regen carries it into `icon-glyphs.ts`, the `icon` def's `name` axis (44 → 45 members) and the committed
docs. No token moves, so CONTRACT is unchanged; a minor change note covers the projected surface.

**What pinned the set size, and what didn't.** `lint-icon-count` derives its expectation from `ICON_NAMES`, so it
needed nothing. The pins that did move:
- `glyph-shape` in `test.ts`: 41 → 42 distinct rendered shapes (43 path strings). The three -fill/-line collisions
  stay the only ones; `menu` collides with nothing.
- Four premises in `apps/plugin/test-update-apply.ts` and one in `test-update-components.ts`: 44 → 45 icons. These
  are Lane A's update-path tests, and the edits are count-only.
- The surface, renames and paint baselines, each by its own `--accept`, and Studio's catalog by its generator.

**Named, not counted.** A new `Q253 A menu` arm in `test.ts` checks that the set carries `menu` and that it draws the
owner's three bars, typed from the SVG the owner sent rather than read from `icons/`. Every count above moves the same
way whichever name joins or leaves, so none of them would say which.

**NOTICE.md.** The Remix Icon License attribution covers `menu-line` as it covers the rest; the file keeps no list of
names. Its "36 glyphs" was already stale (44 names before this PR), so it now reads "a few dozen", with no number to go
stale again. Found while checking it: NOTICE says `resize-grip.svg` is the one glyph not from Remix, but
`fpo-default-icon.svg`'s source is recorded nowhere. Filed as #2570.
