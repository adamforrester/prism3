---
engine: minor
---
Figma property names are lowercase (#2759, owner decision Q345 A): Switch.Control's `State icon` is `state icon`,
Image placeholder's `Marker` is `marker`, Tag's `Check icon` is `check icon`, and Segmented control's `Label` is `label`.
The code props are unchanged. `COMPONENT_RENAMES` gains a `property-rename` kind, and an in-place update renames the set's
property instead of deleting it and adding a new one, so the property keeps its id and every placed instance keeps
the value a designer gave it. The renames lint accepts a `property-rename` entry as the claim for a property that
leaves a set.
