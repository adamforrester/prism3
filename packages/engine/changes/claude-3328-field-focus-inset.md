---
engine: minor
---
A focused field now draws its focus inside itself, at its own radius (#3328, owner decision Q3328.1 A). The border takes the focus color and the 2px focus ring sits inside it, so the focus reads as one 3px edge with no outer frame. The ring takes the field's own radius variable, so no corner is written as a number. This applies to Text field, Textarea, Select, Password field, Card number field, Search field, Code input and Counter (outline) (Q3328.2 A). Counter's ghost and every field drawn in the underline Field style keep the outside ring. A part can now declare `borderInset`, the host border width it sits inside, and both executors honor it (EXECUTOR_REVISION 50). No token is added or renamed.
