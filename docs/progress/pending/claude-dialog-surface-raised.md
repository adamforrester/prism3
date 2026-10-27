## (2026-10-27) — The raised surface: Dialog's panel gets its own role, defaulting to the card (#3049)

The owner took Q721 A on #3049, then answered the proposal: the name is `color.foreground.raised` (Q3049.1 C), the
setting acts in light and hc-light only (Q3049.2 A), the role aliases a palette step (Q3049.3 A), and its values are
`card | page | white` with the reference brand set to `white` in both its inputs (Q3049.4). The scrim is #3050.

- **The role.** `foreground.raised`, after the three surface tiers. Unset or `card`, it aliases the card's own step in
  every mode, so no existing value moves in any brand (checked across every committed emission). It has no inverse
  twin: a dialog renders in the top layer, so the inverse-coverage register lists it as structural.
- **The setting.** `raisedSurface`, in Color, a value setting. Its Studio home is Components › Dialog, below Dialog
  title size. The label ("Dialog surface"), option labels and description are drafts (Q3049.6 on the PR).
- **Dialog.** The panel binds `color/foreground/raised`. The primary and link inks are held on it in place of the
  card, which no component places them on any more (Q419 A: no wider). The studio's scrim cards draw it too.
- **The reference brand.** White in light; its card (`neutral.900`, white, black) in the other modes.
- **Gates.** `test.ts`'s #3049 block: the default is the card, the dark family is always the card, the light values
  hold what they name, every dialog ink clears its floor on the panel in every brand × mode × value (1,176 pairs),
  the override twin, both reference-brand inputs, and the committed emission. Each failed by name under a mutation.
- **An existing Figma file.** Apply Theme adds the variable; Update file then rebinds Dialog's panel.
