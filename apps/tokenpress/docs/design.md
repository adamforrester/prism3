# Plugin Visual Language — Handoff Spec

This document describes the visual language used by Token Press so other Figma plugins can adopt the same look. It is targeted at AI coding agents: rules first, rationale second, copy-pasteable CSS throughout.

**Scope:** visual tokens (color, type, spacing, radius), components (buttons, chips, cards, inputs, switches, stepper, status badges), and theming (light/dark). Layout patterns are intentionally out of scope — they vary too much per plugin.

**Source of truth:** `src/ui.html` in the Token Press repo. If this doc and the source disagree, the source wins; update this doc.

---

## 0. Hard rules (read these first)

1. **Inherit Figma's themed surface vars; do not redefine them.** Use `--figma-color-bg`, `--figma-color-text`, `--figma-color-border`, etc. Figma sets these per the user's theme (light/dark) inside the plugin iframe. Defining your own neutral palette will fight Figma's theme switching and look wrong in one mode.
2. **Define your plugin's brand and spatial scale as `--tp-*` vars on `:root`.** Brand color, spacing, radius, mono font stack — these don't come from Figma. Prefix with your plugin's namespace (Token Press uses `--tp-*`); pick a different prefix for your plugin.
3. **Override Figma's surface vars only inside `@media (prefers-color-scheme: dark)`.** Do not use a JS observer on `<html>` — `MutationObserver` on the document root has hung the Figma iframe in real files. CSS-only theming is the rule.
4. **Status colors stay Figma-native.** `--figma-color-bg-success`, `--figma-color-bg-warning`, `--figma-color-bg-danger`, `--figma-color-bg-brand` come from Figma. Do not override these — the plugin should read as a Figma surface.
5. **No JS frameworks; vanilla HTML/CSS only.** Plugin runtime is ES2018 with minify off. `?.`, `??`, and spread are unsafe in `code.ts`; the UI side is more permissive but keep dependencies near zero.
6. **Geist Mono with a system fallback for technical labels.** Google Fonts is sometimes CSP-blocked in the plugin iframe. Always layer `ui-monospace, SFMono-Regular, ...` after `Geist Mono` so a blocked fetch is invisible.

---

## 1. Tokens

### 1.1 Brand + spatial scale (`:root`)

```css
:root {
  /* Brand — Figma blue. Use sparingly: focus rings, primary buttons,
     selected chips, selected stepper marker. Not body text. */
  --tp-brand: #0D99FF;
  --tp-brand-strong: #3AAEFF;            /* hover-state on solid brand fill */
  --tp-brand-soft: rgba(13, 153, 255, 0.12); /* selected/active soft fill */
  --tp-brand-ring: rgba(13, 153, 255, 0.35); /* focus glow (3px box-shadow) */

  /* Radius scale — three steps. sm=controls, md=cards, lg=large surfaces. */
  --tp-r-sm: 6px;
  --tp-r-md: 10px;
  --tp-r-lg: 14px;

  /* Spacing — 4px base. Use these everywhere; never hard-code px. */
  --tp-space-1: 4px;
  --tp-space-2: 8px;
  --tp-space-3: 12px;
  --tp-space-4: 16px;
  --tp-space-5: 20px;
  --tp-space-6: 24px;

  /* Mono stack — Geist Mono first, ui-monospace ladder so a CSP-blocked
     Google Fonts fetch falls back to system mono invisibly. */
  --tp-font-mono: 'Geist Mono', ui-monospace, SFMono-Regular, 'SF Mono',
                  Menlo, 'Cascadia Code', Consolas, monospace;
}
```

**Renaming for your plugin:** swap `--tp-` for your plugin's prefix (e.g. `--mp-` for "My Plugin"). Keep the structure and ratios identical. Pick a brand hue that doesn't clash with Figma's `--figma-color-bg-success` (greenish) or `-danger` (reddish); blue, purple, and warm-orange all work.

### 1.2 Dark mode override

