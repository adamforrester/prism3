---
engine: patch
---
Plugin open no longer searches the whole file in one turn (#3170). The read of the file's sets loads and searches
a page per turn, and requests made while a read is going share it. The hand-edit pass finds each set in that read
and projects one set's plans per turn. The panel's first turn posts the brand and the settings before any read starts.
