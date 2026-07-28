---
name: Feature / build work
about: A change someone (or an agent) can pick up and build.
title: "[lane] "
labels: task
---

<!--
  Write this as a brief an agent could execute without you in the room.
  Title prefix: the lane in brackets — [engine] [web] [plugin] [mcp] [docs] [research].
  Add the matching lane:* label after opening.
-->

**Lane:** <!-- engine / web / plugin / mcp / docs --> · **Type:** feature · **Source:** <!-- owner direction / review / a PR follow-up / live drive -->

## What

<!-- The gap, in a paragraph. Name the files and functions that already exist and
     what they do, so whoever picks this up doesn't re-derive it. Link the doc
     section (Prism3/docs/NN) that grounds it. -->

## Why now / blocked by

<!-- Delete if neither applies. If this was previously blocked, say what unblocked it. -->

## Do

<!-- Numbered steps. Name the seam: which module owns the change, which pattern it
     mirrors (e.g. "the pure-plan + thin-executor split, same as write-plan.ts"). -->

1.
2.

## Watch-outs

<!-- The traps: async APIs, byte-identity risks, cross-mode assumptions, anything
     an in-memory shim would hide. Delete if genuinely none. -->

## Verify

<!-- How we'll know it's done. The standing gates are in CONTRIBUTING.md — list here
     only what's EXTRA for this change (a live drive, a new test case, a shim harness). -->

## Out of scope

<!-- What this deliberately does not do, and where that work lives instead. -->
