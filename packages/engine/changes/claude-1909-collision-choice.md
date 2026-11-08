---
engine: patch
---
Apply Theme's collision choice (#1909, Q112 A): when an apply would touch content Prism3 did not make, the panel lists
each collision and the person chooses Skip or Rename for each, or one choice for all, and the apply runs again with
those choices. A collision with no choice is refused as before, the pre-flight runs again over the resolved plans before
any write, and nothing is remembered. An agent's apply is unchanged. Plugin and panel only: no committed artifact,
emission or component surface moves, and the component executor is unchanged.
