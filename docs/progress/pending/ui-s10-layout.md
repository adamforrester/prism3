## (2026-10-04) — UI redesign S10: Layout › Breakpoints, Grid, Containers in the two panes; settings stay with their breakpoint (#2045); off-list column counts shown as they are (#2047)

**What moved.** Layout leaves the legacy frame for the two panes (`domains/layout.ts`, `preview/layout.ts`,
`state/layout-input.ts`, and `preview/sections/breakpoints.ts`, `grid.ts`, `containers.ts`, `layout-kit.ts`). Three
lever sections, each headed and described as its preview section (Q23): **Breakpoints** (the list, the first fixed at
0px, Remove ‹name› on the others, Add breakpoint; two to seven, D13), **Grid** (Grid columns, then each breakpoint's
Columns, Gutter and Margin, Auto or a value, D12) and **Containers** (Maximum width and Content container sliders over
today's stops, D15, D17). FIRST_CLASS: no Show advanced. Derived modes disable every control and still draw the
preview (Q59). The preview is concept v6's V11 (D14): the ranges to scale in primary tints, each breakpoint's columns
as tinted bars on a gray margin, the containers to scale against the widest breakpoint (T10), label first and token
under each (QA-B2). Edits ease the preview to their section (`noteSectionEdit`, QA-B9). Continue opens the Components
tab on either host (T8), routed by tab through S7's `pageOfTab(tab, host)`. (S10 first added a store request,
`requestTab`, for the same need, because before S7 the web's Shape and Components showed the same legacy page and
`setPage('sizeRadius')` landed on Shape. Merging S7 unified the two onto `pageOfTab`: it is pure, already tested by
S7's routing, needs no new store topic, and once Shape moved, Components is the only tab that shows `sizeRadius` on
the web.)

