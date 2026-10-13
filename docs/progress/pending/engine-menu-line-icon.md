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
- The single-icon arms of `apps/plugin/test-update-apply.ts` (15) and `test-update-components.ts` (4): 44 → 45
  icons, and "the other 43" → 44. These are Lane A's update-path tests, and the edits are count-only.
- `apps/studio/test-component-catalog.ts`: Icon's "44 components" → 45.
- `lint-axis-values.ts`: the icon `name` set's register entry gains `menu`, between `link` and `minus`.
- The surface, renames and paint baselines, each by its own `--accept`, and Studio's catalog by its generator.

**A trap worth knowing.** The plugin's `test` script chains its files with `&&`, so the first failing file hides
every file after it. A pre-push run piped through `grep | head` also reported exit 0, because the pipe's status is
`head`'s. The first full verify found 3 gates red; each pinned file was then run on its own until green.

**Named, not counted.** A new `Q253 A menu` arm in `test.ts` checks that the set carries `menu` and that it draws the
owner's three bars, typed from the SVG the owner sent rather than read from `icons/`. Every count above moves the same
way whichever name joins or leaves, so none of them would say which.

**NOTICE.md.** The Remix Icon License attribution covers `menu-line` as it covers the rest; the file keeps no list of
names. Its "36 glyphs" was already stale (44 names before this PR), so it now reads "a few dozen", with no number to go
stale again. Found while checking it: NOTICE says `resize-grip.svg` is the one glyph not from Remix, but
`fpo-default-icon.svg`'s source is recorded nowhere. Filed as #2570.

**The source, checked against the release.** The repo records no Remix Icon version. NOTICE.md, LICENSE (whose
"Version 1.0 – January 2026" is the licence's version) and `icon-set.ts` name none. So the owner's paste was checked
against the npm `remixicon` package, unpacked to `/tmp` by `npm pack` (no `node_modules` touched). `menu-line.svg` in
4.9.1, the latest, is exactly the owner's path, and `menu-fill.svg` is the same path. It is also unchanged in every
release from 4.3.0 to 4.8.0. **A trap for whoever pins the set's release later:** no npm release matches every
committed glyph. 4.3–4.5 match 29 of the 43 Remix files and 4.6–4.9.1 match 27. The rest differ only in the fourth
decimal place (`check-line` starts `M10.0007` here and `M9.9997` in 4.9.1). The `width`/`height`/`fill="none"` wrapper
is the remixicon.com download's format, not the package's, so the set was probably taken from the site. Added to #2570.
