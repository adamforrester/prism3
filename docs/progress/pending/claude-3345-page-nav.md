## (2026-11-03) — Page navigation: a navigation of links between sibling pages, and the current page's bar width as a brand setting (#3345)

### What landed
- **PageNav** (`page-nav`) and **PageNav.Item** (`page-nav-item`), built from the owner decisions of 2026-11-03 on #3345. A page-to-page switch is a `<nav>` of links with `aria-current="page"`; Tabs stays for in-place panels (Q1 A). The look is Link's, not the tab look (Q2): the item nests Link, at its standalone look: the other pages plain at rest and underlined at hover (Q7 B), and the current page plain, with Link's 2px current-page bar (`selection=selected`). There's no baseline. Two components, 6 members.
- **`currentIndicator: full | partial`**, the brand setting (Q2 A). Partial is the engine default (Q10 B): round(0.5 × the title's width), centered. Full is the title's width. It moves Link's current-page bar, because a nested instance can't differ from its main component, so every current link in a brand draws the same bar.
- **`footShare`**, a part field. Both executors draw a foot bar at a share of its parent, centered, constrained `SCALE` across so a longer label keeps the share. The readback reads the constraint off the plan's share, and `test-roundtrip.ts` builds and reads back the Partial-materialized Link (`link@partial`) so that branch is gated. `EXECUTOR_REVISION` is raised for it, to 54, which redraws `link` alone.

- **The component-defs export carries the setting.** The export (#3433) restates the plugin's lever chain, so `currentIndicator` joins its brand `settings` and its chain, and the export's format moves to `prism3-component-defs/1.1` (a field added). `test-roundtrip.ts`'s off-defaults brand sets it to `full`.

### Gates
Arms in `packages/engine/test.ts`, each with literals typed from the decision comment:
- `#3345 page-nav code contract`: `<nav`, `<a href` and `aria-current="page"` are present, and no tab role, tablist or aria-selected.
- `#3345 tabs ↔ page-nav cross-reference`: Tabs and PageNav each name the other.
- `#3345 page-nav items`: every item nests Link, the current page at standalone/selected; the other pages are plain at rest and underlined at hover (Q7 B), read off the Link member each lands on.
- `#3345 page-nav indicator: Partial is the engine default`: the lever's default and the null brand's Link bar (Q10 B).
- `#3345 page-nav indicator: 2px`: the bar binds `border-width/thick`, which is 2px in every brand.
- `#3345 page-nav indicator: Full … / Partial …`: on both executor legs, Full is the title's width at x 0, and Partial is round(0.5 × title) at x = (title − bar) / 2 with `SCALE`.

The mutations each failed by name; they're listed on the PR.

### Owner decisions (2026-11-03, on the PR)
Q1–Q5, Q8, Q9 and Q12 A as drafted. Q7 B: the other pages are plain at rest, underlined at hover. Q10 B: Partial is the engine default. Q6 A: the reference fixture sets Partial in a follow-up. Q11 A: a KB component brief is filed.

### Found while building
At Full width the 2px bar sits just below the 1px underline's position, so on the engine default brand the current page reads close to an underlined link: thicker and lower, but the same color and length. Partial reads as clearly different. This finding led to Q10 B: Partial is now the default.

### Trap
- The early renders were drawn in a browser from the projected plans, not from the plugin shim. The shim measures text as `characters × 6`, which is too crude to show a reviewer. The executors' bar arithmetic is the part the arms hold.
- `lint-rung-names` wants PageNav's prop ladder small→medium beside variants medium-first, admitted as `DEFAULT_FIRST`, the way Breadcrumbs does it. Putting the prop in variant order fails as a stale admission.
