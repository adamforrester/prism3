---
engine: patch
---
Native Figma slots (#2417): a `box` part declaring `contentSlot: true` projects as a `CONTENT_SLOT` node and builds
as Figma's own SLOT, the region a designer fills with their own content on an instance, with one SLOT property per
slot name on the set; a text part inside one carries literal `characters`, since Figma refuses a property
reference there. Both executors build it, the read-back expects a SLOT, and the update path converts a slot a
member gains. No def declares one yet, so no committed artifact or projected component surface moves; Accordion is
the first that will.
