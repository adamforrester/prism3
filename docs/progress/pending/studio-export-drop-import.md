## (2026-11-17) — Export no longer offers Import; importing a brief is the brand menu's (#3910)

**What changed.** The owner's note (2026-11-17): Export showed an **Import** caption and a **Brand brief…** action that
opened the same paste-or-upload box as the brand menu's **Import design.md…**. That was a second door to one room. It is
gone from Export. The brand menu's entry, and the start window's **Import a design.md** card, are unchanged.

**One renderer, both hosts.** Studio's Export dialog and the plugin's Export page are the same `exportArea` in
`apps/studio/src/shell/bar.ts`, so one removal covers both. With it went `ExportView.imports`, its rules in `chrome.css`
(`.p3-bardlg-import`), and the `IMPORT_SLOTS` model in `export-settings.ts`. That model existed to keep the unbuilt
Figma-file import (#677) a slot rather than a control, and Export was its only renderer. #677 itself is untouched; where
its control lives, if it is ever built, is a design call for then.

**The test.** `test-chrome.mjs` 3553-md now holds `#3910 … Export offers no Import`, on the plugin at 380 and 1280 and
the web at 1280, both themes. It reads the Export page for any import hook, upload icon or caption starting "Import".
Before this change it fails all six arms; after, it passes. MUTATION (after a `wip:` commit): the Import block restored
in `exportArea` fails `#3910 … Export offers no Import` by name. The M9 alignment arms that measured Export's Import
caption and action left with it, and 3553-icons no longer reads `export-import`. §46's A10 held a host message leaving
the open Export area alone by the import box's text and caret. It now holds the same by the preview's focus and scroll
position.

**Assertion floor.** `test-export-settings.ts` section 7 (four assertions on the slot model) left with the model,
so the suite runs 230 assertions, and its floor in `apps/studio/suites.json` (#3904) moves by hand from 234 to 230.
That is the shrink this diff explains, and the only one.

**Guides.** No guide told anyone to import from Export: `theme-a-brand.md` already points to the brand menu's
**Import design.md…**, and no bold label named the Export entry. The removed lines did move code that guides cite, so
`lint-guide-claims` failed on line drift. `bar.ts` lost one line above every cited block, so its citations move up one
(`:108`, `:175`, `:233-237`, `:237-293`). `main.ts` lost three, so `:1891` (the restore-off hint) becomes `:1888`. The
fingerprints are unchanged: the blocks are the same, one or three lines higher.

**Brand brief description (owner decision Q-BK3 A, APPROVED).** It said "Import it back here to get the brand again"
(`export-settings.ts`), and "here" then read as the dialog. It now says "Import it in Studio to get the brand again."

**Flake seen.** §46's `web light 1280 Shape: a drag stores at most one write` failed once (2 written) in a three-section
run, then passed twice on re-run. It does not touch Export.
