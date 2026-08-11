# Test Plan — v1.7.0 DTCG-Spec Dimension Default + SD Preset

> Goal: validate the `feature/sd-compat-toggle` work before opening the PR.
> Run order: **§1 (build sanity) → §2 (UI behavior) → §3 (export correctness) → §4 (regression) → §5 (fixture regen)**.
> ✅ = passed, ❌ = failed (note + screenshot), ⏭ = skipped (note why).

---

## §1 — Build & lint sanity (terminal, ~2 min)

| # | Step | Expected | Result |
|---|------|----------|--------|
| 1.1 | `npm run build` | Exits 0; `dist/code.js` ≈ 263 kB; no errors | ☐ |
| 1.2 | `npm run lint` | 0 errors (warnings OK) | ☐ |
| 1.3 | `grep -E '\\?\\?\\|\\?\\.' dist/code.js \|\| echo "clean"` | Prints `clean` (proves ES2018 — see [[project-es2018-constraint]]) | ☐ |
| 1.4 | `grep -c '\\.\\.\\.' dist/code.js` | 0 spread operators in compiled output | ☐ |
| 1.5 | `npm test` (vitest) | All converter unit tests pass | ☐ |

---

## §2 — UI behavior (Figma desktop, ~10 min)

> Reload the plugin in Figma desktop after each `npm run build`. Plugin → Development → Token Press.

### 2.1 Default state on first load

| # | Step | Expected | Result |
|---|------|----------|--------|
| 2.1.1 | Open plugin fresh (or "Reset to DTCG defaults" first) | Dimension Format dropdown reads **"Object — { value, unit } (DTCG)"**; Letter Spacing Format reads **"Object"** | ☐ |
| 2.1.2 | Inspect "Apply Style Dictionary preset" + "Reset to DTCG defaults" buttons | Both visible side-by-side, same height/style, wrap if window is narrow | ☐ |

### 2.2 Apply SD preset button

| # | Step | Expected | Result |
|---|------|----------|--------|
| 2.2.1 | Click **Apply Style Dictionary preset** | Five fields update simultaneously: dimension-format=`string`, letter-spacing-format=`string`, letter-spacing-units=`px`, line-height-output=`ratio`, units=`px` | ☐ |
| 2.2.2 | Observe feedback span | "Applied" appears next to buttons; fades after ~1.5s | ☐ |
| 2.2.3 | Click button **twice quickly** | Feedback timer resets (no double-fade); fields land on the SD values once | ☐ |

### 2.3 Reset to DTCG defaults button

| # | Step | Expected | Result |
|---|------|----------|--------|
| 2.3.1 | After applying SD preset, click **Reset to DTCG defaults** | dimension-format flips to `object`; letter-spacing-format flips to `object` | ☐ |
| 2.3.2 | Feedback span | Shows "Reset to DTCG defaults" (or similar) for ~1.5s | ☐ |

### 2.4 Manual override after preset

| # | Step | Expected | Result |
|---|------|----------|--------|
| 2.4.1 | Apply SD preset, then manually change Dimension Format to `object` | Field accepts the change; no preset re-stamping | ☐ |
| 2.4.2 | Reload plugin | Last-saved options restored (mixed/manual values intact) | ☐ |

### 2.5 Persistence

| # | Step | Expected | Result |
|---|------|----------|--------|
| 2.5.1 | Set non-default values, close plugin, reopen | Values persisted via Figma clientStorage | ☐ |

---

## §3 — Export correctness (Figma desktop + a token-rich file, ~15 min)

> Use a Figma file with at least one collection containing: dimension-typed FLOAT variables, FLOAT line-heights, COLOR variables, text styles with fontSize and letterSpacing, and an effect style with shadow.

### 3.1 Default DTCG output

Apply DTCG defaults → Export → DTCG JSON format → inspect downloaded JSON.

