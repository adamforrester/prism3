---
engine: patch
---
Update's check: a set whose only lack is a component that a theme-blocked target adds in the same run (a provider-logo
mark, say) now reads blocked only until Theme, the same as its provider. Before, it read "not in this file" and was left
out of the run (#3770).
