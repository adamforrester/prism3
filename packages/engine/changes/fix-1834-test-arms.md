---
engine: patch
---
A new gate, `lint-test-arms.ts`, fails when a named test arm disappears from its suite (#1834). Every issue tag (`#NNNN`)
in a test suite's string or template literals is a named arm, registered in the authored `test-arms.txt`. An arm gone
from its suite fails by name. A new one fails until `--accept` adds it, and only deleting its registry line by hand
retires one. Tests only; no committed artifact moves.
