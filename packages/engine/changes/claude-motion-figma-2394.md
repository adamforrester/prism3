---
engine: minor
---
Motion reaches Figma (#2394, owner decision Q146 A). Every brand's Figma emission gains a `motion`
collection, `out/figma/<brand>/motion.json`: the `motion.duration-ms` primitives (hidden from publishing),
and `motion.duration`, `motion.duration-reduced` and `motion.stagger` aliasing them, all as FLOAT
milliseconds. The variables carry no scope, because Figma's VariableScope has no time member (plugin-typings
1.131.0 and the live API reference, both checked 2026-10-09) and no Figma property binds a duration. A brand
whose mode levers run a different tempo gets one mode per such mode, the semantic aliasing that mode's
primitive (the radius precedent). Apply Theme writes the collection through the float write plan. Easing,
spring and transition stay DTCG-only: Figma has no variable type for them. The DTCG output is unchanged, so
CONTRACT is unchanged.
