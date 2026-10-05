## (2026-10-05) — UI redesign S12: the start window, today's four cards restyled over the studio

**STATUS: branch `ui/s12-start`, held for the owner's screenshot review.** Studio and plugin UI only: no engine change, no emitted artifact moves, no ENGINE bump, `CONTRACT_VERSION` unchanged. The start is no longer a root view of its own (legacy, pinned light, outside the frame): the studio always renders, and the start opens as a window over it (`shell/start.ts`), on the first run and from "+ New brand", in the chrome's light or dark theme (G10 A).

**What the owner chose, and where each lives:**
- **G11 B:** today's four cards, restyled, every shipped string kept, under "Start a brand" / "Start a brand in this file" (G17). The brand mark is the top bar's (G10). Order color, examples, neutral default, import (S8).
- **S1:** the color card's button reads "Start from this color". **G14:** the color starts at the working brand's primary. **S3:** a hex that is not `#rrggbb` is refused with "Enter a hex color as #rrggbb." (it used to fall back to the picker's color silently).
- **G13:** "Start blank" loads a neutral gray (concept v6's Blank: `l 0.5, c 0.03, h 250`, neutral hue 250 at chroma 0.004, following the primary), not the indigo `NEW_BRAND()` it loaded under the same words.
- **S2:** a paste box above "↑ Upload…", with Import. **S7:** import errors open "Line ‹n›: " when the line is known, and drop it when not. **S6:** another file type says "Choose a .md, .markdown or .txt file.", on the start and the brand menu's upload.
- **G15, S4, S5, S9, S10:** Close whenever the start was reopened (never on the first run; Escape does what Close does). With unsaved edits a choice asks first, in a second window ON TOP of the start: "Replace ‹brand› with ‹choice›?", "‹n› edits to ‹brand› are not saved to a file. Export or apply first to keep them.", "Discard ‹n› edits". Focus starts on Cancel, Cancel and Escape return to the start, and Discard wears Prism3's destructive button.

**The diagnosis that made Close small.** The scope planned to keep "+ New brand"'s `clearOrigin()` and remember the old provenance so Close could put it back (T7, with the #1197/#1200 identity trap that restoring the boot provenance re-arms). Reopening now changes no origin at all: a reopen flag beside the session opens the window, Close clears it, and every path goes through `loadBrand`, which clears it too. So Close restores nothing because nothing moved, the guard is the brand menu's own rule (`needsOverwriteConfirm`, which a cleared origin made false: the scope's headline 8, edits dropped without asking), and the identity guard reads "nothing chosen" until a path is chosen. In the plugin, a reopen before the host answers turns into the first run on an empty file (no Close), and closes on a file with a brand: `test:start` §4b holds both orders.

**Technical calls:**
- **The guard's count** (`editCount`, `provenance.ts`): settings that differ from the origin, read off the same two inputs `isDirty` compares (zero exactly when it is false, held). A plain value, a list of plain values (`modes`) or a color (`l`, `c`, `h`) is one setting, so one pick is one edit, not three. Nothing records keystrokes, and a slider writes per step.
- **‹choice›** reuses the brand menu's shipped words (`originLabel(…, 'arriving')`): "the aurora example", "a new brand" (color and Blank), the brief's quoted id. **‹brand›** is the brand's name. One edit takes the singular ("1 edit … is … keep it", "Discard 1 edit").
- **Line numbers are studio-side** (`state/start-input.ts`): the parser's "at line N" counts inside the front matter, so the file line is N + 1, and that phrase is dropped once the line leads; a refusal naming a key path (`surfaces.light.base: …`) or quoting a name is found in the front matter; a JavaScript error out of the engine (a `TypeError` on a missing key) names no line and none is guessed. No engine change.
- **Discard's hover** moves the edge to `destructive.border.hover`: the filled hover step under the white on-fill measures 3.31:1 in dark (#2135). Rest is Prism3's exactly (`fill.rest`, `on-fill`).
- **One import check:** `validatePaste` (both paste boxes) and `validateDesignMd` (both pickers), moved out of `main.ts`. The brand menu's empty Load now says the approved empty-box sentence.

**Equivalence against `main` (web, first run, persisted bytes):** identical for the color path at `#5e4bc3`, `#1E1EFF` and `#006666`, each example, and the upload of harbor, aurora and wendys; the new paste persists what main's upload of the same brief does. Two decided exceptions: Blank (G13) and the color path's untouched default (G14: the working brand's primary, not `#5e4bc3`).

**Gates:** `test-start-input.ts` (new, in `npm test`): Blank, the color seed's bytes, `readHex`, the guard's words, the edit count against `isDirty`, nine import fixtures with hand-counted lines, the file types, and a source scan that both pastes import the one check. `test:chrome` section 27: every decision above, on both hosts, both themes, at 1280 and 380, the chrome probe in the first-run, reopened and guard states (the start-screen exemption from the inline-value check is gone; the example dots are `data-content`), the brand menu showing the same words for the same input. `test:start`: the plugin heading (G17) and §4b.

**Mutations, each after a `wip:` commit, restored with `git checkout -- <file>`:**
- the guard skipped: chrome `a start path over 3 unsaved edits asks first ("Discard 3 edits") — loaded without asking (brand "aurora")`;
- Discard drawn as an ordinary button: chrome `Discard wears Prism3's destructive button: fill #d24241, label #ffffff (S5) — {"bg":"rgb(255, 255, 255)",…}`;
- focus on Discard: chrome `focus starts on Cancel (S5) — on start-guard-discard`;
- the "Line ‹n›: " prefix dropped: unit `S7: a known line goes in front as "Line ‹n›: "` (and eight more), chrome `a repeated key on line 3 says "Line 3: …" (S7)`;
- the old file-type sentence: unit `S6: the wrong-type sentence is the approved one`, chrome `a file of another type says "Choose a .md, .markdown or .txt file." (S6)` and the brand menu's;
- Blank before the examples: chrome `the cards run color, examples, the neutral default, import (S8)`;
- the brand menu's paste off the shared check: chrome `the brand menu's empty paste says "Paste a design.md brief or choose a file first."`.

### Traps

- **A start-path assertion behind a `hooks.need`** fails as "the hook did not appear", not by the decision's name. The guard's assertion reads the window first and throws after it.
- **harbor has Dark on by default** (no `modes` key): clicking Dark opens the turn-off confirm and writes nothing, so the three-edit fixture turns Wireframe on.
- **The `.start*` rules in `styles.css` and `mountView`'s single branch** are left for S13.
