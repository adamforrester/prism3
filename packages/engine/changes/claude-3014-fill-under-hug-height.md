---
engine: patch
---
`lint-fill-under-hug.ts` gains its height twins (#3014, owner decision Q3014.1 A): a stretch across a row that hugs its
height, or a grow down a column that hugs it, fails by def and part path unless the gate's `MEASURED_SAFE` list names
it. The host keeps a hugging height (measured on a real file on 2026-11-02), and the list holds the three shapes that
measurement covered: Accordion's leading and trailing indicators, and Password field's Show/Hide button. A stale entry
fails too. No committed artifact moves.
