---
engine: minor
---
Component spec model (#2830, phase 1). component-specs.ts builds one pure model per projected component from its def
and Figma anatomy plan: anatomy parts, per-size redlines (padding, gap, height, width, min-width) as token names with
literal or derived px where the build writes a number, text styles, per-state colors per part, and nesting with the
set's component properties. emit-component-docs.ts writes it to out/components/specs.json (one more committed
artifact) and as a Specs section in each projected component's page. apps/plugin/test-roundtrip.ts reads every built
set back against the model, both directions, by name. No token path moves, so CONTRACT is unchanged.
