## (2026-11-17) — The Alias path control is the shared segmented control, and one chrome arm holds every selected segment to one source (#3911)

**The cause.** Not a leaking tab style and not a stale rule: a one-off. The token list (`renderPreviewTokens`, `main.ts`)
built Alias path from the legacy preview classes, `.seg` of `.seg-b`, in `styles.css`. #2487's Q195 gave `.seg-b.on` a
2px `--ink` underline (an inset box-shadow) so its selection reached 3:1. Every other segmented control in Studio and
the plugin is the chrome's `.p3-seg` of `.p3-seg-tab`s and draws none. The legacy classes also ignore the chrome's dark
theme, which the token list's card hides by being pinned light (`legacyHost`).

**The fix.** Alias path is `choice('Alias path', 'token-path', …)` from `lever-kit.ts`, the control every lever uses.
The hooks are unchanged (`token-path-full`, `token-path-short`; the group is now `token-path`). It is a radio group, so
it has one Tab stop and the arrow keys move between options. Section 27's required stops drop `token-path-short` for
that reason. The `.seg` rules in `styles.css` are dead now and carry a note. Deleting them needs a
`lint-live-css.mjs --accept`, which re-sweeps every browser suite; filed as a follow-up.

**The survey.** Section 3911 walked every place, Export and the token list on both hosts and both themes. It found
these segmented controls, all on `.p3-seg` with the shared selected style: the preview's mode control, Color's
sub-page row, every lever `choice` (Neutral source, Scrim strength, Type scale, Density and the rest), and Export's
setting rows. Two underline rows are left alone on purpose, as tab rows rather than segmented controls: the token
list's Primitives / Semantics tier (`.pvseg.tok-seg`, #466) and Export's artifact switcher (`.p3-export-tabs`, #3553
Q-UI11 A). The mode control is held (disabled) on Color › Palettes and draws the disabled treatment there
(`.p3-mode`, #2208 DB1 A). The arm checks it for no underline but does not compare its style.

**The gate.** `test-chrome.mjs` section 3911 (shard 2). For each drawn segmented control (`.p3-seg`, the legacy `.seg`,
any `[role="radiogroup"]`), it reads the selected segment's computed fill, ink, weight, box-shadow, outline, borders
and corners. It compares them, property by property, with a probe `.p3-seg-tab` the test appends to the frame inside
the control's own `data-theme` and nothing else of its context. It also fails on any inset, vertically offset shadow,
an underline, and it requires the Alias path control to be measured with each option selected. On main it fails 24
checks, six per host and theme, every one on the Alias path, and nothing else. After the fix: 340 of 340.
MUTATIONS, each after a `wip:` commit on both rebuilt bundles:
- `.tok-ctrls .p3-seg-tab[aria-checked="true"]{box-shadow:inset 0 -2px 0 var(--ink)}` added to `styles.css` fails
  `#3911 … token-path's selected segment draws no underline` and `… draws the shared selected style`: 16 checks,
  each Alias path reading on both hosts and themes, and no other. It goes in the legacy sheet because the chrome build
  refuses a shadow in `chrome.css` (T5), so that is the sheet such drift would come from.
- Main's markup, the control on `.seg`, fails `#3911 … the Alias path control is a shared segmented control` and
  `… inspect-token-list's selected segment draws no underline`.

**Q195 retired for this control.** Section 45's Q195 arm required a 2px edge at 3:1 on `.seg-b.on`. That is the
underline #3911 asks to remove, so the arm is gone, and section 3911 holds the control to the shared style. Whether the
shared selected style, a 1px `--p3-edge-bar` edge, should also meet Q195's 2px-at-3:1 bar is the owner's call. This
PR does not change it.

**Left for the owner.** The shared control is the chrome's control height, about 36px. Its neighbors in the row,
Show and Category, are legacy `.select`s at about 41px, so the Alias path caption sits about 5px lower than theirs
(`.tok-ctrls` aligns the fields' bottoms). Before/after screenshots are on the PR.
