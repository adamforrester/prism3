## (2026-10-23) — Every lever declares VALUE or STRUCTURAL (#2959, owner Q599 A)

The owner's concern: every component setting adds coded-component complexity. The rule now lives in
`skills/prism3-build-component` (its own section before §7, and the lever-kind table header) and on the `Lever`
type, as the owner's code test (Q610 A): **structural** = the coded component needs different markup, logic or
states per option; **value** = only token values differ (CSS changes, nothing else). A structural lever is what
the shared coded component implements and tests per option, and a new one needs the owner's explicit OK in its
wireframe. Prefer brand-wide settings over per-instance props.

### What was built
- `kind: 'value' | 'structural'` on every lever in `packages/engine/levers.ts`, emitted into
  `schema/lever-manifest.json` (and so `list_levers`). Engine `minor` via the change note.
- `test.ts`: a lever with no kind fails by name (`MISSING: <key>`); `STRUCTURAL_LEVERS` pins the structural set,
  so marking a new lever structural, or downgrading one, is a second edit a reviewer sees.
- `lint-skills.ts` check 8, opt-in by `classifies: levers` in a skill's frontmatter: the skill states the rule and
  holds one table row per live lever whose kind matches the manifest. It also requires the Q610 test's wording,
  so the definition cannot drift back to "anatomy or behavior". Self-checked both ways; a wiring floor
  fails if `prism3-build-component` stops declaring it.

### Classification
By the Q610 test. Four structural: `fieldStyle`, `searchFieldStyle`, `tagStyle`, `buttonIcons`. The other 48
live levers are value, `buttonLabelWeight` (now Control label weight, #2963) included; the retired
`radiusHairline` carries `value` too, and the skill table leaves it out. `buttonTextHover` and
`outlineInteraction` are value: Button's and IconButton's `codeOnly` prescribe no branch for either, and the
`do` lines and `applyButtonLayout` / `applyOutlineInteraction` only key, rebind or drop the overlay token in the
overlay paint slot every outline and text button already has, at the same hover and pressed states.

### Trap
`tsx` does not typecheck, so the required `kind` on `Lever` alone would let an unclassified lever through at
runtime. The `test.ts` arm is the gate, not the type.
