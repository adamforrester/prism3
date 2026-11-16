## (2026-11-16) — `space.550` joins the spacing scale; Button's hit-target floors bind spacing tokens (#3408, Q-HT1 A, Q141)

**What.** The owner revised Q141 on #3408: the button's code-side hit-target floor binds a spacing token at every size,
with no dedicated hit-target tokens and no mixing of token types. Small stays at `space.300` (24px). Medium and large
needed a 44px step, so Q-HT1 A adds `space.550` = 44 to the scale, beside the half steps `space.150` and `space.250`.
It flows wherever the scale goes: the DTCG tree of every brand, the Figma `space` collection, `.ai.json`, the modes
and NB regression reports (marked as an engine addition, since Prism2 has no 44 step), and the token contract
(15.0.0 → 15.1.0, MINOR, one added path, accepted with `token-contract.ts --accept` after the bump). Each button def
now binds `size.<size>.hit-target` (`space.300` / `space.550` / `space.550`), and its `hit-target` codeOnly entry names
those tokens. No part binds them, since Figma has no hit areas: they exist so code reads the floor as a token. The
emission does not carry a def's `tokens` map yet; that is #3506 (Q142 A), a separate PR.

**The ladder kept apart from the scale.** `scale.ts` used one list for both the emitted scale and the density ladder
(compact one step down, spacious one step up). Adding `550` to that list would make spacious move `space.500` to 44
instead of 48, and compact move `space.600` to 44. No def has a density-following `space.500` or `space.600` today
(measured: every component artifact regenerated identically with 550 on the ladder), but the rule would change for the
next one. So `550` is a step of the scale only (`SPACE_OFF_LADDER_KEYS`), and the ladder is unchanged. Whether it should
join the ladder is held as an OWNER DECISION on the PR.

**One alias moved, by an existing rule.** New Balance's medium grid margin is 44px. By #3052's rule (Q785 A) a grid
margin or gutter links to a spacing step when one has its value, and otherwise to `core.dimension.*`, so it now links to
`space.550` (it was `core.dimension.44`, in Figma and DTCG, for both NB fixtures). The px is unchanged. `test.ts` #3052
G2 pinned the old link, so its pin moves to `space/550`, and G3's floor of three dimension links is dropped: those rows
were the 44px margins, and no brand's grid value now sits on the dimension grid off the spacing scale, so that branch
runs on every row but has no witness. Held as an OWNER DECISION on the PR, with the alternative of keeping grid links
off `space.550`. `docs/45`, the `prism3-theme` skill and the comments that named the old link are updated.

**Measured.** `lint-hit-target.ts` gains an arm: each button size binds `size.<size>.hit-target` as a `space.*` step that
resolves, on every density's build, to the gate's own literal (24 / 44 / 44, `CODE_FLOOR_PX`, never read from the def or
`scale.ts`). Run against main's button def, it fails with 9 "binds no code-side hit-target floor" lines; with the fix it
passes. Mutations, each failing by name: medium → `space.500` (40px ≠ 44); the three bindings deleted; large →
`size.md.min-height` (not a `space.*` step); `550` dropped from the scale (`space.550` resolves to nothing). `test.ts`'s
hand-written space order (#1594) now lists `550`.
