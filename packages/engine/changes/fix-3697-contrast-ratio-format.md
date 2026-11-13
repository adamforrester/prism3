---
engine: patch
---
`color.ts` exports `formatRatio`, the one contrast-ratio formatter every surface prints through (#3697 L3): two places,
floored, then `:1`, so a 4.496 pair reads "4.49:1" and never "4.50:1" beside a 4.5 minimum. The plugin's style guide
and override lines and the studio's step pickers and preview tooltips now call it. The studio's preview tooltip and
the plugin's override lines used to round. No emitted artifact changes.
