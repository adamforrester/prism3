---
engine: minor
---
No component stretches a child across a frame that hugs its width any more (#2928, the shape owner QA Q537 found in
Pagination). The host turns that width fixed when the stretch is written, so the frame stopped following its content.
Tab.Item's 2px indicator and Tabs' 1px baseline are now pinned across their parent's foot (`foot`, out of the flow,
constrained `STRETCH`), with a bottom inset of the bar's height so the label row and the tabs sit where they did. A tab
whose label grows keeps its bar under the whole label, and a list with a fourth tab keeps its baseline under all four.
CodeInput's label and message no longer stretch: the field hugs the widest of its label, cells and message, so six
cells from medium up no longer run past a field frozen at the label's 320. New gate `lint-fill-under-hug.ts` fails by
def and part path on a stretch across a hugging column, or a grow along a hugging row, in any projected member. The
component shim models a horizontal `STRETCH` constraint, and `test:roundtrip` measures all three sets with the host
rule on, after their content grows. No property, variant or token name moves.
