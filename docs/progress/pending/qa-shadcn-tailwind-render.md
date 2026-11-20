## (2026-11-20) — Render QA: the shadcn/ui and Tailwind themes on real components (#4382, from #2997)

**Status:** a measurement harness under `packages/tokens/qa/`, not wired into CI. No engine or emission change, so no
change note. Carries #4315 through a normal merge, because the themes it measures are not on `main` yet. Merge #4286,
#4289, #4309 and #4315 first.

### What changed

- **`packages/tokens/qa/`** builds one page per hosted brand (`prism3`, `aurora`, `harbor`) in light and dark, for two
  surfaces. One is stock shadcn/ui new-york-v4 markup under the stock `globals.css` skeleton, with the brand's registry
  item merged in as `shadcn add` merges it. The other is plain Tailwind v4 utilities under the brand's `@theme` file.
  The pinned `@tailwindcss/cli` compiles both, with no new dependency.
- **`render-qa.mjs`** loads each page in Chromium and checks 618 computed colors, radii, shadows, fonts and spacings
  against the DTCG handoff. It reads the handoff with its own overlay merge, alias walk and color parser, and never
  reads the generated CSS or the role map (docs/34). It also reports the contrast of the rendered text and of the
  focus ring, and writes screenshots at deviceScaleFactor 1 to a git-ignored folder.
- **`npm run -w @prism3/tokens qa:render`** runs it.

### Findings

All 618 property checks match the handoff, in both modes, for every brand. Dark mode switches. The observations and
the defects filed from them are on #4382.

### Mutations, each failing by name

- One registry item's light `--primary` changed → `shadcn prism3 light button-default background-color`, along with
  every other primary-filled part.
- `radius-xl` dropped from that item's `cssVars.theme`, so the skeleton's derived value wins →
  `shadcn prism3 light card border-top-left-radius: renders 10px, want 8px (radius.xl)`.
