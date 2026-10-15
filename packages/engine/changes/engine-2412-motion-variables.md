---
engine: minor
---
Motion reaches Figma in Figma's own motion types (#2412, owner decisions Q291 A). The `motion` collection's durations
(`motion/duration-ms/*`, `motion/duration/*`, `motion/duration-reduced/*`, `motion/stagger`) are TIMING variables in
seconds instead of FLOAT milliseconds, so a Figma animation can bind them. The easing curves join as EASING
`CUSTOM_CUBIC_BEZIER` variables (hidden from publishing), the easing roles as EASING aliases of them (re-pointed per
mode where a mode lever moves one), and the springs as EASING `CUSTOM_SPRING` holding `bounce` only (1 − the damping
ratio). Transitions have no Figma form: Figma has no composite variable (`MOTION_FIGMA_COVERAGE` says so per family).
Figma refuses `scopes` on both types, so they stay `ALL_SCOPES` and no executor writes one. Apply Theme writes the
collection through the new `buildMotionVarPlan` and the mixed-type executor, and the CLI paste path through a new
`motion-vars` pass. On a file themed at 0.235.0, Apply replaces the FLOAT motion variables in Prism3's own stamped
`motion` collection with TIMING ones under the same names, and says how many (owner decision Q293 A); every other
type mismatch still refuses. The CLI's `motion-vars` pass checks every row's type before any write and, on a mismatch, writes nothing and names it; it cannot see the stamp, so it never replaces. Every brand's `out/figma/<brand>/motion.json` moves. The DTCG does not, so CONTRACT is unchanged.
