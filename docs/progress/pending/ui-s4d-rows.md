## (2026-10-02) — UI redesign S4d: Color › Surfaces & fills rows (a Foreground section, swatch-panel pickers, preview fixes, a row for every remaining role, locked icon rows)

**STATUS: branch `ui/s4d-rows`, stacked on `ui/s4c-surfaces` (#1980) with `origin/main` merged in.** UI only: no engine change, no emitted artifact moves, no ENGINE bump, `CONTRACT_VERSION` unchanged. Applies the owner's decisions Q44 to Q50 of 2026-10-02, recorded in this change as rows of `docs/superpowers/ui-redesign/decisions-2026-10-01-qa.md`, where S4c's prose below the table (Q41, Q42) became rows too, its wording kept.

**What the user sees on Color › Surfaces & fills.**
- **Jump links** to each of the eight sections at the top of the levers (Q49), with Color › Interactive's control (S5.2, PR #1974): the same `p3-jump` classes and the same CSS lines, so the two branches meet with a duplicate rule, not a conflict.
- **Background fills**: Page and the Inverse band step open the rows' step picker (Q45), not a native select. Page lists White, every neutral step, Black, with no Return to Auto (Q21: Page has no Auto; the picker gained `auto: false`). The band palette stays a select: the picker shows one palette's steps, and choosing a band palette is its own write (it seeds the darkest step). Contrast floor is unchanged.
- **Foreground** (Q44): its own section, the APPROVED heading with the preview's Foreground description. Rows Primary, Secondary, Tertiary (`foreground.*`), then the same under "Inverse" (`inverse.foreground.*`). "Surface — card / panel / nested" are gone.
- **Foreground fills**: the five bold fills, then the subtle fills, the on-color inks (`text.on-*`), and the inverse band's bold and subtle fills under "Inverse".
- **Text color**: the 13 page inks, then the 13 `inverse.text.*` under "Inverse".
- **Border** (new, the preview's heading and description): 8 page borders, then `border.focus` read-only (#1966); the same for the inverse band.
- **Icon** (new, the preview's heading and description; Q50): all 31 icon rows, always visible. While `iconContrast` is `'text'`, each row is disabled and reads "Follows text.X", and the section opens with the APPROVED note and the "Unpair icons from text" button, which writes `iconContrast: '3:1'` exactly as the lever's own control does. Unpaired, the note goes and the rows edit.
- **The preview**: the Text color section draws a ratio badge in each mode column and none by the token (Q46; the Style guide draws none, as before); the inverse Primary background card loses its "Inverse text" sample and chip (Q47). Both are shared sections, so Q47 shows on Brand's Style guide too.

**Which palette each new row picks, measured.** A probe through `brandTheme` + `resolveAllModes` (deleted after) read every new role's derivation on prism3, aurora and harbor, light and dark: each is a step of the palette its family names (neutral for the tiers, `roleToPalette[status]` for the semantic ones), except the on-color inks, which resolve to white, black or a light neutral step, so their rows pick neutral (declared in the test). Then each role was overridden to a step of that palette in light and dark, under both `iconContrast` values, on all three brands: **996 of 996 accepted, each resolving to exactly the step written**, no alpha kept. The only warnings are contrast shortfalls, marked not blocked, as on the existing rows.

**#1968 and the lock.** Under `'text'`, the engine's icon profile is the text one, so icon and text twins resolve to the same step (0 mismatches on prism3 and harbor; aurora loads with `'3:1'`), and a text override carries to the icon: "Follows" is true in value and in edits. An explicit icon override still wins in the engine. So a row with its own icon override in a mode (left from before a re-pair on Interactive) is NOT locked in that mode: it shows its Override and Return to Auto, rather than claim a "Follows" the engine is not doing. Held for the owner below.

**Q48, found real.** `inverse.foreground.tertiary` is the only inverse ladder role with a badge because the engine contracts it: Badge paints its bold neutral member with it, so it is measured against the page at the non-text floor (3:1, 4.5:1 in HC) and carries a second pair with `inverse.text.primary` (#1745, #1776, `modes.ts`). Its siblings are surfaces measured against themselves, so they have no ratio. Not changed.

**Behavior-neutral where it should be, measured.** The same 62 edits per corpus brand (Page through White, Black and four neutral steps; the band step through four steps, Auto, two non-neutral palettes and back; the floor; the three moved Foreground rows picked twice and reverted; three unmoved rows) were driven on a build of `HEAD` before this change (`3a2f8338`, the selects) and on this page (the pickers), in Light and Dark. They leave **byte-identical persisted brands after every edit: 186 of 186** (52, 52 and 50 distinct states, 0 page errors). Every option set matched too (96: the select's options as the picker's keys).

### Tests

- **`test-fills-input`** 98 → 924. (4) Every Surfaces & fills role in the committed emission is a row, a ground set by a Background fills control, or read-only by a reason the test declares literally (the washes; the tier grounds, #1972; the focus rings, #1966), never two; Q49's list written out by family. (5) Each S4d row's palette against the emission's alias in light and dark, and its write, literal, in each mode; the engine resolves it to the emitted hex; the other mode is unmoved; Auto is byte-identical. (6) The lock: paired, each icon row is locked to its twin by the engine's rule restated here, and an edit on each twin moves the icon (so "Follows" is the engine's behavior); Unpair writes `iconContrast: '3:1'` and nothing else; an explicit icon override unlocks only its mode; aurora loads unpaired. (7) Each Page choice writes byte for byte what its select option wrote.
- **`test:chrome`** 10,094 → 10,332: every new row rendered once (literal lists), the focus rows read-only, the 31 icon rows disabled reading "Follows text.X", the APPROVED note and button, the eight jump links each naming its target, the new headings and descriptions, Q44's labels, the "Inverse" sub-headings; jump links classified as chrome controls.
- **`test:smoke`** 3,900 → 3,971: Q46, per mode, every text token carries one badge in each column (by position), its ratio from the emitted pair in that column's mode, none by the token; Q47 in the Background chips; the S4c surface block drives the pickers; new block per corpus brand: the lock and Unpair (persisted `iconContrast`), then one edit in each new section (Foreground, Foreground fills ×2, Text color, Border, Icon ×2) persisted as a literal override and reaching the **exported** DTCG tree as `{<root>.core.palette.<p>.<n>}`, where the committed emission has something else.

### Mutations (each after a `wip:` commit, diff checked non-empty, each failing by name)

| Mutation | Failure |
|---|---|
| (a) `border.warning` dropped from `BORDER_ROWS` | unit, 4: `✗ every Surfaces & fills role the engine emits is a row, a lever or read-only by a declared reason — no home: border.warning`; chrome: `✗ web: Surfaces & fills renders the border.warning row once — rendered 0` |
| (b) icon rows editable while paired (`lockedTo` never locks) | unit, 3: `✗ paired, in light: every icon row is locked and names its text twin ("Follows text.X") — icon.primary → null, …`; chrome: `✗ web: paired, each of the 31 icon rows is locked and reads "Follows text.X" — not: icon.primary {…"disabled":false,"text":"Auto · neutral 950"}` |
| (c) Unpair writes `'text'` | unit, 2: `✗ Unpair writes iconContrast "3:1" and nothing else (iconContrast "text")`; smoke: `✗ S4d prism3: Unpair icons from text persists iconContrast "3:1" and nothing else (persisted "text", was "text")` |
| (d) the text badge only in the page's column | smoke, 12: `✗ aurora / Surfaces & fills / light: each text token has one ratio badge in the "On light" column and one in the "On dark" column, none by the token (18 rows) — text.primary [["text.primary"],[],[]] …` |
| (e) the "Inverse text" sample put back | smoke, 24: `✗ prism3 / Surfaces & fills / light: the shared Background section draws its 7 chips in order — drew [… "inverse.text.primary" …]` |
| (f) the Page picker writes the step one above | smoke, 6: `✗ S4c prism3: previewing dark, the base control writes surfaces.dark.base = 100 … — wrote surfaces {… "dark":{"base":150}}`; the equivalence driver: 28/62 |

### Traps

- **The plugin host in `test:chrome` runs `apps/plugin/dist`, not the studio's.** A mutation rebuilt with only `npm run build` in `apps/studio` fails on the web host and passes on figma. Rebuild the plugin too when the figma arm matters.
- **A locked row clicked by a test is a 30-second timeout, not a failure.** The S4d smoke edits check the button is enabled first, so mutation (c) fails by name and the suite goes on.
- **Band step keys are padded, stored steps are not** (`'050'` vs `50`). The picker matches by number; the old select showed no current value for steps under 100.

### Open with the owner

- **New copy, held for approval:** row labels "Brand, subtle" (foreground subtle fills, page and inverse), "On brand" (text and icon on-color inks), Border's "Primary/Secondary/Tertiary/Brand/…/Focus", Icon's "Primary … Brand, muted … On brand"; the "Inverse" group sub-heading (the preview's own word); the jump nav's accessible name "Sections on this page"; the focus rows' read-out (`primary 600`); the Page picker's "white" and "black" step keys.
- **An explicit icon override while paired** shows as an editable Override in that mode, not as "Follows" (see above). The alternative, clearing icon overrides on re-pair, would change Interactive's write.
- **Q47 also changes Brand's Style guide** (the section is shared, Q5).
- **The Unpair button stays enabled in a derived mode**: `iconContrast` is a brand-wide setting, not a mode's.
- **The band palette stays a select** (Q45 allowed it).
