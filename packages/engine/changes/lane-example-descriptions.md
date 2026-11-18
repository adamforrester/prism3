---
engine: minor
---
The example brands carry a few words each, in a new pure registry, `example-registry.ts` (#3977, owner decision Q-EB1 A): `EXAMPLES` holds each example's id beside the line the hosts show under its name, `EXAMPLE_IDS` is read from it (`emit-brandinput.ts` re-exports both), and `@prism3/engine` exports `EXAMPLE_DESCRIPTIONS`, id → line. The studio's start window and brand menu, and the plugin's, which is the same shell, show the line under each example, muted. No committed artifact moves.
