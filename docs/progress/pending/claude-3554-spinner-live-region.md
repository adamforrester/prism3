## (2026-11-11) — Spinner: the region exists first, and a spinner is not a progressbar (#3554 Q-CC24 A, Q-CC25 A)

Owner decisions Q-CC24 A and Q-CC25 A, one PR because both rewrite the same `accessibility.aria` sentence.

- **Q-CC25 A.** Spinner mounted its `role="status"` wrapper together with its text, where Progress, Toast and
  Banner each require a region present and empty from the start (some screen readers ignore a region inserted
  with its text). The def now says the host's or the app's polite status region exists first and the label is
  written into it on show. It also stops calling the label the region's accessible name ("named by label"):
  the label is the region's content.
- **Q-CC24 A.** Spinner ruled out an indeterminate `role="progressbar"` because "some screen readers keep
  announcing the missing value", while Progress uses exactly that for its indeterminate bar. Progress keeps it (a
  visible bar is one); Spinner's line is now "a spinner is not a progressbar", in `aria`, `codeOnly`, the `dont`
  list and the contested note. The `unverified` entry that asked for the dropped screen-reader claim to be
  verified goes with the claim.
- Prose only. The component catalog, the spinner page and the Figma set's description move; the component-surface
  baseline was re-accepted for the description (same member count).
