## (2026-10-28) — The rail foot's Minimize, Help and Appearance draw their icon alone (#3083)

**Status:** plugin panel and web studio (shared studio shell). No engine change, so no change note. CONTRACT unchanged.
No executor change, so `EXECUTOR_REVISION` stays.

### What changed

- **The owner's decision of 2026-10-28 on #3083:** the rail's bottom three tiles lose their visible labels. Their icons
  are widely recognized, and the "Appearance" label sat too tight to the rail's edge and corner. The web's foot is Help and
  Appearance, and the plugin's foot is Minimize, Help and Appearance. The area tiles keep their labels.
- `dom.ts` `tile` and `linkTile` take a `null` label. They then draw no label node and add `p3-tile-bare`, and the caller
  sets the name and the tooltip, as it does for every tile. Help (`frame.ts`), Appearance (`themeToggle`) and Minimize
  (`agent-link-ui.ts`) pass `null`. Their names are unchanged: "Minimize", "Help" and "Appearance: <choice>". So is each
  tooltip.
- `chrome.css`: a bare rail tile is its 32 × 32 square mark (`rail-tile`), with no padding and no 40px minimum, so the
  icon is centered in it. With the button's hairline the target is 34 × 34, over the 24px floor. The minimized strip's
  Restore was already its icon alone (a 36 × 36 ghost icon button, titled "Restore"), so the Minimize and Restore pair
  now matches. Restore is unchanged.
- **A knock-on to note:** the foot is shorter, so at the plugin's least height (420) the rail fits with its logo. Q2995.2 A's
  hide is measured, not a breakpoint, so the logo now hides only below about 400px. That height is under the plugin's
  `MIN_SIZE`, and the hide still runs there.

### Verification

- A new `test:chrome` arm in section 1 checks the foot tiles at 1280, 640 and 380, light and dark, on both hosts. Its
  hooks and names come from the decision's own words, not from `dom.ts`. Each tile must show no visible text and keep its
  accessible name. Under a real hover, it must show a tooltip in the same words. It must stay at least 24 × 24, and its
  icon's center must sit within 0.5px of the tile's center.
- The strip block gains a matching arm for Restore. It checks for no text, a "Restore" name and title, at least 24 × 24,
  and a centered icon.
- Updated arms:
  - The label arms (every label shown, 9px, the tracking, the fit, no hyphen) now read the area tiles. "Appearance" is
    gone from the hyphen arm's whole-word list.
  - The product-mark arm expects the logo at 420 on the plugin too.
  - Section 2232 holds 420 (every tile inside the window, the area labels, the logo drawn) and adds 360, where the logo
    hides. So its `fit`-removed mutation still has a height to fail at.
- Mutation: Appearance's label put back (`tile('theme-toggle', label)` in `frame.ts`) fails
  `#3083 rail <host> <theme> <width>: … show no visible label …` by name, at all 12 host, theme and width cases.
