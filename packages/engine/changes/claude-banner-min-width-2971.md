---
engine: minor
---
Banner gets a minimum width (#2971, owner decision 2026-10-23, Q2971.1–3 A): one floor for both the contained and the full width, bound to a new `container.min` token (320px, the narrowest column and the WCAG 1.4.10 reflow width). Every member binds it as its `minWidth` in Figma; code reads it as `min-inline-size: min(var(--container-min), 100%)`, clamped to the host so a column narrower than 320 never scrolls the page sideways. `container.min` is emitted for every brand, fixed rather than a lever, and joins the layout variable collection as `container/min`. `CONTRACT_VERSION` 14.9.0.
