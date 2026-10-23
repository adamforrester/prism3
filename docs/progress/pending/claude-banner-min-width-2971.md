## (2026-10-23) — Banner gets a minimum width, bound to a new `container.min` (#2971)

Owner QA 2026-10-23 on #2971: Banner needs a minimum width, the same one for contained and full width, because a narrow host wrapped its body to a sliver. Built on the recommended answers to Q2971.1–3, posted with a 1:1 wireframe on the issue; each alternative is a one-line follow-up.

- **The mechanism was already there.** `minWidthKey` (a token-bound Figma `minWidth`, code `min-inline-size`) has been in the schema, `anatomy-figma.ts` and the plugin shim since 2026-09-28, but no def used it once Tag moved to `minWidthRatio`. Banner's root now binds it, so all 8 members carry the floor. No schema change.
- **No token held the value,** so this adds one: `container.min`, 320px, beside `container.max` and `container.narrow`. It is in the DTCG tree and in the layout variable collection as `container/min`, for every brand. It is fixed, not a lever, because 320 is the WCAG 1.4.10 reflow width and does not vary by brand. `CONTRACT_VERSION` 14.9.0 (MINOR, one added path).
- **320 over 360 (Q2971.1 A).** The narrowest real host is a 320px phone. A contained banner sits in its 288px column (320 less `grid.sm.margin` on each side), and a full-width banner spans 320. At 360 every full-width banner runs 40px past that viewport.
- **Clamped in code (Q2971.2 A).** Both values are wider than the 288 column. So the code note is `min-inline-size: min(container.min, 100%)`, not a plain floor that would scroll the page sideways there. Figma keeps the plain floor, since it has no `min()`.
- **Not done here:** the studio's container preview (`apps/studio/src/preview/sections/containers.ts`) lists `max` and `narrow` only. Showing `min` is a UI change, left out of this PR.
