## (2026-11-19) — The shadcn theme measured in Chromium: contrast and the oklch() round trip (#2997 PR 2)

**What.** Gates 1 and 2 of #2997, over the projector PR 1 (#4286) added. Both render a fresh copy of the shadcn theme
and load each brand's CSS into headless Chromium. A canvas does the reading, so `oklch()`, alpha and the `.dark` switch
are the browser's work and no color goes through `color.ts`, which the projector uses (`shadcn-browser.ts`).
`lint-shadcn-contrast.ts` measures 32 typed ink-on-ground pairs per brand and mode. Each floor is the higher of WCAG (4.5
text, 3 non-text) and the engine's own `min` for the ink's role, read from `<brand>.tokens.json`.
`lint-shadcn-roundtrip.ts` holds every emitted `oklch()` to the role's 8-bit color. It reads that color from the full
tree by its own alias walk, while the projector reads the handoff files.

**What it found.** 320 pairs measured. 15 fail as Q2997.8 A expected: `destructive` and `primary` used as text in dark,
at 4.04–4.25 on every brand. They are listed in `KNOWN` with the decision, and #4279 holds the engine question. One more
pair fails and is held in `KNOWN_PENDING` for the owner: nb, light, `muted-foreground` on `muted`, 3.77. It prints on
every run, and fails as STALE once it passes. The round trip is exact for all 320 values. No mapped role carries alpha
today, so the alpha arm has nothing to read until one does.

**Trap.** A function passed to Playwright's `page.evaluate` from a `tsx` script carries esbuild's `__name` helper, which
the page does not have. The page code is therefore a string.

**Where it runs.** CI's studio job, after the Chromium install step, because the engine job has no browser. Playwright
loads at run time from the workspace, as `tools/block-capture` loads it. `packages/engine/package.json` still declares
no dependency.

**Checked.** Mutations, each failing by name:
- `muted-foreground` → `color.text.tertiary` fails `prism3 light: muted-foreground on muted 3.17 < 4.5`;
- L rounded to two places in the projector fails `prism3 light popover: #e9e9e9 → #e8e8e8` (176 of 320);
- a pending key that no longer fails fails `STALE PENDING`, and the real nb pair fails by name.
