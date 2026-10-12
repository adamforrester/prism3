## (2026-10-11) — Style guides test: the focus ring rows fall back to focus's default mode, now exercised (#2505)

**Status:** test only (`apps/plugin/test-style-guide.ts`). No product code moves, no engine bump, CONTRACT unchanged.

**Part 1, the fallback.** The Border width table reads each focus ring row in "the column's mode by its name there,
else that collection's default mode" (`modeIn` in `style-guide.ts`). No emission exercised the second half: in prism3
and NB, border-width and focus both name their one mode "Default".

The new case, §35b, is §35's file with focus's modes renamed:
- a first mode, "Spare", holds 9 for every ring value;
- its default mode, "Base", holds the emission's aliases (2, 2, 0).

So no Border width column finds a focus mode by name. Each ring row must read focus's default mode: 2px, 2px and 0px
at `focus:base`. And drawn, the ring width's outline must be pinned to `focus:base`. That tells the default apart from
both wrong answers: the first mode (9px) and the column's own ID (nothing).

Mutations, each from a `wip:` commit and restored with `git checkout --`:
- **The fallback removed** (`?? defaultMode(own)` dropped):
  `✗ 35b: … (["pds3/focus/ring/width=—@border-width:0", …])` and `✗ 35b: drawn, … ({"VariableCollectionId:focus":"border-width:0"}; "—")`.
- **The fallback taking the first mode instead:**
  `✗ 35b: … (["pds3/focus/ring/width=9px@focus:spare", …])` and `✗ 35b: drawn, … ({"VariableCollectionId:focus":"focus:spare"}; "9px")`.

**Part 2, extra focus modes (not built; the proposal is on the PR).** The Border width table's columns are
border-width's modes, so a focus mode with no counterpart there is never drawn, and nothing says so. No file does this
today.
