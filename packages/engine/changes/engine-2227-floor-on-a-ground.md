---
engine: minor
---
A contrast floor must be a step a page ground sits on (#2227, #2239, owner Q57 A). `surfaces.<mode>.floorStep`
on a step that none of `background.primary`, `background.secondary` or `background.tertiary` takes is refused
once the modes resolve, with a sentence naming the steps that are: "surfaces.light.floorStep: 300 is not a step
a light page ground sits on — the floor is the ground every floor-gated role is measured against. Use 50
(background.secondary) or 100 (background.tertiary)." It was accepted before: the Figma color emission threw
on it (`export_theme` -32603), and fills at floorSteps 500–750 shipped at 1.2–2:1 on the page while claiming
3:1. `validate_brand` and the generating tools report the sentence through the guarded build. The floor-gated
prose (the bold fills, the interactive fills, and the secondary, tertiary, status and link text) now names the
ground the floor sits on rather than always `background.secondary`: a floor held on the tertiary step says
"on background.tertiary". Auto, with no `floorStep`, is never refused, and keeps naming `background.secondary`. That includes a ladder
end (a Black or neutral 950 light page, a White or neutral 050 dark page), where the derived floor is a step
next to the page, not a ground, and every floor-gated claim still measures true on `background.secondary`. No
committed artifact moves.
