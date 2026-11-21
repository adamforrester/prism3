---
engine: patch
---
Update file keeps two records truer (#3907, #2882). A set whose update skipped a member that is still behind its plan is no longer recorded as current in the as-built ledger: its earlier entry stands, so Update file keeps offering it, including after its updates are turned back on. A member skipped only for the designer's own edits, its reactions among them, is not behind and does not hold the set back. And the publish description lists, for each set, the release items since that set's own members were last stamped, not since the file's About frame was last drawn, so a set last built before the frame lists every item it had not yet published, and the description's first line names the oldest version any set's list starts from. No engine output changes.
