## (2026-10-08) — Studio headings: Bold, tighter view titles and tighter section and group headings, on three new tracking roles (#2322)

The owner approved the type specimen sheet (current against proposed, light and dark), then settled how to wire it (2026-10-08):
- **Three new tracking roles** in every brand's ramp: `tightest` −4%, `snugger` −1.5% (between `tight` and `snug`) and `open` +1% (between `normal` and `wide`). The six existing roles keep their names and values. No +1.5% step for now.
- **The section heading's −2.5% snaps to −3%** (`tighter`).
- **No new line-height role.** The 20px titles' approved 1.2 stays at 1.25 (`compact`), what they use today.

**What changed in the studio's chrome:**

| Heading | Weight | Tracking | Line height |
|---|---|---|---|
| View title (`.p3-preview-title`) and Style guides title (`.p3-sg-title`) | Bold 700 | `tightest` | 1.25 |
| Every L1 section heading (lever sections, palette names, style-guide sections, both dialog titles) | 600 | `tighter` | — |
| Every L2 group heading (lever names, row groups, column titles, breakpoint names, the start screen's title, style-guide option groups) | 600 | `snugger` | — |
| Card titles | 500 | `open` | — |

The values come from chrome tokens resolved from the default Prism3 theme, as every chrome value does. The top bar's wordmark (`.p3-mark`) is unchanged.

**Engine:** the three steps were already on the locked ladder; only roles bind them now. The token contract adds six paths (`CONTRACT_VERSION` 14.4.0, re-accepted), with a `minor` change note. No brand's type moves: no composite binds a new role.

### Diagnosis worth keeping

- **A tracking nudge counts steps along the role list,** so inserting `snugger` and `open` into it would have moved every brand that nudges a group: one step tighter from `snug` would land on −1.5% instead of −2%. The nudge keeps the six (`TRACKING_SHIFT_KEYS`), in the engine and in the studio's nudge control. Whether it should step through all nine is filed as #2337, the owner's call.
- **Brands may re-anchor a role's value, and the engine refuses a ramp out of order.** A brand that set `tighter` to −5% would have made the new `tightest` (−4%) cross it, and its build would throw. A new role a brand does not set takes its default clamped between its resolved neighbors, which keeps it on the ladder. No corpus brand re-anchors tracking.
- **The engine mints a step only when a named role binds it** (#328), which is why "add the steps" meant adding named roles. That made the role names the owner's call.

### Traps for whoever re-verifies

- `test:chrome`'s heading rule (TY2 A) now expects L1 at `ls-tighter` and L2 at `ls-snugger`, as literal paths in its oracle. A new `#2322` arm holds the view title (Bold, −4%) and the card title (+1%), which the rule exempts as page titles.
- The studio's "Line height and letter spacing" lever and the Type preview's letter-spacing table list all nine roles, with no code change: both read the engine's role list. The new roles read "Not used" until a style binds them.
- The specimen sheet and the before-and-after screenshots (web, light and dark, 1280 and 380) are in the owner's Desktop folder, `Prism3 type specimen (#2322)`, outside the repo.
