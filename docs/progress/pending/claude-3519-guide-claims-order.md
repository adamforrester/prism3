## (2026-11-10) — lint-guide-claims: a bold list must hold its cited lines' order (#3519)

**Status:** gate only, so no engine bump, no artifact moves and `CONTRACT_VERSION` is unchanged. No guide changed:
all 7 lists the arm places were already in code order (9 before the review's "or" fix, below).

### What changed

- **A new ORDER arm.** #3517 reordered the Layout page's sections, and the guide row kept the old order. CITE
  passed, because every anchor was still somewhere in the range, and a quoting claim carries no fingerprint. Now a
  run of two or more **bold labels** joined only by `, `, ` and ` or `, and ` is a list. Each label is placed where
  the cited lines hold it as a string of its own (`'Grid'`, `>Grid<`), walking in the claim's order, and each must
  sit after the one before it. The order comes from the cited code, never from the guide (`docs/34` shape 1).
- **Not a list: one whose last join is "or".** "**Select all**, or **Deselect all**" names alternatives (often a
  ternary), not an order, so it is not checked, and the whole run is dropped, however long. Before review, `, or `
  only ended the run, so every label ahead of it was still checked: `build-components.md:18`'s eight set statuses
  were held to the key order of a lookup map, and `style-guides.md:43`'s **Color value** options (reached through
  the table's citation at `:49`) to theirs. Neither is checked now, so the count is 7.
- **A planted fixture, and a floor.** SELF-CHECK plants the #3517 swap (`#3519`), which must fail by name, and the
  control gains the same list in the right order, which must pass with exactly one list checked. The control also
  holds an "or" list of three labels in an order its cited lines do not hold, and must still pass. SCOPE fails if no
  guide list was placed, so the arm cannot pass by checking nothing. The summary line counts the lists checked.

### Mutations, each failing by name

- The #3517 row put back (`**Breakpoints**, **Grid** and **Containers**`): `ORDER: …theme-a-brand.md:35`.
- The code swapped instead (Breakpoints above Grid in `pages.ts`): `ORDER: …theme-a-brand.md:35`.
- The arm's failure removed: `SELF-CHECK: #3519 … was not named`.
- The arm's placement count removed: `SELF-CHECK: the control …` and `SCOPE: no guide lists …`.
- `sequencesOf` back to ending the run at "or" (the head kept): `SELF-CHECK: the control …` names
  `fixture/status.ts:2-4 lists **Needed**, **Due**, but the cited lines hold **Due** before **Needed**`.

### Limits, stated in the gate's header

A label the cited lines do not hold as a whole string is not placed, so a list is held only as far as its labels
are placed. Whether a claim's every anchor (not just one) must be in its range is a separate gap, not this one.
