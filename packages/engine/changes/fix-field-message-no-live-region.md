---
engine: minor
---
FieldMessage's accessibility guidance follows its brief (#1712): on error the host sets aria-invalid="true" and
aria-describedby, and focus moves to the invalid field or the form's error summary. The message is never a live
region, and the form's error summary is the only region that announces, because a live region on the field reads
the error twice while focus moves to it. The def's aria, its announcement code-only entry, its 4.1.3 line and its
don't change, and TextField's aria drops "announce politely". Component docs and components.ai.json move.
