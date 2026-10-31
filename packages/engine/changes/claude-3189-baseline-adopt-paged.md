---
engine: patch
---
Capture baseline and Adopt read the file once, a page per turn (#3189), through the update's run host (`runHost`, #3177),
in place of a whole-file search per set in one turn. Each posts `run-progress` readings (`capture`, `adopt`: check, the
def reached and n of N, finish), and the panel's status strip shows an agent's run in the command's Activity words, with
no Stop and no clock. Results are unchanged. Plugin and panel only: no committed artifact, emission or component surface
moves, and the executor is unchanged.