```css
/* Cool-shift dark — overrides Figma's neutral surface vars only.
   ≈1–1.5 ticks darker than #2C2C2C with a +5° hue rotation toward blue.
   Contrast: text/bg ≈ 13:1, brand/bg ≈ 5.5:1 — both AA+. */
@media (prefers-color-scheme: dark) {
  :root {
    --figma-color-bg: #1D2025;
    --figma-color-bg-secondary: #232830;
    --figma-color-bg-tertiary: #2C323B;
    --figma-color-bg-hover: #2C323B;
    --figma-color-bg-disabled: #232830;
    --figma-color-border: #353A44;
    --figma-color-border-strong: #404653;
    --figma-color-text: #E6E8EC;
    --figma-color-text-secondary: #9BA2AD;
    --figma-color-text-tertiary: #6C7280;
    --figma-color-text-disabled: #4D525A;
  }
}
```

**Why a cool-shift dark instead of `#2C2C2C`:** Figma's native dark surface is a flat warm gray. Side-by-side with the plugin canvas, that flatness reads as "blocked-out modal" rather than "embedded tool." A 5° blue hue rotation and ~1.5-tick darken makes the plugin recede into the chrome. Only override neutrals — keep status colors Figma-native.

**Do not override in light mode.** Figma's defaults are correct in light. Only the `@media (prefers-color-scheme: dark)` block has overrides.

### 1.3 Typography

| Use | Font family | Size | Weight | Letter-spacing |
|---|---|---|---|---|
| Body copy | system-ui stack | 13px | 400 | normal |
| Section heading (h2) | system-ui stack | 18px | 600 | -0.01em |
| Brand name in topbar | system-ui stack | 14px | 600 | -0.01em |
| Section title (uppercase eyebrow) | system-ui stack | 11px | 500 | 0.12em (tracked) |
| Technical labels (setting cards, table values) | `--tp-font-mono` | 12px | 500 | -0.01em |
| Hint text (under labels) | system-ui stack | 11px | 400 | normal |
| Numeric values in stat rows | `--tp-font-mono` + `font-variant-numeric: tabular-nums` | 11px | 400 | normal |

```css
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 13px;
  line-height: 1.45;
  color: var(--figma-color-text);
  background: var(--figma-color-bg);
}
```

**Mono-vs-sans rule:** mono is for *technical configuration values and identifiers* (setting field labels, collection names, format option names, numeric stats). Sans is for *prose, hints, and headings*. Mixing the two communicates "this is a knob" vs "this is copy."

**Why mono drops 1px:** at the same point size, mono fonts optically read ~1px larger than sans. So mono labels at 12px sit visually adjacent to 13px body sans.

### 1.4 Color usage rules

