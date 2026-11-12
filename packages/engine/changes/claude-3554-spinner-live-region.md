---
engine: minor
---
Spinner's announcement follows its siblings' live-region rule (#3554, owner decisions Q-CC24 A and Q-CC25 A). A polite `role="status"` region, the host's or the app's, is present and empty before the spinner shows, and the label ("Loading" by default) is written into it on show, as Progress, Toast and Banner require; the label is the region's content, not its accessible name. Spinner's rule against `role="progressbar"` is narrowed to "a spinner is not a progressbar": the claim that an indeterminate progressbar makes screen readers keep announcing a missing value is dropped, since Progress keeps its indeterminate progressbar for a visible bar. Prose only; the Figma set's description moves, and no member, binding or token does.
