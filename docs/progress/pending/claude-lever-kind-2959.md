## (2026-10-23) — Every lever declares VALUE or STRUCTURAL (#2959, owner Q599 A)

The owner's concern: every component setting adds coded-component complexity. The rule now lives in
`skills/prism3-build-component` (its own section before §7) and on the `Lever` type: a **value** lever resolves
to token values at generation time, so a coded component reads a token and costs no code; a **structural** lever
changes anatomy or behavior, so the shared coded component implements and tests every option, and a new one needs
the owner's explicit OK in its wireframe. Prefer brand-wide settings over per-instance props.

### What was built
- `kind: 'value' | 'structural'` on every lever in `packages/engine/levers.ts`, emitted into
  `schema/lever-manifest.json` (and so `list_levers`). Engine `minor` via the change note.
- `test.ts`: a lever with no kind fails by name (`MISSING: <key>`); `STRUCTURAL_LEVERS` pins the structural set,
  so marking a new lever structural, or downgrading one, is a second edit a reviewer sees.
- `lint-skills.ts` check 8, opt-in by `classifies: levers` in a skill's frontmatter: the skill states the rule and
  holds one table row per live lever whose kind matches the manifest. Self-checked both ways; a wiring floor
  fails if `prism3-build-component` stops declaring it.

### Classification
Six structural: `fieldStyle`, `searchFieldStyle`, `tagStyle`, `buttonIcons`, `buttonTextHover`,
`outlineInteraction`. The other 46 live levers are value; the retired `radiusHairline` carries `value` too, and
the skill table leaves it out. The borderline calls (`buttonTextHover`, `outlineInteraction`, `controlShape`,
`buttonContentSize`, `interactivePalettes`) are held for the owner on the PR; the gate makes any flip a
two-line edit.

### Trap
`tsx` does not typecheck, so the required `kind` on `Lever` alone would let an unclassified lever through at
runtime. The `test.ts` arm is the gate, not the type.
