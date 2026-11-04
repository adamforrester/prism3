---
engine: patch
---
Plugin: Update file shows how far its check has got (#3302). While the plugin reads the file, the dialog's foot reads "Reading this file…" with an empty bar. Then it reads "Checked n of N sets", and the bar fills as each set is checked. The set being checked reads "Checking…". A checked set shows its result as it lands, and a set not reached yet shows no line. The check now reports each set as it finishes (`update-check-progress`). Nothing moves by time. No emitted artifact, token or projected component surface moves.
