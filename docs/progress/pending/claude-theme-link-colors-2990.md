## (2026-10-24) — Theme › Color: link rows gate every pick on the surfaces they sit on, in every mode (#2990)

Draft PR. Built on the recommended answers to Q2990.1–5, which the owner has not answered yet. Wireframe linked on #2990.

### What was already there
The issue's premise was that no Theme UI exposes link roles. It does. Color › Interactive › Links has had `Text link` and `Text link · inverse` rows since the S5 redesign, and the plugin mounts the same page. Pinning one already moves hover, visited and pressed by their derived step distance (`setLinkFamilyOverride`), and the engine already clamps a sub-floor link pin to the nearest clearing step (#1510). So the owner's inverse-link change was possible through Apply Theme already. What was missing: the row measured one mode and one ground; a sub-floor step could still be clicked, and the engine then landed a different step (865 times in the sweep); and nothing said the states follow.

### What changed
- The step picker takes extra surfaces (`against.also`) and rates each step at its worst across them. It also takes `blockBelow`, which marks a sub-floor step `aria-disabled` so it can't be picked. The step stays focusable, so arrow keys still move over it.
- The two text-link rows pass the family's primary and secondary surfaces and block sub-floor steps. Each now has a four-mode contrast strip and a state line. Icon-link rows are unchanged (wireframe scope).

### The surfaces question, held
Derived links measure about 4.1:1 on `background.tertiary` in four of five corpus brands, because the link walk gates on the floor ground only. Whether links sit on the third tier is the owner's call (Q2990.4), so it is filed as #2991. L-07 and the UI use primary and secondary only.

### Gate
`test.ts` L-07 recomputes contrast from resolved hexes against surfaces named literally. It doesn't read `ratio` or `against`, or any studio code. Mutation: removing the #1510 link clamp in `modes.ts` fails L-07 by name.
