## (2026-11-17) — `@prism3/web-components` ships `<p3-button>`, a light-DOM Lit element over `@prism3/css` (#3408 S4)

**What changed.** A new workspace, `packages/web-components` (`@prism3/web-components`), on the code POC's
integration branch `poc/arm-1`. Engine output doesn't move, so there is no change note.

- **`generate.ts` writes `p3-button.js`** from the button def's props in `component-defs.json` (Q96 A), in Lit 3
  (Q95 B). Each def prop is a property of the same name, reflected to `data-prop-<name>`. The element renders
  `@prism3/css`'s markup into its light DOM and adds no style; pending is `aria-busy` plus the spinner, and pending
  and inactive suppress the action while keeping focus.
- **`custom-elements.json`** comes from `@custom-elements-manifest/analyzer`; `check:generated` fails a stale one.
- **Two new browser gates.** `check:parity` holds the element, through its manifest and live, to the def's props,
  values and defaults and the check's own copy of the markup contract; six mutants fail by name. `test:browser`
  renders the element and plain HTML side by side with the real token CSS and requires equal computed styles, plus
  click, keyboard, form and link behavior.
- **Owner decisions** (host attribute names, slot names, the host's box, the busy announcement, element naming) are
  listed in `docs/poc/arm-1-journal.md`, each built as its recommendation.
