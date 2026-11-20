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
`lint-live-css.mjs --accept`, which re-sweeps every browser suite; filed as #3923.

**The survey.** Section 3911 walked every place, Export and the token list on both hosts and both themes. It found
these segmented controls, all on `.p3-seg` with the shared selected style: the preview's mode control, Color's
sub-page row, every lever `choice` (Neutral source, Scrim strength, Type scale, Density and the rest), and Export's
setting rows. Two underline rows are left alone on purpose, as tab rows rather than segmented controls: the token
list's Primitives / Semantics tier (`.pvseg.tok-seg`, #466) and Export's artifact switcher (`.p3-export-tabs`, #3553
Q-UI11 A). The mode control is held (disabled) on Color › Palettes and draws the disabled treatment there
(`.p3-mode`, #2208 DB1 A). The arm checks it for no underline but does not compare its style.

**The gate.** `test-chrome.mjs` section 3911 (shard 2). For each drawn segmented control (`.p3-seg`, the legacy `.seg`,
any `[role="radiogroup"]`), it reads the selected segment's **whole** computed style, and its `::before` and
`::after`'s, every property but a short closed list that only places or sizes the segment (its box, flex, padding and
gaps, the transform origins, the label's face for Export's mono naming option, and custom properties). Since the review
of 3403f780 it reads every property rather than a named list, so a paint property nobody listed fails by default. It compares them, property by
property, with a probe `.p3-seg-tab` the test appends to the frame inside the control's own `data-theme` and nothing
else of its context. The probe is a `.p3-choice` with the same `data-label` when the control is one, because that is
where the shared rules draw the hidden bold-width reservation (#3115); no other class of the control's is copied. It also fails on any inset, vertically offset shadow,
an underline, and it requires the Alias path control to be measured with each option selected. On main it fails 24
checks, six per host and theme, every one on the Alias path, and nothing else. After the fix: 340 of 340.
MUTATIONS, each after a `wip:` commit on both rebuilt bundles:
- `.tok-ctrls .p3-seg-tab[aria-checked="true"]{box-shadow:inset 0 -2px 0 var(--ink)}` added to `styles.css` fails
  `#3911 … token-path's selected segment draws no underline` and `… draws the shared selected style`: 16 checks,
  each Alias path reading on both hosts and themes, and no other. It goes in the legacy sheet because the chrome build
  refuses a shadow in `chrome.css` (T5), so that is the sheet such drift would come from.
- Main's markup, the control on `.seg`, fails `#3911 … the Alias path control is a shared segmented control` and
  `… inspect-token-list's selected segment draws no underline`.
- `text-decoration: underline 2px` on the selected Alias path segment fails `… draws the shared selected style —
  differs in text-decoration-line`, and a 2px `--ink` bar on its `::before` fails the same arm, `— differs in ::before
  content … position … height … background-color`: 8 checks each. Both passed the arm before (review of 90e374ba).
- A 2px `--ink` `background-image` gradient at the bottom of the selected Alias path segment fails `… draws the shared
  selected style — differs in background-image`. It passed the arm before (review of 15b22b87), because the segment's
  own `backgroundImage` was not compared.
- A 2px `--ink` `border-image` at the bottom of the selected Alias path segment fails `… draws the shared selected
  style — differs in border-image-slice … border-image-source linear-gradient(…) (shared none)`, and
  `filter: drop-shadow(0 2px 0 var(--ink))` on it fails the same arm, `— differs in filter drop-shadow(…) (shared
  none)`: 8 checks each. Both passed the arm before (review of 3403f780), because neither property was on the list.

**Q195 retired for this control (owner-decided, #3911 Q-BK1 A, 1(a)).** Section 45's Q195 arm required a 2px edge at
3:1 on `.seg-b.on`. That is the underline #3911 asks to remove, so the arm is gone, and section 3911 holds the control
to the shared style. The owner decided Q195 stays retired here: the shared selected style, a 1px `--p3-edge-bar`
edge, stands for every segmented control. This PR does not change it.

**Row height (owner-decided, Q-BK1 A, 2(c)).** The shared control is the chrome's control height, about 36px. Its
neighbors in the row, Show and Category, are legacy `.select`s at about 41px, so the Alias path caption sits about 5px
lower than theirs (`.tok-ctrls` aligns the fields' bottoms). The owner chose to move the token list's selects onto the
shared `.p3-select`, in a separate PR: #3938. Before/after screenshots are on the PR.
