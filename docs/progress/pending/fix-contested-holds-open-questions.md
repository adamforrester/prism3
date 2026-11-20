## (2026-11-20) — `notes.contested` refuses a decided entry by the verbs decided entries use (#1716)

#1700's check refused a `contested` sentence that opened with Settled, Resolved, RESOLVED or CLOSED. That was wrong in both directions. It refused argued prose ("Brief §4: Settled in the brief, argued here", "e.g. Resolved later?"), because a colon and any period counted as a sentence break. It also passed "Decided: …" and "Chosen: …", which is how decided entries actually read. The #1715 rewrite had itself changed "Settled" to "Decided".

**The choice: option 2 of the two the issue offered.** The issue's other option, a structural marker on every entry, means rewriting all 190 `contested` entries across 52 defs, and the marker would be one more convention to keep. The widened check is `verdictOpening` in `component-schema.ts`, exported with its verb lists so the test drives it directly:
- the verbs are `settled | resolved | closed | decided | chosen`, in any case, so "— settled as …" is caught;
- a clause opens at the entry start, after `.` `!` `?` or `;`, or after an em dash. A period that ends `e.g.`, `i.e.`, `vs.`, `cf.`, `etc.`, `approx.`, `incl.` or `viz.` is not a break, and a colon never is.

**What moved to `evolution`:** the three entries the issue named (Text field's "ship both", Checkbox.Row's border and fill, Select's "settled as text-field settles it"), plus four the widened check found: Text field's prefix/suffix ("Chosen: …"), Toast's two "Decided: …" entries, and the decided half of Accordion's Q241 entry. The pending half (block padding, gap, inset) stays in `contested`.

**A known limit.** "Resolved as X is argued…" is still refused. Reading "is argued" as a reprieve is exactly the vocabulary guessing this check gave up on, so an entry worded that way gets reworded.

**Not touched, filed as #4390:** entries that record an owner decision in the middle of a sentence ("The focus edge … (#3399, owner decision Q22.1 A)", shared by eight field defs; Field label's and Switch.Control's "owner-decided") never open a sentence with a verdict, so this check can't see them.
