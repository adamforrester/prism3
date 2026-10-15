---
engine: patch
---
The component read-back accepts FIXED where the plan says AUTO on an axis the parent stretches (#2696). A node with
`layoutAlign: STRETCH` takes its parent's size on that axis, so its own mode there is moot, and the host switches
the mode to FIXED when the stretch resizes the axis. The rule is narrow. It applies only to a planned AUTO, only on
the axis the stretch fills, and only while the host still holds the stretch. A planned FIXED is never relaxed. The
plugin Update's post-apply verify and its dry run read this one predicate. They stopped disagreeing on Accordion's
indicators at medium and large. No committed artifact or projected component surface moves.
