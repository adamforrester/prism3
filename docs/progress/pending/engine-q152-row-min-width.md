## (2026-10-09) — Checkbox and radio rows and groups shrink with their column, like the fields (owner Q152.3, Q155 A)

**Status:** engine (four defs), plugin tests and the component shim. ENGINE minor (change note): the projected
component surface moves for both rows and both groups. No token name or value moves, so CONTRACT is unchanged. Owner decisions,
recorded on #2266: **Q152.3** (Q99 B reaches checkbox-row and radio-row; their root `minWidth: 320` goes, as a
follow-up PR to #2388) and **Q152.2** (the minimum width is 120px); and, on #2409, **Q155 A** (the groups follow
their rows: checkbox-group and radio-group drop their own 320 minimum the same way).

### What changed

Both rows now size the way #2292 and #2266 size the fields:
- **Before:** the root hugged above a `minWidth: 320` floor. The 320 was there so the wrapping label had room
  to fill (#1424), and it held a row in a narrower column at 320, so the row overflowed the column.
- **Now:** the root is built at Prism 2's root width 320 (`placementWidth`, `sizing.x: 'fill'`). An unplaced row
  still reads at 320, and a row set to fill its column stretches with it, down to a 120 floor (`minWidth: 120`).
- **The label** still fills the row and wraps. `placementWidth` alone bounds it, so the floor is only the
  smallest width the row will take.

**The groups (Q155 A).** Checkbox-group's and radio-group's container floored at `minWidth: 320` (#1503's
resolution of Prism 2's fixed-320 root). It is now built at 320 (`placementWidth`; its root was already
`sizing.x: 'fill'`) with `minWidth: 120`. The rows still stretch to whatever width the group has. Without this,
a group in a narrow column held at 320 even though its rows could shrink.

### Tests and mutations

- **`test.ts` #1424 (c)** now holds every member of both rows to placementWidth 320, its horizontal axis FIXED,
  and minWidth 120, all typed as literals. Its old 320-floor expectation is gone.
- **#1424's floorless-row refusal** now strips the build width as well as the floor (back to a hugging root),
  because since Q152.3 the root's `placementWidth` alone bounds the wrapping label.
- **`test-roundtrip.ts`, a new Q152.3 arm (host truth, in the shim):** each member is placed as a FILL instance
  in a 505px, a 280px and a 100px column, and must read 320 unplaced, then 505 (its label filling what the control
  box and gap leave), 280, and 120.
- **`test.ts`, a new Q155 pin:** every member of both groups is built at 320 (its counter axis FIXED, since a
  group's root is a column) with minWidth 120.
- **`test-roundtrip.ts`:**
  - #1503's host-truth floor check now reads width 320 and minWidth 120 (it read minWidth 320).
  - A new `Q155 <group> fills its column` arm places each member as a FILL instance in 505, 280 and 100px columns.
    It expects 505 with every row spanning it, then 280, then 120. "Spanning" is the column less the group's
    inline `space/0` padding: 0px in every brand, but the shim's synthetic `varValue` here, so the test reads it
    from the shim's own input.
- **The shim:** an instance with no `minWidth` of its own now takes its main's, as an instance does on the host. A
  field's floor sits inside it, measured on the main, so nothing measured a floor on an instance's own root until
  now. Without this the 100px column read 100.

Each mutation ran from a `wip:` commit and was restored with `git checkout --`:

| Arm | Fails by name |
|---|---|
| checkbox-row's floor back to 320 | `❌ #1424/Q152.3 checkbox-row: on every member the row is built at 320 and floors at 120 … (3 off — size=small: row placementWidth 320, primary FIXED, minWidth 320)` and `✗ Q152.3 checkbox-row fills its column …` |
| checkbox-group's floor back to 320 | `❌ Q155 checkbox-group: on every member the group is built at 320 and floors at 120 … (3 off — size=small: container placementWidth 320, counter FIXED, minWidth 320)`, `✗ #1503/Q155 host-truth: every checkbox-group member reads back width 320 and minWidth=120 …` and `✗ Q155 checkbox-group fills its column …` |
| radio-row reverted whole to `main` | `❌ #1424/Q152.3 radio-row: … (3 off — size=small: row placementWidth undefined, primary AUTO, minWidth 320)` and `✗ Q152.3 radio-row fills its column …` |

### Screenshots

These are plan renders, before and after, for NB and prism3 at medium in light mode: unplaced, and in 505, 280,
180 and 100px columns. Variables come from the committed Figma export, set in a system font rather than the brand
font. They are local and not uploaded: `~/Downloads/rebuild/q152-rows/q152-rows-nb.png` and `q152-rows-prism3.png`,
with the throwaway renderer beside them. Figma Desktop was not connected, so there is no live-host render.

### A trap for whoever re-verifies this

A FILL instance of a row sets the instance's PRIMARY sizing mode. A field's root is a column, so its FILL sets
the COUNTER mode, and the #2292 block's `placedAt` writes that one. Copied as-is, the row arm reads every column
as 320.
