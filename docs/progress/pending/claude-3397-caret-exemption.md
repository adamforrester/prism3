## (2026-11-18) — The text cursor is exempt from "no shape binds a text role", by decision (#3397)

**What.** The owner answered #3397 with A (2026-11-18): the caret keeps the field's value ink,
`color.text.primary`, matching CSS `caret-color: currentColor`, and stays a named exemption from #3346's rule that no
shape binds a text role. Nothing is rebound and no value moves.

- `test.ts` #3346 arm (5): `TEXT_CARET` was "held for the owner"; its comment and its message now record the
  decision. It stays a floor, so an entry that stops breaching still fails as stale.
- `prism3-build-component` §5 states the exemption beside the rule and its one other exception (Link's current-page
  bar), so an agent authoring a def reads it where it reads the rule.
- New arm (6), `#3397 the skill records the caret's exemption…`: the skill's caret sentence cites #3397, names
  `color.text.primary` and `caret-color: currentColor`. The oracle is the skill's text, not the set.

**Measured.** On main's skill the new arm fails by name ("no caret sentence in prism3-build-component"), 1 failed;
with the change all pass. Every committed artifact regenerates unchanged, so the change note is `patch`.
