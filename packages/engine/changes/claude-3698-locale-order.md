---
engine: patch
---
Emitted order no longer depends on the machine's locale (#3698 finding 2). The emitters sorted icon names, provider
marks, agent-link flags, spec coordinates, rename-map rows and release-note items with a bare `localeCompare`, so
under a Czech locale `regen --check` reported drift on 8 artifacts. They now share `localeFreeCompare`
(`locale-free-order.ts`): ASCII case folded, then UTF-16 code units. That is the order the artifacts were committed in,
so no emitted byte moves on an English host. A new gate, `lint-locale-order.ts`, refuses a locale-dependent
comparison anywhere under `packages/engine/`.
