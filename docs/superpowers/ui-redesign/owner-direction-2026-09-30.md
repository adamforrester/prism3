# UI redesign: owner direction (2026-09-30)

Owner direction for the Studio + Plugin redesign, recorded when the work was handed to a dedicated lane. It sits on top of the exploration brief (`../specs/2026-09-26-ui-exploration-brief.md`), the ideation prompt (`../specs/2026-09-26-ui-exploration-prompt.md`) and the Concept C mockup (`concept-c-workbench.html`, with its note `concept-c-workbench.md`).

## What the owner likes and wants kept

1. **Previews and levers are separate.**
   - **Previews together:** all previews live in one large center pane.
   - **Levers apart:** the levers live in their own panel, apart from the preview.
   - **This is the core idea to carry forward from Concept C.**
2. **Simpler levers.**
   - Use **chips** wherever a lever has only a few options, instead of a select that holds only a few.
   - Keep selects for long lists.
3. **Less text on screen.** Cut descriptions back. Where more explanation is needed, put it behind an **"i" info icon** (a tooltip or popover), not in running text.

## What the owner has not settled (treat the mockup with a grain of salt)

The mockup was not worked through in detail. Specifically:

- **Modes:** the placement and UX of the mode switcher and per-mode editing are in question.
- **Lever grouping:** it has not been audited. Some levers may sit in the wrong domain.
- **The rest:** other details and nuances are unworked. Audit the mockup against the brief and against the product as it is today; don't take it as a spec.

## Scope

- **Both surfaces:** the Studio web app and the Figma plugin panel, one shared UI.
- **Code structure:**
  - **Open decision:** whether the redesign restructures how the UI code is built is to be decided after the mockup review.
  - **The known concern:** the studio/plugin UI source is too big to work in safely; `apps/studio/src/main.ts` is about 10,000 lines in one file.
  - **What the owner wants:** a recommendation on whether and how to separate it, and when.
