---
engine: minor
---
#259 phase 2 and #1795 (claimed as 0.200.0, 0.205.0, 0.210.0, 0.216.0 and 0.218.0 on its branch before #1807): the style-guide generator draws DIMENSION, FONT-VARIABLE and TEXT-STYLE tables. One
`dimension` table per collection (spacing and size as a spacing cell at the value's width, its width bound; a radius
as the radius swatch, its corners bound), one table per font kind per collection ("Abc 123" with the one property
bound), and one text-style table ("Abc 123" with the style applied, sizes per `type-sets` mode). Values in px and
REM at a 16px base; paragraph spacing and decoration columns on toggle; `PHASE_TYPES` widened; new panel Customize
fields and agent-link args (`pixels`, `rem`, `dimensionDisplay`, `fontDisplay`, `paragraphSpacing`,
`textDecoration`). A plugin behavior change (principle 5) → ENGINE bump; no engine emission or projected surface
moves, so `out/**` + `schema/*` are a stamp-only regen. CONTRACT STANDS at 14.0.0. Design record:
`docs/45-style-guide-generator.md` §6, "How phase 2 decides". In the same release (owner decision 15): a title
cell on every table type (`titleCell`), a leading "Name" column with the path humanized ("Text Primary"), a
designer's edit kept on rerun, and the title column left out of the superseded-table fingerprint. Also in it (the
review of 4faeb98a and the owner's live run of it): the spacing specimen found by the owner's cell structure, the
bracket's line bound and its right bar carried to the value (a MAX constraint override, else a named static move),
every resize guarded and read back, a cell with no layer to size counted; a FLOAT drawn as a length only when its
scopes or name say so (durations, shadow parts, gradient stops and paragraph spacing go to later phases); fonts
loaded and the column's mode pinned before any font binding; all four radius corners bound. And the owner's live QA
(decisions 13 restated and 16): a palette swatch FILLs its cell (floored at 80px), and tables flow left to right in
one row per category (color, dimension, font variables, text styles), the rows stacked down the page; Set up file's
spacing and radius cells built in the owner's layer structure. After the owner's live run of 0.205.0: a spacing
specimen is sized by a bound `paddingLeft` (the host silently drops a width written to a layer inside an
instance), its frame set to HUG again after the bind and read back; cells that cannot be sized are named once.
Owner decisions 18 and 19: one spacing style per run (filled by default), and REM in its own column. #1795: a
superseded table's name and place are read before it is removed, never after. After the live QA of 0.210.0
(decision 21): Set up file's spacing frames rest 0.01 wide with no padding (an instance's layer never hugs
narrower than its main), a zero value's specimen is hidden and counted as drawn, and every padding bind is
followed by FIXED then HUG so a smaller value shrinks the frame. Decision 20: the Pixels option is removed (the
agent link accepts and ignores `pixels`, named in the run's notes), and a text style's letter spacing and
paragraph spacing get REM columns.
