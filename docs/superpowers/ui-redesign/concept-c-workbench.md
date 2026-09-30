# Prism3 — Concept C: Workbench

Prototype: `prism3-concept-c-workbench.html` (self-contained). Harness bar: Host Studio/Plugin, Frame Fill / 1280×900 / 380×420, and **Split 1/3 · 2/5 · 1/2** (the divider also drags and takes arrow keys).

## Direction

Settings on the left, a live preview in the center-right, chips for choices. The preview always follows the setting you touch or focus: a shadow control switches it to Elevation, a radius to Size & shape, and a color setting highlights the element it drives in the style guide. There is no toggle. The view select stays as a manual peek until the next interaction.

## The IA question: primitives first, or domain by domain?

**Recommendation: group by domain, and inside each domain order the page primitives → decisions → results.** Do not collect all primitives up front.

| | Primitives up front | Domain by domain (recommended) |
|---|---|---|
| First run | One long foundations pass before you see anything meaningful | Three seeds, then a complete system exists; everything else is refinement |
| Returning to edit | "Where did I set the corner radius?" means remembering its tier | "Change the type" means opening Type |
| Dependencies | Implicit in tier order | Shown on the page, in order, with links |
| Risk | Users make foundation choices with no feedback | Cross-domain dependencies must be surfaced (they are: "Depends on Brand: Primary color") |

Why this holds for Prism3 specifically: the engine produces ~575 tokens from three inputs, so the required decisions are few. **Brand** holds only those (name, primary color, neutrals) plus optional personality and modes. Every other domain arrives with defaults and is opt-in refinement. That gives you guidance without a wizard, and return editing uses the same map as first run.

**Domains (tabs):** Brand · Color · Type · Shape · Depth & motion · Layout · Components.
**Inside each domain:** Foundations (palettes, faces, density, grid) → Decisions (surfaces, actions, scale, corners) → Results (Color › Roles). Advanced settings sit behind one disclosure at the end of each domain.
**Guidance without lock-in:** "Start here" eyebrows on the two required sections, "Continue to Color →" at the end of each domain, "Depends on" links where a domain consumes another's output. Nothing is gated.
**Modes are not a domain.** They are a global context in the top bar. Every setting shows its scope only when it isn't obvious: "dark only", "Light only", "Read-only here". A note appears at the top of each domain when a non-light mode is active.
**Review lives outside Define.** Health and File open in the same panel from the top bar (contrast verdict, file state), so they never compete with the domain chips.

## Layout ratio

Default **2/5 settings, 3/5 preview** (about 510px of 1280). At 1/3 (about 425px) the chips wrap to two rows and roles still fit; the preview gets the room. At 1/2 the preview is no longer the loudest element, and picker grids get loose. Suggest 2/5 default, draggable between 28% and 62%, with the split remembered per user. Below ~760px the panes stack with a bottom Settings / Preview / Health / File bar; between 760 and 1040px the mode chips collapse to a select.

## Controls

Chips were overused in the first pass. Current rules:
- **Chips (pills):** enums with 3–4 short options (density, control shape, heading scale, tempo, neutral source, disabled legibility) and the personality words. Selected = soft fill plus ink border, not solid black.
- **Selects:** 5+ options (display ceiling) and anything with an "Auto: …" default (palette steps, surfaces, action palette, component defs, view).
- **Tabs (text with underline):** domain navigation, role filters, bottom bar at narrow sizes.
- **Segmented control:** the mode switcher (derived modes hatched).
- **Checkboxes:** modes on.
- **Text links:** "Driven by", "Show advanced settings", "Reset to default", dependency links.
- **Solid black** is reserved for primary actions (Apply Theme, Export tokens) and the selected mode.
- **Whitespace:** 32px between settings, 52px between sections; key names and default/advanced/scope tags removed unless they matter.

## Coverage (same brief as A and B)

| Brief item | Location |
|---|---|
| §4.1 Color foundations | Brand (primary, neutrals); Color › Palettes (brand colors, status, gradients) |
| §4.2 Color roles, per-mode overrides | Color › Roles: one row per role, current mode; customizable modes open a step picker; derived and light explain why and link to drivers |
| §4.3 Interactive color | Color › Actions and links |
| §4.4 Typography | Type › Faces, Scale, Weights and style |
| §4.5 Size, shape, density | Shape |
| §4.6 Component settings | Components › Button (options), all component sets listed below |
| §4.7 Elevation, §4.8 Motion | Depth & motion |
| §4.9 Layout | Layout |
| §4.10 Modes and identity | Brand › Identity, Personality, Modes; mode chips in the top bar |
| §5 read-only views | Preview select: Style guide, Palettes, Type, Size & shape, Elevation, Motion, Layout, Components, Tokens. Contrast and Engine notes in Health |
| §6.1 Start, replace guard, Export | Brand ▾ dialog; Export in the top bar and File |
| §6.2 Apply, Set up, Build set, Prune, Read back, Agent link | File (opened by Apply Theme); file state chip in the top bar; agent banner |
| §7 States | Refusal banner, below-floor toast, scope notes, agent banner, build progress |

**Every lever from the manifest is assigned to exactly one domain** (checked by script).

**Stubbed:** list editors (typeface library, per-category faces, sizes, line heights, breakpoints, custom modes, brand-color add), spinner (in flight), dark chrome. Specimen fonts come from Google Fonts in the prototype only. The Roles list shows 23 of the real set; the contrast table samples 16 of 384 pairs.

## Tradeoffs

**Makes easy:** first run is three decisions; returning users go straight to a domain or the search box; the preview always shows the consequence; per-mode role editing has one home; component settings have a home; contrast fixing works from the header verdict, Health, or a preview click.

**Makes harder:**
- Per-mode *comparison* is weaker than B's matrix (one mode at a time; no side-by-side).
- Domain pages are long in Color and Type; the nav does not show position within a page (a section index would help).
- Cross-domain dependencies are only as good as the "Depends on" links; the engine may have dependencies the brief doesn't list.
- Preview follows on focus, so tabbing through settings switches views quickly; watch for flicker.

**§8 rules strained:** 380×420 leaves about 190px of scrolling settings under the top bar, domain chips and search; it works, but tuning while watching the preview means toggling panes. Preview font loading is a prototype-only convenience.

**Proposed UI labels (not token or lever renames):** "verdict" for "pill", "Engine notes" for the decisions log, "Roles" for the per-mode results list, "Depends on" links.
