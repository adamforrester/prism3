---
engine: minor
---
The page's secondary ink can be fitted on the page (owner Q-TXT1 A): a new optional brand input,
`secondaryTextGround: floor | page`, default `floor`. `floor` keeps today's fit, where `text.secondary` and
`icon.secondary` clear their bar on the contrast floor (`background.secondary` unless `floorStep` moves it). `page`
fits them on `background.primary`, the lightest secondary that still clears the bar on the page; the role's
description and `.ai.json` per-surface wording are measured, so they say it holds on `background.primary` and falls
below the bar on `background.secondary`. The inverse band keeps its own floor. The reference brand's legacy fixture
sets `page`: `text.secondary` and `icon.secondary` move from neutral.550 (#636A6F, 5.49:1 on white) to neutral.500
(#70767C, 4.59:1) in light, 700 → 650 in hc-light and 300 → 350 in hc-dark; dark keeps 450. Every brand that leaves
the input unset emits byte-identical artifacts. No token name moves. CONTRACT unchanged.
