---
engine: patch
---
`color.ts` exports `formatRatio`, the one contrast-ratio formatter every surface prints through (#3697 L3): two places,
floored, then `:1`, so a 4.496 pair reads "4.49:1" and never "4.50:1" beside a 4.5 minimum. `{ bare: true }` drops the
`:1`. The plugin's style guide and override lines and the studio's step pickers, preview tooltips and contrast-contracts
table now call it. The preview tooltip, the override lines and the contracts table used to round. The override
lines also rounded the ratio before printing it; they now print the unrounded one, while the `ratio` fields agents read
in `data` stay rounded to two places. No emitted artifact
changes; the engine's own contract-report markdown still rounds (#3759).
