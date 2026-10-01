# UI redesign: owner QA notes on concept v6 (2026-10-01)

The owner's QA notes on the v6 mockup, sent during S1.2 of the implementation plan. This file extends `decisions-2026-09-30-v6-review.md`, and wins wherever the two differ. S1.2 applies Q1 to Q3 (`docs/progress/pending/ui-s1-2-frame.md`); Q4 is deferred.

| # | Topic | Decision |
|---|---|---|
| Q1 | Color sub-nav placement | On the Color tab, the **Palettes · Surfaces & fills · Interactive** segments go **below the tab row's divider**, not above it. The tab row and its hairline come first; the sub-nav sits under the line, at the top of the levers panel. |
| Q2 | Divider alignment | The levers tab row and the preview title row **share one height**, so their bottom dividers sit at the same y across the split. In v6 the two lines are visibly offset. Both rows take one shared header-height value. `test:chrome` checks it: the tab row's bottom border and the preview header's bottom border at the same y, within 0.5px, at 1280, in light and dark, on a page with the sub-nav and one without. At 380 there is one pane, so the check is skipped there. |
| Q3 | Search | The always-visible "Search settings" field is out of place. Whether to keep search at all is **open**: the owner wants to see it working first (v6's search typed characters backwards). Search goes **behind an icon button in the levers header**: a magnifier, a target of 24px or more, named "Search settings". It opens a field in place; Escape closes it and returns focus to the icon. The caret holds and nothing is rebuilt per keystroke (the P2 subscriber model; the field itself is never re-rendered). A test types "radius" and reads "radius" back, with the radius lever among the results. Flagged in the PR **for the owner's review: keep or remove**. |
| Q4 | Preview follows the lever | **Deferred.** The owner is open to a later trial: the preview scrolls to show the part that matches the lever being edited. It is tried on one section first, in one slice (likely S2, Palettes), and the owner then decides whether it applies everywhere. Not built in S1.2. |

Other notes from the owner, for the overnight lanes: a design call that neither v6 nor these notes cover takes the option closest to v6 and is flagged in the PR. Nothing brand-facing is decided in a lane.

## Later decisions (2026-10-01)

The owner's decisions taken during S3 and S4 of the implementation plan. They extend the table above and win wherever an earlier file differs. S4a (Color › Surfaces & fills, the page) applies Q5 and Q6.

| # | Topic | Decision |
|---|---|---|
| Q5 | The Color previews | **The Color previews reuse the legacy Style guide's sections, with ratio badges.** Color › Surfaces & fills departs from concept v6's preview: it shows the Style guide's **Background, Foreground, Text color, Border and Icon** sections, drawn from the same shared code as the Style guide (`apps/studio/src/preview/sections/`), so the two cannot drift. Each token chip there carries a **contrast ratio badge**, below-floor marked by the role's own floor. The badge is on Surfaces & fills only; the Style guide stays as it was. |
| Q6 | Brand's MVP preview | **The MVP Brand preview is the legacy Style guide.** The condensed preview is backlogged as #1941, and the typography sample as #1942 (with S6). S5's Interactive preview adds the text buttons v6 left out. |
| Q7 | Modes in the brand menu | **Everything about modes leaves the brand menu.** Brand › Modes is the only Modes editor. Done in a separate PR stacked on #1939, closing #1943. No other page adds a mode control outside Brand › Modes. |
| Q8 | A status color switched to Custom | **It starts from the color it currently auto-derives**, not `#808080`, and the user edits from there. Done in a separate PR. |
| Q9 | Neutral chroma under Follow primary | **Stays read-only**, S2's current (legacy) behavior. Nothing changes. |
| Q10 | Neutral copy from S1.2 to S3 | **Approved:** the new neutral copy listed in #1922, #1923, #1929, #1935 and #1939. |
| Q11 | Two glyphs | **"⋯" becomes "…" everywhere, and a plain "⚠" is used, never "⚠" with the emoji selector.** Done in a separate PR. |
| Q12 | The apply action's name | **"Apply Theme" replaces "Apply to Figma".** Done in a separate PR. |
| Q13 | Search (Q3) | **Stays for now.** |
| Q14 | The Q4 trial | **Kept.** The preview scrolls smoothly and respects reduced motion. Done in a separate PR. |
| Q15 | Dark off while a custom mode is based on Dark | **The engine's refusal stays.** The confirm names the blocking mode and no data is lost (done in S3). The longer-term snapshot model is filed as #1946. |
| Q16 | Removing a brand color | **Asks to confirm first, in place.** Done in a separate PR. |
| Q17 | The Activity strip at 380 | **Fine for now** at the bottom. |
| Q18 | Font licenses | **The notice plus its URL is confirmed.** |
