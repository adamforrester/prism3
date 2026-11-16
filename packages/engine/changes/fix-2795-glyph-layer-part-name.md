---
engine: patch
---
A glyph's own layers are never taken for a part (#2795). The component executor re-finds a part by name after the
combine to read back and repair its bindings and property references, and that search ran depth first, so a glyph's
imported layer named like a later sibling part was found first: the part's size bindings were written onto the glyph's
vector on a build, and the next Update re-imported that glyph under new ids, which detaches overrides on placed
instances. The search now skips imported geometry (a vector, group or boolean layer, or anything inside one), which the
executor never builds as a part. Executor revision 60, which redraws no shipped set. Plugin only; no committed artifact moves.
