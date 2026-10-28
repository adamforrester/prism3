---
engine: patch
---
Plugin: Update file with "Keep" no longer reports a kept hand edit as a part not written as planned (#3086 part 2). A node kept as a hand edit is not written, so the plan's binding is absent there by design. The run report now names it with the hand edits kept, in plain words with the layer name first, for example "1 hand edit kept (dot size)" or "1 hand edit kept (container padding)", never a code name (DRAFT wording, owner Q826 A). A binding the host drops on a node no one edited is still reported as not written as planned.
