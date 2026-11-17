## (2026-11-17) — The `.ai.json` requirement states each mode's floor where the modes differ (#1779)

**What.** `ai-metadata.ts` wrote every `contrast_with[].requirement` from the light-mode `min` plus "in every mode".
Where a role's floor rises in high contrast, that understated the contract: `border.brand` said 3:1 against a 4.5:1
HC floor, and `text.primary` said 7:1 against 15:1. A payload agent checking an HC pair at the light floor would pass
a pair the engine holds higher. The sentence now groups modes by floor and names them by their `tokens.json` ids, with
the existing `modeList` phrasing ("in light and dark modes, and 4.5:1 in hc-light and hc-dark modes."). A uniform floor
still says "in every mode". Second pairs (`alsoAgainst`, #1745) read their per-mode floor from whichever end carries it.
`min` stays the light floor, and the schema's `min` and `requirement` descriptions now say so. Wording is DRAFT, held
as an OWNER DECISION on the PR.

**Plan diff.** Only `requirement` strings move, in all five committed sidecars. In each brand 225 of 243 requirements
change (273 of 291 in the reference brand): the 3:1→4.5:1, 3:1→7:1, 4.5:1→7:1 and 7:1→15:1 families, and 18 composite
washes (4.5:1→7:1). Every other field and every token tree is byte-identical.

**Gates.** `lint-voice.ts` holds a role's own pair (`contrast_with[0]`, on a role the tree gives a floor) to the floors
the token tree beside the sidecar records, mode by mode. So "in every mode" is refused where those differ, and a
per-mode sentence must state exactly the tree's floors. A role with no floor of its own in the tree (a ground listed for
the ink measured on it, such as `hover-fill` or `foreground.tertiary`) carries only second pairs at index 0. The tree
records no per-mode floor for those, so only their shape and light floor are checked; the first gate draft missed this
and flagged 17 of them. `test.ts` parses the sentence with its own patterns against the tree, and pins three literals:
`border.brand`, `text.primary`, and a uniform on-fill. On main's code, the gate rejects 1,115 old sentences and the
test fails three asserts by name. Dropping the gate's tree check fails four self-checks by name.