| # | Token type | Expected `$value` shape | Result |
|---|-----------|-------------------------|--------|
| 3.1.1 | Dimension variable (e.g. `space-md` = 16) | `{ "value": 16, "unit": "px" }` | ☐ |
| 3.1.2 | Dimension variable in `rem` mode | `{ "value": 1, "unit": "rem" }` | ☐ |
| 3.1.3 | Text style fontSize | `{ "value": 16, "unit": "px" }` (or rem if units=rem) | ☐ |
| 3.1.4 | Letter spacing in PIXELS | `{ "value": 0.5, "unit": "px" }` | ☐ |
| 3.1.5 | Letter spacing in PERCENT | String `"2%"` (always — percent is always string) | ☐ |
| 3.1.6 | Line height (ratio mode) | Number `1.5` (no unit) | ☐ |
| 3.1.7 | Line height (px mode) | `{ "value": 24, "unit": "px" }` | ☐ |
| 3.1.8 | Shadow offsetX/Y, blur, spread | Each as `{ value, unit }` object | ☐ |
| 3.1.9 | Color variable | Unchanged from v1.6.0 (controlled by Color Format dropdown, not these new options) | ☐ |

### 3.2 Style Dictionary preset output

Apply SD preset → Export → DTCG JSON format → inspect JSON.

| # | Token type | Expected `$value` shape | Result |
|---|-----------|-------------------------|--------|
| 3.2.1 | Dimension variable | String `"16px"` | ☐ |
| 3.2.2 | Text style fontSize | String `"16px"` | ☐ |
| 3.2.3 | Letter spacing in PIXELS | String `"0.5px"` | ☐ |
| 3.2.4 | Line height (ratio) | Number `1.5` | ☐ |
| 3.2.5 | Shadow values | String `"4px"` etc. | ☐ |
| 3.2.6 | `npm run test:sd` after this export | Style Dictionary build succeeds with no transform errors | ☐ |

### 3.3 Mixed / manual overrides

| # | Step | Expected | Result |
|---|------|----------|--------|
| 3.3.1 | DTCG default + manually flip ONLY dimension-format to `string` | Dimensions emit string, letter-spacing still emits object | ☐ |
| 3.3.2 | SD preset + manually flip dimension-format to `object` | Dimensions emit object, other SD values stay (line-height ratio, etc.) | ☐ |

### 3.4 Other export formats unaffected

| # | Format | Expected | Result |
|---|--------|----------|--------|
| 3.4.1 | CSS custom properties | Same output regardless of dimension-format setting (CSS uses string form natively) | ☐ |
| 3.4.2 | Raw Figma JSON | Bypasses DTCG; dimension-format setting ignored | ☐ |
| 3.4.3 | Dot-notation | Bypasses DTCG; dimension-format setting ignored | ☐ |

---

## §4 — Regression spot-check (~5 min)

| # | Area | Expected | Result |
|---|------|----------|--------|
| 4.1 | Color export sRGB / HSL / DTCG-spec object — unchanged from v1.6.0 | All three modes still work | ☐ |
| 4.2 | Per-mode CSS custom properties (added in 9281cfe) | Still emits one file per mode | ☐ |
| 4.3 | Aliases still resolve | `$value: { type: "alias", path: [...] }` references intact | ☐ |
| 4.4 | Composite shadow tokens | Object form `{ offsetX, offsetY, blur, spread, color }` still compiles | ☐ |
| 4.5 | Composite typography tokens | `$value` object with `fontSize`, `fontWeight`, `lineHeight`, `letterSpacing` works | ☐ |
| 4.6 | Validation report unchanged | Scan & Validate panel still works | ☐ |

---

## §5 — Fixture regeneration (~5 min)

| # | Step | Expected | Result |
|---|------|----------|--------|
| 5.1 | Open `tokens-sRGB` source Figma file, export with **DTCG defaults**, save into `test-examples/tokens-sRGB/` | Files match new object-form output | ☐ |
| 5.2 | Same for `tokens-hsl/` | Same | ☐ |
| 5.3 | `git diff test-examples/` | Diff shows `"16px"` → `{value, unit}` shape consistently | ☐ |
| 5.4 | `npm run test:sd` (after applying SD preset and re-exporting into the SD test fixture path, if separate) | Style Dictionary build still succeeds | ☐ |

---

## §6 — Sign-off

- [ ] All §1–§5 ✅ or ⏭ with explanation
- [ ] Screenshots of UI states attached to PR
- [ ] CHANGELOG entry includes BREAKING flag + migration note (apply SD preset)
- [ ] `package.json` version bumped to `1.7.0`
- [ ] `WIP-SD-COMPAT.md` deleted

---

## Quick smoke (if short on time, ~3 min)

Bare minimum before merging:
1. §1.1 build clean
2. §2.2.1 + §2.3.1 both buttons stamp values
3. §3.1.1 + §3.2.1 export proves both shapes work end-to-end
