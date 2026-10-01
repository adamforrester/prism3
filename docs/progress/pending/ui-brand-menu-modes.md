## (2026-10-01) — The brand menu drops its Modes section; Brand › Modes is the one mode editor (#1943)

**STATUS: branch `ui/brand-menu-modes`, stacked on `ui/s3-brand` (#1939); not pushed.** UI only: no engine change, no emitted artifact moves, no ENGINE bump, `CONTRACT_VERSION` unchanged.

**The decision (owner, 2026-10-01).** S3 left the brand menu's Modes section beside Brand › Modes, and the two editors followed different rules. The menu had one High contrast toggle, kept per-mode data when a mode went, and never asked. Brand › Modes has a check per mode, asks before Dark off and drops what it lists (filed as #1943). The owner decided to remove the Modes section and every mode control from the brand menu. Brand › Modes is now the one place modes are edited. The rest of the menu is unchanged: Examples, + New brand, and Import design.md.

### Retired (`main.ts` 9,426 → 9,304 lines; 135 removed, 13 added. `styles.css` 37 removed)

- The menu's Modes caption, its call to `renderModeSetMenu` and the divider that followed it. Examples now leads the menu.
- `renderModeSetMenu`, the mode-set editor, which only the brand menu called (#432 moved it there from the mode strip). Its state went with it: `addModeOpen` and `addModeName` (and their resets in the bar's two menu-close paths), `RESERVED_MODE_NAMES` and `setModes`. Its `lock` icon path went too, and so did the 30 `.mctx-*` rules only it drew: `.mctx-menu`, the option rows, the locked Light row, the custom-mode rows and the add form. The mode strip's own `.mctx-modes`, `.mctx-cap`, `.mctx-b`, `.mctx-name` and `.mctx-vo` stay. Nothing Brand › Modes uses was touched: its writes are in `state/brand-input.ts`, which never imported the menu's code.
- **Two strings pointed at the retired section.** These are the derived-mode note ("Toggle which modes generate from the brand menu’s “Modes” section.") and the per-mode font table's read-only title ("Turn the mode off in the brand menu’s “Modes” section…"). Both now name "Brand › Modes" and are otherwise unchanged. Comments that named the menu's mode toggles say what is true now.

### Tests

- **Coverage moved.** `test:smoke`'s brand-menu arm (#1031) held #1770 in the menu: the locked Light row's "always" label was measured at the chrome bar, and its lock glyph was an image with an accessible name. Brand › Modes' Light row says it is locked in words ("Always generated: it’s the base mode."), not with a glyph. So #1770's claim moved to `test:chrome` §1, for both hosts and both themes at 1280, 640 and 380. The check finds the row by its hook (`mode-on-light`), finds its note among the text nodes the probe measured, and holds that node's own ratio to 4.5:1 (5.51:1 light, 5.03:1 dark).
- **Coverage dropped.** The lock glyph's accessible name has no subject now: Brand › Modes draws no lock glyph, and its check box is `aria-hidden`, with the words carrying the lock. The menu's mode toggles had no other checks. S3 had already moved the #1196 and #1033 brand-menu scenarios to Brand's hooks, and section 16 of `test:chrome` drives Brand › Modes' whole Q3 sequence, Wireframe and the custom modes.
- **Added.** `test:smoke`, per corpus brand and per color scheme, with the menu open: "the brand menu offers no mode control; Brand › Modes is the one place modes are edited (#1943)". This is a `hooks.absent` check. Its proof is the menu itself in that same state: found by its hook, with text drawn in it, after the probe measured it. A mode control is a checkbox, radio, switch, pressed or checked state, or select, or anything whose own text, accessible name or title names a mode (modes, light, dark, high contrast, wireframe). The check uses no removed hook by name, because the hook guard requires every hook a suite names to render.
- Counts: `test:smoke` 3,548 (S3: 3,554; minus two checks and plus one, across six states). `test:chrome` 8,434 (S3: 8,422; plus one check across twelve columns).

**Mutation, after a `wip:` commit, failing by name.** One Wireframe toggle restored in `renderBrandMenu` (a `bm-item` button that toggles `wireframe` in `brandState.modes`) produced this failure for each brand and scheme: `prism3 / brand menu / light scheme: the brand menu offers no mode control; Brand › Modes is the one place modes are edited (#1943) — found button.bm-item "Wireframe"`. The run reported 6 failures of 3,548 assertions.

### Held for the owner

- **The two retargeted strings** keep their sentences and swap only the place they name. They are neutral and not brand-facing, and the words "Brand › Modes" match how S3's copy names a page section ("Continue to Color › Palettes").