**Retired from `main.ts`** (each confirmed by name first): `renderBreakpointsControls`, `csSlider`, `csPicker` (dead),
`LAYOUT_COLUMN_CHOICES`, `renderLayoutPage`, `paintBreakpointsPreview`, `paintColumnsPreview`,
`perBreakpointColsNote`, `paintPerBreakpointGrid`, `paintContainersPreview`, `PAGE_COPY.layout`, the layout arm of
`pageHasModeVaryingControl`, the `NAV` row and the `PAGE_RENDERERS` row. `numberField` and the `.num`, `.adv-*`
(breakpoint list), `.ly-*` and `.cs-ctl*`/`.cs-range` rules lost their only callers with them and went too.
`test-shell-imports.ts`' Type-write guard dropped its `csSlider`/`csPicker` entries, which named writers that no
longer exist (the guard's own staleness arm caught it).

**D13, the one intended byte change (fixes #2045).** The engine names breakpoints from their count, and the three
override maps are keyed by name, so adding or removing a breakpoint used to move every per-breakpoint setting to
another width. `state/layout-input.ts` now re-keys each map through the change: a setting follows its breakpoint to
its new name; an edited breakpoint keeps its settings; a setting on a removed breakpoint (Remove, or an edit onto
another's width) is dropped, and the page says "Removed ‹name›: its column, gutter and margin settings went with it."
The names come from the engine itself (`namesFor` resolves the boot example with only the breakpoints swapped), never a
copy of `bpNames`. The engine is unchanged.

**A breakpoint's field, cleared or refused.** Emptying a breakpoint's field (or typing something that is not a width,
or a negative one) and leaving it puts the breakpoint's previous width back in the field; nothing is written and no
line is shown (owner-approved). An edit that would merge the last two breakpoints into one (typing the first's 0 into
the second, at two) is refused the same way: `editBreakpoint` writes nothing and returns `refused`, and the field shows
its previous width again, so the list never drops below two (D13's two to seven). At three or more, an edit onto
another's width still merges the two, the first in the old order surviving, and the dropped line says so.

**Equivalence against the legacy writes** (transcribed from `main` `d0a306fb`): 6 bases (prism3, aurora, harbor, and
each with column, gutter and margin overrides), 476 sequences per base (every single op over every stop and value,
each override to a value and back to Auto, and 150 random sequences of 1–8 ops: add, remove, edit, duplicate, columns,
overrides, containers), **2,856 runs: 2,433 byte-identical; 423 differ only in D13's re-keying (623 breakpoint steps on
a brand carrying overrides), with the breakpoint list and every other byte identical; 0 unexpected.** An emptied
override map is deleted, never `{}`, as before.

**Two technical calls, flagged for the owner.** (1) An edited breakpoint keeps its settings. D13 says a setting
"stays with the width it was set on"; read literally, editing md from 768 to 800 would drop md's settings, and the
approved line only speaks of removal, so the edit keeps them. One line in `editBreakpoint` if the owner reads it the
other way. (2) An override keyed by a name no breakpoint has (only an agent or the old page could write one) is dropped
on the next breakpoint change, silently: it applies to no width, and kept it would attach to whichever breakpoint next
takes the name, the move D13 rules out.

**Tests.** `test-pages`: MOVED + layout (FIRST_CLASS literal unchanged). `test-layout-input.ts` (new, 23): every write,
D13 by name against the engine's own grid at each width, the emptied map deleted. `test:chrome` section 23 (new):
specimen grounds every host, theme and mode; each tint label at 4.5:1 or above (D14); the four manifest keys rendered
once with no Show advanced; Q23 pairs; the approved copy literally; D16's retired words absent; the first breakpoint
fixed at 0; D13 driven in the browser and read back from the persisted brand; the 2 and 7 limits; Return to Auto
deleting the emptied map; T10 (the Maximum width slider moves its own bar) and the QA-B9 reveal; T8 on both hosts;
#2047 on a hand-written input; Q59 in HC light and HC dark. Moved: `LEGACY_PAGES` − layout; #1031's dark-field check
now reads Motion's easing selects; #2036's "typography.responsive is drawn on Type only" now reads Layout's two panes;
section 22 (QA-B2, B5, I12) covers Layout's rows, pickers and Continue. `test:smoke`: #1532 moved to the new hooks
(the readout is the preview's Grid `data-bpcol`, the override the `bp-cols-pick` value picker), oracle
`out/figma/aurora/grid-styles.json` and M1/M2 unchanged; new 1i checks every brand × mode's Layout preview against the
brand's emission (breakpoints, grid columns, gutter, margin, containers) and the legibility probe; the Pages menu
floor drops to 3 with an absence check for Layout. **#485's select-jump test gets a new host, Motion** (the easing
table's Light baseline, six curves): not a retirement, because the defect lives in the legacy tier (`applyFull()`
emptying the workspace), which every remaining legacy page still runs through until S9.

**Mutations, each after a `wip:` commit, each failing by name** (then restored):

| Mutation | Fails with |
|---|---|
| the Grid readout taken from the base column count (`gridSection`: `String(g.columns)` → `String(ly.baseColumns)`) | smoke `#1532: the per-breakpoint readout equals the engine's EMITTED grid columns [xs:4 sm:8 md:12 lg:12 xl:12 2xl:12] — DIVERGED: xs shows 12, emits 4; sm shows 12, emits 8` (#1532 M1, carried over), and 1i's `‹brand› / Layout / ‹mode›: every breakpoint, grid and container value reads the emission's` |
| the last gutter override back to Auto leaves `{}` | unit `setGapOverride(gutter, md, auto) on the last entry deletes layout.gutterOverrides` |
| the first breakpoint's field left editable | chrome `Layout: the first breakpoint is fixed at 0 (web)` and `(figma)` |
| `editBreakpoint`'s two-breakpoint refusal removed (the merge allowed) | unit `D13: at two breakpoints, an edit onto the other's width is refused and the list is unchanged (two to seven)` and chrome `Layout: at two breakpoints, typing 0 into the second is refused and the field keeps its width (two to seven)` |
| D13's re-keying removed | unit `D13: adding a breakpoint keeps md's 6 columns on the 768px breakpoint, now sm` (and six more D13 arms) |
| Responsive type sizing drawn back on Layout | chrome `typography.responsive is drawn on Type only — also on Layout (levers title "Responsive type sizing", …) (web)` and `(figma)` |
| an off-list column count shown as the first offered value | chrome `#2047: a brand's 10 grid columns (off the offered list) read 10 on the base and 10 on md, as the input says, …` |

Each chrome mutation's run failed only the named assertions.

UI only: no ENGINE or CONTRACT bump.

### Copy for owner approval (DRAFT)

Every other string on the page is the owner's approved copy. These are not approved yet; the recommendation is to
approve them as written.

```
Breakpoints (info):     The screen width where each layout starts, smallest first. The first is always 0px. Names follow the count: up to five run sm to 2xl, six or seven run xs to 3xl.
Grid columns (info):    How many columns the grid has on the widest breakpoints. Smaller breakpoints step up to it: 4, then 8, then this count.
Maximum width (info):   The widest content gets. Below this width, content fills the screen.
Content container (info): A narrower width for long text, so lines stay a readable length.
Columns picker hint:    Column counts the grid can use. Any whole number from 4 to 24 works; these are the common ones.
Gutter/margin hint:     Gutter and margin use the spacing steps, so each stays a spacing token.
At seven breakpoints:   Seven breakpoints at most, xs to 3xl.
Picker titles:          ‹bp› columns · ‹bp› gutter · ‹bp› margin
Preview, fluid row:     Full width
Screen-reader only:     ‹bp›, px (a breakpoint's field) · ‹name›: ‹value›. Pick a value (a picker button)
```
