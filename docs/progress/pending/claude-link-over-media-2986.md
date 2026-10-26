## (2026-10-26) — Link over photography: `inverse.text.primary`, underlined, no new role (#2986)

**Status:** prose and metadata only. ENGINE minor (change note; every brand's `.ai.json` moves). CONTRACT unchanged:
no token is added or renamed, and the derivation is untouched (Q689 A).

### What changed

- **Owner decision Q690 A (2026-10-25), on #2986:** no on-media link role. Over a photograph a link is set in
  `inverse.text.primary` and keeps its underline as the link cue, on the media veil (#1151) when the photo is busy. A
  brand that wants a brighter inverse link pins it in Theme › Color › Links (#2992).
- **`.ai.json`:** written in `ai-metadata.ts`'s link branch, on the text links only (an icon has no underline). The
  inverse twins inherit it through `onInverseGround`'s remap, which leaves `inverse.text.primary` and `veil.*` as they
  are. It sits in `avoid_when`, ahead of the floor note.
- **Skills:** a bullet in `prism3-consume` §4 (the `avoid_when` traps) and one in `prism3-rebind` §5, beside "measure
  the ring". The rebind bullet sorts a brand's brighter link as a brand item, not a Prism3 gap.
- **`lint-skills.ts` check 8, owner rules:** a declared rule must be stated in one paragraph of each skill it names,
  and in the `avoid_when` of every emitted role its pattern matches; the names it quotes must be in the token tree. It
  has a both-directions self-check through the shipping function and a wiring floor. Mutations, each failing by name:
  the consume bullet deleted; every "underline" taken out of the rebind bullet; the `.ai.json` sentence dropped (ten
  roles named); the paragraph split disabled (self-check); the real call site deleted (wiring floor).

### Held for the owner

- **The dark-mode pairing.** `inverse.text.primary` is light in the light modes and dark in the dark modes, while the
  veil is the same in every mode; the veil's own `.ai.json` already says the inverse text roles are not a safe pair
  for it. The rule as written asks for the veil to be picked per mode and the contrast checked on the photo. Q-block on
  the PR.
