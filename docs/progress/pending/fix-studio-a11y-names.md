## (2026-11-20) — Studio accessibility: the pinned neutral's readout is described, the token tier says which is selected, and the preview body is a Tab stop where Safari needs one (#2206, #2492, #4223)

Three places where the markup said less than the screen did. Each arm reads the browser's accessibility tree or the drawn page, fails by name on `main` and passes here, and a mutation of each fix fails it again by name. No visible change, no new words: the one description is the state line already drawn.

### What changed

- **#2206.** Pinned, the hue and chroma sliders are the pinned color's readout, drawn disabled. The state line under the hue ("A pinned neutral sets the ramp: … Hue and chroma are its readout.") now has an id, and both sliders point `aria-describedby` at it, so a screen reader hears why they are unavailable and keeps their values. Arm: end of section `29-pinned`, both hosts.
- **#2492.** Inspect › Token list's Primitives and Semantics buttons carry `aria-pressed`. The issue's other three findings were fixed before this lane reached it: the Show and Category selects are named by `selectField`'s `aria-label` (#3938), and Alias path is the shared radio group with `aria-checked` (#3911). Arm: end of section `45`, both hosts.
- **#4223, the preview body.** `.p3-preview-body` gets `tabindex="0"` exactly while it scrolls and holds nothing a keyboard can reach, which is Chromium's and Firefox's own rule, applied for Safari. A body with controls, or one that does not scroll, gets no stop, so the Tab order of every other page is unchanged. The frame re-reads it on a resize of the body or its children, on a redraw, and when fonts load. Arm: end of section `45`, on every place, both hosts, 1280 and 380. It also asserts that both branches were measured: Palettes, Fills, Layout and Components took the stop, and five places that hold controls did not.

### Trap for a re-verifier

Chromium already makes such a scroller focusable without the attribute, so pressing Tab in the test browser cannot tell the fix from `main`. The arm reads the `tabindex` attribute instead, against a rule worked out in the test from the body's measured overflow and a focusable list typed there.
