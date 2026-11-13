## (2026-11-13) — Slider's thumb names and FieldLabel describe the ", required" rule (#3699 D3699.1–3)

Follow-up to #3699 (Q-FL2.1 A: a required slider puts "required" in each thumb's accessible name and sets no
aria-required). The independent delta review found three descriptions that still told the old story; the owner
accepted option B and the drafted wording (D3699.1 B, D3699.2, D3699.3).

- `_slider-thumb`'s `aria-label` and Slider's `thumbLabels` now end `, with ", required" added when the slider is
  required.` For `thumbLabels` the clause follows "when not set", so it reads as applying to custom labels too, as
  the owner decided.
- FieldLabel's `required` prop, `accessibility.aria` and guidance now read "required / aria-required, or for a
  slider, "required" in the thumb's accessible name". FieldLabel lists Slider as a partner, so the old
  aria-required-only wording was false for it.
- `test.ts` holds each string as a literal (new `D3699.1`, `D3699.2` and `D3699.3` arms beside the `Q-FL2.1` arm).
  Prose only: no Figma surface move, `CONTRACT_VERSION` and `EXECUTOR_REVISION` unchanged; `engine: minor` because
  the docs and `.ai.json` move.

### Not changed

Slider's `labelPattern` ("The Slider names each thumb: its label for a single value, "Minimum {label}" and "Maximum
{label}" for a range.") and the maintainer `<input type="range">` note also describe thumb names without the suffix.
D3699.1 named only the two prop descriptions, so they are left for the owner. Option C (making ", required"
translatable) was not taken.
