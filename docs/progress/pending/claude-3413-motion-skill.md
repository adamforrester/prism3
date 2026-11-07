## (2026-11-07) — The prism3-motion skill and its literal gate (#3413 P1)

### What landed

- **`skills/prism3-motion/SKILL.md`**, a fifth shipped skill (owner decisions Q-M1–Q-M7 all A on #3413): the
  motion token families an agent binds, rules R1–R11, six recipes on today's tokens (dialog, accordion, tabs
  indicator, toast and banner, the spinner's delayed show, focus) and a gaps table. Written fresh, in the
  voice standard, from KB `18-motion-foundations` / `21-motion-spec-and-handoff` and the engine's own motion
  decisions; nothing taken from the reference skills. Each rule names its grounding. The focus ring never
  animates in (Q-M4 A); the dialog fades at `motion.duration-reduced.normal` under reduced motion (Q-M5 A).
  **The wording is held for the owner's sign-off in the PR.**
- **Discovery:** the `.claude/skills/prism3-motion` symlink (`lint-skills` check 6), the ecosystem page's
  `load-skills` members (`lint-ecosystem` MEMBERS), `llms.txt`, the README, CLAUDE.md's layer table and docs/07.
- **Pointers:** one line each from `prism3-build-ui` (beside the `motion.*` exception) and
  `prism3-build-component` (beside the ungated `motion` field, #2773).
- **`packages/engine/lint-motion-literals.ts`**, in CI after the skills gate. Three halves: no duration, curve
  or spring constant in the skill's text, and every `motion.*` name resolving in every brand's committed
  `out/<brand>.tokens.json`; and (added below) no reduced exit longer than its entrance.
- **Filed, per Q-M6 A:** G1–G6 as #3481–#3486; raw milliseconds in `tab`/`tabs`/`banner` motion prose as
  #3487; `dialog`'s reduced form dropping the fade as #3488.
- **Reduced order (owner decision Q88 A):** the reduced ramp isn't monotonic (#3493: in every brand the reduced
  `fast` outlasts the reduced `normal`), so the accordion and the toast and banner recipes now use one reduced
  role, `motion.duration-reduced.normal`, both ways. R3, R7, checklist item 3 and the gaps table say so. The
  gate gains a third half, REDUCED EXIT LONGER: each recipe's direction-tagged reduced roles are compared in
  the emitted milliseconds of every brand, aliases followed to the primitive, with floors on the reduced
  forms and pairs it reads.

### Why the literal oracle is a shape

The obvious gate reads the emitted durations and flags any number equal to one. It's derived from the
subject's neighbor (docs/34 sub-shape 2) and passes an off-ramp `180ms`, which is the value an agent invents.
So the literal half imports nothing from `theme.ts` and reads nothing from `out/**`: the patterns are typed
in the gate. A `motion.duration-ms.*` path fails too, as a number spelled as a path. Non-motion numbers are
admitted by exact text and file, each with a reason; today one, WCAG 2.2.2's "five seconds". An unused
allowance fails as stale.

### Mutations, each failing by name

Recorded with the commands and output in the PR: a literal `200ms` in the skill (DURATION LITERAL), a
`cubic-bezier(0.2, 0, 0, 1)` in a recipe (CURVE LITERAL), and `motion.easing-role.enter` renamed in the
skill (UNRESOLVED PATH; `lint-skills` also fails it, as a dead token path, from its own probe tree). The
accordion's or the toast's reduced form put back to `…normal` entering and `…fast` leaving fails as REDUCED
EXIT LONGER, naming all 5 brands.

### Remaining

P2 (the token gaps), P3 (the motion-patterns file and its gates), P4 (Figma animation styles) and P5 (the
skill teaching patterns) stay open on #3413. The gate's scope widens to the defs' `motion` prose when #3487
lands.
