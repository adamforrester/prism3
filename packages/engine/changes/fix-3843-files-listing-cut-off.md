---
engine: patch
---
A `--files` listing arrives whole, and its reader names one that did not (#3843). `lint-us-english.ts --files` and
`lint-voice.ts --files` wrote one line at a time and then exited, which drops any write the reader had not yet taken,
still with exit 0; on a busy CI runner `lint-schema-classification.ts` read "listed 0 schema file(s)". Both now print
through `printListing` (`files-listing.ts`): one write, awaited, then a `--files: N line(s) listed, complete` line on
stderr. The classification gate reads the listing with `readListing`, which compares that count with the lines that
arrived: a short delivery is LISTING CUT OFF, a non-zero exit, signal or spawn error is LISTING FAILED, and SCANNED BLIND
is kept for a whole listing that names no schema file. Gates only; no committed artifact moves.
