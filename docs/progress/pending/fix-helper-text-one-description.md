## (2026-11-19) — One description for the helper-text props, and "inactive" defined once (#4204, decisions 1 and 2)

#4204 is the overnight copy audit of the component guidance and the token sidecar. The owner settled its three named decisions as recommended (2026-11-19). This entry builds the first two. The third, and the per-row rewrites, are left open (below).

### What changed

- **Decision 1 b: keep both prop names, describe them identically.** The twelve helper-text props now open with one sentence, "Helper text, read by assistive tech through aria-describedby.", and keep their own guidance after it. Those are `description` on Checkbox.Row, Radio.Row and Switch.Row, and `helpText` on Card number field, Code input, Counter, Password field, Search field, Select, Slider, Text field and Textarea. Unifying the names waits for the next contract bump, as decided. Each def's own accessibility text was checked first: all twelve already say the helper joins aria-describedby, so the sentence claims nothing new.
- **Decision 2 a: two words, defined once.** Button's do-list line is the definition. "Use isInactive for a control the user can still unblock, such as Submit on an unfinished form; it stays focusable and says why. Use disabled only when the control doesn't apply right now." Counter's five "unavailable" become "inactive" where they name the code-side state (summary, `min`, `max`, the do-line), and a disabled Counter's buttons are "disabled". The two stepper anatomy notes tell the designer which Figma state to set, and the nested button's state axis has no inactive value, so they say "disabled at the minimum" and "disabled at the maximum" (review of #4363). Pagination.Item already said "inactive".
- **Owner decision on #4363 (2026-11-20, as recommended).** Button's definition takes a semicolon, as the issue's DRAFT did, not a colon ("…such as Submit on an unfinished form; it stays focusable and says why."). Counter keeps "inactive". Rewording Button's `isInactive` and `disabled` prop rows to match the definition is a follow-up, filed as #4377. "In its default status" is accepted as carrying "Persistent".

### Tests

`test.ts`, four `#4204` arms at the end of the suite. One holds every helper-text prop to the lead sentence; the props are found by name across the registry, and the three rows are asserted present. The other reads every string Button, Counter and Pagination.Item ship: no "unavailable", and Button's definition present. On `main` both fail by name. Rewording one prop's lead also fails the first. The third holds each Counter anatomy note that names a designer-set state to a value on the nested button's exposed state axis, read from the nested def; "inactive" in either stepper note fails it by name. The fourth types the decided definition out itself and finds it, semicolon included, in the def and in all three emitted Button pages; a colon in its place fails it by name.

A register gate (`#2714`) refuses a code span in a consumer field, so Counter's summary says "inactive" with no `aria-disabled` beside it. Button's line defines the word.

### Left open

Decision 3 b (the Q438 A summary sentence in the Figma description only) changes what `lint-component-docs.ts` requires, a gate rule the owner set, so it needs its own change. The per-row DRAFT rewrites (rows A to E) carry no recommendation, so they are still the owner's. The issue's own plan folds the def rows into #3555's MB3 to MB6 batches.
