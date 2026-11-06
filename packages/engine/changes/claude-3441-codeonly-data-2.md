---
engine: minor
---
A correction to page navigation's note (#3345), which the merge with #3441 made due: two component pages join `out/components/`, making 229 committed artifacts, not 227. Page navigation also moved the component-defs export: `currentIndicator` joins its brand `settings` and its lever chain, and its format moved `prism3-component-defs/1.0` → `1.1` (a field added: minor). PageNav's and PageNav.Item's `anatomy.codeOnly` entries are data, as every def's are, and `syncBoundary` lists them.
