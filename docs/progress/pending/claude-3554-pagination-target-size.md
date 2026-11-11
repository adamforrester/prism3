## (2026-11-11) — Pagination and CodeInput carry the items size note; 44px targets cite 2.5.5 (#3554 M-D)

Part of #3554 (the 2026-11-11 component consistency audit), batch M-D.

- **The Q438 items size note.** A host whose items sit in a native slot passes `size` to the items a designer has not
  edited, and its summary says so in the owner's sentence. Arm F of `lint-component-docs.ts`, and the summary cap in
  `component-schema.ts`, found hosts only by an `items` code prop beside `size`. Pagination's code API is count-driven
  and CodeInput's is a value, so neither has one, and neither was asked. Both now also find a host by its anatomy: a
  native slot whose default items `follow` the host's `size`. Pagination and CodeInput carry the sentence. CodeInput was
  not in the audit; the widened scan found it (its six default cells follow `size`).
- **44px targets cited as 2.5.8.** SC 2.5.8 (Minimum) is 24×24; 44×44 is SC 2.5.5 (Enhanced), stated as intent. Pagination
  (both its WCAG lists), Tab.Item, SegmentedControl, Slider (both) and ButtonGroup cited 2.5.8 for a 44px target. Each
  now carries Button's pair: a 2.5.8 line with the 24×24 minimum, and a 2.5.5 line with the 44px claim as intent.
- **Stale comments.** `pagination.ts`'s header named `border.tertiary` for the current page's border, which is
  `border.secondary` since Q427. `component-schema.ts` said the `separator` values are shared by the separator, which
  picks its mark by its own `type` axis.

### Mutation

With the sentence dropped from Pagination's summary after the fix, arm F fails by name three times (def, JSON, page).
Before the fix, the same drop passed, because Pagination was never a host.
