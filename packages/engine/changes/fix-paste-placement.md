---
engine: patch
---
The chunked paste places a new set under the page's `_section-header` as the plugin's `placeNewSet` does (#2610): below the header, 80 down, in the first free slot from its left edge, or level with the sets already there. Before, it read the header as content and put the set 160 right of it. The placement code now ships in chunk 1 only, the one chunk that can create a set, and `planSetChunks` packs chunk 1 to its own shell, so every later chunk is smaller than before.
