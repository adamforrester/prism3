---
engine: minor
---
Component guidance (#4204, owner decisions 1 b and 2 a). The helper line under a label keeps its two prop names, `description` on Checkbox.Row, Radio.Row and Switch.Row and `helpText` on the fields, and all twelve now open with one sentence: "Helper text, read by assistive tech through aria-describedby." Button's guidance defines "inactive" (the user can still unblock it, and it stays focusable) and "disabled" (doesn't apply right now). Counter says "inactive" where it said "unavailable", and its stepper anatomy notes name the Figma state the designer sets, "disabled", at each limit. Regenerated in `out/components/*.md` and `components.ai.json`.
