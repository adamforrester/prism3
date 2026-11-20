## (2026-11-19) — Brand B: a second brand inside the Prism3 reference theme (#1729)

**What.** The default theme carries a second brand as a custom mode, `brand-b` (owner decision Q-BB1 A). It is built on light, the mechanical default for one mode: Q-BB1 names no base.
It swaps only the primary and accent colors, the display face and the gradient. Neutrals, surfaces, status colors,
radius, density, motion and shadows stay Prism3's. The identity is Aurora's, not a new one: its primary and accent
verbatim (Brand B's two ramps are byte-identical to Aurora's), Clash Display on display and title (per-mode family by
category, #415), and its brand gradient through the swap (identical stops, `#5241af → #007cbb`).

**The lever it needed.** Nothing could swap a palette for one mode: `overrides` re-points one role at a time, and
primitives are mode-invariant. New input `modePalettes: { <mode>: { <palette>: <replacement> } }`, resolved in
`brandTheme` into per-mode color routing (role → palette, role anchors, link palette and anchor, interactive columns).
`resolveAllModes` resolves that mode against its own routing (`withModePalettes`), so every moved role is re-anchored
at the replacement's own shade and re-gated against the same floors; nothing in `modes.ts` re-derives the swap. The
replacements must be `brandColors`, so their ramps ship in every mode and a swap only re-points aliases. Gradient
stops follow the swap into a per-mode value (`gradientsByMode`, emitted as the token's `modes` entry with its own CSS
and worst-case contrast). Every gated pair passes in brand-b: 241 per mode, the same as light.

**Fixed on the way, because Brand B is the first corpus brand to reach them:**
- a per-mode font family's mode entry carried light's description, so the overlay named Playfair Display for Clash
  Display; it now carries its own;
- `.ai.json` refused a per-mode font family (`typographyEntry` had no `mode_overrides`), and gradient entries now carry
  per-mode stops;
- the MCP paste path (`materialise-to-figma.ts`) read only the built-in mode names, so a custom mode's color file was
  dropped silently and its per-mode font files left the font pass with nothing to read;
- `lint-cut-binding` and the exporter-agreement gate read `core.font.json` by name; both read the per-mode files now.
  The exporter adapter fills a mode-invariant file's rows into the collection's other modes, as Figma does when a mode
  is added, and counts the fill (`filledFromDefault`);
- the Studio cascades `modePalettes` with every mode and palette rename and removal (`name-refs.ts`);
- **the plugin wrote `core`'s palette and dimension rows to its first mode only.** A per-mode face gives `core` a second
  mode, so in a Figma file previewing `core` in Brand B those primitives read whatever the mode last held: on a re-apply,
  the previous apply's values. Read-back parity caught it (245 rows missing from the brand-b export). The executor now
  writes a one-value row to every mode its collection holds (`writeExtraModes`), and a pass that adds a mode fills it
  for the rows it does not plan (`fillAddedModes`, as Figma copies on `addMode`, stated rather than left to the host).

**Shown as "Brand B".** A custom mode's slug is its name everywhere but the Studio's mode control and Health, which now
read it as words (`customModeLabel`: `brand-b` → "Brand B").

**Artifacts.** +3, to 263 (the floor moved to the set's size): the brand-b overlay, the brand-b Figma color mode, and `core.font.json` split into
`core.font.Default.json` and `core.font.brand-b.json`. `ARTIFACT_FLOOR` moved with them. The guaranteed token contract
is unchanged (`token-contract.ts --check`); the new names are prism3's own palette primitives (`core.palette.brand-b-*`).
The shipped token CSS gains a `[data-theme="brand-b"]` block.

The removal confirm names the mode the same way ("In Brand B, accent is no longer swapped for brand-b-accent.";
the label moved to `state/mode-label.ts` so `name-refs.ts` can read it), and the plugin's style guide titles a
palette's one-letter word as a letter's name: "Brand B primary", "Brand B accent", not "Brand b".

**Owner decisions (2026-11-19, on the PR):** decision 7 is A, so Brand B's controls stay on `brand-b-primary` (violet)
with no per-mode `actionPalette`. Decisions 1–6 and the new strings are approved as recommended: the "Brand B" label
rule; the glow gradient ending on Brand B's violet rather than Aurora's azure; the gamut note Aurora's accent brings to
the default theme; Brand B's ramps showing in every palette picker; and the five-mode header falling back to the select
at 1280 on four pages, against Q-UI1 (#3553), which the chrome test holds on four modes.

**Measured.** On main's Prism3 input the new arms fail by name (plugin read-back: "brand B (#1729): the saved default
theme declares brand-b"; Studio: "the default theme ships brand-b"; verdict: "prism3 gates 1205 roles"). Mutation:
`withModePalettes` returning the theme unchanged fails `test.ts` "#1729 no brand-b role draws from Prism3's primary or
accent", "#1729 every one of light's 67 primary roles draws from brand-b-primary" and "#1729 brand-b's primary fill
anchors on Brand B's own shade". Dropping the palette pass's extra-mode write fails `test-readback.ts` "brand B
(#1729): every core palette and dimension primitive holds one value in both core modes (245 read, 204 differ)".
