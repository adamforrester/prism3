## (2026-11-18) — Studio token list: its dropdowns are the shared select, and the caption row lines up (#3938)

**What changed.** The token list's Show and Category dropdowns (Inspect › Token list) used the legacy `.select`. That box was 40.92px tall, beside the 36px Alias path segmented control. Because `.tok-ctrls` aligns its fields at the bottom, their captions sat 4.92px below Alias path's.

- **The move (Q-BK1 A, 2026-11-17):** both dropdowns are now lever-kit `selectField`, the chrome's `.p3-select`, with hooks `token-show` and `token-category`. On its own, the move flipped the offset to 3px the other way, because the shared select is 32px (`--p3-ctl-h-sm`).
- **The height (owner decision A, 2026-11-18):** the token list's selects take the segmented control's height, with one rule in `chrome.css`: `.tok-ctrls .p3-select { min-height: var(--p3-ctl-h); }`. This is the convention the Settings levers already use (`.p3-levers .p3-select`, QA-B5, QA-B18). Nothing else about the shared select or the segmented control changes.

The overnight lane's branch (the move and chrome section `3938`) was sound, so this PR reuses it, merges main, and adds the rule.

### Verification

- **Chrome section `3938`** runs Inspect › Token list at 1280 on the web and Figma hosts, light and dark, over both tiers. It asserts:
  - both dropdowns are `.p3-select`, not `.select`;
  - every caption in the row sits at the same top, to the hundredth of a pixel (offset 0);
  - choosing a category still filters the list.
- **On main's source** the section fails 8 arms by name: the shared-select arm and the caption arm (4.92px) in each of the four cells.
- **Mutations**, each failing the caption arm by name in all four cells (3.00px): the rule dropped, and the rule set to `--p3-ctl-h-sm`.
