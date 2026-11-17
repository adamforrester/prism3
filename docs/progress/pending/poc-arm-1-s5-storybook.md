## (2026-11-17) — The arm 1 Storybook: the button as `<p3-button>` and as plain HTML, one story per state (#3408 S5)

**What changed.** A new workspace, `apps/storybook` (`@prism3/storybook`), on the code POC's integration branch
`poc/arm-1`, stacked on S4. Engine output doesn't move, so there is no change note.

- **Storybook 10.6.5 on `@storybook/web-components-vite`.** It loads the shipped token CSS, `@prism3/css` and
  `@prism3/web-components`, and takes the element's controls from `custom-elements.json`.
- **36 stories:** 18 cases in each of two delivery forms. The cases are each def state (hover, pressed and
  focus-visible forced by `storybook-addon-pseudo-states`), each appearance and size, inverse, the visual slots and
  full width.
- **Two new gates.**
  - `build`.
  - `check:build`, which opens every story of the static build in Chromium. The index must hold exactly the check's
    own story list, each forced state must show, and the element and HTML stories of a case must compute the same
    styles. Two mutations fail by name.
- **Corrects S4's browser test**, which named two token names that don't exist for its page background.
