## (2026-11-17) — `roleColors.action` anchors the action fill where `actionPalette` does (#1896)

**What.** `theme-brand.ts` computed the action anchor step from the `actionPalette` lever, so `roleColors.action`
(the schema's alias for it) rebased the action ramp but kept primary's anchor step. A brand color then sat at
primary's step, not its own shade, and neutral or status palettes took primary's step instead of 500. The anchor and
its decisions-log note now key off `roleToPalette.action`, the palette action resolves to after the roleColors pass.
This is the same move #1895 made for links.

**Plan diff.** No committed brand sets `roleColors.action`: `regen.ts` is byte-clean across every brand and mode.
For a measured brand (primary l 0.55, plus accent, deep and pale brand colors), the two spellings differed on 7, 104
and 95 roles before the fix and differ on none after. The only remaining difference is the decisions-log lines that
name the spelling. Links follow, since #1903 anchors them on the action anchor.

**Tests.** The issue's repro is pinned as a literal (accent → 450). Unpinned deep and pale now land on their own shade
for fill and link. For five palettes (accent, deep, pale, neutral, success), on a primary anchored off 500 so the
neutral and status arms witness too, the test checks the two spellings agree role by role. #1895's link-follows-anchor
witness only separates the two anchors once the action anchor is pinned, so its deep and pale cases now pin 550 and
500. That keeps their literals, and the modes.ts `linkAnchorStep` mutation still fails them. Mutations: main's
`theme-brand.ts` fails all eight #1896 asserts by name; the modes.ts mutation fails the two #1895 asserts.

**Pending.** OWNER DECISION: whether the "anchored at" note fires for the `roleColors` spelling (built: it does, same
wording, naming the resolved palette). Two more sites that read the lever were filed as #3845: the accent≠action guard
and the "actionPalette is not set" note.
