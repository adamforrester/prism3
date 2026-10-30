## (2026-10-30) — Toast: the message at 14px, and a floor that keeps the toast on the ladder (#3165)

Owner request on #3165: the toast's message is 14px (`type.body.sm.default`), not 16px, after the option rows' 14px
label (#3153). Q3165.1 was posted on the issue and is built as A.

- **Only the message moves.** The Toast owns one text part. The action is a nested Button (text, small) with its own
  label type, and the close is a glyph. The Toast has no title.
- **The height (Q3165.1 A).** The 14px line box is 21px where it was 24. Without a floor, a one-line toast with no action
  would be 33 / 37 / 45 (compact / comfortable / spacious), off the 4px grid. The card now binds `size.md.height` as its
  `minHeight`, the option rows' floor mechanism (#2894), so it measures 36 / 44 / 56, on the control-height ladder. That
  is 4px taller than today's 40 at comfortable and 8px taller than 48 at spacious. With the action it stays 52 at
  comfortable, because the small Button sets that height. The rejected options were holding 40 with a 24px floor on the
  message row (no height token is 24, so it would bind a glyph rung) and no floor.
- **The glyph** stays top-aligned beside line one. Its 20px box is now within 0.5px of the 21px line's center (2px off
  in the 24px line before). #3161's line-box cell for the option rows hasn't merged, so this change doesn't use it. If it
  lands, the toast's glyph can take the same cell.
- **Existing files** update in place. `test-update-apply.ts` `toast 14/…` builds both members as main built them
  (body/md, no floor) and updates them. Every key and id is kept, both members are written, and both read current after.
  The executor is unchanged, so `EXECUTOR_REVISION` stays.
- **Gates.** `test.ts` `#3165` measures every corpus brand at comfortable and each rebuilt brand at compact and
  spacious. It reads the message's size from the emitted composite and resolves the plan's bound padding and floor
  through each emitted tree. EXPECTED (14px; 36 / 44 / 56; 52 with the action) is typed. The message back at
  `body.md` fails `#3165 toast message size`, and the floor dropped fails `#3165 toast height`. The `#2668` message arm no
  longer restates the type role.
