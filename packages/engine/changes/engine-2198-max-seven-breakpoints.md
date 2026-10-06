---
engine: minor
---
Layout refuses more than seven breakpoints (#2198). `bpNames` names seven, xs to 3xl, and an eighth built
and took the placeholder name `bp7`. `buildLayout` now refuses a list longer than seven (owner decision
2026-10-06, Q43 A), with the count as entered: "The brand can have at most seven breakpoints. This brand has
<n>." The refusal is in the build path, so MCP `validate_brand` and the generating tools report it in that
sentence. Narrowing what the engine accepts is a behavior change, so this is a minor bump with no contract
change. No committed artifact moves: no committed brand, fixture or brief declares more than seven.
