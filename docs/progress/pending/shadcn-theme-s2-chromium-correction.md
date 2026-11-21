## (2026-11-21) — Correction to 2026-11-19 The shadcn theme measured in Chromium: contrast and the oklch() round trip (#2997 PR 2)

**Why a correction.** The 2026-11-19 entry is `shadcn-theme-s2-chromium.md`, this branch's own fragment. It reached `main`
as first written, inside #4309 (#2997 PR 3), which carried this branch's head merged in. The entry stays as written, and
what #4289 changed after it travels here.

**Accepted ratios.** The contrast gate lists the 15 `KNOWN` pairs per brand, each with the decision and the ratio accepted
(the value measured, floored to two places); #4279 holds the engine question. A known pair below its accepted ratio fails
by name, and an entry whose pair passes fails as STALE, so the list remembers what the owner saw (review on #4289). The nb
pair, light `muted-foreground` on `muted` at 3.77, was accepted on #4289 (owner decision 2026-11-19 A: a legacy fixture,
not engine-derived). It stays in `KNOWN_PENDING`, held the same way as `KNOWN`: to its accepted 3.77, printed on every
run, STALE once it passes.

**Trap.** The `test.ts` import of the gate moves every line below it by one, so the public guide's cite of `test.ts`
(`docs/public/guides/index.md`) moves with it; `lint-guide-claims` names the stale range (delta review on #4289).

**Fix carried here (#4428).** On a tree with `main` merged in, both gates crashed: `aurora.web: no
aurora.web.dark.overlay.tokens.json in the handoff`. Since #4282 `out/` commits a web-only `<brand>.web.base.tokens.json`,
and `handoffBrands` (#4286) read every `*.base.tokens.json` as a brand. It now keeps a name only when the full tree
`<brand>.tokens.json` sits beside it. A `test.ts` arm plants a web base, so the regression fails by name (`#4428 a
web-only base is not read as a brand`) rather than as a thrown error.

**Checked.** Mutations, each failing by name:
- prism3's dark `primary` emitted as `oklch(0.25 0.1 266.7)` fails `prism3 dark: primary on background 1.19 < 4.5 — BELOW
  ACCEPTED 4.24`, and a lighter dark `destructive` fails `STALE KNOWN prism3 dark: destructive on background`;
- nb's light `muted` darkened fails `nb light: muted-foreground on muted 2.57 < 4.5 — BELOW ACCEPTED 3.77`, where it
  was muted at any ratio before (delta review on #4289).
