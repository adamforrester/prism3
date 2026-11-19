---
engine: patch
---
`buildTree` can share one token tree per theme inside `withSharedTree(f)`, exported from `@prism3/engine/figma` with `treeBuilds`, a count of the trees built (#4230). Outside that scope every call builds its own tree, as before. The plugin's Apply Theme plans now build their tree once instead of about nine times, and no emitted artifact changes.
