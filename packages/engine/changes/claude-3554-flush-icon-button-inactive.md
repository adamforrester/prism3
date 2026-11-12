---
engine: minor
---
The flush icon buttons carry a code-only `isInactive` (#3554, owner decision Q-CC22 A). A host that blocks the button at a limit, such as a counter at its minimum, sets `isInactive`, which keeps the button focusable and in the accessibility tree with aria-disabled, as on IconButton. `disabled` drops its advice to prefer aria-disabled and is now native disabled only, for a button irrelevant to the view. `inactive` joins the state list as code-only, admitted as not projected: no Figma member is added, and the member count is unchanged. Pending stays out.
