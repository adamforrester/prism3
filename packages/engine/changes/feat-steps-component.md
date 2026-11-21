---
engine: minor
---
Two new components (#3055): Steps, a person's place in a fixed sequence of steps, and StepItem, one step in its `items` slot. Each step is a numbered disc beside its name with a neutral line to the next step: filled for the current step, outlined for a step not started yet, a check for a complete step (whose name can link back through `href`), and the danger error glyph for a step with an error. Both lay out horizontally or vertically, at medium or small. Progress, Breadcrumbs, Tabs and PageNav now point to Steps instead of a planned stepper.
