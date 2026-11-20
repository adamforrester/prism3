---
engine: minor
---
The component executor moves to revision 67 (#2865, #3828, #4160), and every built set reads as due once.

- Every description it writes now records itself, so Update file can tell Prism3's description from a designer's (owner decision A). A def's summary that moved now reaches existing files. The check lists the set's description as a change, even when every member is current, and the update writes it. On a set Prism3 built, a description that still matches its record, or has none, is Prism3's to replace; one a designer changed after the record is kept, and the check says so. A set Prism3 never built keeps its description.
- Two plain components under one name are no longer picked by document order in a nest override's swap value or in the icon re-run's existing-member lookup, in both executors. Each is reported, as #1796 reports a nest or swap target.
- The executor's whole-file component searches run with hidden instance children skipped, and the slot-constraint pass searches once per build instead of twice per slot property.

No engine output changes.
