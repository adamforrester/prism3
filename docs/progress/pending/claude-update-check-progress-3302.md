## (2026-11-02) — Update file: the check's progress in the dialog's foot (#3302)

On the template, opening Update file spent about 20 s checking every set. Every row read "Checking what changes…" until
the single answer landed, and nothing said how far the check had got. The owner decided Q3302.1–.4, all A, on
2026-11-02. The strings were approved as written.

### The change

- **Foot** (Q3302.1 A, Q3302.3 A): the dialog's foot, before Cancel, carries the chrome's own bar (`p3-op-prog`), as
  wide as the status strip's. Beside it:
  - "Reading this file…", with the bar empty, until every set is found;
  - then "Checked n of N sets", with the bar filled by sets.

  At 380 the buttons wrap under it.
- **Rows** (Q3302.2 A): only the set being checked reads "Checking…". A checked set shows its result as it lands, with
  the existing fade (#3150). A set not reached yet shows no line. The old "Checking what changes…" is gone.
- **Order** (Q3302.4 A): this comes after #3313's faster check. It is built on that branch.
- **Host**: `previewUpdate` now finds every target first. That covers the file's read and the single-component defs'
  reads, which is the "Reading this file…" stretch. Then it reads and checks each set in turn and calls a `progress`
  hook:
  - `done` 0 once every set is found;
  - then once per set, with that set's own preview and the next set's id.

  The hook hands the thread back after each call, so the panel hears each reading before the next set. `checkSets`
  posts each reading as `update-check-progress`. Its `set` is `checkedSetOf` over that set's own preview, its
  consumer-breaking line included. The answer (`update-check`) still replaces every line. The sets' moves and a blocked
  panel's clearing are worked out only over every set, so the answer can change a line. On the template stand-in it
  changed none of 60.
- **Motion** (#3150): no motion is driven by time. The bar's value moves only when the host reports a set.

### Gates

- `test-chrome.mjs`, section `ia2`, Figma light and dark: five arms check the foot's text as literals and the bar's
  value, max and label.
  - Before the first set: "Reading this file…", the bar at 0 of 1, before Cancel.
  - Then "Checked 0 of 2 sets" and "Checked 1 of 2 sets".
  - The rows' text and `data-state` (`waiting`, `checking`, `checked`).
  - No animation or transition on the bar, and the same foot and rows 600 ms later.
  - The foot's progress is gone once the answer lands.
- `test-open-large-file.ts`, `check/progress`: the template's check posts done 0 of 60 and then 1 to 60, in order. Each
  reading names its set and the next, sits in its own turn, and lands before the answer.

Mutations, each failing by name:
- every row reading "Checking…" while the check is out → `#3302 Q3302.2 A` (and Q3302.3 A);
- the foot left at "Reading this file…" → `#3302 Q3302.1 A`;
- the first reading dropped → `check/progress`;
- the hand-back after each set dropped → `check/progress`.
