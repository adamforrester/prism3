# Rendered-contrast sweep — 2026-08-06

> `lint:contrast` (#516) gates the studio's token **values**. This report measures what actually
> **renders**: every visible text node and every declared control edge, per page x mode x brand,
> with translucent layers composited over the walked-up opaque ground. It is a report, not a gate —
> the repo deliberately carries no Playwright dependency (#333); the probe ran against a global
> install via `PLAYWRIGHT_MODULE`, the same escape hatch `mode-audit.mjs` documents.

## Method

- **Scope:** 9 pages (Palettes, Surfaces & fills, Interactive, Typography, Elevation, Size & radius,
  Layout, Motion, Preview — plus each page's view segments: Typography's tabs, Preview's three views)
  x every mode the brand generates (light, dark, hc-light, hc-dark; no corpus brand enables
  wireframe) x three brands (aurora, harbor, wendys) = **150 sweeps, 40,650 text nodes, 1,187
  control edges measured**.
- **nb is not in the sweep:** the legacy fixture has no `BrandInput` — it is built by `nbThemeFrom()`
  from the hand-authored token dump, and the studio can only load a `BrandInput`. Not a probe
  limitation; there is nothing to load.
- **wendys loaded by injection, not import** — see "Side-finding" below.
- **Compositing:** for each node, ancestor backgrounds are collected upward until the first opaque
  one, then composited forward; cumulative `opacity` multiplies into the ink before the ratio is
  taken. This is the trap the sweep exists to avoid: a translucent wash read as opaque produces
  nonsense ratios.
- **Sanity anchor:** every one of the 150 sweeps independently computed `--ink` on `--paper` through
  the same math and got **15.97:1** (expected ~15:1). Zero sweeps failed the anchor; no failure below
  was trusted before this held.
- **Floors:** 4.5:1 for text (3:1 at >= 24px, or >= 18.66px bold — WCAG large text), 3:1 for declared
  control edges. An edge passes if it clears 3:1 against **either** adjacent field (outer ground or
  the control's own fill) — measuring one side only would flag borders legitimately carried by the
  other.
- **Skipped:** SVG content, `[disabled]` form controls (WCAG exemption), gradient-grounded nodes
  (zero encountered). Text nodes are deduplicated per sweep on (selector-signature, ink, ground).

## Verdict, classified

The raw sweep found 995 per-sweep failing pairings, collapsing to **202 distinct text pairings and
36 edge pairings**. They are not one population. Classified by root cause, most severe first:

### A. Specimens that cross modes with their grounds — text at 1.0-1.6:1, effectively invisible (REAL)

The worst ratios in the sweep are all one defect family: **a specimen surface with a fixed ground
rendering a mode-resolved ink** (or the inverse). Verified by computed-style inspection, not just
the probe:

1. **Surfaces & fills, dark modes — `sf-ex-fill` neutral surface cards.** "Card" / "Panel" /
   "Nested" labels render **1.02-1.26:1** in every brand's Dark mode. The renderer sets both inline
   (`background: rgb(23,23,25); color: rgb(25,25,32)` — verified on the live element): a dark
   surface fill with a dark ink. In Light mode the same cards are legible.
2. **Interactive, dark modes — the example boxes.** The rest-surface `exbox` has a **transparent
   background**, so its specimens actually sit on the always-light chrome page; in Dark mode the
   brand's link resolves near-white and lands on white — **1.07:1** (`#f7f7f7` on `#ffffff`).
   Meanwhile the hardcoded-dark `exbox.dark` renders the dark-resolved inverse link on its fixed
   dark ground — **1.00:1** (`#0d0d0e` on `#0d0d10`). Both brands, both HC-dark too.
3. **Preview / Style guide, dark modes — `sg-st` state labels.** The "On Light surface" column is a
   fixed light card, but the state labels under its buttons ink with the mode-resolved muted gray —
   **1.51-1.61:1** (`#c9ccce` on `#f7f7f7`), 10 labels per brand per dark mode.
4. **Typography (wendys) — `tpw-mark.unknown`** "?" glyph at **1.36:1** on white.

### B. Studio chrome under floor — the class the value gate cannot see (REAL)

5. **Motion page, every brand, every mode — `.mo-playnote`.** The "playing at ..." note is
   `color: var(--faint)` **at `opacity: .75`**. The #516 gate holds `--faint` to 4.628:1 and passes;
   the render fades it to **3.12:1** (`#929297` on white). This is the exact shape the sweep brief
   predicted: the token value is legal, the rendered pairing is not. 48 nodes.

### C. Specimens rendering brand tokens whose engine contract is 3:1 (INFORMATIONAL — meets contract)

The 3.0-4.5 band is dominated by specimens faithfully displaying token pairs whose **engine
contract is deliberately 3:1**, not 4.5: the disabled set (`Save` / `Button` / `Disabled` labels at
3.04-3.08 — `disabledMin` floors at 3), the `-subtle`-on-tint semantics ("Success, quietly" etc. at
3.16-3.25 — `secondaryMin`), and `on-color` / on-fill samples at 4.1-4.5. These are the brand's
contracted values being previewed, not studio defects. They are listed in the full table for
completeness and marked in place.

### D. Control-edge hairlines — one root cause, 36 selectors (JUDGMENT CALL)

Every failing edge is the same `--line` hairline (`#dcdde2`) at **1.22-1.36:1** on `--paper` /
`--panel` / white: nav buttons, the brand selector, mode chips, palette inputs, number fields,
Typography's step buttons. WCAG 1.4.11 requires 3:1 only where the boundary is **required to
identify** the control; most of these carry identification in their text or fill, making the border
decorative. But the text inputs (`.pname-input`, `.adv-num`, `.gr-ed-nameinput`, `.tf-addin`) have
no other affordance — for those the hairline *is* the boundary. Flagged for an owner decision
rather than asserted as violations.

## Side-finding: the studio rejects the corpus's own standard-dialect design.md

`wendys.design.md` — a corpus brand `regen.ts` rebuilds on every run — cannot be imported through
the studio's upload: `validateDesignMd` (web/src/main.ts:6152) parses **only the engine-native
dialect** (`parseDesignMd`), while `cli.ts` auto-detects and routes the standard dialect through
`parseStandardDesignMd` + `standardToBrandInput`. The upload fails with "Parsed, but the engine
rejected it: Cannot read properties of undefined (reading 'l')" — the empty native parse handed to
`brandTheme`. For this sweep wendys was loaded by deriving its BrandInput with the engine's own
standard parser and injecting it via the app's `prism3:brandInput` localStorage persistence.

## Where the failures are NOT

Worth stating: the editing chrome itself — knob labels, section titles, table text, hints, the
things #355/#516 fought for — measured clean in all 150 sweeps outside the five clusters above.
`--faint` and `--muted` hold everywhere they are used **at full opacity**; the one breach goes
through an `opacity` fade (cluster B), which is invisible to a value gate by construction.

---


## Text pairings under floor (202)

| selector | kind | pairing | measured | floor | nodes | where | sample |
|---|---|---|---|---|---|---|---|
| `.exbox a.ilink.pinnable` | text | #0e0d0c on #0d0d10 | 1.00 | 4.5 | 1 | harbor · Dark · Interactive | "Text link" |
| `.exbox a.ilink.pinnable` | text | #0d0d0e on #0d0d10 | 1.00 | 4.5 | 2 | aurora, wendys · Dark · Interactive | "Text link" |
| `.sf-right div.sf-ex.sf-ex-fill` | text | #191920 on #171719 | 1.02 | 4.5 | 1 | aurora · Dark · Surfaces & fills | "Card" |
| `.sf-right div.sf-ex.sf-ex-fill` | text | #191920 on #181716 | 1.02 | 4.5 | 1 | harbor · Dark · Surfaces & fills | "Card" |
| `.sf-right div.sf-ex.sf-ex-fill` | text | #191920 on #171718 | 1.02 | 4.5 | 1 | wendys · Dark · Surfaces & fills | "Card" |
| `.exbox span.inote` | text | #f7f7f7 on #ffffff | 1.07 | 4.5 | 4 | aurora, wendys · Dark · Interactive | "Notifications" |
| `.exbox a.ilink.pinnable` | text | #f7f7f7 on #ffffff | 1.07 | 4.5 | 2 | aurora, wendys · Dark · Interactive | "Text link" |
| `.exbox span.ibtn.pinnable` | text | #f7f7f7 on #ffffff | 1.07 | 4.5 | 2 | aurora, wendys · Dark · Interactive | "Outline" |
| `.exbox span.inote` | text | #f7f7f6 on #ffffff | 1.07 | 4.5 | 2 | harbor · Dark · Interactive | "Notifications" |
| `.exbox a.ilink.pinnable` | text | #f7f7f6 on #ffffff | 1.07 | 4.5 | 1 | harbor · Dark · Interactive | "Text link" |
| `.exbox span.ibtn.pinnable` | text | #f7f7f6 on #ffffff | 1.07 | 4.5 | 1 | harbor · Dark · Interactive | "Outline" |
| `.sf-right div.sf-ex.sf-ex-fill` | text | #191920 on #212124 | 1.09 | 4.5 | 1 | aurora · Dark · Surfaces & fills | "Panel" |
| `.sf-right div.sf-ex.sf-ex-fill` | text | #191920 on #232120 | 1.09 | 4.5 | 1 | harbor · Dark · Surfaces & fills | "Panel" |
| `.sf-right div.sf-ex.sf-ex-fill` | text | #191920 on #212222 | 1.10 | 4.5 | 1 | wendys · Dark · Surfaces & fills | "Panel" |
| `.sf-right div.sf-ex.sf-ex-fill` | text | #191920 on #2c2c2d | 1.25 | 4.5 | 1 | wendys · Dark · Surfaces & fills | "Nested" |
| `.sf-right div.sf-ex.sf-ex-fill` | text | #191920 on #2c2c2f | 1.26 | 4.5 | 1 | aurora · Dark · Surfaces & fills | "Nested" |
| `.sf-right div.sf-ex.sf-ex-fill` | text | #191920 on #2e2c2b | 1.26 | 4.5 | 1 | harbor · Dark · Surfaces & fills | "Nested" |
| `.mtbl-mode span.tpw-mark.unknown` | text | #dcdde2 on #ffffff | 1.36 | 4.5 | 10 | wendys · Light, Dark · Typography | "?" |
| `.sg-bcol span.sg-st` | text | #c9ccce on #f7f7f6 | 1.51 | 4.5 | 10 | harbor · Dark · Preview | "rest" |
| `.sg-bcol span.sg-st` | text | #c9ccce on #f7f7f7 | 1.51 | 4.5 | 20 | aurora, wendys · Dark · Preview | "rest" |
| `.sg-bcol span.sg-st` | text | #c9ccce on #ffffff | 1.61 | 4.5 | 30 | all brands · HC dark · Preview | "rest" |
| `.exbox a.ilink.pinnable` | text | #006666 on #0d0d10 | 2.86 | 4.5 | 1 | harbor · Dark · Interactive | "Text link" |
| `.sg-bcol button.sg-btn` | text | #808283 on #373839 | 3.04 | 4.5 | 2 | wendys · Dark · Preview | "Button" |
| `.sg-card div.sg-lab` | text | #808283 on #373839 | 3.04 | 4.5 | 1 | wendys · Dark · Preview | "Disabled" |
| `.exbox span.ibtn` | text | #808283 on #373839 | 3.04 | 4.5 | 1 | wendys · Dark · Interactive | "Save" |
| `.sg-bcol button.sg-btn` | text | #818286 on #38383b | 3.04 | 4.5 | 2 | aurora · Dark · Preview | "Button" |
| `.sg-card div.sg-lab` | text | #818286 on #38383b | 3.04 | 4.5 | 1 | aurora · Dark · Preview | "Disabled" |
| `.exbox span.ibtn` | text | #818286 on #38383b | 3.04 | 4.5 | 1 | aurora · Dark · Interactive | "Save" |
| `.sg-bcol button.sg-btn` | text | #83817e on #393735 | 3.05 | 4.5 | 2 | harbor · Dark · Preview | "Button" |
| `.sg-card div.sg-lab` | text | #83817e on #393735 | 3.05 | 4.5 | 1 | harbor · Dark · Preview | "Disabled" |
| `.exbox span.ibtn` | text | #83817e on #393735 | 3.05 | 4.5 | 1 | harbor · Dark · Interactive | "Save" |
| `.sg-bcol button.sg-btn` | text | #67696a on #c0c1c2 | 3.06 | 4.5 | 2 | wendys · Light · Preview | "Button" |
| `.sg-card div.sg-lab` | text | #67696a on #c0c1c2 | 3.06 | 4.5 | 1 | wendys · Light · Preview | "Disabled" |
| `.exbox span.ibtn` | text | #67696a on #c0c1c2 | 3.06 | 4.5 | 1 | wendys · Light · Interactive | "Save" |
| `.sg-bcol button.sg-btn` | text | #6b6865 on #c2c1bf | 3.08 | 4.5 | 2 | harbor · Light · Preview | "Button" |
| `.sg-card div.sg-lab` | text | #6b6865 on #c2c1bf | 3.08 | 4.5 | 1 | harbor · Light · Preview | "Disabled" |
| `.exbox span.ibtn` | text | #6b6865 on #c2c1bf | 3.08 | 4.5 | 1 | harbor · Light · Interactive | "Save" |
| `.sg-bcol button.sg-btn` | text | #68686d on #c1c1c3 | 3.08 | 4.5 | 2 | aurora · Light · Preview | "Button" |
| `.sg-card div.sg-lab` | text | #68686d on #c1c1c3 | 3.08 | 4.5 | 1 | aurora · Light · Preview | "Disabled" |
| `.exbox span.ibtn` | text | #68686d on #c1c1c3 | 3.08 | 4.5 | 1 | aurora · Light · Interactive | "Save" |
| `.mo-colmeta div.mo-playnote.mono` | text | #929297 on #ffffff | 3.12 | 4.5 | 48 | all brands · all modes · Motion | "playing at 640ms (1/4×)" |
| `.sf-right div.sf-ex.sf-ex-text` | text | #4d9151 on #e9e9ea | 3.16 | 4.5 | 1 | aurora · Light · Surfaces & fills | "Success, quietly" |
| `.sg-tc span.sg-samp` | text | #4d9151 on #e9e9ea | 3.16 | 4.5 | 2 | aurora · Light, Dark · Preview | "Success" |
| `.sf-right div.sf-ex.sf-ex-text` | text | #4e905e on #e9e9e8 | 3.16 | 4.5 | 1 | harbor · Light · Surfaces & fills | "Success, quietly" |
| `.sg-tc span.sg-samp` | text | #4e905e on #e9e9e8 | 3.16 | 4.5 | 2 | harbor · Light, Dark · Preview | "Success" |
| `.sf-right div.sf-ex.sf-ex-text` | text | #3a87c3 on #e9e9e8 | 3.18 | 4.5 | 1 | harbor · Light · Surfaces & fills | "Info, quietly" |
| `.sg-tc span.sg-samp` | text | #3a87c3 on #e9e9e8 | 3.18 | 4.5 | 2 | harbor · Light, Dark · Preview | "Info" |
| `.sf-right div.sf-ex.sf-ex-text` | text | #3a87c3 on #e9e9ea | 3.19 | 4.5 | 1 | aurora · Light · Surfaces & fills | "Info, quietly" |
| `.sg-tc span.sg-samp` | text | #3a87c3 on #e9e9ea | 3.19 | 4.5 | 2 | aurora · Light, Dark · Preview | "Info" |
| `.sf-right div.sf-ex.sf-ex-text` | text | #b37414 on #e9e9e8 | 3.19 | 4.5 | 1 | harbor · Light · Surfaces & fills | "Warning, quietly" |
| `.sg-tc span.sg-samp` | text | #b37414 on #e9e9e8 | 3.19 | 4.5 | 2 | harbor · Light, Dark · Preview | "Warning" |
| `.sf-right div.sf-ex.sf-ex-text` | text | #578a8a on #e9e9e8 | 3.20 | 4.5 | 1 | harbor · Light · Surfaces & fills | "Brand, quietly" |
| `.sg-tc span.sg-samp` | text | #578a8a on #e9e9e8 | 3.20 | 4.5 | 2 | harbor · Light, Dark · Preview | "Brand" |
| `.sf-right div.sf-ex.sf-ex-text` | text | #7d77ce on #e9e9ea | 3.20 | 4.5 | 1 | aurora · Light · Surfaces & fills | "Brand, quietly" |
| `.sg-tc span.sg-samp` | text | #7d77ce on #e9e9ea | 3.20 | 4.5 | 2 | aurora · Light, Dark · Preview | "Brand" |
| `.sf-right div.sf-ex.sf-ex-text` | text | #ae760d on #e9e9ea | 3.21 | 4.5 | 1 | aurora · Light · Surfaces & fills | "Warning, quietly" |
| `.sg-tc span.sg-samp` | text | #ae760d on #e9e9ea | 3.21 | 4.5 | 2 | aurora · Light, Dark · Preview | "Warning" |
| `.sf-right div.sf-ex.sf-ex-text` | text | #d9554c on #e9e9ea | 3.23 | 4.5 | 1 | aurora · Light · Surfaces & fills | "Danger, quietly" |
| `.sg-tc span.sg-samp` | text | #d9554c on #e9e9ea | 3.23 | 4.5 | 2 | aurora · Light, Dark · Preview | "Danger" |
| `.sf-right div.sf-ex.sf-ex-text` | text | #de5048 on #e9e9e8 | 3.23 | 4.5 | 1 | harbor · Light · Surfaces & fills | "Danger, quietly" |
| `.sg-tc span.sg-samp` | text | #de5048 on #e9e9e8 | 3.23 | 4.5 | 2 | harbor · Light, Dark · Preview | "Danger" |
| `.exbox a.ilink.pinnable` | text | #c8102e on #0d0d10 | 3.30 | 4.5 | 1 | wendys · Dark · Interactive | "Text link" |
| `.sg-bcol button.sg-btn` | text | #ffffff on #e16767 | 3.31 | 4.5 | 1 | wendys · Dark · Preview | "Button" |
| `.exbox a.ilink.pinnable` | text | #006e99 on #0d0d10 | 3.41 | 4.5 | 1 | aurora · Dark · Interactive | "Text link" |
| `.sg-card div.sg-sub` | text | #3878a9 on #cbdeef | 3.43 | 4.5 | 1 | wendys · Light · Preview | "On-color text" |
| `.sg-card div.sg-sub` | text | #4a8147 on #b5ecaf | 3.45 | 4.5 | 1 | wendys · Light · Preview | "On-color text" |
| `.sg-card div.sg-sub` | text | #ad5d2b on #f3d5c6 | 3.45 | 4.5 | 1 | wendys · Light · Preview | "On-color text" |
| `.exbox a.ilink.pinnable` | text | #b83d36 on #0d0d10 | 3.47 | 4.5 | 1 | harbor · Dark · Interactive | "Text link" |
| `.exbox a.ilink.pinnable` | text | #b63f43 on #0d0d10 | 3.49 | 4.5 | 1 | wendys · Dark · Interactive | "Text link" |
| `.exbox a.ilink.pinnable` | text | #b5413a on #0d0d10 | 3.49 | 4.5 | 1 | aurora · Dark · Interactive | "Text link" |
| `.sg-card div.sg-sub` | text | #bc4e51 on #f2d5d3 | 3.50 | 4.5 | 1 | wendys · Light · Preview | "On-color text" |
| `.sg-tcg div.sg-tc.sg-r` | text | #68686d on #0d0d0e | 3.51 | 4.5 | 4 | aurora · Light · Preview | "On Dark surface" |
| `.sg-tcg div.sg-tc.sg-l` | text | #68686d on #0d0d0e | 3.51 | 4.5 | 4 | aurora · Dark · Preview | "On Dark surface" |
| `.sf-right div.sf-ex.sf-ex-text` | text | #68686d on #0d0d0e | 3.51 | 4.5 | 1 | aurora · Dark · Surfaces & fills | "Least-emphasis caption" |
| `.sg-tc span.sg-samp` | text | #68686d on #0d0d0e | 3.51 | 4.5 | 2 | aurora · Light, Dark · Preview | "Tertiary" |
| `.sg-card div.sg-lab` | text | #68686d on #0d0d0e | 3.51 | 4.5 | 1 | aurora · Dark · Preview | "Disabled" |
| `.sg-bcol button.sg-btn` | text | #68686d on #0d0d0e | 3.51 | 4.5 | 1 | aurora · Dark · Preview | "Button" |
| `.sg-tcg div.sg-tc.sg-r` | text | #6b6865 on #0e0d0c | 3.51 | 4.5 | 4 | harbor · Light · Preview | "On Dark surface" |
| `.sg-tcg div.sg-tc.sg-l` | text | #6b6865 on #0e0d0c | 3.51 | 4.5 | 4 | harbor · Dark · Preview | "On Dark surface" |
| `.sf-right div.sf-ex.sf-ex-text` | text | #6b6865 on #0e0d0c | 3.51 | 4.5 | 1 | harbor · Dark · Surfaces & fills | "Least-emphasis caption" |
| `.sg-tc span.sg-samp` | text | #6b6865 on #0e0d0c | 3.51 | 4.5 | 2 | harbor · Light, Dark · Preview | "Tertiary" |
| `.sg-card div.sg-lab` | text | #6b6865 on #0e0d0c | 3.51 | 4.5 | 1 | harbor · Dark · Preview | "Disabled" |
| `.sg-bcol button.sg-btn` | text | #6b6865 on #0e0d0c | 3.51 | 4.5 | 1 | harbor · Dark · Preview | "Button" |
| `.sg-tcg div.sg-tc.sg-r` | text | #67696a on #0d0d0e | 3.52 | 4.5 | 4 | wendys · Light · Preview | "On Dark surface" |
| `.sg-tcg div.sg-tc.sg-l` | text | #67696a on #0d0d0e | 3.52 | 4.5 | 4 | wendys · Dark · Preview | "On Dark surface" |
| `.sf-right div.sf-ex.sf-ex-text` | text | #67696a on #0d0d0e | 3.52 | 4.5 | 1 | wendys · Dark · Surfaces & fills | "Least-emphasis caption" |
| `.sg-tc span.sg-samp` | text | #67696a on #0d0d0e | 3.52 | 4.5 | 2 | wendys · Light, Dark · Preview | "Tertiary" |
| `.sg-card div.sg-lab` | text | #67696a on #0d0d0e | 3.52 | 4.5 | 1 | wendys · Dark · Preview | "Disabled" |
| `.sg-bcol button.sg-btn` | text | #67696a on #0d0d0e | 3.52 | 4.5 | 1 | wendys · Dark · Preview | "Button" |
| `.sg-bcol button.sg-btn` | text | #f7f7f6 on #578a8a | 3.62 | 4.5 | 1 | harbor · Dark · Preview | "Button" |
| `.exbox span.ibtn.pinnable` | text | #ca494d on #e6e6e6 | 3.66 | 4.5 | 1 | wendys · Light · Interactive | "Outline" |
| `.sg-bcol button.sg-btn` | text | #f7f7f7 on #d45859 | 3.67 | 4.5 | 1 | wendys · Dark · Preview | "Button" |
| `.sg-tcg div.sg-tc.sg-l` | text | #75767a on #e9e9ea | 3.74 | 4.5 | 4 | aurora · Light · Preview | "On Light surface" |
| `.sg-tcg div.sg-tc.sg-r` | text | #75767a on #e9e9ea | 3.74 | 4.5 | 4 | aurora · Dark · Preview | "On Light surface" |
| `.sf-right div.sf-ex.sf-ex-text` | text | #75767a on #e9e9ea | 3.74 | 4.5 | 1 | aurora · Light · Surfaces & fills | "Least-emphasis caption" |
| `.sg-tc span.sg-samp` | text | #75767a on #e9e9ea | 3.74 | 4.5 | 2 | aurora · Light, Dark · Preview | "Tertiary" |
| `.sg-card div.sg-lab` | text | #75767a on #e9e9ea | 3.74 | 4.5 | 1 | aurora · Light · Preview | "Disabled" |
| `.sg-bcol button.sg-btn` | text | #75767a on #e9e9ea | 3.74 | 4.5 | 1 | aurora · Light · Preview | "Button" |
| `.sg-bcol button.sg-btn` | text | #56a1cb on #3d3d3e | 3.78 | 4.5 | 1 | aurora · Dark · Preview | "Button" |
| `.sg-tcg div.sg-tc.sg-l` | text | #777572 on #e9e9e8 | 3.78 | 4.5 | 4 | harbor · Light · Preview | "On Light surface" |
| `.sg-tcg div.sg-tc.sg-r` | text | #777572 on #e9e9e8 | 3.78 | 4.5 | 4 | harbor · Dark · Preview | "On Light surface" |
| `.sf-right div.sf-ex.sf-ex-text` | text | #777572 on #e9e9e8 | 3.78 | 4.5 | 1 | harbor · Light · Surfaces & fills | "Least-emphasis caption" |
| `.sg-tc span.sg-samp` | text | #777572 on #e9e9e8 | 3.78 | 4.5 | 2 | harbor · Light, Dark · Preview | "Tertiary" |
| `.sg-card div.sg-lab` | text | #777572 on #e9e9e8 | 3.78 | 4.5 | 1 | harbor · Light · Preview | "Disabled" |
| `.sg-bcol button.sg-btn` | text | #777572 on #e9e9e8 | 3.78 | 4.5 | 1 | harbor · Light · Preview | "Button" |
| `.sg-card div.sg-sub` | text | #cc233e on #f0d1cf | 3.79 | 4.5 | 1 | wendys · Light · Preview | "On-color text" |
| `.sg-bcol button.sg-btn` | text | #e47b7a on #3d3d3e | 3.81 | 4.5 | 1 | wendys · Dark · Preview | "Button" |
| `.sg-bcol button.sg-btn` | text | #e37d72 on #3d3d3e | 3.82 | 4.5 | 1 | aurora · Dark · Preview | "Button" |
| `.sg-tc span.sg-samp` | text | #4d9151 on #ffffff | 3.83 | 4.5 | 2 | aurora · HC light, HC dark · Preview | "Success" |
| `.sg-bcol button.sg-btn` | text | #e77b70 on #3e3d3d | 3.83 | 4.5 | 1 | harbor · Dark · Preview | "Button" |
| `.sg-bcol button.sg-btn` | text | #7ca1a1 on #3e3d3d | 3.83 | 4.5 | 1 | harbor · Dark · Preview | "Button" |
| `.sg-tc span.sg-samp` | text | #4e905e on #ffffff | 3.84 | 4.5 | 2 | harbor · HC light, HC dark · Preview | "Success" |
| `.sg-tc span.sg-samp` | text | #53904e on #ffffff | 3.84 | 4.5 | 4 | wendys · all modes · Preview | "Success" |
| `.sf-right div.sf-ex.sf-ex-text` | text | #53904e on #ffffff | 3.84 | 4.5 | 1 | wendys · Light · Surfaces & fills | "Success, quietly" |
| `.sg-tcg div.sg-tc.sg-l` | text | #808283 on #ffffff | 3.86 | 4.5 | 4 | wendys · Light · Preview | "On Light surface" |
| `.sg-tcg div.sg-tc.sg-r` | text | #808283 on #ffffff | 3.86 | 4.5 | 4 | wendys · Dark · Preview | "On Light surface" |
| `.sf-right div.sf-ex.sf-ex-text` | text | #808283 on #ffffff | 3.86 | 4.5 | 1 | wendys · Light · Surfaces & fills | "Least-emphasis caption" |
| `.sg-tc span.sg-samp` | text | #808283 on #ffffff | 3.86 | 4.5 | 2 | wendys · Light, Dark · Preview | "Tertiary" |
| `.sg-card div.sg-lab` | text | #808283 on #ffffff | 3.86 | 4.5 | 1 | wendys · Light · Preview | "Disabled" |
| `.sg-bcol button.sg-btn` | text | #808283 on #ffffff | 3.86 | 4.5 | 1 | wendys · Light · Preview | "Button" |
| `.sg-tc span.sg-samp` | text | #3a87c3 on #ffffff | 3.86 | 4.5 | 8 | all brands · all modes · Preview | "Info" |
| `.sf-right div.sf-ex.sf-ex-text` | text | #3a87c3 on #ffffff | 3.86 | 4.5 | 1 | wendys · Light · Surfaces & fills | "Info, quietly" |
| `.sg-tc span.sg-samp` | text | #b37414 on #ffffff | 3.87 | 4.5 | 2 | harbor · HC light, HC dark · Preview | "Warning" |
| `.exbox span.ibtn` | text | #578a8a on #ffffff | 3.88 | 4.5 | 2 | harbor · Dark · Interactive | "Outline" |
| `.sg-tc span.sg-samp` | text | #578a8a on #ffffff | 3.88 | 4.5 | 2 | harbor · HC light, HC dark · Preview | "Brand" |
| `.exbox a.ilink.pinnable` | text | #578a8a on #ffffff | 3.88 | 4.5 | 1 | harbor · Dark · Interactive | "Text link" |
| `.exbox span.ibtn.pinnable` | text | #578a8a on #ffffff | 3.88 | 4.5 | 1 | harbor · Dark · Interactive | "Outline" |
| `.sg-tc span.sg-samp` | text | #7d77ce on #ffffff | 3.89 | 4.5 | 2 | aurora · HC light, HC dark · Preview | "Brand" |
| `.sg-tc span.sg-samp` | text | #ae760d on #ffffff | 3.89 | 4.5 | 2 | aurora · HC light, HC dark · Preview | "Warning" |
| `.sg-tc span.sg-samp` | text | #c7662b on #ffffff | 3.92 | 4.5 | 4 | wendys · all modes · Preview | "Warning" |
| `.sf-right div.sf-ex.sf-ex-text` | text | #c7662b on #ffffff | 3.92 | 4.5 | 1 | wendys · Light · Surfaces & fills | "Warning, quietly" |
| `.sg-tc span.sg-samp` | text | #d9554c on #ffffff | 3.92 | 4.5 | 2 | aurora · HC light, HC dark · Preview | "Danger" |
| `.exbox a.ilink.pinnable` | text | #d9554c on #ffffff | 3.92 | 4.5 | 1 | aurora · Dark · Interactive | "Text link" |
| `.exbox span.ibtn.pinnable` | text | #d9554c on #ffffff | 3.92 | 4.5 | 1 | aurora · Dark · Interactive | "Outline" |
| `.sg-card div.sg-sub` | text | #6a59c7 on #dadaed | 3.92 | 4.5 | 1 | aurora · Light · Preview | "On-color text" |
| `.sg-tc span.sg-samp` | text | #db5256 on #ffffff | 3.92 | 4.5 | 4 | wendys · all modes · Preview | "Danger" |
| `.sf-right div.sf-ex.sf-ex-text` | text | #db5256 on #ffffff | 3.92 | 4.5 | 1 | wendys · Light · Surfaces & fills | "Danger, quietly" |
| `.exbox a.ilink.pinnable` | text | #db5256 on #ffffff | 3.92 | 4.5 | 1 | wendys · Dark · Interactive | "Text link" |
| `.exbox span.ibtn.pinnable` | text | #db5256 on #ffffff | 3.92 | 4.5 | 1 | wendys · Dark · Interactive | "Outline" |
| `.sg-bcol button.sg-btn` | text | #ffffff on #db5256 | 3.92 | 4.5 | 1 | wendys · Dark · Preview | "Button" |
| `.sg-tc span.sg-samp` | text | #de5048 on #ffffff | 3.93 | 4.5 | 2 | harbor · HC light, HC dark · Preview | "Danger" |
| `.exbox a.ilink.pinnable` | text | #de5048 on #ffffff | 3.93 | 4.5 | 1 | harbor · Dark · Interactive | "Text link" |
| `.exbox span.ibtn.pinnable` | text | #de5048 on #ffffff | 3.93 | 4.5 | 1 | harbor · Dark · Interactive | "Outline" |
| `.exbox span.ibtn` | text | #d45859 on #ffffff | 3.93 | 4.5 | 2 | wendys · Dark · Interactive | "Outline" |
| `.exbox a.ilink.pinnable` | text | #d45859 on #ffffff | 3.93 | 4.5 | 1 | wendys · Dark · Interactive | "Text link" |
| `.exbox span.ibtn.pinnable` | text | #d45859 on #ffffff | 3.93 | 4.5 | 1 | wendys · Dark · Interactive | "Outline" |
| `.sg-bcol button.sg-btn` | text | #de8481 on #3d3d3e | 3.97 | 4.5 | 1 | wendys · Dark · Preview | "Button" |
| `.sg-card div.sg-sub` | text | #a06c0c on #231400 | 3.97 | 4.5 | 1 | aurora · Dark · Preview | "On-color text" |
| `.sg-card div.sg-sub` | text | #4e7f7f on #001b1c | 3.97 | 4.5 | 1 | harbor · Dark · Preview | "On-color text" |
| `.sg-card div.sg-sub` | text | #468555 on #001e08 | 3.98 | 4.5 | 1 | harbor · Dark · Preview | "On-color text" |
| `.sg-card div.sg-sub` | text | #4b8546 on #001e00 | 3.98 | 4.5 | 1 | wendys · Dark · Preview | "On-color text" |
| `.sg-card div.sg-sub` | text | #b75d27 on #2b0d00 | 3.98 | 4.5 | 1 | wendys · Dark · Preview | "On-color text" |
| `.sg-card div.sg-sub` | text | #347cb4 on #00192d | 3.98 | 4.5 | 3 | all brands · Dark · Preview | "On-color text" |
| `.exbox span.ibtn` | text | #0088be on #ffffff | 3.99 | 4.5 | 2 | aurora · Dark · Interactive | "Outline" |
| `.exbox a.ilink.pinnable` | text | #0088be on #ffffff | 3.99 | 4.5 | 1 | aurora · Dark · Interactive | "Text link" |
| `.exbox span.ibtn.pinnable` | text | #0088be on #ffffff | 3.99 | 4.5 | 1 | aurora · Dark · Interactive | "Outline" |
| `.sg-card div.sg-sub` | text | #458649 on #001e03 | 3.99 | 4.5 | 1 | aurora · Dark · Preview | "On-color text" |
| `.sg-card div.sg-sub` | text | #faedec on #cd4840 | 3.99 | 4.5 | 1 | harbor · Light · Preview | "On-color text" |
| `.sg-card div.sg-sub` | text | #ca4a4e on #350005 | 3.99 | 4.5 | 1 | wendys · Dark · Preview | "On-color text" |
| `.sg-card div.sg-sub` | text | #cd4841 on #350001 | 4.00 | 4.5 | 1 | harbor · Dark · Preview | "On-color text" |
| `.sg-card div.sg-sub` | text | #faedec on #c94c44 | 4.00 | 4.5 | 1 | aurora · Light · Preview | "On-color text" |
| `.sg-card div.sg-sub` | text | #c94d45 on #350001 | 4.00 | 4.5 | 1 | aurora · Dark · Preview | "On-color text" |
| `.sg-card div.sg-sub` | text | #a56a12 on #241300 | 4.00 | 4.5 | 1 | harbor · Dark · Preview | "On-color text" |
| `.sg-card div.sg-sub` | text | #c44f51 on #330004 | 4.01 | 4.5 | 1 | wendys · Dark · Preview | "On-color text" |
| `.sg-card div.sg-lab` | text | #286da1 on #cbdeef | 4.02 | 4.5 | 1 | wendys · Light · Preview | "Info" |
| `.sg-card div.sg-sub` | text | #faeded on #ca494d | 4.02 | 4.5 | 2 | wendys · Light, Dark · Preview | "On-color text" |
| `.sg-card div.sg-sub` | text | #eaf2f7 on #317bb2 | 4.02 | 4.5 | 3 | all brands · Light · Preview | "On-color text" |
| `.sg-card div.sg-lab` | text | #a5501a on #f3d5c6 | 4.03 | 4.5 | 1 | wendys · Light · Preview | "Warning" |
| `.sg-card div.sg-sub` | text | #edf3ec on #498344 | 4.03 | 4.5 | 1 | wendys · Light · Preview | "On-color text" |
| `.sg-card div.sg-lab` | text | #b63f43 on #f2d5d3 | 4.03 | 4.5 | 1 | wendys · Light · Preview | "Danger" |
| `.sg-card div.sg-sub` | text | #8e5e12 on #f5d6b4 | 4.03 | 4.5 | 1 | harbor · Light · Preview | "On-color text" |
| `.sg-card div.sg-sub` | text | #8a6012 on #f4d7b0 | 4.03 | 4.5 | 1 | aurora · Light · Preview | "On-color text" |
| `.sg-card div.sg-sub` | text | #f8efe9 on #b75c23 | 4.04 | 4.5 | 2 | wendys · Light, Dark · Preview | "On-color text" |
| `.sg-card div.sg-sub` | text | #f5f0e6 on #9f6b00 | 4.05 | 4.5 | 2 | aurora · Light, Dark · Preview | "On-color text" |
| `.sg-card div.sg-sub` | text | #306d9a on #cbdeef | 4.05 | 4.5 | 2 | aurora, harbor · Light · Preview | "On-color text" |
| `.sg-card div.sg-sub` | text | #736cc0 on #15093e | 4.06 | 4.5 | 1 | aurora · Dark · Preview | "On-color text" |
| `.sg-card div.sg-sub` | text | #ecf3ed on #438347 | 4.06 | 4.5 | 2 | aurora · Light, Dark · Preview | "On-color text" |
| `.sg-card div.sg-sub` | text | #f6f0e6 on #a46808 | 4.06 | 4.5 | 2 | harbor · Light, Dark · Preview | "On-color text" |
| `.sg-card div.sg-sub` | text | #ecf3ee on #448253 | 4.07 | 4.5 | 2 | harbor · Light, Dark · Preview | "On-color text" |
| `.sg-card div.sg-lab` | text | #3e753b on #b5ecaf | 4.09 | 4.5 | 1 | wendys · Light · Preview | "Success" |
| `.sg-card div.sg-sub` | text | #3b763f on #abefac | 4.09 | 4.5 | 1 | aurora · Light · Preview | "On-color text" |
| `.sg-card div.sg-sub` | text | #3c754a on #abeeb8 | 4.10 | 4.5 | 1 | harbor · Light · Preview | "On-color text" |
| `.sg-card div.sg-lab` | text | #c8102e on #f0d1cf | 4.13 | 4.5 | 1 | wendys · Light · Preview | "Brand" |
| `.sg-card div.sg-sub` | text | #157272 on #d3dedd | 4.15 | 4.5 | 1 | harbor · Light · Preview | "On-color text" |
| `.sg-card div.sg-sub` | text | #a94741 on #f2d5d2 | 4.16 | 4.5 | 1 | aurora · Light · Preview | "On-color text" |
| `.sg-card div.sg-sub` | text | #ac433d on #f3d5d1 | 4.20 | 4.5 | 1 | harbor · Light · Preview | "On-color text" |
| `.sg-bcol button.sg-btn` | text | #a23539 on #cccccc | 4.21 | 4.5 | 1 | wendys · Light · Preview | "Button" |
| `.sg-bcol button.sg-btn` | text | #8e2d27 on #bababb | 4.26 | 4.5 | 1 | aurora · Light · Preview | "Button" |
| `.sg-bcol button.sg-btn` | text | #912924 on #bababa | 4.26 | 4.5 | 1 | harbor · Light · Preview | "Button" |
| `.sg-bcol button.sg-btn` | text | #f7f7f6 on #437f7f | 4.28 | 4.5 | 1 | harbor · Dark · Preview | "Button" |
| `.sg-card div.sg-sub` | text | #0b0a14 on #7269ca | 4.29 | 4.5 | 1 | aurora · Dark · Preview | "On-color text" |
| `.sg-bcol button.sg-btn` | text | #005476 on #bababb | 4.30 | 4.5 | 1 | aurora · Light · Preview | "Button" |
| `.sg-card div.sg-sub` | text | #050c12 on #317bb2 | 4.31 | 4.5 | 3 | all brands · Dark · Preview | "On-color text" |
| `.sg-card div.sg-sub` | text | #070d07 on #498344 | 4.31 | 4.5 | 1 | wendys · Dark · Preview | "On-color text" |
| `.sg-card div.sg-sub` | text | #140807 on #c94c44 | 4.32 | 4.5 | 1 | aurora · Dark · Preview | "On-color text" |
| `.sg-card div.sg-sub` | text | #140706 on #cd4840 | 4.32 | 4.5 | 1 | harbor · Dark · Preview | "On-color text" |
| `.exbox span.ibtn.pinnable` | text | #b5413a on #e6e6e6 | 4.43 | 4.5 | 1 | aurora · Light · Interactive | "Outline" |
| `.sg-bcol button.sg-btn` | text | #b63f43 on #e6e6e6 | 4.43 | 4.5 | 1 | wendys · Light · Preview | "Button" |
| `.exbox span.ibtn.pinnable` | text | #b83d36 on #e6e6e6 | 4.46 | 4.5 | 1 | harbor · Light · Interactive | "Outline" |
| `.sg-bcol button.sg-btn` | text | #a13731 on #d2d2d3 | 4.46 | 4.5 | 1 | aurora · Light · Preview | "Button" |
| `.sg-bcol button.sg-btn` | text | #a4332d on #d2d2d1 | 4.48 | 4.5 | 1 | harbor · Light · Preview | "Button" |
| `.sg-bcol button.sg-btn` | text | #f7f7f7 on #ce3d44 | 4.48 | 4.5 | 1 | wendys · Dark · Preview | "Button" |

## Control edges under 3:1 (36)

| selector | kind | pairing | measured | floor | nodes | where | sample |
|---|---|---|---|---|---|---|---|
| `.mctx-modes button.mctx-b` | edge | #dcdde2 on #f2f3f6 | 1.22 | 3 | 108 | all brands · all modes · Surfaces & fills, Interactive, Elevation, Size & radius, Motion, Preview | — |
| `.mctx-modes button.mctx-b.derived` | edge | #dcdde2 on #f2f3f6 | 1.22 | 3 | 108 | all brands · all modes · Surfaces & fills, Interactive, Elevation, Size & radius, Motion, Preview | — |
| `.ws button.addbtn.gr-ed-add` | edge | #dcdde2 on #f2f3f6 | 1.22 | 3 | 2 | aurora · Light, Dark · Surfaces & fills | — |
| `.ic-add button.addbtn.ic-addbtn` | edge | #dcdde2 on #f2f3f6 | 1.22 | 3 | 1 | wendys · Light · Interactive | — |
| `.barmenu-wrap button.brandsel` | edge | #dcdde2 on #f2f3f6 | 1.36 | 3 | 150 | all brands · all modes · Palettes, Surfaces & fills, Interactive, Typography, Elevation, Size & radius, Layout, Motion, Preview | — |
| `.barmenu-wrap button.barbtn` | edge | #dcdde2 on #f2f3f6 | 1.36 | 3 | 150 | all brands · all modes · Palettes, Surfaces & fills, Interactive, Typography, Elevation, Size & radius, Layout, Motion, Preview | — |
| `.rail button.stage.active` | edge | #dcdde2 on #f2f3f6 | 1.36 | 3 | 150 | all brands · all modes · Palettes, Surfaces & fills, Interactive, Typography, Elevation, Size & radius, Layout, Motion, Preview | — |
| `.pident input.pswatch` | edge | #dcdde2 on #ffffff | 1.36 | 3 | 48 | all brands · all modes · Palettes | — |
| `.pidcol input.pname-input.mono` | edge | #dcdde2 on #ffffff | 1.36 | 3 | 12 | aurora, wendys · all modes · Palettes | — |
| `.pident button.rx.prm` | edge | #dcdde2 on #ffffff | 1.36 | 3 | 12 | aurora, wendys · all modes · Palettes | — |
| `.psec button.addbtn.padd` | edge | #dcdde2 on #ffffff | 1.36 | 3 | 12 | all brands · all modes · Palettes | — |
| `.gr-ed-head input.gr-ed-nameinput` | edge | #dcdde2 on #ffffff | 1.36 | 3 | 4 | aurora · Light, Dark · Surfaces & fills | — |
| `.gr-ed-head button.rx` | edge | #dcdde2 on #ffffff | 1.36 | 3 | 4 | aurora · Light, Dark · Surfaces & fills | — |
| `.gr-ed-stop input.num.gr-ed-num` | edge | #dcdde2 on #ffffff | 1.36 | 3 | 8 | aurora · Light, Dark · Surfaces & fills | — |
| `.gr-ed-card button.addbtn.gr-ed-addstop` | edge | #dcdde2 on #ffffff | 1.36 | 3 | 4 | aurora · Light, Dark · Surfaces & fills | — |
| `.gr-ed-field input.num.gr-ed-num` | edge | #dcdde2 on #ffffff | 1.36 | 3 | 4 | aurora · Light, Dark · Surfaces & fills | — |
| `.tf-add input.tf-in.tf-addin` | edge | #dcdde2 on #ffffff | 1.36 | 3 | 6 | all brands · Light, Dark · Typography | — |
| `.mcell button.mstep` | edge | #dcdde2 on #ffffff | 1.36 | 3 | 108 | all brands · Light, Dark · Typography | — |
| `.shape-cards button.shape-card` | edge | #dcdde2 on #ffffff | 1.36 | 3 | 10 | all brands · Light, Dark · Typography | — |
| `.shape-blocked button.shape-release` | edge | #dcdde2 on #f2f3f6 | 1.36 | 3 | 2 | aurora · Light, Dark · Typography | — |
| `.adv-bp input.num.adv-num` | edge | #dcdde2 on #ffffff | 1.36 | 3 | 32 | all brands · Light, Dark · Layout | — |
| `.adv-bplist button.adv-add` | edge | #dcdde2 on #ffffff | 1.36 | 3 | 6 | all brands · Light, Dark · Layout | — |
| `.adv-row input.num.adv-num` | edge | #dcdde2 on #ffffff | 1.36 | 3 | 12 | all brands · Light, Dark · Layout | — |
| `.mo-slowmo select.mo-slowmo-sel` | edge | #dcdde2 on #ffffff | 1.36 | 3 | 12 | all brands · all modes · Motion | — |
| `.psec button.mo-replay` | edge | #dcdde2 on #ffffff | 1.36 | 3 | 12 | all brands · all modes · Motion | — |
| `.sg-bcol button.sg-btn` | edge | #c2c1bf on #e9e9e8 | 1.48 | 3 | 1 | harbor · Light · Preview | — |
| `.sg-bcol button.sg-btn` | edge | #c1c1c3 on #e9e9ea | 1.48 | 3 | 1 | aurora · Light · Preview | — |
| `.sg-bcol button.sg-btn` | edge | #393735 on #0e0d0c | 1.64 | 3 | 1 | harbor · Dark · Preview | — |
| `.sg-bcol button.sg-btn` | edge | #373839 on #0d0d0e | 1.65 | 3 | 1 | wendys · Dark · Preview | — |
| `.sg-bcol button.sg-btn` | edge | #38383b on #0d0d0e | 1.66 | 3 | 1 | aurora · Dark · Preview | — |
| `.sg-bcol button.sg-btn` | edge | #393735 on #000000 | 1.77 | 3 | 1 | harbor · HC dark · Preview | — |
| `.sg-bcol button.sg-btn` | edge | #373839 on #000000 | 1.79 | 3 | 1 | wendys · HC dark · Preview | — |
| `.sg-bcol button.sg-btn` | edge | #38383b on #000000 | 1.80 | 3 | 1 | aurora · HC dark · Preview | — |
| `.sg-bcol button.sg-btn` | edge | #c1c1c3 on #ffffff | 1.80 | 3 | 1 | aurora · HC light · Preview | — |
| `.sg-bcol button.sg-btn` | edge | #c2c1bf on #ffffff | 1.80 | 3 | 1 | harbor · HC light · Preview | — |
| `.sg-bcol button.sg-btn` | edge | #c0c1c2 on #ffffff | 1.80 | 3 | 2 | wendys · Light, HC light · Preview | — |
