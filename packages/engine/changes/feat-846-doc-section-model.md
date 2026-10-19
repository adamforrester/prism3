---
engine: minor
---
Component usage docs, phase 1 (#846, wireframe approved 2026-10-19): one doc section model, component-doc-sections.ts,
turns a definition into the ordered sections of its usage doc — Overview, Anatomy, Styles, Usage guidelines,
Accessibility, Content guidelines, Theming, Related components, Building it in code — with the wireframe's field map.
A section with no data is left out, and what is missing goes to the new docGaps list in
schema/component-maintainer.json. out/components/<id>.md now renders the model's sections in order and nothing else,
so every page changes shape: part notes appear as Anatomy captions (notes written for maintainers are held back),
the axis prop's description joins the Styles table, Props move to Building it in code, Motion joins Accessibility,
and composition.planned leaves the page (it stays in components.ai.json, which does not change). Theming needs a
brand's modes, so the brand-independent page has none. lint-component-docs gains arm F: the model and every page
against the gate's own section rule.
