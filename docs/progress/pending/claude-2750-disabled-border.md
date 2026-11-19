## (2026-11-18) — The disabled levers also set the disabled border's contrast (#2750)

**What.** The owner decision on #2750 (lettered A; its text is option B's, which is what is built): `disabledStrategy` and `disabledMin` now set a contrast target for
`color.disabled.border`, not only for the disabled inks. The border, and its inverse twin, are picked from the
same candidates against the same worst-case surface as `disabled.text` / `disabled.icon`, at the same floor. Before,
both were the fixed `neutralLow()` step that `disabled.fill` uses, rated `min: 0`: 1.5–1.8:1 against the page at every
lever setting. The two roles join the contract set, so the contract count per mode rises by two.

**Held for the owner (on #2750).** The decision fixed that the levers set a target, not which one. Built: the same
floor as the inks (4.5 under `full`, the dial under `reduced`, ≥4.5 in high contrast), so the border's value equals
`disabled.icon`'s. The other options are a fixed 3:1 non-text floor that ignores the dial, or a floor a set step
below the inks. Recommendation: the one built, since it is the only option where both levers visibly move the edge.

**Ripples.** Every control that binds `color.disabled.border` gets a darker disabled edge (the issue listed these as
accepted). Tab's disabled selected bar binds the same role, so it darkens too; it is left bound to the border.
Switch's disabled glyph bound `disabled.border` only because that equalled the disabled track (#1764); it now binds
`color.disabled.fill`, the track role itself, so its value and its 3.04–5.49:1 against the thumb are unchanged. The
#1764 test caught this: with the border moved and the glyph left alone, glyph and thumb fell to 1.43:1.

**Studio.** The page's `disabled.border` is now measured on the contrast floor, so it joins the floor's disabled
group, and every verdict count rises: 239 → 241 per mode, 956 → 964 for the default theme. The group's label
"Disabled text and icon" becomes "Disabled text, icon and border" — **a draft, held for the owner** (the other option
is a separate "Disabled border" group; recommendation: the one built, since the three share one lever). One visible
coincidence, **also flagged**: at the default theme's floor the disabled edge lands on the same neutral step as an
editable field's rest edge (`#808284` light, `#67696b` dark), so a disabled field now differs from an editable one by
its fill and value ink, not its edge. The chrome F1 A arm compared all three and now compares fill and ink.

**Measured.** A new `test.ts` #2750 block sweeps `full`, `reduced 3` and `reduced 4.5` in light, dark and
high-contrast, page and inverse. On main both arms fail (every border `min 0`; `reduced 3` and `reduced 4.5` both
`#c0c1c2`); with the fix both pass (`reduced 3` gives `#808284` at 3.18:1, `reduced 4.5` gives `#67696c` at 4.54:1 on the
test seed). Mutation: reverting only `inverse.disabled.border` fails "#2750 disabled.border clears the disabled levers'
floor in every setting, mode and context" by name. No token names move, so `CONTRACT_VERSION` is untouched.
