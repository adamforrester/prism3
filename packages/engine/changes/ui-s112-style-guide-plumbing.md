---
engine: minor
---
Plugin: the style guide's plumbing for the Build style guides page (UI redesign S11.2). A failed table no longer ends
the run: it is reported failed with the host's words and the next table is drawn ("⚠ 21 drawn, 1 failed"). A run can
be stopped after its current table (`style-guide-cancel`); a stopped run deletes no superseded table. A panel run posts
its table list and each table's move; `style-guide-catalog-request` answers with the file's collections, variables,
text styles, the tables a run would draw and whether Set up file has run. No emitted artifact moves.