| Token | Use for | Don't use for |
|---|---|---|
| `--tp-brand` | focus rings, selected chip border, primary action surface | body text, large fills |
| `--tp-brand-soft` | selected chip background, hover on outline buttons | hover on body rows |
| `--tp-brand-ring` | `box-shadow: 0 0 0 3px` focus glow | borders |
| `--figma-color-bg` | window background, primary input field | cards (use `-secondary`) |
| `--figma-color-bg-secondary` | rail surface, cards, chip resting | window background |
| `--figma-color-bg-tertiary` | switch rail, table-header fills | text colors |
| `--figma-color-text` | primary copy | hints |
| `--figma-color-text-secondary` | hints, eyebrows, disabled labels | primary copy |
| `--figma-color-text-tertiary` | dividers in copy, muted timestamps | anything load-bearing |
| `--figma-color-bg-success` | confirmation states (stepper "done" marker) | brand surfaces |
| `--figma-color-bg-warning` | warning issue rows | hover states |
| `--figma-color-bg-danger` | error issue rows | destructive primary buttons (use Figma's danger button vars instead) |

**Rule of thumb:** if you're reaching for `--figma-color-text-tertiary` to *de-emphasize* something, you're correct. If you're reaching for it to *theme* something, you're wrong — Figma may change tertiary across releases.

---

## 2. Components

Each component below has: (a) the rule it follows, (b) the markup shape, (c) the CSS. Copy-paste the CSS verbatim into a new plugin and rename the `--tp-*` prefix.

### 2.1 Buttons

Three variants: **primary** (filled), **secondary** (outlined), **compact** (small for inline use). Primary uses Figma's `--figma-color-bg-brand` so it matches Figma's own buttons.

```html
<button class="button">Export</button>
<button class="button secondary">Rescan</button>
<button class="button compact">Refresh</button>
```

```css
.button {
  background: var(--figma-color-bg-brand);
  color: var(--figma-color-text-onbrand);
  border: none;
  border-radius: var(--tp-r-sm);
  padding: 8px 16px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background 0.2s;
  width: 100%;
  margin-top: var(--tp-space-4);
}
.button:hover { background: var(--figma-color-bg-brand-hover); }
.button:disabled {
  background: var(--figma-color-bg-disabled);
  color: var(--figma-color-text-disabled);
  cursor: not-allowed;
}
.button:focus-visible {
  outline: 2px solid var(--tp-brand);
  outline-offset: 2px;
}

.button.secondary {
  background: transparent;
  color: var(--tp-brand);
  border: 1px solid var(--tp-brand);
}
.button.secondary:hover { background: var(--tp-brand-soft); }

.button.compact {
  width: auto;
  margin-top: 0;
  padding: 6px 12px;
  font-size: 12px;
}
```

**Rules:**
- Primary buttons take 100% width by default and have 16px top margin (designed to sit at the bottom of a panel). Override with `.compact` for inline use.
- Use `:focus-visible`, never `:focus` — Figma users hit Tab a lot and unconditional focus rings on click look noisy.
- Demote secondary actions (e.g. "Rescan" after a successful scan) to `.secondary` — don't compete with the primary action.

### 2.2 Chips

Two flavors: **format chips** (round-pill, multi-select with checkmark) and **preset chips** (small-radius, single-select).

#### 2.2.1 Format chips (multi-select pill)

```html
<label class="chip on">
  <span class="chip-check">✓</span>
  <input type="checkbox" checked>
  <span>JSON</span>
  <span class="chip-tag">.json</span>
</label>
```

```css
.chip {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: var(--tp-space-2);
  padding: 8px 14px;
  background: var(--figma-color-bg-secondary);
  border: 1px solid var(--figma-color-border);
  border-radius: 999px;
  font-size: 12px;
  color: var(--figma-color-text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
}
.chip:hover {
  background: var(--figma-color-bg-hover);
  color: var(--figma-color-text);
  border-color: var(--figma-color-border-strong, var(--figma-color-border));
}
.chip.on {
  background: var(--tp-brand-soft);
  border-color: var(--tp-brand);
  color: var(--tp-brand);
}
.chip.locked {
  /* Same visual as .on but cursor: default — used when the chip is
     selected by virtue of being the only valid option. */
  cursor: default;
  background: var(--tp-brand-soft);
  border-color: var(--tp-brand);
  color: var(--tp-brand);
}
.chip.disabled { cursor: not-allowed; opacity: 0.55; }
.chip input[type="checkbox"] {
  position: absolute; opacity: 0; width: 0; height: 0; pointer-events: none;
}
.chip:focus-within { outline: 2px solid var(--tp-brand); outline-offset: 2px; }
.chip .chip-check {
  width: 14px; height: 14px; border-radius: 3px;
  border: 1.5px solid var(--figma-color-border-strong, var(--figma-color-border));
  background: var(--figma-color-bg);
  display: grid; place-items: center; flex-shrink: 0;
  font-size: 9px; color: #fff;
  transition: all 0.15s ease;
}
.chip.on .chip-check, .chip.locked .chip-check {
  background: var(--tp-brand); border-color: var(--tp-brand);
}
.chip-tag {
  color: var(--figma-color-text-tertiary, var(--figma-color-text-secondary));
  font-size: 11px;
  margin-left: 2px;
}
```

#### 2.2.2 Preset chips (single-select, small-radius)

```html
<button class="preset-chip selected">DTCG</button>
<button class="preset-chip">Style Dictionary</button>
<button class="preset-chip preset-custom">Custom</button>
```

```css
.preset-chip {
  display: inline-flex; align-items: center; gap: var(--tp-space-2);
  padding: 6px 12px;
  background: transparent;
  border: 1px solid var(--figma-color-border);
  border-radius: var(--tp-r-sm);  /* 6px — NOT pill */
  color: var(--figma-color-text-secondary);
  font-family: inherit; font-size: 12px; font-weight: 500;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}
.preset-chip:hover:not(.selected):not([disabled]) {
  border-color: var(--figma-color-text-tertiary);
  color: var(--figma-color-text);
}
.preset-chip.selected {
  background: var(--tp-brand-soft);
  border-color: var(--tp-brand);
  color: var(--tp-brand);
}
.preset-chip:focus-visible { outline: 2px solid var(--tp-brand); outline-offset: 2px; }

/* Render-only "Custom" chip: not focusable, no hover. Signals
   "you're off-preset" without inviting a click. */
.preset-chip.preset-custom { cursor: default; }
.preset-chip.preset-custom:not(.selected) { opacity: 0.55; }
```

**Rule:** Use **format chips** when the user can pick multiple things (output formats, included collections). Use **preset chips** when exactly one option is active (preset modes, theme variants). The two are intentionally visually distinct so users can read multi-select vs single-select at a glance.

### 2.3 Setting cards

A labeled config knob: mono label up top, hint underneath, control at the bottom. Stack two-up in a 2-col grid for 320px+ panels.

```html
<div class="settings-grid">
  <div class="setting-card">
    <label class="label" for="units">Units</label>
    <p class="hint">px or rem for dimension output.</p>
    <select id="units"><option>px</option><option>rem</option></select>
  </div>
  <!-- ... -->
</div>
```

```css
.settings-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--tp-space-3);
}
.setting-card {
  background: var(--figma-color-bg-secondary);
  border: 1px solid var(--figma-color-border);
  border-radius: var(--tp-r-md);
  padding: 14px var(--tp-space-4);
  transition: border-color 0.15s ease;
  display: flex;
  flex-direction: column;
  gap: var(--tp-space-1);
}
.setting-card:hover {
  border-color: var(--figma-color-text-tertiary, var(--figma-color-text-secondary));
}
.setting-card.disabled { opacity: 0.5; }
.setting-card.disabled select,
.setting-card.disabled input[type="text"] {
  cursor: not-allowed; pointer-events: none;
}
.setting-card .label {
  /* Mono signals "technical config field" vs body copy. 13→12px because
     mono fonts at the same size optically read ~1px larger than the body. */
  font-family: var(--tp-font-mono);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: -0.01em;
  color: var(--figma-color-text);
  cursor: pointer;
}
.setting-card .hint {
  font-size: 11px;
  color: var(--figma-color-text-tertiary, var(--figma-color-text-secondary));
  margin-bottom: var(--tp-space-2);
  line-height: 1.4;
}
.setting-card select,
.setting-card input[type="text"] {
  width: 100%;
  padding: 9px var(--tp-space-3);
  margin-top: auto;
  background: var(--figma-color-bg);
  border: 1px solid var(--figma-color-border);
  border-radius: var(--tp-r-sm);
  color: var(--figma-color-text);
  font-family: inherit;
  font-size: 13px;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.setting-card select:focus,
.setting-card input[type="text"]:focus {
  outline: none;
  border-color: var(--tp-brand);
  box-shadow: 0 0 0 3px var(--tp-brand-ring);
}
/* Custom select chevron — use a data: URL so there's no asset dependency */
.setting-card select {
  appearance: none; -webkit-appearance: none; -moz-appearance: none;
  padding-right: 36px;
  background-image: url("data:image/svg+xml;utf8,<svg width='12' height='8' xmlns='http://www.w3.org/2000/svg'><path d='M1 1l5 5 5-5' stroke='%23888' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/></svg>");
  background-repeat: no-repeat;
  background-position: right 14px center;
}
```

**Rules:**
- Cards stretch to equal height when in a grid (`display: flex; flex-direction: column`). The `margin-top: auto` on the control pushes it to the bottom regardless of hint length.
- Focus state is a 3px brand-ring box-shadow on the inner control, **not** an outline. Outlines clip against the card border.
- For disabled cards, dim the whole card (opacity 0.5) and disable the inner control. Don't try to dim individual elements.

### 2.4 Toggle rows

Switch on the right, copy + hint on the left. Used for boolean knobs that don't deserve their own card.

```html
<label class="toggle-row">
  <span class="copy">
    <span class="toggle-label">Include Figma extensions</span>
    <span class="toggle-hint">Add `$extensions.figma` metadata to each token.</span>
  </span>
  <input type="checkbox">
  <span class="switch"></span>
</label>
```

```css
.toggle-row {
  position: relative;
  display: flex; align-items: flex-start; justify-content: space-between;
  gap: var(--tp-space-4);
  padding: var(--tp-space-3) var(--tp-space-4);
  background: var(--figma-color-bg-secondary);
  border: 1px solid var(--figma-color-border);
  border-radius: var(--tp-r-md);
  cursor: pointer;
  user-select: none;
  transition: border-color 0.15s ease;
}
.toggle-row:hover {
  border-color: var(--figma-color-text-tertiary, var(--figma-color-text-secondary));
}
.toggle-row + .toggle-row { margin-top: var(--tp-space-2); }
.toggle-row .copy { flex: 1; min-width: 0; }
.toggle-row .toggle-label {
  font-size: 13px; font-weight: 500;
  color: var(--figma-color-text); display: block;
}
.toggle-row .toggle-hint {
  font-size: 11px; color: var(--figma-color-text-secondary);
  margin-top: 2px; line-height: 1.4;
}
.toggle-row input[type="checkbox"] {
  position: absolute; opacity: 0; width: 0; height: 0; pointer-events: none;
}
.toggle-row:focus-within .switch { box-shadow: 0 0 0 3px var(--tp-brand-ring); }

/* Switch — 36×20 with 14px thumb */
.switch {
  position: relative;
  width: 36px; height: 20px;
  background: var(--figma-color-bg-tertiary, var(--figma-color-bg-disabled));
  border: 1px solid var(--figma-color-border);
  border-radius: 999px;
  flex-shrink: 0;
  transition: background 0.15s, border-color 0.15s;
}
.switch::after {
  content: '';
  position: absolute; top: 2px; left: 2px;
  width: 14px; height: 14px;
  background: var(--figma-color-text-secondary);
  border-radius: 50%;
  transition: all 0.18s ease;
}
.switch.on {
  background: var(--tp-brand);
  border-color: var(--tp-brand);
}
.switch.on::after { left: 18px; background: #fff; }
```

**Rule:** Toggling adds/removes the `.on` class on the `.switch` from JS. The hidden checkbox's `checked` state stays in sync so form-style code paths still work.

### 2.5 Stepper (progress indicator)

Compact pill that lives in the topbar. Three states per step: resting (number), `.active` (brand fill), `.done` (success-green fill with checkmark).

```html
<div class="stepper">
  <div class="stepper-step done">
    <span class="stepper-marker"><svg viewBox="0 0 12 12">…check…</svg></span>
    <span class="stepper-label">Scan</span>
  </div>
  <div class="stepper-divider"></div>
  <div class="stepper-step active">
    <span class="stepper-marker">2</span>
    <span class="stepper-label">Configure</span>
  </div>
  <div class="stepper-divider"></div>
  <div class="stepper-step">
    <span class="stepper-marker">3</span>
    <span class="stepper-label">Export</span>
  </div>
</div>
```

```css
.stepper {
  display: flex; align-items: center;
  gap: var(--tp-space-2);
  padding: 6px 14px;
  background: var(--figma-color-bg-secondary);
  border: 1px solid var(--figma-color-border);
  border-radius: 999px;
  font-size: 12px;
  justify-self: center;
}
.stepper-step {
  display: inline-flex; align-items: center; gap: var(--tp-space-2);
  color: var(--figma-color-text-secondary);
  white-space: nowrap;
}
.stepper-marker {
  width: 22px; height: 22px;
  border-radius: 50%;
  display: grid; place-items: center;
  background: var(--figma-color-bg);
  border: 1px solid var(--figma-color-border);
  color: var(--figma-color-text-secondary);
  font-size: 11px; font-weight: 600;
  flex-shrink: 0;
}
.stepper-marker svg { width: 12px; height: 12px; }
.stepper-step.done .stepper-marker {
  background: var(--figma-color-bg-success, #16a34a);
  border-color: var(--figma-color-bg-success, #16a34a);
  color: #fff;
}
.stepper-step.done .stepper-label { color: var(--figma-color-text); }
.stepper-step.active .stepper-marker {
  background: var(--tp-brand);
  border-color: var(--tp-brand);
  color: var(--figma-color-text-onbrand, #fff);
}
.stepper-step.active .stepper-label {
  color: var(--figma-color-text); font-weight: 500;
}
.stepper-divider {
  flex: 0 0 24px; height: 1px;
  background: var(--figma-color-border);
}
```

### 2.6 Status messages (issues)

Inline error/warning rows that sit in the panel after a scan or validation pass.

```html
<div class="issues">
  <div class="issue error">Two collections share the name "Brand."</div>
  <div class="issue warning">Variable `body.0` aliases an excluded collection.</div>
</div>
```

```css
.issues { margin-top: var(--tp-space-4); }
.issue {
  padding: var(--tp-space-3);
  border-radius: var(--tp-r-sm);
  margin-bottom: var(--tp-space-2);
  font-size: 12px;
}
.issue.error {
  background: var(--figma-color-bg-danger);
  border: 1px solid var(--figma-color-border-danger);
}
.issue.warning {
  background: var(--figma-color-bg-warning);
  border: 1px solid var(--figma-color-border-warning);
}
```

### 2.7 Section title (uppercase eyebrow with trailing rule)

Used to break up long settings panels. The `::after` pseudo fills the remaining row width with a soft border line.

```html
<h3 class="section-title">Output</h3>
```

```css
.section-title {
  font-size: 11px; font-weight: 500;
  letter-spacing: 0.12em; text-transform: uppercase;
  color: var(--figma-color-text-secondary);
  margin: var(--tp-space-5) 0 var(--tp-space-3);
  display: flex; align-items: center; gap: var(--tp-space-3);
  white-space: nowrap;
}
.section-title::after {
  content: '';
  flex: 1; height: 1px;
  background: var(--figma-color-border);
}
```

---

## 3. Interaction patterns (visual only)

### 3.1 Focus rings

Two flavors:
- **Outline ring** for self-contained elements (buttons, chips): `outline: 2px solid var(--tp-brand); outline-offset: 2px;`
- **Inset glow** for inputs inside cards (selects, text fields): `box-shadow: 0 0 0 3px var(--tp-brand-ring); border-color: var(--tp-brand);`

Outlines clip against parent borders; box-shadows don't. Use the right one per context.

### 3.2 Hover

Only ever `border-color` and/or `background` transitions, never `transform: scale()` or `translate`. Plugin UI is dense — micro-translations look jittery in a 320px rail.

```css
transition: border-color 0.15s ease, background 0.15s ease;
```

### 3.3 Disabled

Drop opacity to 0.5 and set `cursor: not-allowed` on the wrapper. Inner controls get `pointer-events: none`. Don't try to dim individual elements within a disabled card.

### 3.4 Selected vs locked

- `.on` / `.selected` → user picked this; clicking again deselects.
- `.locked` → same brand-soft visual, but `cursor: default` and clicking does nothing. Use when the chip is selected by virtue of being the only valid option (e.g. "you must export at least one format").

These look identical at a glance, but the cursor change tells the user the chip isn't going anywhere.

---

## 4. Theming checklist

When porting this to a new plugin:

1. Drop `:root` brand + spatial vars into the top of your stylesheet. Rename `--tp-` → your prefix.
2. Drop the `@media (prefers-color-scheme: dark)` block in unchanged. Do not touch light mode.
3. Pull in the Geist Mono link tag and the `--tp-font-mono` stack.
4. Copy components from §2 as needed. Rename the prefix.
5. Use `--figma-color-*` for everything else — don't redefine neutrals.
6. Use `:focus-visible` not `:focus` for buttons/chips.
7. No JS framework, no ES2018+ syntax in `code.ts`, no MutationObserver on the document root.

That's the whole spec. If a new pattern doesn't fit one of these components, it probably needs a design conversation before it goes in — don't invent a fourth chip variant or a sixth space step without a reason.

---

## 5. Reference: Token Press's full UI source

The canonical implementation is `src/ui.html` in this repo. When in doubt, open that file — it's a single-file plugin UI, so the markup, styles, and behavior all live together. Search for the class names in this doc to find the matching CSS.
