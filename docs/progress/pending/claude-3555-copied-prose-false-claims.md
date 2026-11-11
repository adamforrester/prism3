## (2026-11-11) — Overlay ratios at the shipped alpha, and the field-ground prose (#3555 F4, F5, V1)

Part of #3555 (the 2026-11-11 metadata audit), batch MB2: the token prose `modes.ts` writes, which the sidecar copies.

- **F4, the overlay ratio.** Each `interactive.*.overlay.*` (and inverse twin) recorded `text.primary` on the wash
  composited at the nominal alpha (0.10), but the hex dialect ships 10% as 26/255. Stated vs shipped was 15.49 vs 15.42
  in the hex brands and 14.26 vs 14.17 on the inverse twins. The derivation now composites at `emittedAlpha`, the rule
  `tree.ts` writes through, as the field status grounds already did. The rgb-dialect brand is unchanged. Every 4.5:1
  contract still holds.
- **F5, "darkest permissible ground".** The field border, hover border and placeholder descriptions (page and inverse)
  called `background.secondary` "the darkest permissible ground". It is not: the same entries list deeper grounds below
  3:1, and in dark mode `background.secondary` is lighter than the page. They now name the ground they are gated on.
- **V1, "PAGE".** The overlay description used capitals for emphasis; it now reads "page ground".

### Why `lint-ratio-truth` missed F4, and what changed there

Arm A recomputed the wash at `r.alpha`, the nominal alpha the derivation itself used, so it agreed with the derivation
by construction (`docs/34` shape 1), and the 0.07–0.09 difference sat in that shared input, not in its EPS. The arm now
rounds the alpha the way each dialect ships it (8-digit hex, or two decimals), written in the gate rather than imported
from `emittedAlpha`. Mutation: the page overlay composite restored to `step / 100` fails the arm 25 times by name
("records ratio 15.49 … but the emitted colors measure 15.42").

### Gaps

- No gate for F5: "darkest" is a comparison across every ground a field may sit on, which no emitted field records. The
  phrase is gone from shipped prose; two code comments in `modes.ts` keep it and are left alone.
- The capitals check on `$description` (V1) belongs to the sidecar gate in `test.ts`, which batch MB1 owns; it lands with
  the rest of MB1.
