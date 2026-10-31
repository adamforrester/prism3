---
engine: patch
---
The Update check and apply no longer search the whole file in one turn, several times per set (#3177). Each run reads
the file once, a page per turn, and every set's lookups are answered from that read. The apply reads a page again after
it writes the set on it, and the whole file again after it moves sets between pages.
