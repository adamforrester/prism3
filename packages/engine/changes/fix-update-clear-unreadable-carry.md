---
engine: patch
---
Update file clears a kept slot carry it can't read on a set that has no other work (#3803). Such an entry was cleared
only by a write to its set, so on a set already up to date the check named it every time and nothing removed it. The
apply now clears it on every set it is given that reaches no write and was not refused, as the dry run's line already
says ("The set's next update clears it"). Clearing it alone saves no named version. Plugin only; no committed artifact
moves.
