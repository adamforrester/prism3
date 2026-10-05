## (2026-10-05) — Color: Pinned becomes a third neutral source (#2175)

**Status:** `apps/studio/src/domains/color-palettes.ts`, `apps/studio/src/shell/pages.ts`, one rule in
`apps/studio/src/chrome.css`, `packages/engine/levers.ts` and the regenerated `schema/lever-manifest.json`, and
`test:chrome`. ENGINE bump owed (`packages/engine/changes/ui-2175-pinned-neutral.md`, minor): the manifest no longer
flags `neutral.anchor` as `advanced`. CONTRACT unchanged (`token-contract.ts --check`: unchanged). The saved value is
unchanged in shape and in bytes.

### What changed

The owner chose option B on #2175 (PN1 B, PN2, PN3). On Color › Palettes, the Neutrals section's source choice under
"Neutral hue" has a third option, "Pinned", beside "Follow primary" and "Custom tint".

- **Choosing Pinned** does what the old switch did when turned on (`setNeutralPinned(true)`). The color field
  ("Pinned neutral") then appears in its own lever block directly under the choice, and the hue and chroma sliders
  are its read-only readout, as before. The state line reads "A pinned neutral sets the ramp: ‹#hex›. Hue and chroma
  are its readout." (PN2: today's line without "in Advanced").
- **Choosing Follow primary or Custom tint while pinned** unpins and sets that source: `setNeutralPinned(false)`,
  then `setNeutralFollow(…)`. That is exactly the old switch off followed by that choice, so the saved bytes match.
- **Exactly one source is selected,** and Pinned is selected exactly when `neutral.anchor` is set. While pinned,
  Follow and Custom cannot be flipped underneath the pinned gray (the cost the mock named; the hidden `auto` is
  kept and comes back on unpin).
- **The "Pinned neutral" Advanced section and its switch are gone.** Advanced reads "Show 4 advanced" (the four
  status colors).
- **PN3:** `neutral.anchor` loses `advanced: true` in `levers.ts`, and `regen.ts` rewrote the lever manifest. This
  keeps R2 (the Palettes tier follows the manifest flag, held by `test-pages.ts`) true without an exception.
- **The 380 fit.** At the narrow tier the three segments overflow their row by 19px at the 12px segment padding.
  One rule, `.p3-frame[data-w="narrow"] .p3-seg-snug .p3-seg-tab { padding: 0 var(--p3-space-100); }`, pads them at
  8px. Only the neutral source opts in (`p3-seg-snug`), so no other segmented control moves.

### Equivalence (scratch driver, not committed)

The same session on a build of `origin/main` (`273221f6`, today's switch behind Show advanced) and on this branch:
boot, pin, type `#5c6670`, unpin via Follow primary, pin, unpin via Custom tint, on prism3, aurora and harbor. On main,
each "unpin via" is the switch off and then that choice. **18/18 snapshots byte-identical** in `brandState.neutral` and
in the whole persisted brand, and **30/30 downloads byte-identical** (the tokens file and the design.md brief, after
each step but the first pin). 0 page errors on either side. Harbor shows the one non-trivial case: unpinning via Custom
tint from Follow primary writes the primary's hue (195) as the custom hue on both sides.

### The tests, and how they are independent

`test:chrome` section 28, on both hosts, both themes, at 1280 and 380. The truth for "pinned" is the persisted brand
(web, read from storage) and the preview's neutral anchor pill (both hosts), a separate render path from the levers.
The labels, the state line, the typed gray and the section titles are literals in the test. It holds: the three
choices in order with exactly one selected; Pinned selected iff the anchor is set; the color field only while pinned,
directly under the choice; Follow and Custom each unpin and restore their source (with the saved shape checked on the
web); the state line; no "Pinned neutral" section and no switch behind Show advanced ("Hide 4 advanced"); and the 380
fit, unpinned and pinned (the selected segment is bold, so wider). Section 12 now expects `neutral.anchor` everyday and
drawn only while pinned, and its search check reads the status colors as the advanced levers reached.

Mutations, each failing by name (a `wip:` commit before each):

| Mutation | Fails |
|---|---|
| the Advanced "Pinned neutral" section and switch put back | `#2175 … no "Pinned neutral" section and no switch remain behind Show advanced` (8, every host, theme and width); `test-pages.ts`: `no manifest lever has two homes` and `each lever's tier follows the manifest flag` |
| Pinned shown selected while the anchor is unset | `#2175 … unpinned, exactly one source is selected and it is not Pinned` (8), and each case then stops at `neutral-anchor-hex` (8) |
| the narrow padding rule dropped | `#2175 {web,figma} {light,dark} 380: {unpinned,pinned}, the three neutral sources fit their row with no clipping` (8; the last segment ends at 349 in a 330 row) |

### Not in scope

#2184 (the shadow tint follows the stored `neutral.hue`, also while pinned) is untouched.
