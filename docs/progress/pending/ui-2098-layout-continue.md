## (2026-10-05) — UI: a Layout write guard on main.ts, a dashed edge on a fixed text field, and PAIRS names Continue (#2098 items 5, 6)

**STATUS: branch `ui/2098-layout-continue`. Part of #2098 (UI-lane items 5 and 6, from the reviews of #2041 and
S10 #2060).** UI and studio tests only: no engine change, no emitted artifact moves, no ENGINE bump,
`CONTRACT_VERSION` unchanged, no new visible wording.

**1. `main.ts` keeps no Layout writes** (`test-shell-imports`, four new assertions), the same AST arm S9.1 and
#2083 built for Depth & motion, Shape and the Button options. S10 moved Breakpoints, Grid and Containers to
`domains/layout.ts`, writing through `state/layout-input.ts`. Now held: no direct write under `brandState.layout`
(any assignment operator, `delete`, `++`/`--`, `Object.assign`, an in-place mutator such as `.push` on its
breakpoints, or `setPath` rooted at `brandState.layout`, directly or through one alias); no keyed write (`setPath`
into `layout.*`); and no `layout.*` key literal handed to the generic renderer (`renderControl`); and no import of `./state/layout-input` at all (review of #2120: the AST arms see only a write spelled in `main.ts`, so a call into `setColumns` or `addBreakpoint` slipped past them). Layout has no
`ModeLevers` field, so there is no mode field to hold. Oracle: the literal `layout` root.

**2. The fixed first breakpoint field no longer looks editable.** `.p3-text-input:disabled` takes a dashed edge and a
not-allowed cursor. That is the chrome's existing can't-change edge, not a new design: a fixed check box
(`.p3-check-fixed`), a locked value picker (`.p3-vpick[aria-disabled]`), a locked mode check and a disabled button
already draw it. It also applies to text fields a derived mode locks, which had the same problem. `test:chrome`'s Layout
block reads each breakpoint field's computed `border-top-style`: dashed on the first, solid on every editable one.

**3. PAIRS names Continue.** `chrome/spec.mjs` described `inv-text` on `inv-bg` / `inv-bg-2` as "Apply Theme" only;
Continue (`.p3-next`, QA-I12) draws in the same pair, so the entries now read "Apply Theme and Continue". This is the
build-time checker's description, not visible copy.

**Held for the owner (not in this PR).** Item 5's ring color: Continue's focus ring is `ctl-edge`, the same color as
its `inv-bg` fill, so only the 2px offset separates it. The issue names the problem but not the fix (another color, a
two-tone ring, or a wider offset are all visual choices). Item 6's first-field value: on a hand-written brand whose
first breakpoint isn't 0, the disabled field shows that value beside "Always 0px." Showing 0 would misstate the
brand, and dropping or rewording the note needs new copy. Both are listed on #2098.

**Mutations, each failing by name:** `brandState.layout!.breakpoints!.push(320)` or `brandState.layout = {}` added to
`main.ts` → `src/main.ts writes nothing into brandState.layout itself`; `setPath(brandState, 'layout.columns', 12)`
→ `src/main.ts makes no keyed Layout write (setPath into layout.*)`; `import { setColumns, addBreakpoint } from './state/layout-input'` plus both calls → `src/main.ts imports no Layout write (./state/layout-input): it has none left to make`; the `.p3-text-input:disabled` rule removed →
`Layout: web: the fixed first breakpoint field draws a dashed edge, and every editable one a solid edge` (and the
figma arm).
