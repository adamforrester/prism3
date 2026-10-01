## (2026-10-01) — UI redesign S3: Brand in the two panes, the namespace warning, the dark-off confirm, the Style guide lent to its preview

**STATUS: branch `ui/s3-brand`, stacked on `ui/s2-palettes`; not pushed.** UI only: no engine behavior change, no emitted artifact moves, no ENGINE bump, `CONTRACT_VERSION` unchanged. One engine file changes, as configuration: `packages/engine/package.json` exports `./vocabulary`, so the studio reads the personality words (`TRAITS`) by name instead of restating them. The spec is `docs/superpowers/ui-redesign/implementation-plan.md` (S3 under "Per slice", §4, §5, §6.1, §9), concept v6's Brand page, the v4 review (F5, T2, Q3), the v5 review (IA-1, answer 4, V1, V12), the v6 review (R4) and the QA notes (Q2).

**What the user sees.** Brand, the first tab, is the second page in the two-pane layout and the first outside Color:
- **The levers panel**, in concept v6's order: the intro; **Identity**, with **Brand name** and **Token namespace** side by side at every width, 380 included (v5 answer 4), and the namespace notes under both; **Personality**, the engine's nine words as chips, with what each chosen word sets; **Modes**, Light always on, a check for Dark, High contrast light, High contrast dark and Wireframe, each with v6's note, then **Custom modes** (name, base, remove, and Add custom mode); last, **Continue to Color › Palettes**.
- **The namespace (T2, F5, Q9).** `pds3` (the default theme's) and `prism` warn in v6's words: "pds3 is the default theme’s placeholder. Set your brand’s namespace before you export." Any other value names the paths it makes. The field holds a draft: a changed draft says what a rename breaks and offers **Rename namespace**, which asks once more in place ("Rename namespace to ‹x›", **Rename every token path**, Cancel). Nothing reaches the brand before that confirm. The name still writes per keystroke without a rebuild (#1196), and the bar's brand switcher follows it.
- **Modes (Q3).** Turning Dark off first asks, in place: "Turn off Dark and high contrast dark", "High contrast dark follows dark, so it turns off too. The two modes’ 442 pairs leave the verdict (884 becomes 442).", what each mode drops, and **Turn off both modes** or Cancel. Confirming drops both modes and their per-mode data; High contrast dark then stays off and locked, saying "Off while dark is off: it follows dark.", until Dark is back, and Dark back does not bring it back. A mode with nothing to drop turns off at once.
- **The preview** is the Style guide (V1, R4), the page's one home, with the mode control in its header. It is the legacy renderer, lent (below), on a card pinned light, as Inspect's Contrast and Tokens are. Its grounds sit on the brand's own `background.primary` for the previewed mode.

### Diagnosis and structure

- **A page moves by data, as S2 set up.** `shell/pages.ts` sets Brand's `status` to `new` and empties its legacy list; the frame's `NEW_PAGES` gains its row. `LegacyPageKey` loses `preview`, so `NAV`, `PAGE_COPY` and `PAGE_RENDERERS` failed `typecheck` until their rows went: the compiler walked the retirement.
- **New code, new files.** `domains/brand.ts` (the levers), `preview/brand.ts` (the preview), `state/brand-input.ts` (the DOM-free writes: the namespace rule and its warnings, the per-keystroke name, personality, the mode rules and drops, custom modes, following S2's `palette-input.ts`). `ui/lever-kit.ts` grows a text field, a check row (`role="checkbox"`), a word chip (`aria-pressed`) and an in-place confirm, and `leverBlock` takes a description for a schema input that is not a manifest lever.
- **The Style guide is lent, not ported.** `renderPreviewStyleGuide` stays in `main.ts`; the frame hands it to Brand's preview at mount (`lend.styleGuide`), the way S1.3 lends Inspect its two legacy views. It takes the repaint its own ground select calls, which used to be `renderWorkspace()`. Each of its grounds is now a specimen root (`data-p3="specimen"`).
- **Repaint by subscription only.** A control writes through `brand-input.ts` and calls `rebuild()`; the levers, the preview, the mode control and the verdict repaint from `brand` and `mode`. The name is the one write without a rebuild: `syncIdentity` now tells a new store topic, `identity`, and one `main.ts` subscription patches the bar's brand name, as the menu's Name field did by name. The repaint guard reads the two new files by name.

### Retired from `main.ts` (9,486 → 9,426 lines; 91 removed, 30 added)

The legacy Preview page: its `NAV` row, its `PAGE_COPY` and `PAGE_RENDERERS` rows, `renderPreviewPage`, `PreviewView`, `previewView`, `PREVIEW_VIEWS`, and its case in `pageHasModeVaryingControl`. Nothing else reached it: S1.3's Inspect already carries the contract table and the token list, and the Style guide is Brand's. The brand menu's **Name** and **Namespace** fields, their `field` helper, the namespace hint, the in-place example-marker patch (#1075, whose subject went with the Name field), and `ROOT_RE` (the rule lives in `brand-input.ts`). The Pages menu's note loses "Preview renders the whole system."

**Behavior changed on purpose, each the option closest to v6:**
- The namespace no longer commits per valid keystroke; it commits on Rename namespace and its confirm, which rebuilds (v6, Q9). The name still commits per keystroke.
- Turning Dark off now drops High contrast dark (Q3) and the per-mode data of both. The legacy menu's toggle left Dark's overrides in the brand, which the engine refuses for a mode that is off.
- The brand menu keeps its Modes section: the plan retires only the two fields. Brand › Modes edits the same set.

### Tests

- **`test:chrome`: 7,964 assertions** (S2: 6,916). Brand moves from `LEGACY_PAGES` to `NEW_PAGES`. New or extended:
  - Brand on both hosts, both themes, at 1280, 640 and 380 (section 1), its Preview pane at 380, and the rings Tab draws through its levers;
  - **Q2's second case for real**: Brand, without the sub-nav, both dividers at one y, light and dark, with the sub-nav's absence proved first;
  - **specimen ground** for Brand's Style guide, both hosts, both chrome themes, every mode;
  - **section 16**: the five schema inputs v6 homes on Brand (`BRAND_LEVERS`, literal) each render once and no other lever block does; the nine personality words in the engine's order (literal); name and namespace side by side at every width, both hosts; the T2 warnings in v6's words; the draft, the confirm, Escape and the rename; the name reaching the bar and the persisted brand; a personality word reaching the brand; the whole Q3 sequence; Wireframe on and off with no confirm; a custom mode added and removed; the Style guide's ground select redrawing it inside the preview; Continue.
- **`test:smoke`: 3,237** (S2: 3,276). The Pages menu lost Preview, so its Style guide sweep moved to a new section, "Brand — the moved page", per corpus brand and per mode: text and field legibility, the paired specimens counted into the sweep's own #1652 totals, each ground against the emission's `background.primary`, and **"a reserved namespace warns before export"**. The brand-menu (#1031), #1196 and #1033 scenarios moved to Brand's hooks; #1075's case C is retired with its subject; #1629 and #1147 reach the Style guide through the Brand tab.
- **Studio `test`:** new `test-brand-input.ts`, 24 assertions (30 after the review round) (the T2 words, the name without a rebuild, Q3, the drops, custom modes, personality, each against the engine's own `brandTheme`); `test-shell-imports` 30; `test-pages` 71 (Brand in `MOVED`).
- **`test:start`** measures Brand's two fields in the plugin bundle, and the brand menu's import field.

**Mutations, each after a `wip:` commit, diff checked non-empty, each failing by name:**

| | Mutation | Fails with |
|---|---|---|
| 1 | `pds3` dropped from `RESERVED_NAMESPACES` | smoke: `prism3: a reserved namespace warns before export — "pds3" must say "pds3 is the default theme’s placeholder. …", says null` (and each brand's draft); `test-brand-input`: `a reserved namespace warns before export: pds3 — {"kind":"hint",…}` |
| 2 | the namespace lever not rendered | `web 1280: Brand lever root renders its hook lever-root once — rendered 0` |
| 3 | the personality lever rendered twice | `web 1280: Brand lever personality renders its hook lever-personality once — rendered 2` |
| 4 | the preview following focus in Brand's levers | `V1 focus: web brand control 0 took focus and the preview stayed guide (now palettes)` |
| 5 | `import { build } from '../main'` in `domains/brand.ts` | `src/domains/brand.ts:34: references the legacy repaint tier "build"`, and `… imports "../main", which reaches src/main.ts` |
| 6 | a Style guide ground drawn on the card | `specimen ground: brand web light 1280, previewing dark: every specimen root sits on background.primary #0d0d0e — Background is the chrome card (#ffffff) | …` |
| 7 | Brand's preview title row moved 4px | `Q2 light 1280 / brand: the tab row's divider and the preview title row's divider are 4.00px apart (tolerance 0.5px)` |

**Edit to paint**, in the built studio at 1280 with Brand in view: the median time from a Wireframe toggle to the frame after it, 25 toggles after 5 warm-ups, five runs of each, alternated. Before (S2's build: the brand menu's toggle, Brand showing the legacy Preview page) the per-run medians were 85–94 ms (median 89 ms). After, the same brand-menu toggle measured 82–88 ms (median 84 ms), and Brand › Modes' own check 72–91 ms (median 77 ms).

### Traps

- **Playwright will not click an `aria-disabled` element.** The locked High contrast dark keeps its focus stop, so the suite activates it by keyboard, which is the claim anyway.
- **The lent Style guide is not chrome.** Its select and its specimen buttons are focus stops with 1px rings (`styles.css`). `test:chrome`'s ring walk stops at it, as it stops at a legacy page.
- **A `test:chrome` mutation run that rebuilds only the studio** fails on the web host alone: the plugin rows drive `apps/plugin/dist/ui.html`.

### Held for the owner

Each is the option closest to v6, picked and flagged under the overnight rule. None is brand-facing.
- **The confirms are drawn in place**, under the control that asked (the namespace rename, Dark off, a custom mode with overrides), with `role="dialog"`, focus on the action, Escape and Cancel back to the control. v6 drew modal dialogs.
- **The mode checks are buttons with `role="checkbox"`**, their focus ring measurable; Light is a fixed row with a dashed box, and the locked High contrast dark is `aria-disabled` with its reason as its description. v6 drew native checkboxes.
- **Personality's line is hidden while no word is chosen**; v6 repeated the section's own sentence there. With a word chosen it is v6's: "soft: Corner radius → soft, Shadow softness → soft." (#1937 put → in the embedded Inter.)
- **The Dark-off sentence counts both modes**: "The two modes’ 442 pairs leave the verdict (884 becomes 442)." v6 said "Its 221 pairs" and subtracted 442.
- **A custom mode's base offers Dark only while Dark is on** (the legacy add form's rule). v6 offered both.
- **The warning glyph is v6's triangle**, added to the shell's glyphs; the kit's warning line used ✕ before, and nothing on Palettes used it.
- **The Style guide is the legacy one, lent**, on a white card even in dark chrome (as Inspect's legacy views are), not v6's newer specimen page.
- **At 380 the two Identity fields align on their bottoms**, so "Token namespace" can wrap above its field.
- **The brand menu keeps Modes** beside Brand › Modes (the plan retires only Name and Namespace), and the two editors follow diverging rules: the menu has one High contrast toggle, keeps per-mode data when a mode goes, and never asks; Brand › Modes has a check per mode, asks before Dark off and drops what it lists. The orchestrator is filing an issue for the owner from the #1939 review; the menu is unchanged here.
- **Removing a custom mode that has overrides removes the mode and its overrides** (after Brand's confirm lists them). The legacy menu refused that removal.
- **More modes than fit in the preview header show as a select of the same modes** (v6's slim-preview `modesel`), never a clipped radio, and the radios come back when they fit. At 640 the default theme's four radios already did not fit: the old scroll hid all of them past the control's edge, and nothing measured it.
- **New neutral copy** (v6's unless marked; the orchestrator's review added the second list): "Brand name", "Token namespace", "Every token path starts with it. Renaming it renames every path.", "Rename namespace", "Rename every token path", "Renames every token path: ‹a›.color.text.primary becomes ‹b›.color.text.primary. Consumers referencing the old names stop resolving." (v6's with full paths for its "…"), "A namespace is lowercase letters, digits and hyphens, and starts with a letter." (new), "Personality words", "‹word›: ‹Label› → ‹value›, ….", "Modes on", "Always generated: it’s the base mode.", the four mode notes, "Off while dark is off: it follows dark.", "No overrides are set in this mode." (new), "Custom modes", "Based on", "Base of ‹name›" (new, the select's name), "Copies light or dark, then takes its own overrides.", "Add custom mode", "Remove ‹name›", "Continue to Color › Palettes".
  Also: "Token paths start with ‹x›, for example ‹x›.color.text.primary."; "prism is reserved for the shipped catalog. Set your brand’s namespace before you export."; the rename confirm's body, "Every token path changes: ‹a›.color.text.primary becomes ‹b›.color.text.primary." and "Consumers referencing the old names stop resolving, with no error. The contract version tracks names, so plan the rename with the teams that consume these tokens."; "No overrides are set in either mode."; the drop list's items, "Role override: ‹role›", "Setting: ‹path› = ‹value›", "Anchor: ‹column› at ‹step›", "Surface: ‹key› = ‹value›" (and, for High contrast dark's, the same prefixed "High contrast dark: "); "Custom mode name" (the field's name); "Cancel".
  Review round, new: "Custom mode ‹name› is based on Dark, so turning Dark off is refused until it is based on Light or removed." (plural: "Custom modes ‹a›, ‹b› are based on Dark, … until they are based on Light or removed."); the mode select's options, "‹Mode› (derived) · all pass" / "‹Mode› · N below floor" (v6's `modesel`).
  Review round, changed: "Turn off ‹Mode›" and "Turning ‹Mode› on again starts from Auto." now use the display name ("Turn off Dark"); "Turn off Dark…: drops N settings" and "Remove ‹name›: drops N settings" count every item the list names and say "settings" (were "overrides").

### Review round (orchestrator's independent review of #1939)

- **Dark off lost data on a refusal (blocking).** The first cut dropped Dark's overrides, settings, anchors and surfaces before it asked the engine, so a refusal (a custom mode based on Dark) lost them, and High contrast dark stayed off. `setModeOff` now builds the whole change on a copy and asks the engine (`brandTheme`) first; only an input it takes replaces the working brand, so a refused Dark off leaves the brand byte-identical, as the legacy toggle did. The Modes lever shows the refusal. The Dark-off confirm names any custom mode based on Dark first. Turning a mode on that is already on is now a no-op (it used to write the default mode list out).
- **Gate gaps closed, represented and not counted.** The Style guide's specimen roots are a literal list by section title (`STYLE_GUIDE_ROOTS`, modeled on S2's `EXPECT_SPECIMENS`), each held to the page color by name in `test:chrome` and per brand in `test:smoke`, with unlisted sections failing. Each personality chip's visible word is checked against the engine's own vocabulary, bundled from `packages/engine/vocabulary.ts`. The repaint guard scans `src/state`; nothing there trips it.
- **Copy:** mode display names in the confirm, the drop count in "settings", and v6's "→" back in the Personality line (#1937).
- **The mode control never clips** (above), with a `test:chrome` section at 4, 5 and 6 modes, 1280, 640 and 380.
- **Merged** `origin/ui/s2-palettes` at `b3b06f11` (S2's review round, `main` and #1937); the specimen section and `test-shell-imports.ts` conflicts were resolved by hand, keeping both sides.

| | Mutation | Fails with |
|---|---|---|
| 8 | Dark's data dropped from the working brand before the engine is asked | `test-brand-input`: `a refused Dark off leaves the brand byte-identical (dark data, modes and HC dark kept)` and `then Dark on: the saved brand equals the original (differs)` |
| 9 | the Style guide's Border section drawn without its ground (unhooked, on the card) | `specimen ground: brand web light 1280, previewing light: Border is a specimen root on background.primary #ffffff — not a specimen root, on the chrome card (#ffffff)` (every mode, both themes) |
| 10 | the `soft` chip labeled "gentle" | `web 1280: personality chip 7 reads "gentle" and writes "soft"; the engine's word is "soft"` |
| 11 | `globalThis['renderWorkspace']?.()` in `state/brand-input.ts` | `src/state/brand-input.ts:47: references the legacy repaint tier "renderWorkspace"` |
| 12 | the mode control never falling back to the select | `web light 1280 / brand, 5 modes: every mode is choosable in the preview header, none clipped — {"radios":5,"clipped":["custom-1"],…}` |

Counts after the review round and the merge: `test:chrome` 8,422; `test:smoke` 3,554; `test-brand-input` 30; `test-shell-imports` 33.

### Not done

- The Style guide's 1px focus rings and focusable specimen buttons are a legacy defect, measured and not fixed (one concern per PR); to be filed.
