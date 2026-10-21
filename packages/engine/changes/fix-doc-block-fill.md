---
engine: patch
---
Plugin: Set up file's _Doc-block template fills its block (#2902). The padding spacers, Field's row, Do-Dont's columns
and Chips' chips are set to FILL once appended to their auto-layout parent, where layoutAlign set before the append
left them hugging (Do-Dont's columns at 100px, Chips at ~986px that never wrapped). Field's label grows to its text at
the label column instead of sitting clipped at 1px. A file already set up is repaired in place on the next Set up file
run (repairDocBlock): the same set and members, so usage-panel instances keep pointing at it. No committed artifact
moves.
