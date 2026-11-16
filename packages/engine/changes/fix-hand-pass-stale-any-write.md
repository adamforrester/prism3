---
engine: patch
---
The plugin's background hand-edit pass stops reading while any write holds the file (#3737). Its staleness check named
four writes and left out prune, so a pass asked for while a prune's delete ran read on and reported; it now asks the run
guard whether anything holds the file (`guard.busy()`), which covers every write under #3697 R7's single hold. Plugin
only; no committed artifact moves.
