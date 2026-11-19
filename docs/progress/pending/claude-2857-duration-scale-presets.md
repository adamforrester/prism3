## (2026-11-19) — Motion presets, engine foundation: long duration steps, a preset → step mapping, a brand-only group (#2857, Q-MP7 option 3)

**What.** The three items of the owner's Q-MP7 option 3, engine side only. No plugin, studio or Figma style work.
1. **The duration scale extends past `slower`.** `motion.duration.{long,longer,longest}` hold 900, 1100 and 1300ms at
   the standard tempo and scale with tempo like every step; their reduced twins are 0ms, the existing rule for any step
   above 200ms. The `duration-ms` primitives they alias appear on their own, because that tier is the union of every
   reachable value. Six guaranteed names: `CONTRACT_VERSION` 15.1.0 → 15.2.0, raised first, then
   `token-contract.ts --accept`. No short step: every starter preset already lands on an existing step.
2. **`motionPersonality.presets`** maps a preset to a step. `MOTION_PRESET_DEFAULTS` (`theme-motion.ts`) is the
   default mapping, the eleven #2857 wireframe cards on the step each plays. A preset is not a token, per the owner's
   "no per-preset duration tokens": the resolved presets go to the agent sidecar as `motion_presets` (schema 0.6),
   each naming `motion.duration.<step>`, `motion.easing-role.<role>` and `motion.duration-reduced.<step>`. The future
   Figma animation styles bind those same role variables. `buildMotion` refuses an unknown preset and an unknown step
   by name; the schema enumerates both too, though the hand-rolled validator does not read `propertyNames`.
3. **`motionPersonality.brandOnly`** emits a brand's one-offs under `motion.brand.<name>`: a spring (`damping`,
   `stiffness`), a distance-scaled duration (`baseMs`, `msPerPx`, optional `minMs`/`maxMs`) or gesture physics
   (`coastTauMs`, `rubberBand`, `parallax`). Each is a custom-typed leaf (`spring`, `distanceDuration`, `gesture`), so
   the conforming projection omits it (#642) and Figma gets nothing yet. No corpus member sets one, so the group is in
   neither `guaranteed` nor `brandDependent`.

**No value moves for any example brand.** Neither input is set anywhere, and the only emission diff is the added steps,
their primitives and the sidecar's new block.

**DRAFT for the owner.** The step names and values (recommended `long`/`longer`/`longest`; the alternative is a
t-shirt scale, `xl`/`2xl`/`3xl`, which renames the existing steps and so belongs in the batched MAJOR, #4165 with
#1421). The preset names and set (Q-MP1 to Q-MP6 are open). The reduced step staying the preset's own rather than
the brand's. The brand-only group's name (`motion.brand`) and fields. The reference brand's mapping waits on the
brand-team questions.

**Trap.** #3998 (springs to CSS) also raises the contract to 15.2.0. Whichever lands second re-raises to 15.3.0 and
re-runs `--accept`.
