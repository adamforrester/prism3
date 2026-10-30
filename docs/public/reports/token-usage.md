# Token usage

Where each token is bound: by which component, on which part, and at which variants and states. 273 of 802 emitted tokens are bound by at least one component.

Two sources feed each entry. **Keys** are the binding keys in the component definition. **Parts** are where the design-file projection draws the token; "where" lists the axis values a part is bound at, leaves out any axis bound at every value, and counts the members.

Generated from the component definitions and the emission by `packages/engine/emit-analysis-reports.ts`; `regen.ts --check` fails when this page is stale. The same data for agents: [token-usage.json](token-usage.json). All reports: [index](index.md).

## Contents

- [By token](#by-token)
- [By component](#by-component)
- [Tokens no component binds](#tokens-no-component-binds)

## By token

### `border-width.hairline`

Type: dimension. Bound by 25 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| badge | `border-width` | surface | every member (40 of 40) |
| banner | `border-width`, `width.contained.edge-side` | container | every member (8 of 8) |
| button | `border-width` | container | every member (576 of 576) |
| button-destructive | `border-width` | container | every member (576 of 576) |
| button-neutral | `border-width` | container | every member (576 of 576) |
| card-number-field | `border-width`, `caret-width` | caret | state: focus-visible (12 of 84) |
|  |  | caretEnd | state: focus-visible-filled (12 of 84) |
|  |  | control | every member (84 of 84) |
| code-input-cell | `border-width`, `caret-width` | caret | state: focus-visible (4 of 28) |
|  |  | container | every member (28 of 28) |
| counter | `border-width` | control | every member (18 of 18) |
| divider | `horizontal.false.height`, `horizontal.line.height`, `horizontal.line.width`, `vertical.false.width`, `vertical.line.height`, `vertical.line.width` | container | labeled: false (5 of 7) |
|  |  | leadingRule | inset: none · labeled: true (2 of 7) |
|  |  | trailingRule | inset: none · labeled: true (2 of 7) |
| flush-icon-button | `border-width` | container | every member (60 of 60) |
| flush-icon-button-destructive | `border-width` | container | every member (60 of 60) |
| flush-icon-button-neutral | `border-width` | container | every member (60 of 60) |
| icon-button | `border-width` | container | every member (216 of 216) |
| icon-button-destructive | `border-width` | container | every member (216 of 216) |
| icon-button-neutral | `border-width` | container | every member (216 of 216) |
| pagination-item | `border-width` | container | every member (87 of 87) |
| password-field | `border-width`, `caret-width` | caret | state: focus-visible (12 of 84) |
|  |  | caretEnd | state: focus-visible-filled (12 of 84) |
|  |  | control | every member (84 of 84) |
| provider-logo | `tile.border-width` | glyph | name: payment/affirm, payment/amazon-pay, payment/apple-pay, payment/diners-club, payment/discover, payment/google-pay, payment/klarna, payment/maestro, payment/mastercard, payment/paypal, payment/visa (11 of 75) |
| search-field | `border-width`, `caret-width` | caret | state: focus-visible (12 of 84) |
|  |  | caretEnd | state: focus-visible-filled (12 of 84) |
|  |  | control | every member (84 of 84) |
| select | `border-width` | control | every member (84 of 84) |
| sign-in-button | `border-width` | container | every member (96 of 96) |
| tabs | `baseline-height` | baseline | every member (6 of 6) |
|  |  | container | every member (6 of 6) |
| tag | `unselected.border-width` | container | selection: unselected (30 of 45) |
| text-field | `border-width`, `caret-width` | caret | state: focus-visible (12 of 84) |
|  |  | caretEnd | state: focus-visible-filled (12 of 84) |
|  |  | control | every member (84 of 84) |
| textarea | `border-width`, `caret-width`, `grip-inset` | caret | state: focus-visible (12 of 84) |
|  |  | control | every member (84 of 84) |
|  |  | gripGlyph | every member (84 of 84) |

### `border-width.heavy`

Type: dimension. Bound by 3 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| _slider-thumb | `halo-width` | hoverHalo | every member (15 of 15) |
| progress | `stop-size`, `track-height` | dotGlyph | shape: linear · size: medium · type: determinate (3 of 12) |
|  |  | track | shape: linear · size: medium (4 of 12) |
| slider | `size.medium.thickness` | bar | size: medium (10 of 30) |
|  |  | spaceEnd | size: medium (10 of 30) |
|  |  | spaceStart | size: medium · type: range (5 of 30) |
|  |  | track | size: medium (10 of 30) |

### `border-width.none`

Type: dimension. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| banner | `width.full.edge-side` | container | width: full (4 of 8) |

### `border-width.thick`

Type: dimension. Bound by 8 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| checkbox-control | `border-width` | control | every member (90 of 90) |
| link | `bar-height` | bar | selection: selected · style: standalone (48 of 144) |
| pagination-item | `underline-height` | balance | labeled: false · selection: selected · state: focus-visible, rest · style: underline · type: page (6 of 87) |
|  |  | underline | labeled: false · selection: selected · state: focus-visible, rest · style: underline · type: page (6 of 87) |
| radio-control | `border-width` | control | every member (60 of 60) |
| slider | `size.small.thickness` | bar | size: small (10 of 30) |
|  |  | spaceEnd | size: small (10 of 30) |
|  |  | spaceStart | size: small · type: range (5 of 30) |
|  |  | track | size: small (10 of 30) |
| switch-control | `border-width` | track | every member (40 of 40) |
| tab-item | `indicator-height` | container | every member (30 of 30) |
|  |  | indicator | every member (30 of 30) |
| tag | `selected.border-width` | container | selection: selected · type: select (15 of 45) |

### `border-width.x-heavy`

Type: dimension. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| slider | `size.large.thickness` | bar | size: large (10 of 30) |
|  |  | spaceEnd | size: large (10 of 30) |
|  |  | spaceStart | size: large · type: range (5 of 30) |
|  |  | track | size: large (10 of 30) |

### `color.background.primary`

Type: color. Bound by 2 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| badge | `danger.status.surface.fill`, `info.status.surface.fill`, `neutral.status.surface.fill`, `success.status.surface.fill`, `warning.status.surface.fill` | surface | emphasis: surface · type: status (10 of 40) |
| segmented-control-segment | `disabled.fill`, `selected.fill` | indicator | selection: selected (15 of 30) |

### `color.background.secondary`

Type: color. Bound by 2 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| image-placeholder | `fill` | frame | every member (7 of 7) |
| segmented-control | `fill` | track | every member (3 of 3) |

### `color.background.tertiary`

Type: color. Bound by 2 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| progress | `fill` | ringGlyph | shape: circular (8 of 12) |
|  |  | track | shape: linear · size: medium (4 of 12) |
| switch-control | `off.fill`, `off.icon` | offGlyph | selection: off · state: focus-visible, hover, pressed, rest (16 of 40) |
|  |  | track | selection: off · state: focus-visible, hover, pressed, rest (16 of 40) |

### `color.border.danger`

Type: color. Bound by 12 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| badge | `danger.status.subtle.border` | surface | emphasis: subtle · tone: danger · type: status (2 of 40) |
| banner | `danger.border` | container | tone: danger (2 of 8) |
| card-number-field | `error.border.empty`, `error.border.filled`, `error.border.focus-visible`, `error.border.focus-visible-filled`, `error.border.hover`, `error.border.read-only`, `error.border.rest` | control | state: filled, focus-visible, focus-visible-filled, hover, read-only, rest · status: error (18 of 84) |
| checkbox-control | `error.checked.border.focus-visible`, `error.checked.border.hover`, `error.checked.border.pressed`, `error.checked.border.rest`, `error.indeterminate.border.focus-visible`, `error.indeterminate.border.hover`, `error.indeterminate.border.pressed`, `error.indeterminate.border.rest`, `error.unchecked.border.focus-visible`, `error.unchecked.border.hover`, `error.unchecked.border.pressed`, `error.unchecked.border.rest` | control | state: focus-visible, hover, pressed, rest · status: error (36 of 90) |
| code-input-cell | `border.error` | container | state: error (4 of 28) |
| password-field | `error.border.empty`, `error.border.filled`, `error.border.focus-visible`, `error.border.focus-visible-filled`, `error.border.hover`, `error.border.read-only`, `error.border.rest` | control | state: filled, focus-visible, focus-visible-filled, hover, read-only, rest · status: error (18 of 84) |
| radio-control | `error.checked.border.focus-visible`, `error.checked.border.hover`, `error.checked.border.pressed`, `error.checked.border.rest`, `error.unchecked.border.focus-visible`, `error.unchecked.border.hover`, `error.unchecked.border.pressed`, `error.unchecked.border.rest` | control | state: focus-visible, hover, pressed, rest · status: error (24 of 60) |
| search-field | `error.border.empty`, `error.border.filled`, `error.border.focus-visible`, `error.border.focus-visible-filled`, `error.border.hover`, `error.border.read-only`, `error.border.rest` | control | state: filled, focus-visible, focus-visible-filled, hover, read-only, rest · status: error (18 of 84) |
| select | `error.border.empty`, `error.border.filled`, `error.border.focus-visible`, `error.border.focus-visible-filled`, `error.border.hover`, `error.border.read-only`, `error.border.rest` | control | state: filled, focus-visible, focus-visible-filled, hover, read-only, rest · status: error (18 of 84) |
| switch-control | `error.off.border.focus-visible`, `error.off.border.hover`, `error.off.border.pressed`, `error.off.border.rest`, `error.on.border.focus-visible`, `error.on.border.hover`, `error.on.border.pressed`, `error.on.border.rest` | track | state: focus-visible, hover, pressed, rest · status: error (16 of 40) |
| text-field | `error.border.empty`, `error.border.filled`, `error.border.focus-visible`, `error.border.focus-visible-filled`, `error.border.hover`, `error.border.read-only`, `error.border.rest` | control | state: filled, focus-visible, focus-visible-filled, hover, read-only, rest · status: error (18 of 84) |
| textarea | `error.border.empty`, `error.border.filled`, `error.border.focus-visible`, `error.border.focus-visible-filled`, `error.border.hover`, `error.border.read-only`, `error.border.rest` | control | state: filled, focus-visible, focus-visible-filled, hover, read-only, rest · status: error (18 of 84) |

### `color.border.focus`

Type: color. Bound by 22 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| _slider-thumb | `focus-ring` | (not drawn) | — |
| button | `focus-ring` | (not drawn) | — |
| button-destructive | `focus-ring` | (not drawn) | — |
| button-neutral | `focus-ring` | (not drawn) | — |
| card-number-field | `border.focus-visible`, `border.focus-visible-filled` | control | state: focus-visible, focus-visible-filled · status: default (6 of 84) |
| checkbox-control | `focus-ring` | (not drawn) | — |
| code-input-cell | `border.focus-visible`, `border.focus-visible-filled` | container | state: focus-visible, focus-visible-filled (8 of 28) |
| focus-ring | `border` | ring | surface: default (1 of 2) |
| icon-button | `focus-ring` | (not drawn) | — |
| icon-button-destructive | `focus-ring` | (not drawn) | — |
| icon-button-neutral | `focus-ring` | (not drawn) | — |
| pagination-item | `focus-ring` | (not drawn) | — |
| password-field | `border.focus-visible`, `border.focus-visible-filled` | control | state: focus-visible, focus-visible-filled · status: default (6 of 84) |
| radio-control | `focus-ring` | (not drawn) | — |
| search-field | `border.focus-visible`, `border.focus-visible-filled` | control | state: focus-visible, focus-visible-filled · status: default (6 of 84) |
| segmented-control-segment | `focus-ring` | (not drawn) | — |
| select | `border.focus-visible`, `border.focus-visible-filled` | control | state: focus-visible, focus-visible-filled · status: default (6 of 84) |
| switch-control | `focus-ring` | (not drawn) | — |
| tab-item | `focus-ring` | (not drawn) | — |
| tag | `focus-ring` | (not drawn) | — |
| text-field | `border.focus-visible`, `border.focus-visible-filled` | control | state: focus-visible, focus-visible-filled · status: default (6 of 84) |
| textarea | `border.focus-visible`, `border.focus-visible-filled` | control | state: focus-visible, focus-visible-filled · status: default (6 of 84) |

### `color.border.info`

Type: color. Bound by 2 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| badge | `info.status.subtle.border` | surface | emphasis: subtle · tone: info · type: status (2 of 40) |
| banner | `info.border` | container | tone: info (2 of 8) |

### `color.border.primary`

Type: color. Bound by 3 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| _slider-thumb | `border.hover`, `border.pressed`, `fill.pressed` | hoverHalo | state: hover, pressed (6 of 15) |
|  |  | pressHalo | state: pressed (3 of 15) |
| provider-logo | `tile.border` | glyph | name: payment/affirm, payment/amazon-pay, payment/apple-pay, payment/diners-club, payment/discover, payment/google-pay, payment/klarna, payment/maestro, payment/mastercard, payment/paypal, payment/visa (11 of 75) |
| tabs | `fill` | baseline | every member (6 of 6) |

### `color.border.secondary`

Type: color. Bound by 6 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| divider | `fill` | leadingRule | inset: none · labeled: true (2 of 7) |
|  |  | rule | labeled: false (5 of 7) |
|  |  | trailingRule | inset: none · labeled: true (2 of 7) |
| flush-icon-button | `round.border` | container | shape: round · state: focus-visible, hover, pressed, rest · surface: default (12 of 60) |
| flush-icon-button-destructive | `round.border` | container | shape: round · state: focus-visible, hover, pressed, rest · surface: default (12 of 60) |
| flush-icon-button-neutral | `round.border` | container | shape: round · state: focus-visible, hover, pressed, rest · surface: default (12 of 60) |
| pagination-item | `selected.border.page.border.focus-visible`, `selected.border.page.border.rest` | container | labeled: false · selection: selected · state: focus-visible, rest · style: border · type: page (6 of 87) |
| tab-item | `unselected.fill.hover`, `unselected.fill.pressed` | indicator | selection: unselected · state: hover, pressed (6 of 30) |

### `color.border.success`

Type: color. Bound by 8 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| badge | `success.status.subtle.border` | surface | emphasis: subtle · tone: success · type: status (2 of 40) |
| banner | `success.border` | container | tone: success (2 of 8) |
| card-number-field | `success.border.empty`, `success.border.filled`, `success.border.focus-visible`, `success.border.focus-visible-filled`, `success.border.hover`, `success.border.read-only`, `success.border.rest` | control | state: filled, focus-visible, focus-visible-filled, hover, read-only, rest · status: success (18 of 84) |
| password-field | `success.border.empty`, `success.border.filled`, `success.border.focus-visible`, `success.border.focus-visible-filled`, `success.border.hover`, `success.border.read-only`, `success.border.rest` | control | state: filled, focus-visible, focus-visible-filled, hover, read-only, rest · status: success (18 of 84) |
| search-field | `success.border.empty`, `success.border.filled`, `success.border.focus-visible`, `success.border.focus-visible-filled`, `success.border.hover`, `success.border.read-only`, `success.border.rest` | control | state: filled, focus-visible, focus-visible-filled, hover, read-only, rest · status: success (18 of 84) |
| select | `success.border.empty`, `success.border.filled`, `success.border.focus-visible`, `success.border.focus-visible-filled`, `success.border.hover`, `success.border.read-only`, `success.border.rest` | control | state: filled, focus-visible, focus-visible-filled, hover, read-only, rest · status: success (18 of 84) |
| text-field | `success.border.empty`, `success.border.filled`, `success.border.focus-visible`, `success.border.focus-visible-filled`, `success.border.hover`, `success.border.read-only`, `success.border.rest` | control | state: filled, focus-visible, focus-visible-filled, hover, read-only, rest · status: success (18 of 84) |
| textarea | `success.border.empty`, `success.border.filled`, `success.border.focus-visible`, `success.border.focus-visible-filled`, `success.border.hover`, `success.border.read-only`, `success.border.rest` | control | state: filled, focus-visible, focus-visible-filled, hover, read-only, rest · status: success (18 of 84) |

### `color.border.tertiary`

Type: color. Bound by 3 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| badge | `neutral.status.subtle.border` | surface | emphasis: subtle · tone: neutral · type: status (2 of 40) |
| divider | `separator.fill` | (not drawn) | — |
| pagination-item | `selected.underline.page.fill.focus-visible`, `selected.underline.page.fill.rest` | underline | labeled: false · selection: selected · state: focus-visible, rest · style: underline · type: page (6 of 87) |

### `color.border.warning`

Type: color. Bound by 8 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| badge | `warning.status.subtle.border` | surface | emphasis: subtle · tone: warning · type: status (2 of 40) |
| banner | `warning.border` | container | tone: warning (2 of 8) |
| card-number-field | `warning.border.empty`, `warning.border.filled`, `warning.border.focus-visible`, `warning.border.focus-visible-filled`, `warning.border.hover`, `warning.border.read-only`, `warning.border.rest` | control | state: filled, focus-visible, focus-visible-filled, hover, read-only, rest · status: warning (18 of 84) |
| password-field | `warning.border.empty`, `warning.border.filled`, `warning.border.focus-visible`, `warning.border.focus-visible-filled`, `warning.border.hover`, `warning.border.read-only`, `warning.border.rest` | control | state: filled, focus-visible, focus-visible-filled, hover, read-only, rest · status: warning (18 of 84) |
| search-field | `warning.border.empty`, `warning.border.filled`, `warning.border.focus-visible`, `warning.border.focus-visible-filled`, `warning.border.hover`, `warning.border.read-only`, `warning.border.rest` | control | state: filled, focus-visible, focus-visible-filled, hover, read-only, rest · status: warning (18 of 84) |
| select | `warning.border.empty`, `warning.border.filled`, `warning.border.focus-visible`, `warning.border.focus-visible-filled`, `warning.border.hover`, `warning.border.read-only`, `warning.border.rest` | control | state: filled, focus-visible, focus-visible-filled, hover, read-only, rest · status: warning (18 of 84) |
| text-field | `warning.border.empty`, `warning.border.filled`, `warning.border.focus-visible`, `warning.border.focus-visible-filled`, `warning.border.hover`, `warning.border.read-only`, `warning.border.rest` | control | state: filled, focus-visible, focus-visible-filled, hover, read-only, rest · status: warning (18 of 84) |
| textarea | `warning.border.empty`, `warning.border.filled`, `warning.border.focus-visible`, `warning.border.focus-visible-filled`, `warning.border.hover`, `warning.border.read-only`, `warning.border.rest` | control | state: filled, focus-visible, focus-visible-filled, hover, read-only, rest · status: warning (18 of 84) |

### `color.disabled.border`

Type: color. Bound by 22 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button | `disabled.border` | container | appearance: outline · inset: default · state: disabled · surface: default (12 of 576) |
| button-destructive | `disabled.border` | container | appearance: outline · inset: default · state: disabled · surface: default (12 of 576) |
| button-neutral | `disabled.border` | container | appearance: outline · inset: default · state: disabled · surface: default (12 of 576) |
| card-number-field | `disabled.border` | control | state: disabled (12 of 84) |
| checkbox-control | `disabled.border` | control | selection: unchecked · state: disabled (6 of 90) |
| code-input-cell | `disabled.border` | container | state: disabled (4 of 28) |
| counter | `disabled.border` | control | appearance: outline · state: disabled (3 of 18) |
| flush-icon-button | `disabled.border` | container | shape: round · state: disabled · surface: default (3 of 60) |
| flush-icon-button-destructive | `disabled.border` | container | shape: round · state: disabled · surface: default (3 of 60) |
| flush-icon-button-neutral | `disabled.border` | container | shape: round · state: disabled · surface: default (3 of 60) |
| icon-button | `disabled.border` | container | appearance: outline · state: disabled · surface: default (6 of 216) |
| icon-button-destructive | `disabled.border` | container | appearance: outline · state: disabled · surface: default (6 of 216) |
| icon-button-neutral | `disabled.border` | container | appearance: outline · state: disabled · surface: default (6 of 216) |
| password-field | `disabled.border` | control | state: disabled (12 of 84) |
| radio-control | `disabled.border` | control | state: disabled (12 of 60) |
| search-field | `disabled.border` | control | state: disabled (12 of 84) |
| select | `disabled.border` | control | state: disabled (12 of 84) |
| switch-control | `disabled.border`, `disabled.icon.on-fill` | offGlyph | selection: off · state: disabled (4 of 40) |
|  |  | onGlyph | selection: on · state: disabled (4 of 40) |
|  |  | track | selection: off · state: disabled (4 of 40) |
| tab-item | `disabled.fill` | indicator | selection: selected · state: disabled (3 of 30) |
| tag | `disabled.border` | container | state: disabled (9 of 45) |
| text-field | `disabled.border` | control | state: disabled (12 of 84) |
| textarea | `disabled.border` | control | state: disabled (12 of 84) |

### `color.disabled.fill`

Type: color. Bound by 17 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button | `disabled.fill` | container | appearance: filled · inset: default · state: disabled · surface: default (12 of 576) |
| button-destructive | `disabled.fill` | container | appearance: filled · inset: default · state: disabled · surface: default (12 of 576) |
| button-neutral | `disabled.fill` | container | appearance: filled · inset: default · state: disabled · surface: default (12 of 576) |
| card-number-field | `disabled.fill` | control | state: disabled (12 of 84) |
| checkbox-control | `disabled.fill` | control | selection: checked, indeterminate · state: disabled (12 of 90) |
| code-input-cell | `disabled.fill` | container | state: disabled (4 of 28) |
| icon-button | `disabled.fill` | container | appearance: filled · state: disabled · surface: default (6 of 216) |
| icon-button-destructive | `disabled.fill` | container | appearance: filled · state: disabled · surface: default (6 of 216) |
| icon-button-neutral | `disabled.fill` | container | appearance: filled · state: disabled · surface: default (6 of 216) |
| password-field | `disabled.fill` | control | state: disabled (12 of 84) |
| radio-control | `disabled.indicator` | dot | selection: checked · state: disabled (6 of 60) |
| search-field | `disabled.fill` | control | state: disabled (12 of 84) |
| select | `disabled.fill` | control | state: disabled (12 of 84) |
| slider | `disabled.fill` | track | state: disabled (6 of 30) |
| switch-control | `disabled.fill` | track | state: disabled (8 of 40) |
| text-field | `disabled.fill` | control | state: disabled (12 of 84) |
| textarea | `disabled.fill` | control | state: disabled (12 of 84) |

### `color.disabled.icon`

Type: color. Bound by 15 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| _slider-thumb | `disabled.indicator` | disc | state: disabled (3 of 15) |
| button | `disabled.icon` | leadingVisual | appearance: outline, text · leading: true · state: disabled · surface: default (18 of 576) |
|  |  | trailingVisual | appearance: outline, text · state: disabled · surface: default · trailing: true (18 of 576) |
| button-destructive | `disabled.icon` | leadingVisual | appearance: outline, text · leading: true · state: disabled · surface: default (18 of 576) |
|  |  | trailingVisual | appearance: outline, text · state: disabled · surface: default · trailing: true (18 of 576) |
| button-neutral | `disabled.icon` | leadingVisual | appearance: outline, text · leading: true · state: disabled · surface: default (18 of 576) |
|  |  | trailingVisual | appearance: outline, text · state: disabled · surface: default · trailing: true (18 of 576) |
| flush-icon-button | `disabled.icon` | icon | state: disabled · surface: default (6 of 60) |
| flush-icon-button-destructive | `disabled.icon` | icon | state: disabled · surface: default (6 of 60) |
| flush-icon-button-neutral | `disabled.icon` | icon | state: disabled · surface: default (6 of 60) |
| icon-button | `disabled.icon` | icon | state: disabled · surface: default (18 of 216) |
| icon-button-destructive | `disabled.icon` | icon | state: disabled · surface: default (18 of 216) |
| icon-button-neutral | `disabled.icon` | icon | state: disabled · surface: default (18 of 216) |
| pagination-item | `disabled.icon` | nextGlyph | selection: unselected · state: disabled · style: border · type: next (6 of 87) |
|  |  | previousGlyph | selection: unselected · state: disabled · style: border · type: previous (6 of 87) |
| segmented-control-segment | `disabled.icon` | leadingVisual | state: disabled (6 of 30) |
| slider | `disabled.indicator` | bar | state: disabled (6 of 30) |
| tab-item | `disabled.icon` | leadingVisual | state: disabled (6 of 30) |
| tag | `disabled.icon` | checkGlyph | selection: selected · state: disabled · type: select (3 of 45) |
|  |  | dismissGlyph | selection: unselected · state: disabled · type: dismissible (3 of 45) |
|  |  | leadingVisual | state: disabled (9 of 45) |

### `color.disabled.on-fill`

Type: color. Bound by 11 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button | `disabled.icon.on-fill`, `disabled.label.on-fill` | label | appearance: filled · inset: default · state: disabled · surface: default (12 of 576) |
|  |  | leadingVisual | appearance: filled · inset: default · leading: true · state: disabled · surface: default (6 of 576) |
|  |  | trailingVisual | appearance: filled · inset: default · state: disabled · surface: default · trailing: true (6 of 576) |
| button-destructive | `disabled.icon.on-fill`, `disabled.label.on-fill` | label | appearance: filled · inset: default · state: disabled · surface: default (12 of 576) |
|  |  | leadingVisual | appearance: filled · inset: default · leading: true · state: disabled · surface: default (6 of 576) |
|  |  | trailingVisual | appearance: filled · inset: default · state: disabled · surface: default · trailing: true (6 of 576) |
| button-neutral | `disabled.icon.on-fill`, `disabled.label.on-fill` | label | appearance: filled · inset: default · state: disabled · surface: default (12 of 576) |
|  |  | leadingVisual | appearance: filled · inset: default · leading: true · state: disabled · surface: default (6 of 576) |
|  |  | trailingVisual | appearance: filled · inset: default · state: disabled · surface: default · trailing: true (6 of 576) |
| card-number-field | `disabled.icon.on-fill`, `disabled.label.on-fill` | leadingVisual | state: disabled (12 of 84) |
|  |  | placeholder | state: disabled (12 of 84) |
| checkbox-control | `disabled.icon.on-fill` | glyph | selection: checked, indeterminate · state: disabled (12 of 90) |
| password-field | `disabled.icon.on-fill`, `disabled.label.on-fill` | leadingVisual | state: disabled (12 of 84) |
|  |  | placeholder | state: disabled (12 of 84) |
| search-field | `disabled.icon.on-fill`, `disabled.label.on-fill` | leadingVisual | state: disabled (12 of 84) |
|  |  | placeholder | state: disabled (12 of 84) |
|  |  | trailingVisual | state: disabled (12 of 84) |
| select | `disabled.icon.on-fill`, `disabled.label.on-fill` | chevronGlyph | state: disabled (12 of 84) |
|  |  | leadingVisual | state: disabled (12 of 84) |
|  |  | placeholder | state: disabled (12 of 84) |
| switch-control | `disabled.indicator.on-fill` | thumb | state: disabled (8 of 40) |
| text-field | `disabled.icon.on-fill`, `disabled.label.on-fill` | leadingVisual | state: disabled (12 of 84) |
|  |  | placeholder | state: disabled (12 of 84) |
|  |  | trailingVisual | state: disabled (12 of 84) |
| textarea | `disabled.icon.on-fill`, `disabled.label.on-fill` | gripGlyph | state: disabled (12 of 84) |
|  |  | placeholder | state: disabled (12 of 84) |

### `color.disabled.text`

Type: color. Bound by 14 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button | `disabled.label` | label | appearance: outline, text · state: disabled · surface: default (36 of 576) |
| button-destructive | `disabled.label` | label | appearance: outline, text · state: disabled · surface: default (36 of 576) |
| button-neutral | `disabled.label` | label | appearance: outline, text · state: disabled · surface: default (36 of 576) |
| checkbox-row | `disabled.indicator`, `disabled.label` | (not drawn) | — |
| counter | `disabled.label` | value | state: disabled (6 of 18) |
| field-label | `disabled.indicator`, `disabled.label` | indicator | state: disabled (12 of 24) |
|  |  | label | state: disabled (12 of 24) |
| pagination-item | `disabled.label` | nextText | labeled: true · selection: unselected · state: disabled · style: border · type: next (3 of 87) |
|  |  | previousText | labeled: true · selection: unselected · state: disabled · style: border · type: previous (3 of 87) |
| radio-row | `disabled.indicator`, `disabled.label` | (not drawn) | — |
| segmented-control-segment | `disabled.label` | label | state: disabled (6 of 30) |
|  |  | labelReserve | state: disabled (6 of 30) |
| slider | `disabled.body`, `disabled.label` | maxLabel | state: disabled (6 of 30) |
|  |  | milestone | state: disabled (6 of 30) |
|  |  | minLabel | state: disabled (6 of 30) |
|  |  | valueRange | state: disabled · type: range (3 of 30) |
|  |  | valueSingle | state: disabled · type: single (3 of 30) |
| switch-row | `disabled.label` | (not drawn) | — |
| tab-item | `disabled.label` | label | state: disabled (6 of 30) |
|  |  | labelReserve | state: disabled (6 of 30) |
| tag | `disabled.label` | label | state: disabled (9 of 45) |
| textarea | `disabled.indicator` | counter | state: disabled (12 of 84) |

### `color.field.border.hover`

Type: color. Bound by 9 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| card-number-field | `border.hover` | control | state: hover · status: default (3 of 84) |
| checkbox-control | `unchecked.border.hover` | control | selection: unchecked · state: hover · status: default (3 of 90) |
| code-input-cell | `border.hover` | container | state: hover (4 of 28) |
| password-field | `border.hover` | control | state: hover · status: default (3 of 84) |
| radio-control | `unchecked.border.hover` | control | selection: unchecked · state: hover · status: default (3 of 60) |
| search-field | `border.hover` | control | state: hover · status: default (3 of 84) |
| select | `border.hover` | control | state: hover · status: default (3 of 84) |
| text-field | `border.hover` | control | state: hover · status: default (3 of 84) |
| textarea | `border.hover` | control | state: hover · status: default (3 of 84) |

### `color.field.border.rest`

Type: color. Bound by 11 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| card-number-field | `border`, `border.read-only` | control | state: filled, read-only, rest · status: default (9 of 84) |
| checkbox-control | `unchecked.border` | control | selection: unchecked · state: focus-visible, pressed, rest · status: default (9 of 90) |
| code-input-cell | `border` | container | state: filled, rest (8 of 28) |
| counter | `outline.border` | control | appearance: outline · state: focus-visible, rest (6 of 18) |
| password-field | `border`, `border.read-only` | control | state: filled, read-only, rest · status: default (9 of 84) |
| radio-control | `unchecked.border` | control | selection: unchecked · state: focus-visible, pressed, rest · status: default (9 of 60) |
| search-field | `border`, `border.read-only` | control | state: filled, read-only, rest · status: default (9 of 84) |
| select | `border`, `border.read-only` | control | state: filled, read-only, rest · status: default (9 of 84) |
| slider | `fill` | track | state: focus-visible, hover, pressed, rest (24 of 30) |
| text-field | `border`, `border.read-only` | control | state: filled, read-only, rest · status: default (9 of 84) |
| textarea | `border`, `border.read-only` | control | state: filled, read-only, rest · status: default (9 of 84) |

### `color.field.fill`

Type: color. Bound by 8 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| card-number-field | `fill` | control | state: filled, focus-visible, focus-visible-filled, hover, read-only, rest (72 of 84) |
| code-input-cell | `fill` | container | state: error, filled, focus-visible, focus-visible-filled, hover, rest (24 of 28) |
| counter | `outline.fill` | control | appearance: outline · state: focus-visible, rest (6 of 18) |
| password-field | `fill` | control | state: filled, focus-visible, focus-visible-filled, hover, read-only, rest (72 of 84) |
| search-field | `fill` | control | state: filled, focus-visible, focus-visible-filled, hover, read-only, rest (72 of 84) |
| select | `fill` | control | state: filled, focus-visible, focus-visible-filled, hover, read-only, rest (72 of 84) |
| text-field | `fill` | control | state: filled, focus-visible, focus-visible-filled, hover, read-only, rest (72 of 84) |
| textarea | `fill` | control | state: filled, focus-visible, focus-visible-filled, hover, read-only, rest (72 of 84) |

### `color.foreground.danger`

Type: color. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| badge | `danger.count.bold.fill`, `danger.dot.bold.fill`, `danger.status.bold.fill` | surface | emphasis: bold · tone: danger (4 of 40) |

### `color.foreground.danger-subtle`

Type: color. Bound by 2 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| badge | `danger.status.subtle.fill` | surface | emphasis: subtle · tone: danger · type: status (2 of 40) |
| banner | `danger.fill` | container | tone: danger (2 of 8) |

### `color.foreground.info`

Type: color. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| badge | `info.count.bold.fill`, `info.dot.bold.fill`, `info.status.bold.fill` | surface | emphasis: bold · tone: info (4 of 40) |

### `color.foreground.info-subtle`

Type: color. Bound by 2 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| badge | `info.status.subtle.fill` | surface | emphasis: subtle · tone: info · type: status (2 of 40) |
| banner | `info.fill` | container | tone: info (2 of 8) |

### `color.foreground.raised`

Type: color. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| dialog | `fill` | panel | every member (24 of 24) |

### `color.foreground.secondary`

Type: color. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| badge | `neutral.status.subtle.fill` | surface | emphasis: subtle · tone: neutral · type: status (2 of 40) |

### `color.foreground.success`

Type: color. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| badge | `success.count.bold.fill`, `success.dot.bold.fill`, `success.status.bold.fill` | surface | emphasis: bold · tone: success (4 of 40) |

### `color.foreground.success-subtle`

Type: color. Bound by 2 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| badge | `success.status.subtle.fill` | surface | emphasis: subtle · tone: success · type: status (2 of 40) |
| banner | `success.fill` | container | tone: success (2 of 8) |

### `color.foreground.warning`

Type: color. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| badge | `warning.count.bold.fill`, `warning.dot.bold.fill`, `warning.status.bold.fill` | surface | emphasis: bold · tone: warning (4 of 40) |

### `color.foreground.warning-subtle`

Type: color. Bound by 2 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| badge | `warning.status.subtle.fill` | surface | emphasis: subtle · tone: warning · type: status (2 of 40) |
| banner | `warning.fill` | container | tone: warning (2 of 8) |

### `color.icon.brand`

Type: color. Bound by 2 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| icon | `tone.brand` | (not drawn) | — |
| progress | `active.icon`, `active.indicator` | arcGlyph | shape: circular · status: active (4 of 12) |
|  |  | dotGlyph | shape: linear · size: medium · status: active · type: determinate (1 of 12) |
|  |  | fill | shape: linear · size: medium · status: active (2 of 12) |

### `color.icon.danger`

Type: color. Bound by 4 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| banner | `danger.icon` | dangerGlyph | tone: danger (2 of 8) |
| field-message | `error.icon` | errorGlyph | status: error (1 of 4) |
| icon | `tone.danger` | (not drawn) | — |
| progress | `error.icon`, `error.indicator` | arcGlyph | shape: circular · status: error · type: determinate (2 of 12) |
|  |  | dotGlyph | shape: linear · size: medium · status: error · type: determinate (1 of 12) |
|  |  | fill | shape: linear · size: medium · status: error · type: determinate (1 of 12) |

### `color.icon.info`

Type: color. Bound by 2 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| banner | `info.icon` | infoGlyph | tone: info (2 of 8) |
| icon | `tone.info` | (not drawn) | — |

### `color.icon.link.default`

Type: color. Bound by 2 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| breadcrumbs | `icon` | backGlyph | path: parent · separator: chevron (2 of 6) |
| link | `fill.selected.rest`, `icon` | bar | selection: selected · state: rest · style: standalone · surface: default (6 of 144) |
|  |  | trailingVisual | state: rest · style: standalone · surface: default (12 of 144) |

### `color.icon.link.focused`

Type: color. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| link | `fill.selected.focus-visible`, `icon.focus-visible` | bar | selection: selected · state: focus-visible · style: standalone · surface: default (6 of 144) |
|  |  | trailingVisual | state: focus-visible · style: standalone · surface: default (12 of 144) |

### `color.icon.link.hover`

Type: color. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| link | `fill.selected.hover`, `icon.hover` | bar | selection: selected · state: hover · style: standalone · surface: default (6 of 144) |
|  |  | trailingVisual | state: hover · style: standalone · surface: default (12 of 144) |

### `color.icon.link.pressed`

Type: color. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| link | `fill.selected.pressed`, `icon.pressed` | bar | selection: selected · state: pressed · style: standalone · surface: default (6 of 144) |
|  |  | trailingVisual | state: pressed · style: standalone · surface: default (12 of 144) |

### `color.icon.primary`

Type: color. Bound by 9 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| card-number-field | `icon` | leadingVisual | state: filled, focus-visible, focus-visible-filled, hover, read-only, rest (72 of 84) |
| icon | `icon`, `tone.primary` | glyph | every member (46 of 46) |
| list-item | `icon`, `indicator` | bullet | type: unordered (3 of 9) |
|  |  | icon | type: icon (3 of 9) |
| pagination-item | `unselected.ellipsis.icon` | gapGlyph | labeled: false · selection: unselected · state: rest · style: border · type: ellipsis (3 of 87) |
| password-field | `icon` | leadingVisual | state: filled, focus-visible, focus-visible-filled, hover, read-only, rest (72 of 84) |
| search-field | `icon` | leadingVisual | state: filled, focus-visible, focus-visible-filled, hover, read-only, rest (72 of 84) |
|  |  | trailingVisual | state: filled, focus-visible, focus-visible-filled, hover, read-only, rest (72 of 84) |
| select | `icon` | chevronGlyph | state: filled, focus-visible, focus-visible-filled, hover, read-only, rest (72 of 84) |
|  |  | leadingVisual | state: filled, focus-visible, focus-visible-filled, hover, read-only, rest (72 of 84) |
| spinner | `icon` | ringGlyph | every member (4 of 4) |
| text-field | `icon` | leadingVisual | state: filled, focus-visible, focus-visible-filled, hover, read-only, rest (72 of 84) |
|  |  | trailingVisual | state: filled, focus-visible, focus-visible-filled, hover, read-only, rest (72 of 84) |

### `color.icon.secondary`

Type: color. Bound by 4 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| _breadcrumb-separator | `icon` | chevronGlyph | type: chevron (1 of 2) |
|  |  | slashGlyph | type: slash (1 of 2) |
| field-message | `default.icon` | (not drawn) | — |
| icon | `tone.secondary` | (not drawn) | — |
| textarea | `icon` | gripGlyph | state: filled, focus-visible, focus-visible-filled, hover, read-only, rest (72 of 84) |

### `color.icon.success`

Type: color. Bound by 4 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| banner | `success.icon` | successGlyph | tone: success (2 of 8) |
| field-message | `success.icon` | successGlyph | status: success (1 of 4) |
| icon | `tone.success` | (not drawn) | — |
| progress | `complete.icon`, `complete.indicator` | dotGlyph | shape: linear · size: medium · status: complete · type: determinate (1 of 12) |
|  |  | fill | shape: linear · size: medium · status: complete · type: determinate (1 of 12) |
|  |  | fullRingGlyph | shape: circular · status: complete · type: determinate (2 of 12) |

### `color.icon.tertiary`

Type: color. Bound by 2 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| icon | `tone.tertiary` | (not drawn) | — |
| image-placeholder | `icon` | markerGlyph | every member (7 of 7) |

### `color.icon.warning`

Type: color. Bound by 3 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| banner | `warning.icon` | warningGlyph | tone: warning (2 of 8) |
| field-message | `warning.icon` | warningGlyph | status: warning (1 of 4) |
| icon | `tone.warning` | (not drawn) | — |

### `color.interactive.destructive.border.hover`

Type: color. Bound by 2 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button-destructive | `outline.border.hover` | container | appearance: outline · inset: default · state: hover · surface: default (12 of 576) |
| icon-button-destructive | `outline.border.hover` | container | appearance: outline · state: hover · surface: default (6 of 216) |

### `color.interactive.destructive.border.pressed`

Type: color. Bound by 2 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button-destructive | `outline.border.pressed` | container | appearance: outline · inset: default · state: pressed · surface: default (12 of 576) |
| icon-button-destructive | `outline.border.pressed` | container | appearance: outline · state: pressed · surface: default (6 of 216) |

### `color.interactive.destructive.border.rest`

Type: color. Bound by 2 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button-destructive | `outline.border` | container | appearance: outline · inset: default · state: focus-visible, pending, rest · surface: default (36 of 576) |
| icon-button-destructive | `outline.border` | container | appearance: outline · state: focus-visible, pending, rest · surface: default (18 of 216) |

### `color.interactive.destructive.fill.hover`

Type: color. Bound by 2 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button-destructive | `filled.fill.hover` | container | appearance: filled · inset: default · state: hover · surface: default (12 of 576) |
| icon-button-destructive | `filled.fill.hover` | container | appearance: filled · state: hover · surface: default (6 of 216) |

### `color.interactive.destructive.fill.pressed`

Type: color. Bound by 2 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button-destructive | `filled.fill.pressed` | container | appearance: filled · inset: default · state: pressed · surface: default (12 of 576) |
| icon-button-destructive | `filled.fill.pressed` | container | appearance: filled · state: pressed · surface: default (6 of 216) |

### `color.interactive.destructive.fill.rest`

Type: color. Bound by 2 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button-destructive | `filled.fill` | container | appearance: filled · inset: default · state: focus-visible, pending, rest · surface: default (36 of 576) |
| icon-button-destructive | `filled.fill` | container | appearance: filled · state: focus-visible, pending, rest · surface: default (18 of 216) |

### `color.interactive.destructive.icon.hover`

Type: color. Bound by 3 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button-destructive | `outline.icon.hover`, `text.icon.hover` | leadingVisual | appearance: outline, text · leading: true · state: hover · surface: default (18 of 576) |
|  |  | trailingVisual | appearance: outline, text · state: hover · surface: default · trailing: true (18 of 576) |
| flush-icon-button-destructive | `flush.icon.hover`, `round.icon.hover` | icon | state: hover · surface: default (6 of 60) |
| icon-button-destructive | `ghost.icon.hover`, `outline.icon.hover` | icon | appearance: ghost, outline · state: hover · surface: default (12 of 216) |

### `color.interactive.destructive.icon.pressed`

Type: color. Bound by 3 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button-destructive | `outline.icon.pressed`, `text.icon.pressed` | leadingVisual | appearance: outline, text · leading: true · state: pressed · surface: default (18 of 576) |
|  |  | trailingVisual | appearance: outline, text · state: pressed · surface: default · trailing: true (18 of 576) |
| flush-icon-button-destructive | `flush.icon.pressed`, `round.icon.pressed` | icon | state: pressed · surface: default (6 of 60) |
| icon-button-destructive | `ghost.icon.pressed`, `outline.icon.pressed` | icon | appearance: ghost, outline · state: pressed · surface: default (12 of 216) |

### `color.interactive.destructive.icon.rest`

Type: color. Bound by 3 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button-destructive | `outline.icon`, `text.icon` | leadingVisual | appearance: outline, text · leading: true · state: focus-visible, rest · surface: default (36 of 576) |
|  |  | spinner | appearance: outline, text · state: pending · surface: default (36 of 576) |
|  |  | trailingVisual | appearance: outline, text · state: focus-visible, pending, rest · surface: default · trailing: true (45 of 576) |
| flush-icon-button-destructive | `flush.icon`, `round.icon` | icon | state: focus-visible, rest · surface: default (12 of 60) |
| icon-button-destructive | `ghost.icon`, `outline.icon` | icon | appearance: ghost, outline · state: focus-visible, rest · surface: default (24 of 216) |
|  |  | spinner | appearance: ghost, outline · state: pending · surface: default (12 of 216) |

### `color.interactive.destructive.on-fill`

Type: color. Bound by 2 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button-destructive | `filled.icon`, `filled.label` | label | appearance: filled · inset: default · state: focus-visible, hover, pending, pressed, rest · surface: default (60 of 576) |
|  |  | leadingVisual | appearance: filled · inset: default · leading: true · state: focus-visible, hover, pressed, rest · surface: default (24 of 576) |
|  |  | spinner | appearance: filled · inset: default · state: pending · surface: default (12 of 576) |
|  |  | trailingVisual | appearance: filled · inset: default · state: focus-visible, hover, pending, pressed, rest · surface: default · trailing: true (27 of 576) |
| icon-button-destructive | `filled.icon` | icon | appearance: filled · state: focus-visible, hover, pressed, rest · surface: default (24 of 216) |
|  |  | spinner | appearance: filled · state: pending · surface: default (6 of 216) |

### `color.interactive.destructive.overlay.hover`

Type: color. Bound by 3 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button-destructive | `outline.overlay.hover` | container | appearance: outline · inset: default · state: hover · surface: default (12 of 576) |
| flush-icon-button-destructive | `round.overlay.hover` | container | shape: round · state: hover · surface: default (3 of 60) |
| icon-button-destructive | `ghost.overlay.hover`, `outline.overlay.hover` | container | appearance: ghost, outline · state: hover · surface: default (12 of 216) |

### `color.interactive.destructive.overlay.pressed`

Type: color. Bound by 3 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button-destructive | `outline.overlay.pressed` | container | appearance: outline · inset: default · state: pressed · surface: default (12 of 576) |
| flush-icon-button-destructive | `round.overlay.pressed` | container | shape: round · state: pressed · surface: default (3 of 60) |
| icon-button-destructive | `ghost.overlay.pressed`, `outline.overlay.pressed` | container | appearance: ghost, outline · state: pressed · surface: default (12 of 216) |

### `color.interactive.destructive.text.hover`

Type: color. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button-destructive | `outline.label.hover`, `text.label.hover` | label | appearance: outline, text · state: hover · surface: default (36 of 576) |

### `color.interactive.destructive.text.pressed`

Type: color. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button-destructive | `outline.label.pressed`, `text.label.pressed` | label | appearance: outline, text · state: pressed · surface: default (36 of 576) |

### `color.interactive.destructive.text.rest`

Type: color. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button-destructive | `outline.label`, `text.label` | label | appearance: outline, text · state: focus-visible, pending, rest · surface: default (108 of 576) |

### `color.interactive.neutral.border.hover`

Type: color. Bound by 5 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| _slider-thumb | `indicator.hover` | disc | state: hover (3 of 15) |
| button-neutral | `outline.border.hover` | container | appearance: outline · inset: default · state: hover · surface: default (12 of 576) |
| icon-button-neutral | `outline.border.hover` | container | appearance: outline · state: hover · surface: default (6 of 216) |
| switch-control | `off.border.hover` | track | selection: off · state: hover · status: default (2 of 40) |
| tag | `unselected.border.hover` | container | selection: unselected · state: hover (6 of 45) |

### `color.interactive.neutral.border.pressed`

Type: color. Bound by 5 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| _slider-thumb | `indicator.pressed` | disc | state: pressed (3 of 15) |
| button-neutral | `outline.border.pressed` | container | appearance: outline · inset: default · state: pressed · surface: default (12 of 576) |
| icon-button-neutral | `outline.border.pressed` | container | appearance: outline · state: pressed · surface: default (6 of 216) |
| switch-control | `off.border.pressed` | track | selection: off · state: pressed · status: default (2 of 40) |
| tag | `unselected.border.pressed` | container | selection: unselected · state: pressed (6 of 45) |

### `color.interactive.neutral.border.rest`

Type: color. Bound by 6 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| _slider-thumb | `indicator` | disc | state: focus-visible, rest (6 of 15) |
| button-neutral | `outline.border` | container | appearance: outline · inset: default · state: focus-visible, pending, rest · surface: default (36 of 576) |
| icon-button-neutral | `outline.border` | container | appearance: outline · state: focus-visible, pending, rest · surface: default (18 of 216) |
| slider | `indicator` | bar | state: focus-visible, hover, pressed, rest (24 of 30) |
| switch-control | `off.border`, `off.indicator` | thumb | selection: off · state: focus-visible, hover, pressed, rest (16 of 40) |
|  |  | track | selection: off · state: focus-visible, rest · status: default (4 of 40) |
| tag | `unselected.border` | container | selection: unselected · state: focus-visible, rest (12 of 45) |

### `color.interactive.neutral.fill.hover`

Type: color. Bound by 2 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button-neutral | `filled.fill.hover` | container | appearance: filled · inset: default · state: hover · surface: default (12 of 576) |
| icon-button-neutral | `filled.fill.hover` | container | appearance: filled · state: hover · surface: default (6 of 216) |

### `color.interactive.neutral.fill.pressed`

Type: color. Bound by 2 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button-neutral | `filled.fill.pressed` | container | appearance: filled · inset: default · state: pressed · surface: default (12 of 576) |
| icon-button-neutral | `filled.fill.pressed` | container | appearance: filled · state: pressed · surface: default (6 of 216) |

### `color.interactive.neutral.fill.rest`

Type: color. Bound by 2 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button-neutral | `filled.fill` | container | appearance: filled · inset: default · state: focus-visible, pending, rest · surface: default (36 of 576) |
| icon-button-neutral | `filled.fill` | container | appearance: filled · state: focus-visible, pending, rest · surface: default (18 of 216) |

### `color.interactive.neutral.icon.hover`

Type: color. Bound by 7 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button-neutral | `outline.icon.hover`, `text.icon.hover` | leadingVisual | appearance: outline, text · leading: true · state: hover · surface: default (18 of 576) |
|  |  | trailingVisual | appearance: outline, text · state: hover · surface: default · trailing: true (18 of 576) |
| flush-icon-button-neutral | `flush.icon.hover`, `round.icon.hover` | icon | state: hover · surface: default (6 of 60) |
| icon-button-neutral | `ghost.icon.hover`, `outline.icon.hover` | icon | appearance: ghost, outline · state: hover · surface: default (12 of 216) |
| pagination-item | `unselected.next.icon.hover`, `unselected.previous.icon.hover` | nextGlyph | selection: unselected · state: hover · style: border · type: next (6 of 87) |
|  |  | previousGlyph | selection: unselected · state: hover · style: border · type: previous (6 of 87) |
| segmented-control-segment | `unselected.icon.hover` | leadingVisual | selection: unselected · state: hover (3 of 30) |
| tab-item | `unselected.icon.hover` | leadingVisual | selection: unselected · state: hover (3 of 30) |
| tag | `selected.icon.hover`, `unselected.icon.hover` | checkGlyph | selection: selected · state: hover · type: select (3 of 45) |
|  |  | dismissGlyph | selection: unselected · state: hover · type: dismissible (3 of 45) |
|  |  | leadingVisual | state: hover (9 of 45) |

### `color.interactive.neutral.icon.pressed`

Type: color. Bound by 7 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button-neutral | `outline.icon.pressed`, `text.icon.pressed` | leadingVisual | appearance: outline, text · leading: true · state: pressed · surface: default (18 of 576) |
|  |  | trailingVisual | appearance: outline, text · state: pressed · surface: default · trailing: true (18 of 576) |
| flush-icon-button-neutral | `flush.icon.pressed`, `round.icon.pressed` | icon | state: pressed · surface: default (6 of 60) |
| icon-button-neutral | `ghost.icon.pressed`, `outline.icon.pressed` | icon | appearance: ghost, outline · state: pressed · surface: default (12 of 216) |
| pagination-item | `unselected.next.icon.pressed`, `unselected.previous.icon.pressed` | nextGlyph | selection: unselected · state: pressed · style: border · type: next (6 of 87) |
|  |  | previousGlyph | selection: unselected · state: pressed · style: border · type: previous (6 of 87) |
| segmented-control-segment | `unselected.icon.pressed` | leadingVisual | selection: unselected · state: pressed (3 of 30) |
| tab-item | `unselected.icon.pressed` | leadingVisual | selection: unselected · state: pressed (3 of 30) |
| tag | `selected.icon.pressed`, `unselected.icon.pressed` | checkGlyph | selection: selected · state: pressed · type: select (3 of 45) |
|  |  | dismissGlyph | selection: unselected · state: pressed · type: dismissible (3 of 45) |
|  |  | leadingVisual | state: pressed (9 of 45) |

### `color.interactive.neutral.icon.rest`

Type: color. Bound by 8 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| _accordion-indicator | `icon` | chevronDownGlyph | expansion: collapsed · indicator: chevron (3 of 12) |
|  |  | chevronUpGlyph | expansion: expanded · indicator: chevron (3 of 12) |
|  |  | minusGlyph | expansion: expanded · indicator: plus-minus (3 of 12) |
|  |  | plusGlyph | expansion: collapsed · indicator: plus-minus (3 of 12) |
| button-neutral | `outline.icon`, `text.icon` | leadingVisual | appearance: outline, text · leading: true · state: focus-visible, rest · surface: default (36 of 576) |
|  |  | spinner | appearance: outline, text · state: pending · surface: default (36 of 576) |
|  |  | trailingVisual | appearance: outline, text · state: focus-visible, pending, rest · surface: default · trailing: true (45 of 576) |
| flush-icon-button-neutral | `flush.icon`, `round.icon` | icon | state: focus-visible, rest · surface: default (12 of 60) |
| icon-button-neutral | `ghost.icon`, `outline.icon` | icon | appearance: ghost, outline · state: focus-visible, rest · surface: default (24 of 216) |
|  |  | spinner | appearance: ghost, outline · state: pending · surface: default (12 of 216) |
| pagination-item | `unselected.next.icon`, `unselected.previous.icon` | nextGlyph | selection: unselected · state: focus-visible, rest · style: border · type: next (12 of 87) |
|  |  | previousGlyph | selection: unselected · state: focus-visible, rest · style: border · type: previous (12 of 87) |
| segmented-control-segment | `selected.icon`, `unselected.icon` | leadingVisual | state: focus-visible, hover, pressed, rest (18 of 30) |
| tab-item | `unselected.icon` | leadingVisual | selection: unselected · state: focus-visible, rest (6 of 30) |
| tag | `selected.icon`, `unselected.icon` | checkGlyph | selection: selected · state: focus-visible, rest · type: select (6 of 45) |
|  |  | dismissGlyph | selection: unselected · state: focus-visible, rest · type: dismissible (6 of 45) |
|  |  | leadingVisual | state: focus-visible, rest (18 of 45) |

### `color.interactive.neutral.on-fill`

Type: color. Bound by 2 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button-neutral | `filled.icon`, `filled.label` | label | appearance: filled · inset: default · state: focus-visible, hover, pending, pressed, rest · surface: default (60 of 576) |
|  |  | leadingVisual | appearance: filled · inset: default · leading: true · state: focus-visible, hover, pressed, rest · surface: default (24 of 576) |
|  |  | spinner | appearance: filled · inset: default · state: pending · surface: default (12 of 576) |
|  |  | trailingVisual | appearance: filled · inset: default · state: focus-visible, hover, pending, pressed, rest · surface: default · trailing: true (27 of 576) |
| icon-button-neutral | `filled.icon` | icon | appearance: filled · state: focus-visible, hover, pressed, rest · surface: default (24 of 216) |
|  |  | spinner | appearance: filled · state: pending · surface: default (6 of 216) |

### `color.interactive.neutral.overlay.hover`

Type: color. Bound by 6 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button-neutral | `outline.overlay.hover` | container | appearance: outline · inset: default · state: hover · surface: default (12 of 576) |
| flush-icon-button-neutral | `round.overlay.hover` | container | shape: round · state: hover · surface: default (3 of 60) |
| icon-button-neutral | `ghost.overlay.hover`, `outline.overlay.hover` | container | appearance: ghost, outline · state: hover · surface: default (12 of 216) |
| pagination-item | `unselected.border.false.next.overlay.hover`, `unselected.border.false.previous.overlay.hover`, `unselected.page.overlay.hover` | container | labeled: false · selection: unselected · state: hover · style: border · type: next, page, previous (9 of 87) |
| segmented-control-segment | `unselected.overlay.hover` | indicator | selection: unselected · state: hover (3 of 30) |
| tag | `unselected.overlay.hover` | container | selection: unselected · state: hover (6 of 45) |

### `color.interactive.neutral.overlay.pressed`

Type: color. Bound by 6 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button-neutral | `outline.overlay.pressed` | container | appearance: outline · inset: default · state: pressed · surface: default (12 of 576) |
| flush-icon-button-neutral | `round.overlay.pressed` | container | shape: round · state: pressed · surface: default (3 of 60) |
| icon-button-neutral | `ghost.overlay.pressed`, `outline.overlay.pressed` | container | appearance: ghost, outline · state: pressed · surface: default (12 of 216) |
| pagination-item | `unselected.border.false.next.overlay.pressed`, `unselected.border.false.previous.overlay.pressed`, `unselected.page.overlay.pressed` | container | labeled: false · selection: unselected · state: pressed · style: border · type: next, page, previous (9 of 87) |
| segmented-control-segment | `unselected.overlay.pressed` | indicator | selection: unselected · state: pressed (3 of 30) |
| tag | `unselected.overlay.pressed` | container | selection: unselected · state: pressed (6 of 45) |

### `color.interactive.neutral.text.hover`

Type: color. Bound by 5 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button-neutral | `outline.label.hover`, `text.label.hover` | label | appearance: outline, text · state: hover · surface: default (36 of 576) |
| pagination-item | `unselected.next.label.hover`, `unselected.page.label.hover`, `unselected.previous.label.hover` | label | labeled: false · selection: unselected · state: hover · style: border · type: page (3 of 87) |
|  |  | labelReserve | labeled: false · selection: unselected · state: hover · style: border · type: page (3 of 87) |
|  |  | nextText | labeled: true · selection: unselected · state: hover · style: border · type: next (3 of 87) |
|  |  | previousText | labeled: true · selection: unselected · state: hover · style: border · type: previous (3 of 87) |
| segmented-control-segment | `unselected.label.hover` | label | selection: unselected · state: hover (3 of 30) |
|  |  | labelReserve | selection: unselected · state: hover (3 of 30) |
| tab-item | `unselected.label.hover` | label | selection: unselected · state: hover (3 of 30) |
|  |  | labelReserve | selection: unselected · state: hover (3 of 30) |
| tag | `selected.label.hover`, `unselected.label.hover` | label | state: hover (9 of 45) |

### `color.interactive.neutral.text.pressed`

Type: color. Bound by 5 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button-neutral | `outline.label.pressed`, `text.label.pressed` | label | appearance: outline, text · state: pressed · surface: default (36 of 576) |
| pagination-item | `unselected.next.label.pressed`, `unselected.page.label.pressed`, `unselected.previous.label.pressed` | label | labeled: false · selection: unselected · state: pressed · style: border · type: page (3 of 87) |
|  |  | labelReserve | labeled: false · selection: unselected · state: pressed · style: border · type: page (3 of 87) |
|  |  | nextText | labeled: true · selection: unselected · state: pressed · style: border · type: next (3 of 87) |
|  |  | previousText | labeled: true · selection: unselected · state: pressed · style: border · type: previous (3 of 87) |
| segmented-control-segment | `unselected.label.pressed` | label | selection: unselected · state: pressed (3 of 30) |
|  |  | labelReserve | selection: unselected · state: pressed (3 of 30) |
| tab-item | `unselected.label.pressed` | label | selection: unselected · state: pressed (3 of 30) |
|  |  | labelReserve | selection: unselected · state: pressed (3 of 30) |
| tag | `selected.label.pressed`, `unselected.label.pressed` | label | state: pressed (9 of 45) |

### `color.interactive.neutral.text.rest`

Type: color. Bound by 6 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| accordion | `label` | label | every member (48 of 48) |
| button-neutral | `outline.label`, `text.label` | label | appearance: outline, text · state: focus-visible, pending, rest · surface: default (108 of 576) |
| pagination-item | `selected.page.label`, `unselected.next.label`, `unselected.page.label`, `unselected.previous.label` | label | labeled: false · state: focus-visible, rest · type: page (18 of 87) |
|  |  | labelReserve | labeled: false · state: focus-visible, rest · type: page (18 of 87) |
|  |  | nextText | labeled: true · selection: unselected · state: focus-visible, rest · style: border · type: next (6 of 87) |
|  |  | previousText | labeled: true · selection: unselected · state: focus-visible, rest · style: border · type: previous (6 of 87) |
|  |  | underlineLabel | labeled: false · selection: selected · state: focus-visible, rest · style: underline · type: page (6 of 87) |
| segmented-control-segment | `selected.label`, `unselected.label` | label | state: focus-visible, hover, pressed, rest (18 of 30) |
|  |  | labelReserve | state: focus-visible, hover, pressed, rest (18 of 30) |
| tab-item | `unselected.label` | label | selection: unselected · state: focus-visible, rest (6 of 30) |
|  |  | labelReserve | selection: unselected · state: focus-visible, rest (6 of 30) |
| tag | `selected.label`, `unselected.label` | label | state: focus-visible, rest (18 of 45) |

### `color.interactive.primary.border.hover`

Type: color. Bound by 5 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button | `outline.border.hover` | container | appearance: outline · inset: default · state: hover · surface: default (12 of 576) |
| icon-button | `outline.border.hover` | container | appearance: outline · state: hover · surface: default (6 of 216) |
| radio-control | `checked.border.hover` | control | selection: checked · state: hover · status: default (3 of 60) |
| tab-item | `selected.fill.hover` | indicator | selection: selected · state: hover (3 of 30) |
| tag | `selected.border.hover` | container | selection: selected · state: hover · type: select (3 of 45) |

### `color.interactive.primary.border.pressed`

Type: color. Bound by 5 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button | `outline.border.pressed` | container | appearance: outline · inset: default · state: pressed · surface: default (12 of 576) |
| icon-button | `outline.border.pressed` | container | appearance: outline · state: pressed · surface: default (6 of 216) |
| radio-control | `checked.border.pressed` | control | selection: checked · state: pressed · status: default (3 of 60) |
| tab-item | `selected.fill.pressed` | indicator | selection: selected · state: pressed (3 of 30) |
| tag | `selected.border.pressed` | container | selection: selected · state: pressed · type: select (3 of 45) |

### `color.interactive.primary.border.rest`

Type: color. Bound by 5 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button | `outline.border` | container | appearance: outline · inset: default · state: focus-visible, pending, rest · surface: default (36 of 576) |
| icon-button | `outline.border` | container | appearance: outline · state: focus-visible, pending, rest · surface: default (18 of 216) |
| radio-control | `checked.border` | control | selection: checked · state: focus-visible, rest · status: default (6 of 60) |
| tab-item | `selected.fill` | indicator | selection: selected · state: focus-visible, rest (6 of 30) |
| tag | `selected.border` | container | selection: selected · state: focus-visible, rest · type: select (6 of 45) |

### `color.interactive.primary.fill.hover`

Type: color. Bound by 4 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button | `filled.fill.hover` | container | appearance: filled · inset: default · state: hover · surface: default (12 of 576) |
| checkbox-control | `checked.fill.hover`, `indeterminate.fill.hover` | control | selection: checked, indeterminate · state: hover (12 of 90) |
| icon-button | `filled.fill.hover` | container | appearance: filled · state: hover · surface: default (6 of 216) |
| switch-control | `on.fill.hover` | track | selection: on · state: hover (4 of 40) |

### `color.interactive.primary.fill.pressed`

Type: color. Bound by 4 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button | `filled.fill.pressed` | container | appearance: filled · inset: default · state: pressed · surface: default (12 of 576) |
| checkbox-control | `checked.fill.pressed`, `indeterminate.fill.pressed` | control | selection: checked, indeterminate · state: pressed (12 of 90) |
| icon-button | `filled.fill.pressed` | container | appearance: filled · state: pressed · surface: default (6 of 216) |
| switch-control | `on.fill.pressed` | track | selection: on · state: pressed (4 of 40) |

### `color.interactive.primary.fill.rest`

Type: color. Bound by 2 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button | `filled.fill` | container | appearance: filled · inset: default · state: focus-visible, pending, rest · surface: default (36 of 576) |
| icon-button | `filled.fill` | container | appearance: filled · state: focus-visible, pending, rest · surface: default (18 of 216) |

### `color.interactive.primary.fill.selected`

Type: color. Bound by 3 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| checkbox-control | `checked.fill`, `indeterminate.fill` | control | selection: checked, indeterminate · state: focus-visible, rest (24 of 90) |
| radio-control | `checked.indicator` | dot | selection: checked · state: focus-visible, hover, pressed, rest (24 of 60) |
| switch-control | `on.fill`, `on.icon` | onGlyph | selection: on · state: focus-visible, hover, pressed, rest (16 of 40) |
|  |  | track | selection: on · state: focus-visible, rest (8 of 40) |

### `color.interactive.primary.icon.hover`

Type: color. Bound by 4 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button | `outline.icon.hover`, `text.icon.hover` | leadingVisual | appearance: outline, text · leading: true · state: hover · surface: default (18 of 576) |
|  |  | trailingVisual | appearance: outline, text · state: hover · surface: default · trailing: true (18 of 576) |
| flush-icon-button | `flush.icon.hover`, `round.icon.hover` | icon | state: hover · surface: default (6 of 60) |
| icon-button | `ghost.icon.hover`, `outline.icon.hover` | icon | appearance: ghost, outline · state: hover · surface: default (12 of 216) |
| tab-item | `selected.icon.hover` | leadingVisual | selection: selected · state: hover (3 of 30) |

### `color.interactive.primary.icon.pressed`

Type: color. Bound by 4 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button | `outline.icon.pressed`, `text.icon.pressed` | leadingVisual | appearance: outline, text · leading: true · state: pressed · surface: default (18 of 576) |
|  |  | trailingVisual | appearance: outline, text · state: pressed · surface: default · trailing: true (18 of 576) |
| flush-icon-button | `flush.icon.pressed`, `round.icon.pressed` | icon | state: pressed · surface: default (6 of 60) |
| icon-button | `ghost.icon.pressed`, `outline.icon.pressed` | icon | appearance: ghost, outline · state: pressed · surface: default (12 of 216) |
| tab-item | `selected.icon.pressed` | leadingVisual | selection: selected · state: pressed (3 of 30) |

### `color.interactive.primary.icon.rest`

Type: color. Bound by 4 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button | `outline.icon`, `text.icon` | leadingVisual | appearance: outline, text · leading: true · state: focus-visible, rest · surface: default (36 of 576) |
|  |  | spinner | appearance: outline, text · state: pending · surface: default (36 of 576) |
|  |  | trailingVisual | appearance: outline, text · state: focus-visible, pending, rest · surface: default · trailing: true (45 of 576) |
| flush-icon-button | `flush.icon`, `round.icon` | icon | state: focus-visible, rest · surface: default (12 of 60) |
| icon-button | `ghost.icon`, `outline.icon` | icon | appearance: ghost, outline · state: focus-visible, rest · surface: default (24 of 216) |
|  |  | spinner | appearance: ghost, outline · state: pending · surface: default (12 of 216) |
| tab-item | `selected.icon` | leadingVisual | selection: selected · state: focus-visible, rest (6 of 30) |

### `color.interactive.primary.on-fill`

Type: color. Bound by 4 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button | `filled.icon`, `filled.label` | label | appearance: filled · inset: default · state: focus-visible, hover, pending, pressed, rest · surface: default (60 of 576) |
|  |  | leadingVisual | appearance: filled · inset: default · leading: true · state: focus-visible, hover, pressed, rest · surface: default (24 of 576) |
|  |  | spinner | appearance: filled · inset: default · state: pending · surface: default (12 of 576) |
|  |  | trailingVisual | appearance: filled · inset: default · state: focus-visible, hover, pending, pressed, rest · surface: default · trailing: true (27 of 576) |
| checkbox-control | `checked.icon`, `indeterminate.icon` | glyph | selection: checked, indeterminate · state: focus-visible, hover, pressed, rest (48 of 90) |
| icon-button | `filled.icon` | icon | appearance: filled · state: focus-visible, hover, pressed, rest · surface: default (24 of 216) |
|  |  | spinner | appearance: filled · state: pending · surface: default (6 of 216) |
| switch-control | `on.indicator` | thumb | selection: on · state: focus-visible, hover, pressed, rest (16 of 40) |

### `color.interactive.primary.overlay.hover`

Type: color. Bound by 3 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button | `outline.overlay.hover` | container | appearance: outline · inset: default · state: hover · surface: default (12 of 576) |
| flush-icon-button | `round.overlay.hover` | container | shape: round · state: hover · surface: default (3 of 60) |
| icon-button | `ghost.overlay.hover`, `outline.overlay.hover` | container | appearance: ghost, outline · state: hover · surface: default (12 of 216) |

### `color.interactive.primary.overlay.pressed`

Type: color. Bound by 3 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button | `outline.overlay.pressed` | container | appearance: outline · inset: default · state: pressed · surface: default (12 of 576) |
| flush-icon-button | `round.overlay.pressed` | container | shape: round · state: pressed · surface: default (3 of 60) |
| icon-button | `ghost.overlay.pressed`, `outline.overlay.pressed` | container | appearance: ghost, outline · state: pressed · surface: default (12 of 216) |

### `color.interactive.primary.subtle-fill.selected`

Type: color. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| tag | `selected.overlay` | container | selection: selected · state: focus-visible, hover, pressed, rest · type: select (12 of 45) |

### `color.interactive.primary.text.hover`

Type: color. Bound by 2 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button | `outline.label.hover`, `text.label.hover` | label | appearance: outline, text · state: hover · surface: default (36 of 576) |
| tab-item | `selected.label.hover` | label | selection: selected · state: hover (3 of 30) |
|  |  | labelReserve | selection: selected · state: hover (3 of 30) |

### `color.interactive.primary.text.pressed`

Type: color. Bound by 2 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button | `outline.label.pressed`, `text.label.pressed` | label | appearance: outline, text · state: pressed · surface: default (36 of 576) |
| tab-item | `selected.label.pressed` | label | selection: selected · state: pressed (3 of 30) |
|  |  | labelReserve | selection: selected · state: pressed (3 of 30) |

### `color.interactive.primary.text.rest`

Type: color. Bound by 2 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button | `outline.label`, `text.label` | label | appearance: outline, text · state: focus-visible, pending, rest · surface: default (108 of 576) |
| tab-item | `selected.label` | label | selection: selected · state: focus-visible, rest (6 of 30) |
|  |  | labelReserve | selection: selected · state: focus-visible, rest (6 of 30) |

### `color.inverse.background.primary`

Type: color. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| toast | `fill` | container | every member (2 of 2) |

### `color.inverse.border.focus`

Type: color. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| focus-ring | (projection only) | ring | surface: inverse (1 of 2) |

### `color.inverse.border.secondary`

Type: color. Bound by 3 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| flush-icon-button | (projection only) | container | shape: round · state: focus-visible, hover, pressed, rest · surface: inverse (12 of 60) |
| flush-icon-button-destructive | (projection only) | container | shape: round · state: focus-visible, hover, pressed, rest · surface: inverse (12 of 60) |
| flush-icon-button-neutral | (projection only) | container | shape: round · state: focus-visible, hover, pressed, rest · surface: inverse (12 of 60) |

### `color.inverse.disabled.border`

Type: color. Bound by 9 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button | (projection only) | container | appearance: outline · inset: default · state: disabled · surface: inverse (12 of 576) |
| button-destructive | (projection only) | container | appearance: outline · inset: default · state: disabled · surface: inverse (12 of 576) |
| button-neutral | (projection only) | container | appearance: outline · inset: default · state: disabled · surface: inverse (12 of 576) |
| flush-icon-button | (projection only) | container | shape: round · state: disabled · surface: inverse (3 of 60) |
| flush-icon-button-destructive | (projection only) | container | shape: round · state: disabled · surface: inverse (3 of 60) |
| flush-icon-button-neutral | (projection only) | container | shape: round · state: disabled · surface: inverse (3 of 60) |
| icon-button | (projection only) | container | appearance: outline · state: disabled · surface: inverse (6 of 216) |
| icon-button-destructive | (projection only) | container | appearance: outline · state: disabled · surface: inverse (6 of 216) |
| icon-button-neutral | (projection only) | container | appearance: outline · state: disabled · surface: inverse (6 of 216) |

### `color.inverse.disabled.fill`

Type: color. Bound by 6 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button | (projection only) | container | appearance: filled · inset: default · state: disabled · surface: inverse (12 of 576) |
| button-destructive | (projection only) | container | appearance: filled · inset: default · state: disabled · surface: inverse (12 of 576) |
| button-neutral | (projection only) | container | appearance: filled · inset: default · state: disabled · surface: inverse (12 of 576) |
| icon-button | (projection only) | container | appearance: filled · state: disabled · surface: inverse (6 of 216) |
| icon-button-destructive | (projection only) | container | appearance: filled · state: disabled · surface: inverse (6 of 216) |
| icon-button-neutral | (projection only) | container | appearance: filled · state: disabled · surface: inverse (6 of 216) |

### `color.inverse.disabled.icon`

Type: color. Bound by 9 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button | (projection only) | leadingVisual | appearance: outline, text · leading: true · state: disabled · surface: inverse (18 of 576) |
|  |  | trailingVisual | appearance: outline, text · state: disabled · surface: inverse · trailing: true (18 of 576) |
| button-destructive | (projection only) | leadingVisual | appearance: outline, text · leading: true · state: disabled · surface: inverse (18 of 576) |
|  |  | trailingVisual | appearance: outline, text · state: disabled · surface: inverse · trailing: true (18 of 576) |
| button-neutral | (projection only) | leadingVisual | appearance: outline, text · leading: true · state: disabled · surface: inverse (18 of 576) |
|  |  | trailingVisual | appearance: outline, text · state: disabled · surface: inverse · trailing: true (18 of 576) |
| flush-icon-button | (projection only) | icon | state: disabled · surface: inverse (6 of 60) |
| flush-icon-button-destructive | (projection only) | icon | state: disabled · surface: inverse (6 of 60) |
| flush-icon-button-neutral | (projection only) | icon | state: disabled · surface: inverse (6 of 60) |
| icon-button | (projection only) | icon | state: disabled · surface: inverse (18 of 216) |
| icon-button-destructive | (projection only) | icon | state: disabled · surface: inverse (18 of 216) |
| icon-button-neutral | (projection only) | icon | state: disabled · surface: inverse (18 of 216) |

### `color.inverse.disabled.on-fill`

Type: color. Bound by 3 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button | (projection only) | label | appearance: filled · inset: default · state: disabled · surface: inverse (12 of 576) |
|  |  | leadingVisual | appearance: filled · inset: default · leading: true · state: disabled · surface: inverse (6 of 576) |
|  |  | trailingVisual | appearance: filled · inset: default · state: disabled · surface: inverse · trailing: true (6 of 576) |
| button-destructive | (projection only) | label | appearance: filled · inset: default · state: disabled · surface: inverse (12 of 576) |
|  |  | leadingVisual | appearance: filled · inset: default · leading: true · state: disabled · surface: inverse (6 of 576) |
|  |  | trailingVisual | appearance: filled · inset: default · state: disabled · surface: inverse · trailing: true (6 of 576) |
| button-neutral | (projection only) | label | appearance: filled · inset: default · state: disabled · surface: inverse (12 of 576) |
|  |  | leadingVisual | appearance: filled · inset: default · leading: true · state: disabled · surface: inverse (6 of 576) |
|  |  | trailingVisual | appearance: filled · inset: default · state: disabled · surface: inverse · trailing: true (6 of 576) |

### `color.inverse.disabled.text`

Type: color. Bound by 3 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button | (projection only) | label | appearance: outline, text · state: disabled · surface: inverse (36 of 576) |
| button-destructive | (projection only) | label | appearance: outline, text · state: disabled · surface: inverse (36 of 576) |
| button-neutral | (projection only) | label | appearance: outline, text · state: disabled · surface: inverse (36 of 576) |

### `color.inverse.foreground.tertiary`

Type: color. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| badge | `neutral.count.bold.fill`, `neutral.dot.bold.fill`, `neutral.status.bold.fill` | surface | emphasis: bold · tone: neutral (4 of 40) |

### `color.inverse.icon.link.default`

Type: color. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| link | (projection only) | bar | selection: selected · state: rest · style: standalone · surface: inverse (6 of 144) |
|  |  | trailingVisual | state: rest · style: standalone · surface: inverse (12 of 144) |

### `color.inverse.icon.link.focused`

Type: color. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| link | (projection only) | bar | selection: selected · state: focus-visible · style: standalone · surface: inverse (6 of 144) |
|  |  | trailingVisual | state: focus-visible · style: standalone · surface: inverse (12 of 144) |

### `color.inverse.icon.link.hover`

Type: color. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| link | (projection only) | bar | selection: selected · state: hover · style: standalone · surface: inverse (6 of 144) |
|  |  | trailingVisual | state: hover · style: standalone · surface: inverse (12 of 144) |

### `color.inverse.icon.link.pressed`

Type: color. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| link | (projection only) | bar | selection: selected · state: pressed · style: standalone · surface: inverse (6 of 144) |
|  |  | trailingVisual | state: pressed · style: standalone · surface: inverse (12 of 144) |

### `color.inverse.icon.success`

Type: color. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| toast | `success.icon` | checkCircleGlyph | intent: success (1 of 2) |

### `color.inverse.interactive.destructive.border.hover`

Type: color. Bound by 2 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button-destructive | (projection only) | container | appearance: outline · inset: default · state: hover · surface: inverse (12 of 576) |
| icon-button-destructive | (projection only) | container | appearance: outline · state: hover · surface: inverse (6 of 216) |

### `color.inverse.interactive.destructive.border.pressed`

Type: color. Bound by 2 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button-destructive | (projection only) | container | appearance: outline · inset: default · state: pressed · surface: inverse (12 of 576) |
| icon-button-destructive | (projection only) | container | appearance: outline · state: pressed · surface: inverse (6 of 216) |

### `color.inverse.interactive.destructive.border.rest`

Type: color. Bound by 2 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button-destructive | (projection only) | container | appearance: outline · inset: default · state: focus-visible, pending, rest · surface: inverse (36 of 576) |
| icon-button-destructive | (projection only) | container | appearance: outline · state: focus-visible, pending, rest · surface: inverse (18 of 216) |

### `color.inverse.interactive.destructive.fill.hover`

Type: color. Bound by 2 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button-destructive | (projection only) | container | appearance: filled · inset: default · state: hover · surface: inverse (12 of 576) |
| icon-button-destructive | (projection only) | container | appearance: filled · state: hover · surface: inverse (6 of 216) |

### `color.inverse.interactive.destructive.fill.pressed`

Type: color. Bound by 2 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button-destructive | (projection only) | container | appearance: filled · inset: default · state: pressed · surface: inverse (12 of 576) |
| icon-button-destructive | (projection only) | container | appearance: filled · state: pressed · surface: inverse (6 of 216) |

### `color.inverse.interactive.destructive.fill.rest`

Type: color. Bound by 2 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button-destructive | (projection only) | container | appearance: filled · inset: default · state: focus-visible, pending, rest · surface: inverse (36 of 576) |
| icon-button-destructive | (projection only) | container | appearance: filled · state: focus-visible, pending, rest · surface: inverse (18 of 216) |

### `color.inverse.interactive.destructive.icon.hover`

Type: color. Bound by 3 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button-destructive | (projection only) | leadingVisual | appearance: outline, text · leading: true · state: hover · surface: inverse (18 of 576) |
|  |  | trailingVisual | appearance: outline, text · state: hover · surface: inverse · trailing: true (18 of 576) |
| flush-icon-button-destructive | (projection only) | icon | state: hover · surface: inverse (6 of 60) |
| icon-button-destructive | (projection only) | icon | appearance: ghost, outline · state: hover · surface: inverse (12 of 216) |

### `color.inverse.interactive.destructive.icon.pressed`

Type: color. Bound by 3 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button-destructive | (projection only) | leadingVisual | appearance: outline, text · leading: true · state: pressed · surface: inverse (18 of 576) |
|  |  | trailingVisual | appearance: outline, text · state: pressed · surface: inverse · trailing: true (18 of 576) |
| flush-icon-button-destructive | (projection only) | icon | state: pressed · surface: inverse (6 of 60) |
| icon-button-destructive | (projection only) | icon | appearance: ghost, outline · state: pressed · surface: inverse (12 of 216) |

### `color.inverse.interactive.destructive.icon.rest`

Type: color. Bound by 3 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button-destructive | (projection only) | leadingVisual | appearance: outline, text · leading: true · state: focus-visible, rest · surface: inverse (36 of 576) |
|  |  | spinner | appearance: outline, text · state: pending · surface: inverse (36 of 576) |
|  |  | trailingVisual | appearance: outline, text · state: focus-visible, pending, rest · surface: inverse · trailing: true (45 of 576) |
| flush-icon-button-destructive | (projection only) | icon | state: focus-visible, rest · surface: inverse (12 of 60) |
| icon-button-destructive | (projection only) | icon | appearance: ghost, outline · state: focus-visible, rest · surface: inverse (24 of 216) |
|  |  | spinner | appearance: ghost, outline · state: pending · surface: inverse (12 of 216) |

### `color.inverse.interactive.destructive.on-fill`

Type: color. Bound by 2 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button-destructive | (projection only) | label | appearance: filled · inset: default · state: focus-visible, hover, pending, pressed, rest · surface: inverse (60 of 576) |
|  |  | leadingVisual | appearance: filled · inset: default · leading: true · state: focus-visible, hover, pressed, rest · surface: inverse (24 of 576) |
|  |  | spinner | appearance: filled · inset: default · state: pending · surface: inverse (12 of 576) |
|  |  | trailingVisual | appearance: filled · inset: default · state: focus-visible, hover, pending, pressed, rest · surface: inverse · trailing: true (27 of 576) |
| icon-button-destructive | (projection only) | icon | appearance: filled · state: focus-visible, hover, pressed, rest · surface: inverse (24 of 216) |
|  |  | spinner | appearance: filled · state: pending · surface: inverse (6 of 216) |

### `color.inverse.interactive.destructive.overlay.hover`

Type: color. Bound by 3 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button-destructive | (projection only) | container | appearance: outline · inset: default · state: hover · surface: inverse (12 of 576) |
| flush-icon-button-destructive | (projection only) | container | shape: round · state: hover · surface: inverse (3 of 60) |
| icon-button-destructive | (projection only) | container | appearance: ghost, outline · state: hover · surface: inverse (12 of 216) |

### `color.inverse.interactive.destructive.overlay.pressed`

Type: color. Bound by 3 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button-destructive | (projection only) | container | appearance: outline · inset: default · state: pressed · surface: inverse (12 of 576) |
| flush-icon-button-destructive | (projection only) | container | shape: round · state: pressed · surface: inverse (3 of 60) |
| icon-button-destructive | (projection only) | container | appearance: ghost, outline · state: pressed · surface: inverse (12 of 216) |

### `color.inverse.interactive.destructive.text.hover`

Type: color. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button-destructive | (projection only) | label | appearance: outline, text · state: hover · surface: inverse (36 of 576) |

### `color.inverse.interactive.destructive.text.pressed`

Type: color. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button-destructive | (projection only) | label | appearance: outline, text · state: pressed · surface: inverse (36 of 576) |

### `color.inverse.interactive.destructive.text.rest`

Type: color. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button-destructive | (projection only) | label | appearance: outline, text · state: focus-visible, pending, rest · surface: inverse (108 of 576) |

### `color.inverse.interactive.neutral.border.hover`

Type: color. Bound by 2 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button-neutral | (projection only) | container | appearance: outline · inset: default · state: hover · surface: inverse (12 of 576) |
| icon-button-neutral | (projection only) | container | appearance: outline · state: hover · surface: inverse (6 of 216) |

### `color.inverse.interactive.neutral.border.pressed`

Type: color. Bound by 2 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button-neutral | (projection only) | container | appearance: outline · inset: default · state: pressed · surface: inverse (12 of 576) |
| icon-button-neutral | (projection only) | container | appearance: outline · state: pressed · surface: inverse (6 of 216) |

### `color.inverse.interactive.neutral.border.rest`

Type: color. Bound by 2 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button-neutral | (projection only) | container | appearance: outline · inset: default · state: focus-visible, pending, rest · surface: inverse (36 of 576) |
| icon-button-neutral | (projection only) | container | appearance: outline · state: focus-visible, pending, rest · surface: inverse (18 of 216) |

### `color.inverse.interactive.neutral.fill.hover`

Type: color. Bound by 2 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button-neutral | (projection only) | container | appearance: filled · inset: default · state: hover · surface: inverse (12 of 576) |
| icon-button-neutral | (projection only) | container | appearance: filled · state: hover · surface: inverse (6 of 216) |

### `color.inverse.interactive.neutral.fill.pressed`

Type: color. Bound by 2 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button-neutral | (projection only) | container | appearance: filled · inset: default · state: pressed · surface: inverse (12 of 576) |
| icon-button-neutral | (projection only) | container | appearance: filled · state: pressed · surface: inverse (6 of 216) |

### `color.inverse.interactive.neutral.fill.rest`

Type: color. Bound by 2 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button-neutral | (projection only) | container | appearance: filled · inset: default · state: focus-visible, pending, rest · surface: inverse (36 of 576) |
| icon-button-neutral | (projection only) | container | appearance: filled · state: focus-visible, pending, rest · surface: inverse (18 of 216) |

### `color.inverse.interactive.neutral.icon.hover`

Type: color. Bound by 3 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button-neutral | (projection only) | leadingVisual | appearance: outline, text · leading: true · state: hover · surface: inverse (18 of 576) |
|  |  | trailingVisual | appearance: outline, text · state: hover · surface: inverse · trailing: true (18 of 576) |
| flush-icon-button-neutral | (projection only) | icon | state: hover · surface: inverse (6 of 60) |
| icon-button-neutral | (projection only) | icon | appearance: ghost, outline · state: hover · surface: inverse (12 of 216) |

### `color.inverse.interactive.neutral.icon.pressed`

Type: color. Bound by 3 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button-neutral | (projection only) | leadingVisual | appearance: outline, text · leading: true · state: pressed · surface: inverse (18 of 576) |
|  |  | trailingVisual | appearance: outline, text · state: pressed · surface: inverse · trailing: true (18 of 576) |
| flush-icon-button-neutral | (projection only) | icon | state: pressed · surface: inverse (6 of 60) |
| icon-button-neutral | (projection only) | icon | appearance: ghost, outline · state: pressed · surface: inverse (12 of 216) |

### `color.inverse.interactive.neutral.icon.rest`

Type: color. Bound by 3 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button-neutral | (projection only) | leadingVisual | appearance: outline, text · leading: true · state: focus-visible, rest · surface: inverse (36 of 576) |
|  |  | spinner | appearance: outline, text · state: pending · surface: inverse (36 of 576) |
|  |  | trailingVisual | appearance: outline, text · state: focus-visible, pending, rest · surface: inverse · trailing: true (45 of 576) |
| flush-icon-button-neutral | (projection only) | icon | state: focus-visible, rest · surface: inverse (12 of 60) |
| icon-button-neutral | (projection only) | icon | appearance: ghost, outline · state: focus-visible, rest · surface: inverse (24 of 216) |
|  |  | spinner | appearance: ghost, outline · state: pending · surface: inverse (12 of 216) |

### `color.inverse.interactive.neutral.on-fill`

Type: color. Bound by 2 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button-neutral | (projection only) | label | appearance: filled · inset: default · state: focus-visible, hover, pending, pressed, rest · surface: inverse (60 of 576) |
|  |  | leadingVisual | appearance: filled · inset: default · leading: true · state: focus-visible, hover, pressed, rest · surface: inverse (24 of 576) |
|  |  | spinner | appearance: filled · inset: default · state: pending · surface: inverse (12 of 576) |
|  |  | trailingVisual | appearance: filled · inset: default · state: focus-visible, hover, pending, pressed, rest · surface: inverse · trailing: true (27 of 576) |
| icon-button-neutral | (projection only) | icon | appearance: filled · state: focus-visible, hover, pressed, rest · surface: inverse (24 of 216) |
|  |  | spinner | appearance: filled · state: pending · surface: inverse (6 of 216) |

### `color.inverse.interactive.neutral.overlay.hover`

Type: color. Bound by 3 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button-neutral | (projection only) | container | appearance: outline · inset: default · state: hover · surface: inverse (12 of 576) |
| flush-icon-button-neutral | (projection only) | container | shape: round · state: hover · surface: inverse (3 of 60) |
| icon-button-neutral | (projection only) | container | appearance: ghost, outline · state: hover · surface: inverse (12 of 216) |

### `color.inverse.interactive.neutral.overlay.pressed`

Type: color. Bound by 3 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button-neutral | (projection only) | container | appearance: outline · inset: default · state: pressed · surface: inverse (12 of 576) |
| flush-icon-button-neutral | (projection only) | container | shape: round · state: pressed · surface: inverse (3 of 60) |
| icon-button-neutral | (projection only) | container | appearance: ghost, outline · state: pressed · surface: inverse (12 of 216) |

### `color.inverse.interactive.neutral.text.hover`

Type: color. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button-neutral | (projection only) | label | appearance: outline, text · state: hover · surface: inverse (36 of 576) |

### `color.inverse.interactive.neutral.text.pressed`

Type: color. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button-neutral | (projection only) | label | appearance: outline, text · state: pressed · surface: inverse (36 of 576) |

### `color.inverse.interactive.neutral.text.rest`

Type: color. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button-neutral | (projection only) | label | appearance: outline, text · state: focus-visible, pending, rest · surface: inverse (108 of 576) |

### `color.inverse.interactive.primary.border.hover`

Type: color. Bound by 2 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button | (projection only) | container | appearance: outline · inset: default · state: hover · surface: inverse (12 of 576) |
| icon-button | (projection only) | container | appearance: outline · state: hover · surface: inverse (6 of 216) |

### `color.inverse.interactive.primary.border.pressed`

Type: color. Bound by 2 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button | (projection only) | container | appearance: outline · inset: default · state: pressed · surface: inverse (12 of 576) |
| icon-button | (projection only) | container | appearance: outline · state: pressed · surface: inverse (6 of 216) |

### `color.inverse.interactive.primary.border.rest`

Type: color. Bound by 2 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button | (projection only) | container | appearance: outline · inset: default · state: focus-visible, pending, rest · surface: inverse (36 of 576) |
| icon-button | (projection only) | container | appearance: outline · state: focus-visible, pending, rest · surface: inverse (18 of 216) |

### `color.inverse.interactive.primary.fill.hover`

Type: color. Bound by 2 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button | (projection only) | container | appearance: filled · inset: default · state: hover · surface: inverse (12 of 576) |
| icon-button | (projection only) | container | appearance: filled · state: hover · surface: inverse (6 of 216) |

### `color.inverse.interactive.primary.fill.pressed`

Type: color. Bound by 2 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button | (projection only) | container | appearance: filled · inset: default · state: pressed · surface: inverse (12 of 576) |
| icon-button | (projection only) | container | appearance: filled · state: pressed · surface: inverse (6 of 216) |

### `color.inverse.interactive.primary.fill.rest`

Type: color. Bound by 2 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button | (projection only) | container | appearance: filled · inset: default · state: focus-visible, pending, rest · surface: inverse (36 of 576) |
| icon-button | (projection only) | container | appearance: filled · state: focus-visible, pending, rest · surface: inverse (18 of 216) |

### `color.inverse.interactive.primary.icon.hover`

Type: color. Bound by 3 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button | (projection only) | leadingVisual | appearance: outline, text · leading: true · state: hover · surface: inverse (18 of 576) |
|  |  | trailingVisual | appearance: outline, text · state: hover · surface: inverse · trailing: true (18 of 576) |
| flush-icon-button | (projection only) | icon | state: hover · surface: inverse (6 of 60) |
| icon-button | (projection only) | icon | appearance: ghost, outline · state: hover · surface: inverse (12 of 216) |

### `color.inverse.interactive.primary.icon.pressed`

Type: color. Bound by 3 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button | (projection only) | leadingVisual | appearance: outline, text · leading: true · state: pressed · surface: inverse (18 of 576) |
|  |  | trailingVisual | appearance: outline, text · state: pressed · surface: inverse · trailing: true (18 of 576) |
| flush-icon-button | (projection only) | icon | state: pressed · surface: inverse (6 of 60) |
| icon-button | (projection only) | icon | appearance: ghost, outline · state: pressed · surface: inverse (12 of 216) |

### `color.inverse.interactive.primary.icon.rest`

Type: color. Bound by 3 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button | (projection only) | leadingVisual | appearance: outline, text · leading: true · state: focus-visible, rest · surface: inverse (36 of 576) |
|  |  | spinner | appearance: outline, text · state: pending · surface: inverse (36 of 576) |
|  |  | trailingVisual | appearance: outline, text · state: focus-visible, pending, rest · surface: inverse · trailing: true (45 of 576) |
| flush-icon-button | (projection only) | icon | state: focus-visible, rest · surface: inverse (12 of 60) |
| icon-button | (projection only) | icon | appearance: ghost, outline · state: focus-visible, rest · surface: inverse (24 of 216) |
|  |  | spinner | appearance: ghost, outline · state: pending · surface: inverse (12 of 216) |

### `color.inverse.interactive.primary.on-fill`

Type: color. Bound by 2 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button | (projection only) | label | appearance: filled · inset: default · state: focus-visible, hover, pending, pressed, rest · surface: inverse (60 of 576) |
|  |  | leadingVisual | appearance: filled · inset: default · leading: true · state: focus-visible, hover, pressed, rest · surface: inverse (24 of 576) |
|  |  | spinner | appearance: filled · inset: default · state: pending · surface: inverse (12 of 576) |
|  |  | trailingVisual | appearance: filled · inset: default · state: focus-visible, hover, pending, pressed, rest · surface: inverse · trailing: true (27 of 576) |
| icon-button | (projection only) | icon | appearance: filled · state: focus-visible, hover, pressed, rest · surface: inverse (24 of 216) |
|  |  | spinner | appearance: filled · state: pending · surface: inverse (6 of 216) |

### `color.inverse.interactive.primary.overlay.hover`

Type: color. Bound by 3 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button | (projection only) | container | appearance: outline · inset: default · state: hover · surface: inverse (12 of 576) |
| flush-icon-button | (projection only) | container | shape: round · state: hover · surface: inverse (3 of 60) |
| icon-button | (projection only) | container | appearance: ghost, outline · state: hover · surface: inverse (12 of 216) |

### `color.inverse.interactive.primary.overlay.pressed`

Type: color. Bound by 3 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button | (projection only) | container | appearance: outline · inset: default · state: pressed · surface: inverse (12 of 576) |
| flush-icon-button | (projection only) | container | shape: round · state: pressed · surface: inverse (3 of 60) |
| icon-button | (projection only) | container | appearance: ghost, outline · state: pressed · surface: inverse (12 of 216) |

### `color.inverse.interactive.primary.text.hover`

Type: color. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button | (projection only) | label | appearance: outline, text · state: hover · surface: inverse (36 of 576) |

### `color.inverse.interactive.primary.text.pressed`

Type: color. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button | (projection only) | label | appearance: outline, text · state: pressed · surface: inverse (36 of 576) |

### `color.inverse.interactive.primary.text.rest`

Type: color. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button | (projection only) | label | appearance: outline, text · state: focus-visible, pending, rest · surface: inverse (108 of 576) |

### `color.inverse.text.link.default`

Type: color. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| link | (projection only) | label | state: rest · surface: inverse (18 of 144) |

### `color.inverse.text.link.focused`

Type: color. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| link | (projection only) | label | state: focus-visible · surface: inverse (18 of 144) |

### `color.inverse.text.link.hover`

Type: color. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| link | (projection only) | label | state: hover · surface: inverse (18 of 144) |

### `color.inverse.text.link.pressed`

Type: color. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| link | (projection only) | label | state: pressed · surface: inverse (18 of 144) |

### `color.inverse.text.primary`

Type: color. Bound by 2 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| badge | `neutral.count.bold.label`, `neutral.status.bold.label` | count | emphasis: bold · size: medium · tone: neutral · type: count (1 of 40) |
|  |  | label | emphasis: bold · tone: neutral · type: status (2 of 40) |
| toast | `label` | message | every member (2 of 2) |

### `color.text.danger`

Type: color. Bound by 2 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| badge | `danger.status.subtle.label`, `danger.status.surface.label` | label | emphasis: subtle, surface · tone: danger · type: status (4 of 40) |
| field-message | `error.label` | label | status: error (1 of 4) |

### `color.text.info`

Type: color. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| badge | `info.status.subtle.label`, `info.status.surface.label` | label | emphasis: subtle, surface · tone: info · type: status (4 of 40) |

### `color.text.link.default`

Type: color. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| link | `label` | label | state: rest · surface: default (18 of 144) |

### `color.text.link.focused`

Type: color. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| link | `label.focus-visible` | label | state: focus-visible · surface: default (18 of 144) |

### `color.text.link.hover`

Type: color. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| link | `label.hover` | label | state: hover · surface: default (18 of 144) |

### `color.text.link.pressed`

Type: color. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| link | `label.pressed` | label | state: pressed · surface: default (18 of 144) |

### `color.text.on-danger`

Type: color. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| badge | `danger.count.bold.label`, `danger.status.bold.label` | count | emphasis: bold · size: medium · tone: danger · type: count (1 of 40) |
|  |  | label | emphasis: bold · tone: danger · type: status (2 of 40) |

### `color.text.on-info`

Type: color. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| badge | `info.count.bold.label`, `info.status.bold.label` | count | emphasis: bold · size: medium · tone: info · type: count (1 of 40) |
|  |  | label | emphasis: bold · tone: info · type: status (2 of 40) |

### `color.text.on-success`

Type: color. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| badge | `success.count.bold.label`, `success.status.bold.label` | count | emphasis: bold · size: medium · tone: success · type: count (1 of 40) |
|  |  | label | emphasis: bold · tone: success · type: status (2 of 40) |

### `color.text.on-warning`

Type: color. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| badge | `warning.count.bold.label`, `warning.status.bold.label` | count | emphasis: bold · size: medium · tone: warning · type: count (1 of 40) |
|  |  | label | emphasis: bold · tone: warning · type: status (2 of 40) |

### `color.text.primary`

Type: color. Bound by 21 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| accordion | `body` | placeholder | expansion: expanded (24 of 48) |
| badge | `neutral.status.subtle.label`, `neutral.status.surface.label` | label | emphasis: subtle, surface · tone: neutral · type: status (4 of 40) |
| banner | `body`, `label` | placeholder | every member (8 of 8) |
|  |  | title | every member (8 of 8) |
| breadcrumb-item | `label` | current | kind: current · separator: chevron (2 of 10) |
| card-number-field | `caret`, `caret-end`, `label` | caret | state: focus-visible (12 of 84) |
|  |  | caretEnd | state: focus-visible-filled (12 of 84) |
|  |  | value | state: filled, focus-visible-filled, read-only (36 of 84) |
| checkbox-row | `label` | label | every member (6 of 6) |
| code-input-cell | `caret`, `label` | caret | state: focus-visible (4 of 28) |
|  |  | digit | state: error, filled, focus-visible-filled (12 of 28) |
| counter | `ghost.label`, `outline.label` | value | state: focus-visible, rest (12 of 18) |
| dialog | `body`, `label` | placeholder | every member (24 of 24) |
|  |  | title | every member (24 of 24) |
| field-label | `primary.indicator`, `primary.label` | indicator | emphasis: primary · state: rest (6 of 24) |
|  |  | label | emphasis: primary · state: rest (6 of 24) |
| list-item | `label` | label | every member (9 of 9) |
|  |  | number | type: ordered (3 of 9) |
| pagination | `label` | status | style: border · type: compact (3 of 12) |
| password-field | `caret`, `caret-end`, `label` | caret | state: focus-visible (12 of 84) |
|  |  | caretEnd | state: focus-visible-filled (12 of 84) |
|  |  | value | state: filled, focus-visible-filled, read-only (36 of 84) |
| progress | `label` | label | shape: linear · size: medium (4 of 12) |
| radio-row | `label` | label | every member (6 of 6) |
| search-field | `caret`, `caret-end`, `label` | caret | state: focus-visible (12 of 84) |
|  |  | caretEnd | state: focus-visible-filled (12 of 84) |
|  |  | value | state: filled, focus-visible-filled, read-only (36 of 84) |
| select | `label` | value | state: filled, focus-visible-filled, read-only (36 of 84) |
| slider | `label` | valueRange | state: focus-visible, hover, pressed, rest · type: range (12 of 30) |
|  |  | valueSingle | state: focus-visible, hover, pressed, rest · type: single (12 of 30) |
| switch-row | `label` | label | every member (4 of 4) |
| text-field | `caret`, `caret-end`, `label` | caret | state: focus-visible (12 of 84) |
|  |  | caretEnd | state: focus-visible-filled (12 of 84) |
|  |  | value | state: filled, focus-visible-filled, read-only (36 of 84) |
| textarea | `caret`, `label` | caret | state: focus-visible (12 of 84) |
|  |  | value | state: filled, focus-visible-filled, read-only (36 of 84) |

### `color.text.secondary`

Type: color. Bound by 14 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| card-number-field | `label.empty`, `label.focus-visible`, `label.hover`, `label.rest` | placeholder | state: focus-visible, hover, rest (36 of 84) |
| checkbox-row | `indicator` | description | every member (6 of 6) |
| dialog | `indicator` | description | every member (24 of 24) |
| divider | `label` | label | inset: none · labeled: true (2 of 7) |
| field-label | `secondary.indicator`, `secondary.label` | indicator | emphasis: secondary · state: rest (6 of 24) |
|  |  | label | emphasis: secondary · state: rest (6 of 24) |
| field-message | `default.label` | label | status: default (1 of 4) |
| password-field | `label.empty`, `label.focus-visible`, `label.hover`, `label.rest` | placeholder | state: focus-visible, hover, rest (36 of 84) |
| progress | `body` | ringValue | shape: circular · status: active, error · type: determinate (4 of 12) |
|  |  | ringValueComplete | shape: circular · status: complete · type: determinate (2 of 12) |
|  |  | value | shape: linear · size: medium · status: active, error · type: determinate (2 of 12) |
|  |  | valueComplete | shape: linear · size: medium · status: complete · type: determinate (1 of 12) |
| radio-row | `indicator` | description | every member (6 of 6) |
| search-field | `label.empty`, `label.focus-visible`, `label.hover`, `label.rest` | placeholder | state: focus-visible, hover, rest (36 of 84) |
| select | `label.empty`, `label.focus-visible`, `label.hover`, `label.rest` | placeholder | state: focus-visible, hover, rest (36 of 84) |
| slider | `body` | maxLabel | state: focus-visible, hover, pressed, rest (24 of 30) |
|  |  | milestone | state: focus-visible, hover, pressed, rest (24 of 30) |
|  |  | minLabel | state: focus-visible, hover, pressed, rest (24 of 30) |
| text-field | `label.empty`, `label.focus-visible`, `label.hover`, `label.rest` | placeholder | state: focus-visible, hover, rest (36 of 84) |
| textarea | `indicator`, `label.empty`, `label.focus-visible`, `label.hover`, `label.rest` | counter | state: filled, focus-visible, focus-visible-filled, hover, read-only, rest (72 of 84) |
|  |  | placeholder | state: focus-visible, hover, rest (36 of 84) |

### `color.text.success`

Type: color. Bound by 2 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| badge | `success.status.subtle.label`, `success.status.surface.label` | label | emphasis: subtle, surface · tone: success · type: status (4 of 40) |
| field-message | `success.label` | label | status: success (1 of 4) |

### `color.text.warning`

Type: color. Bound by 2 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| badge | `warning.status.subtle.label`, `warning.status.surface.label` | label | emphasis: subtle, surface · tone: warning · type: status (4 of 40) |
| field-message | `warning.label` | label | status: warning (1 of 4) |

### `color.veil.dark.clear`

Type: color. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| veil | `dark.clear` | wash | direction: from-bottom, from-left, from-right, from-top · value: dark (12 of 30) |

### `color.veil.dark.medium`

Type: color. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| veil | `dark.medium` | wash | intensity: medium · value: dark (5 of 30) |

### `color.veil.dark.strong`

Type: color. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| veil | `dark.strong` | wash | intensity: strong · value: dark (5 of 30) |

### `color.veil.dark.subtle`

Type: color. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| veil | `dark.subtle` | wash | intensity: subtle · value: dark (5 of 30) |

### `color.veil.light.clear`

Type: color. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| veil | `light.clear` | wash | direction: from-bottom, from-left, from-right, from-top · value: light (12 of 30) |

### `color.veil.light.medium`

Type: color. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| veil | `light.medium` | wash | intensity: medium · value: light (5 of 30) |

### `color.veil.light.strong`

Type: color. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| veil | `light.strong` | wash | intensity: strong · value: light (5 of 30) |

### `color.veil.light.subtle`

Type: color. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| veil | `light.subtle` | wash | intensity: subtle · value: light (5 of 30) |

### `container.min`

Type: dimension. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| banner | `min-width` | container | every member (8 of 8) |

### `container.narrow`

Type: dimension. Bound by 3 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| divider | `horizontal.false.width`, `horizontal.true.width` | container | orientation: horizontal (4 of 7) |
| image-placeholder | `nominal-side` | frame | every member (7 of 7) |
| veil | `nominal-side` | wash | every member (30 of 30) |

### `control.size.lg.dot`

Type: dimension. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| radio-control | `size.large.dot` | dot | selection: checked · size: large (10 of 60) |

### `control.size.lg.height`

Type: dimension. Bound by 4 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| checkbox-control | `size.large.control` | checkGlyph | selection: checked · size: large (10 of 90) |
|  |  | control | size: large (30 of 90) |
|  |  | dashGlyph | selection: indeterminate · size: large (10 of 90) |
| checkbox-row | `size.large.control` | control | size: large (2 of 6) |
| radio-control | `size.large.control` | control | size: large (20 of 60) |
| radio-row | `size.large.control` | control | size: large (2 of 6) |

### `control.size.lg.label-inset`

Type: dimension. Bound by 2 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| checkbox-row | `size.large.label-inset` | textStack | size: large (2 of 6) |
| radio-row | `size.large.label-inset` | textStack | size: large (2 of 6) |

### `control.size.lg.line-box`

Type: dimension. Bound by 6 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| card-number-field | `size.large.caret-height` | caret | size: large · state: focus-visible (4 of 84) |
|  |  | caretEnd | size: large · state: focus-visible-filled (4 of 84) |
| list-item | `size.large.line-box` | markerBox | size: large (3 of 9) |
| password-field | `size.large.caret-height` | caret | size: large · state: focus-visible (4 of 84) |
|  |  | caretEnd | size: large · state: focus-visible-filled (4 of 84) |
| search-field | `size.large.caret-height` | caret | size: large · state: focus-visible (4 of 84) |
|  |  | caretEnd | size: large · state: focus-visible-filled (4 of 84) |
| text-field | `size.large.caret-height` | caret | size: large · state: focus-visible (4 of 84) |
|  |  | caretEnd | size: large · state: focus-visible-filled (4 of 84) |
| textarea | `size.large.caret-height` | caret | size: large · state: focus-visible (4 of 84) |

### `control.size.lg.radius`

Type: dimension. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| checkbox-control | `size.large.radius` | control | size: large (30 of 90) |

### `control.size.lg.thumb`

Type: dimension. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| _slider-thumb | `size.large.thumb` | disc | size: large (5 of 15) |
|  |  | frame | size: large (5 of 15) |

### `control.size.md.dot`

Type: dimension. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| radio-control | `size.medium.dot` | dot | selection: checked · size: medium (10 of 60) |

### `control.size.md.height`

Type: dimension. Bound by 4 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| checkbox-control | `size.medium.control` | checkGlyph | selection: checked · size: medium (10 of 90) |
|  |  | control | size: medium (30 of 90) |
|  |  | dashGlyph | selection: indeterminate · size: medium (10 of 90) |
| checkbox-row | `size.medium.control` | control | size: medium (2 of 6) |
| radio-control | `size.medium.control` | control | size: medium (20 of 60) |
| radio-row | `size.medium.control` | control | size: medium (2 of 6) |

### `control.size.md.inset`

Type: dimension. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| switch-control | `size.medium.inset` | track | size: medium (20 of 40) |

### `control.size.md.label-inset`

Type: dimension. Bound by 2 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| checkbox-row | `size.medium.label-inset` | textStack | size: medium (2 of 6) |
| radio-row | `size.medium.label-inset` | textStack | size: medium (2 of 6) |

### `control.size.md.line-box`

Type: dimension. Bound by 6 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| card-number-field | `size.medium.caret-height` | caret | size: medium · state: focus-visible (4 of 84) |
|  |  | caretEnd | size: medium · state: focus-visible-filled (4 of 84) |
| list-item | `size.medium.line-box` | markerBox | size: medium (3 of 9) |
| password-field | `size.medium.caret-height` | caret | size: medium · state: focus-visible (4 of 84) |
|  |  | caretEnd | size: medium · state: focus-visible-filled (4 of 84) |
| search-field | `size.medium.caret-height` | caret | size: medium · state: focus-visible (4 of 84) |
|  |  | caretEnd | size: medium · state: focus-visible-filled (4 of 84) |
| text-field | `size.medium.caret-height` | caret | size: medium · state: focus-visible (4 of 84) |
|  |  | caretEnd | size: medium · state: focus-visible-filled (4 of 84) |
| textarea | `size.medium.caret-height` | caret | size: medium · state: focus-visible (4 of 84) |

### `control.size.md.radius`

Type: dimension. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| checkbox-control | `size.medium.radius` | control | size: medium (30 of 90) |

### `control.size.md.thumb`

Type: dimension. Bound by 2 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| _slider-thumb | `size.medium.thumb` | disc | size: medium (5 of 15) |
|  |  | frame | size: medium (5 of 15) |
| switch-control | `size.medium.dot` | offGlyph | selection: off · size: medium (10 of 40) |
|  |  | onGlyph | selection: on · size: medium (10 of 40) |
|  |  | thumb | size: medium (20 of 40) |

### `control.size.md.track`

Type: dimension. Bound by 2 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| switch-control | `size.medium.control` | track | size: medium (20 of 40) |
| switch-row | `size.medium.control` | control | size: medium (2 of 4) |

### `control.size.md.width`

Type: dimension. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| switch-control | `size.medium.track` | track | size: medium (20 of 40) |

### `control.size.sm.dot`

Type: dimension. Bound by 2 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| badge | `dot-size` | dot | emphasis: bold · size: medium · type: dot (5 of 40) |
| radio-control | `size.small.dot` | dot | selection: checked · size: small (10 of 60) |

### `control.size.sm.height`

Type: dimension. Bound by 4 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| checkbox-control | `size.small.control` | checkGlyph | selection: checked · size: small (10 of 90) |
|  |  | control | size: small (30 of 90) |
|  |  | dashGlyph | selection: indeterminate · size: small (10 of 90) |
| checkbox-row | `size.small.control` | control | size: small (2 of 6) |
| radio-control | `size.small.control` | control | size: small (20 of 60) |
| radio-row | `size.small.control` | control | size: small (2 of 6) |

### `control.size.sm.inset`

Type: dimension. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| switch-control | `size.small.inset` | track | size: small (20 of 40) |

### `control.size.sm.label-inset`

Type: dimension. Bound by 2 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| checkbox-row | `size.small.label-inset` | textStack | size: small (2 of 6) |
| radio-row | `size.small.label-inset` | textStack | size: small (2 of 6) |

### `control.size.sm.line-box`

Type: dimension. Bound by 6 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| card-number-field | `size.small.caret-height` | caret | size: small · state: focus-visible (4 of 84) |
|  |  | caretEnd | size: small · state: focus-visible-filled (4 of 84) |
| list-item | `size.small.line-box` | markerBox | size: small (3 of 9) |
| password-field | `size.small.caret-height` | caret | size: small · state: focus-visible (4 of 84) |
|  |  | caretEnd | size: small · state: focus-visible-filled (4 of 84) |
| search-field | `size.small.caret-height` | caret | size: small · state: focus-visible (4 of 84) |
|  |  | caretEnd | size: small · state: focus-visible-filled (4 of 84) |
| text-field | `size.small.caret-height` | caret | size: small · state: focus-visible (4 of 84) |
|  |  | caretEnd | size: small · state: focus-visible-filled (4 of 84) |
| textarea | `size.small.caret-height` | caret | size: small · state: focus-visible (4 of 84) |

### `control.size.sm.radius`

Type: dimension. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| checkbox-control | `size.small.radius` | control | size: small (30 of 90) |

### `control.size.sm.thumb`

Type: dimension. Bound by 2 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| _slider-thumb | `size.small.thumb` | disc | size: small (5 of 15) |
|  |  | frame | size: small (5 of 15) |
| switch-control | `size.small.dot` | offGlyph | selection: off · size: small (10 of 40) |
|  |  | onGlyph | selection: on · size: small (10 of 40) |
|  |  | thumb | size: small (20 of 40) |

### `control.size.sm.track`

Type: dimension. Bound by 2 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| switch-control | `size.small.control` | track | size: small (20 of 40) |
| switch-row | `size.small.control` | control | size: small (2 of 4) |

### `control.size.sm.width`

Type: dimension. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| switch-control | `size.small.track` | track | size: small (20 of 40) |

### `focus.ring.offset`

Type: dimension. Bound by 22 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| _slider-thumb | `ring-offset` | focusRing | state: focus-visible (3 of 15) |
| button | `ring-offset` | focusRing | state: focus-visible (96 of 576) |
| button-destructive | `ring-offset` | focusRing | state: focus-visible (96 of 576) |
| button-neutral | `ring-offset` | focusRing | state: focus-visible (96 of 576) |
| checkbox-control | `ring-offset` | focusRing | state: focus-visible (18 of 90) |
| counter | `ghost.ring-offset` | focusRing | appearance: ghost · state: focus-visible (3 of 18) |
| flush-icon-button | `ring-offset` | focusRing | state: focus-visible (12 of 60) |
| flush-icon-button-destructive | `ring-offset` | focusRing | state: focus-visible (12 of 60) |
| flush-icon-button-neutral | `ring-offset` | focusRing | state: focus-visible (12 of 60) |
| focus-ring | `offset.control` | (not drawn) | — |
| icon-button | `ring-offset` | focusRing | state: focus-visible (36 of 216) |
| icon-button-destructive | `ring-offset` | focusRing | state: focus-visible (36 of 216) |
| icon-button-neutral | `ring-offset` | focusRing | state: focus-visible (36 of 216) |
| link | `ring-offset` | focusRing | state: focus-visible (36 of 144) |
| pagination-item | `ring-offset` | focusRing | state: focus-visible · type: next, page, previous (21 of 87) |
| radio-control | `ring-offset` | focusRing | state: focus-visible (12 of 60) |
| segmented-control-segment | `ring-offset` | focusRing | state: focus-visible (6 of 30) |
| sign-in-button | `ring-offset` | focusRing | state: focus-visible (24 of 96) |
| switch-control | `ring-offset` | focusRing | state: focus-visible (8 of 40) |
| tab-item | `ring-offset` | focusRing | state: focus-visible (6 of 30) |
| tag | `ring-offset` | focusRing | state: focus-visible (9 of 45) |
| wallet-button | `ring-offset` | focusRing | state: focus-visible (10 of 20) |

### `focus.ring.offset-field`

Type: dimension. Bound by 10 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| accordion | `ring-offset` | focusRing | state: focus-visible (24 of 48) |
| card-number-field | `ring-offset` | focusRing | state: focus-visible, focus-visible-filled (24 of 84) |
| code-input-cell | `ring-offset` | focusRing | state: focus-visible, focus-visible-filled (8 of 28) |
| counter | `outline.ring-offset` | focusRing | appearance: outline · state: focus-visible (3 of 18) |
| focus-ring | `offset.field` | (not drawn) | — |
| password-field | `ring-offset` | focusRing | state: focus-visible, focus-visible-filled (24 of 84) |
| search-field | `ring-offset` | focusRing | state: focus-visible, focus-visible-filled (24 of 84) |
| select | `ring-offset` | focusRing | state: focus-visible, focus-visible-filled (24 of 84) |
| text-field | `ring-offset` | focusRing | state: focus-visible, focus-visible-filled (24 of 84) |
| textarea | `ring-offset` | focusRing | state: focus-visible, focus-visible-filled (24 of 84) |

### `focus.ring.style`

Type: strokeStyle. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| focus-ring | `style` | (not drawn) | — |

### `focus.ring.width`

Type: dimension. Bound by 29 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| _slider-thumb | `ring-width` | focusRing | state: focus-visible (3 of 15) |
| button | `ring-width` | focusRing | state: focus-visible (96 of 576) |
| button-destructive | `ring-width` | focusRing | state: focus-visible (96 of 576) |
| button-neutral | `ring-width` | focusRing | state: focus-visible (96 of 576) |
| card-number-field | `ring-width` | focusRing | state: focus-visible, focus-visible-filled (24 of 84) |
| checkbox-control | `ring-width` | focusRing | state: focus-visible (18 of 90) |
| code-input-cell | `ring-width` | focusRing | state: focus-visible, focus-visible-filled (8 of 28) |
| counter | `ring-width` | focusRing | state: focus-visible (6 of 18) |
| flush-icon-button | `ring-width` | focusRing | state: focus-visible (12 of 60) |
| flush-icon-button-destructive | `ring-width` | focusRing | state: focus-visible (12 of 60) |
| flush-icon-button-neutral | `ring-width` | focusRing | state: focus-visible (12 of 60) |
| focus-ring | `width` | ring | every member (2 of 2) |
| icon-button | `ring-width` | focusRing | state: focus-visible (36 of 216) |
| icon-button-destructive | `ring-width` | focusRing | state: focus-visible (36 of 216) |
| icon-button-neutral | `ring-width` | focusRing | state: focus-visible (36 of 216) |
| link | `ring-width` | focusRing | state: focus-visible (36 of 144) |
| pagination-item | `ring-width` | focusRing | state: focus-visible · type: next, page, previous (21 of 87) |
| password-field | `ring-width` | focusRing | state: focus-visible, focus-visible-filled (24 of 84) |
| radio-control | `ring-width` | focusRing | state: focus-visible (12 of 60) |
| search-field | `ring-width` | focusRing | state: focus-visible, focus-visible-filled (24 of 84) |
| segmented-control-segment | `ring-width` | focusRing | state: focus-visible (6 of 30) |
| select | `ring-width` | focusRing | state: focus-visible, focus-visible-filled (24 of 84) |
| sign-in-button | `ring-width` | focusRing | state: focus-visible (24 of 96) |
| switch-control | `ring-width` | focusRing | state: focus-visible (8 of 40) |
| tab-item | `ring-width` | focusRing | state: focus-visible (6 of 30) |
| tag | `ring-width` | focusRing | state: focus-visible (9 of 45) |
| text-field | `ring-width` | focusRing | state: focus-visible, focus-visible-filled (24 of 84) |
| textarea | `ring-width` | focusRing | state: focus-visible, focus-visible-filled (24 of 84) |
| wallet-button | `ring-width` | focusRing | state: focus-visible (10 of 20) |

### `icon.size.lg`

Type: dimension. Bound by 8 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| icon | `size.large` | (not drawn) | — |
| icon-button | `size.large.icon` | icon | size: large · state: disabled, focus-visible, hover, pressed, rest (60 of 216) |
|  |  | spinner | size: large · state: pending (12 of 216) |
| icon-button-destructive | `size.large.icon` | icon | size: large · state: disabled, focus-visible, hover, pressed, rest (60 of 216) |
|  |  | spinner | size: large · state: pending (12 of 216) |
| icon-button-neutral | `size.large.icon` | icon | size: large · state: disabled, focus-visible, hover, pressed, rest (60 of 216) |
|  |  | spinner | size: large · state: pending (12 of 216) |
| list-item | `size.large.icon` | icon | size: large · type: icon (1 of 9) |
| provider-logo | `size.large` | (not drawn) | — |
| spinner | `size.large` | frame | size: large (1 of 4) |
|  |  | ringGlyph | size: large (1 of 4) |
| wallet-button | `size.large.mark` | mark | provider: apple-pay, google-pay, shop-pay · size: large (6 of 20) |

### `icon.size.md`

Type: dimension. Bound by 24 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| _accordion-indicator | `size.large.icon` | chevronDownGlyph | expansion: collapsed · indicator: chevron · size: large (1 of 12) |
|  |  | chevronUpGlyph | expansion: expanded · indicator: chevron · size: large (1 of 12) |
|  |  | frame | size: large (4 of 12) |
|  |  | minusGlyph | expansion: expanded · indicator: plus-minus · size: large (1 of 12) |
|  |  | plusGlyph | expansion: collapsed · indicator: plus-minus · size: large (1 of 12) |
| banner | `glyph-size` | dangerGlyph | tone: danger (2 of 8) |
|  |  | infoGlyph | tone: info (2 of 8) |
|  |  | successGlyph | tone: success (2 of 8) |
|  |  | warningGlyph | tone: warning (2 of 8) |
| button | `size.large.icon` | leadingVisual | leading: true · size: large · state: disabled, focus-visible, hover, pressed, rest (80 of 576) |
|  |  | spinner | size: large · state: pending (32 of 576) |
|  |  | trailingVisual | size: large · trailing: true (88 of 576) |
| button-destructive | `size.large.icon` | leadingVisual | leading: true · size: large · state: disabled, focus-visible, hover, pressed, rest (80 of 576) |
|  |  | spinner | size: large · state: pending (32 of 576) |
|  |  | trailingVisual | size: large · trailing: true (88 of 576) |
| button-neutral | `size.large.icon` | leadingVisual | leading: true · size: large · state: disabled, focus-visible, hover, pressed, rest (80 of 576) |
|  |  | spinner | size: large · state: pending (32 of 576) |
|  |  | trailingVisual | size: large · trailing: true (88 of 576) |
| card-number-field | `size.large.mark-height` | cardMark | size: large (28 of 84) |
| code-input-cell | `size.large.caret-height` | caret | size: large · state: focus-visible (1 of 28) |
| flush-icon-button | `size.large.flush`, `size.large.icon` | container | shape: flush · size: large (10 of 60) |
|  |  | icon | size: large (20 of 60) |
| flush-icon-button-destructive | `size.large.flush`, `size.large.icon` | container | shape: flush · size: large (10 of 60) |
|  |  | icon | size: large (20 of 60) |
| flush-icon-button-neutral | `size.large.flush`, `size.large.icon` | container | shape: flush · size: large (10 of 60) |
|  |  | icon | size: large (20 of 60) |
| icon | `size.medium` | (not drawn) | — |
| icon-button | `size.medium.icon` | icon | size: medium · state: disabled, focus-visible, hover, pressed, rest (60 of 216) |
|  |  | spinner | size: medium · state: pending (12 of 216) |
| icon-button-destructive | `size.medium.icon` | icon | size: medium · state: disabled, focus-visible, hover, pressed, rest (60 of 216) |
|  |  | spinner | size: medium · state: pending (12 of 216) |
| icon-button-neutral | `size.medium.icon` | icon | size: medium · state: disabled, focus-visible, hover, pressed, rest (60 of 216) |
|  |  | spinner | size: medium · state: pending (12 of 216) |
| list-item | `size.medium.icon` | icon | size: medium · type: icon (1 of 9) |
| pagination-item | `size.large.icon` | gapGlyph | labeled: false · selection: unselected · size: large · state: rest · style: border · type: ellipsis (1 of 87) |
|  |  | nextGlyph | selection: unselected · size: large · style: border · type: next (10 of 87) |
|  |  | previousGlyph | selection: unselected · size: large · style: border · type: previous (10 of 87) |
| progress | `header-min`, `size.small` | arcGlyph | shape: circular · size: small · status: active, error (3 of 12) |
|  |  | fullRingGlyph | shape: circular · size: small · status: complete · type: determinate (1 of 12) |
|  |  | header | shape: linear · size: medium (4 of 12) |
|  |  | ring | shape: circular · size: small (4 of 12) |
|  |  | ringGlyph | shape: circular · size: small (4 of 12) |
| provider-logo | `size.medium` | (not drawn) | — |
| segmented-control-segment | `size.large.icon` | leadingVisual | size: large (10 of 30) |
| sign-in-button | `size.large.mark` | mark | size: large (32 of 96) |
| spinner | `size.medium` | frame | size: medium (1 of 4) |
|  |  | ringGlyph | size: medium (1 of 4) |
| tab-item | `size.large.icon` | leadingVisual | size: large (10 of 30) |
| tag | `size.large.icon` | checkGlyph | selection: selected · size: large · type: select (5 of 45) |
|  |  | dismissGlyph | selection: unselected · size: large · type: dismissible (5 of 45) |
|  |  | leadingVisual | size: large (15 of 45) |
| wallet-button | `size.medium.mark` | mark | size: medium (8 of 20) |

### `icon.size.sm`

Type: dimension. Bound by 28 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| _accordion-indicator | `size.medium.icon` | chevronDownGlyph | expansion: collapsed · indicator: chevron · size: medium (1 of 12) |
|  |  | chevronUpGlyph | expansion: expanded · indicator: chevron · size: medium (1 of 12) |
|  |  | frame | size: medium (4 of 12) |
|  |  | minusGlyph | expansion: expanded · indicator: plus-minus · size: medium (1 of 12) |
|  |  | plusGlyph | expansion: collapsed · indicator: plus-minus · size: medium (1 of 12) |
| button | `size.medium.icon` | leadingVisual | leading: true · size: medium · state: disabled, focus-visible, hover, pressed, rest (80 of 576) |
|  |  | spinner | size: medium · state: pending (32 of 576) |
|  |  | trailingVisual | size: medium · trailing: true (88 of 576) |
| button-destructive | `size.medium.icon` | leadingVisual | leading: true · size: medium · state: disabled, focus-visible, hover, pressed, rest (80 of 576) |
|  |  | spinner | size: medium · state: pending (32 of 576) |
|  |  | trailingVisual | size: medium · trailing: true (88 of 576) |
| button-neutral | `size.medium.icon` | leadingVisual | leading: true · size: medium · state: disabled, focus-visible, hover, pressed, rest (80 of 576) |
|  |  | spinner | size: medium · state: pending (32 of 576) |
|  |  | trailingVisual | size: medium · trailing: true (88 of 576) |
| card-number-field | `icon-size`, `size.medium.mark-height`, `size.small.mark-height` | cardMark | size: medium, small (56 of 84) |
|  |  | leadingVisual | every member (84 of 84) |
| code-input-cell | `size.medium.caret-height` | caret | size: medium · state: focus-visible (1 of 28) |
| flush-icon-button | `size.medium.flush`, `size.medium.icon`, `size.small.flush`, `size.small.icon` | container | shape: flush · size: medium, small (20 of 60) |
|  |  | icon | size: medium, small (40 of 60) |
| flush-icon-button-destructive | `size.medium.flush`, `size.medium.icon`, `size.small.flush`, `size.small.icon` | container | shape: flush · size: medium, small (20 of 60) |
|  |  | icon | size: medium, small (40 of 60) |
| flush-icon-button-neutral | `size.medium.flush`, `size.medium.icon`, `size.small.flush`, `size.small.icon` | container | shape: flush · size: medium, small (20 of 60) |
|  |  | icon | size: medium, small (40 of 60) |
| icon | `size.small` | (not drawn) | — |
| icon-button | `size.small.icon` | icon | size: small · state: disabled, focus-visible, hover, pressed, rest (60 of 216) |
|  |  | spinner | size: small · state: pending (12 of 216) |
| icon-button-destructive | `size.small.icon` | icon | size: small · state: disabled, focus-visible, hover, pressed, rest (60 of 216) |
|  |  | spinner | size: small · state: pending (12 of 216) |
| icon-button-neutral | `size.small.icon` | icon | size: small · state: disabled, focus-visible, hover, pressed, rest (60 of 216) |
|  |  | spinner | size: small · state: pending (12 of 216) |
| link | `size.large.icon` | trailingVisual | size: large · style: standalone (32 of 144) |
| list-item | `size.small.icon` | icon | size: small · type: icon (1 of 9) |
| pagination-item | `size.medium.icon` | gapGlyph | labeled: false · selection: unselected · size: medium · state: rest · style: border · type: ellipsis (1 of 87) |
|  |  | nextGlyph | selection: unselected · size: medium · style: border · type: next (10 of 87) |
|  |  | previousGlyph | selection: unselected · size: medium · style: border · type: previous (10 of 87) |
| password-field | `icon-size` | leadingVisual | every member (84 of 84) |
| provider-logo | `size.small` | (not drawn) | — |
| search-field | `icon-size` | leadingVisual | every member (84 of 84) |
|  |  | trailingVisual | every member (84 of 84) |
| segmented-control-segment | `size.medium.icon` | leadingVisual | size: medium (10 of 30) |
| select | `icon-size` | chevronGlyph | every member (84 of 84) |
|  |  | leadingVisual | every member (84 of 84) |
| sign-in-button | `size.medium.mark` | mark | size: medium (32 of 96) |
| spinner | `size.small` | frame | size: small (1 of 4) |
|  |  | ringGlyph | size: small (1 of 4) |
| tab-item | `size.medium.icon` | leadingVisual | size: medium (10 of 30) |
| tag | `size.medium.icon` | checkGlyph | selection: selected · size: medium · type: select (5 of 45) |
|  |  | dismissGlyph | selection: unselected · size: medium · type: dismissible (5 of 45) |
|  |  | leadingVisual | size: medium (15 of 45) |
| text-field | `icon-size` | leadingVisual | every member (84 of 84) |
|  |  | trailingVisual | every member (84 of 84) |
| toast | `glyph-size` | checkCircleGlyph | intent: success (1 of 2) |
| wallet-button | `size.small.mark` | mark | provider: apple-pay, google-pay, paypal · size: small (6 of 20) |

### `icon.size.xl`

Type: dimension. Bound by 2 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| code-input-cell | `size.xlarge.caret-height` | caret | size: xlarge · state: focus-visible (1 of 28) |
| progress | `size.medium` | arcGlyph | shape: circular · size: medium · status: active, error (3 of 12) |
|  |  | fullRingGlyph | shape: circular · size: medium · status: complete · type: determinate (1 of 12) |
|  |  | ring | shape: circular · size: medium (4 of 12) |
|  |  | ringGlyph | shape: circular · size: medium (4 of 12) |

### `icon.size.xs`

Type: dimension. Bound by 17 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| _accordion-indicator | `size.small.icon` | chevronDownGlyph | expansion: collapsed · indicator: chevron · size: small (1 of 12) |
|  |  | chevronUpGlyph | expansion: expanded · indicator: chevron · size: small (1 of 12) |
|  |  | frame | size: small (4 of 12) |
|  |  | minusGlyph | expansion: expanded · indicator: plus-minus · size: small (1 of 12) |
|  |  | plusGlyph | expansion: collapsed · indicator: plus-minus · size: small (1 of 12) |
| _breadcrumb-separator | `glyph-size` | chevronGlyph | type: chevron (1 of 2) |
|  |  | frame | every member (2 of 2) |
|  |  | slashGlyph | type: slash (1 of 2) |
| breadcrumbs | `back-icon` | backGlyph | path: parent · separator: chevron (2 of 6) |
| button | `size.small.icon` | leadingVisual | leading: true · size: small · state: disabled, focus-visible, hover, pressed, rest (80 of 576) |
|  |  | spinner | size: small · state: pending (32 of 576) |
|  |  | trailingVisual | size: small · trailing: true (88 of 576) |
| button-destructive | `size.small.icon` | leadingVisual | leading: true · size: small · state: disabled, focus-visible, hover, pressed, rest (80 of 576) |
|  |  | spinner | size: small · state: pending (32 of 576) |
|  |  | trailingVisual | size: small · trailing: true (88 of 576) |
| button-neutral | `size.small.icon` | leadingVisual | leading: true · size: small · state: disabled, focus-visible, hover, pressed, rest (80 of 576) |
|  |  | spinner | size: small · state: pending (32 of 576) |
|  |  | trailingVisual | size: small · trailing: true (88 of 576) |
| code-input-cell | `size.small.caret-height` | caret | size: small · state: focus-visible (1 of 28) |
| field-message | `glyph-size` | errorGlyph | status: error (1 of 4) |
|  |  | message | every member (4 of 4) |
|  |  | successGlyph | status: success (1 of 4) |
|  |  | warningGlyph | status: warning (1 of 4) |
| icon | `size.x-small` | (not drawn) | — |
| link | `size.medium.icon`, `size.small.icon` | trailingVisual | size: medium, small · style: standalone (64 of 144) |
| pagination-item | `size.small.icon` | gapGlyph | labeled: false · selection: unselected · size: small · state: rest · style: border · type: ellipsis (1 of 87) |
|  |  | nextGlyph | selection: unselected · size: small · style: border · type: next (10 of 87) |
|  |  | previousGlyph | selection: unselected · size: small · style: border · type: previous (10 of 87) |
| segmented-control-segment | `size.small.icon` | leadingVisual | size: small (10 of 30) |
| sign-in-button | `size.small.mark` | mark | size: small (32 of 96) |
| spinner | `size.x-small` | frame | size: x-small (1 of 4) |
|  |  | ringGlyph | size: x-small (1 of 4) |
| tab-item | `size.small.icon` | leadingVisual | size: small (10 of 30) |
| tag | `size.small.icon` | checkGlyph | selection: selected · size: small · type: select (5 of 45) |
|  |  | dismissGlyph | selection: unselected · size: small · type: dismissible (5 of 45) |
|  |  | leadingVisual | size: small (15 of 45) |
| textarea | `grip-size` | gripGlyph | every member (84 of 84) |

### `radius.2xl`

Type: dimension. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| dialog | `placement.bottom.radius-top`, `placement.center.radius-bottom`, `placement.center.radius-top` | panel | placement: bottom, center (16 of 24) |

### `radius.capsule`

Type: dimension. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| progress | `radius` | fill | shape: linear · size: medium (4 of 12) |
|  |  | track | shape: linear · size: medium (4 of 12) |

### `radius.lg`

Type: dimension. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| code-input-cell | `size.xlarge.radius` | container | size: xlarge (7 of 28) |

### `radius.md`

Type: dimension. Bound by 11 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| banner | `width.contained.radius` | container | width: contained (4 of 8) |
| button | `radius` | container | every member (576 of 576) |
| button-destructive | `radius` | container | every member (576 of 576) |
| button-neutral | `radius` | container | every member (576 of 576) |
| icon-button | `radius.square` | container | shape: square (108 of 216) |
| icon-button-destructive | `radius.square` | container | shape: square (108 of 216) |
| icon-button-neutral | `radius.square` | container | shape: square (108 of 216) |
| pagination-item | `radius` | container | every member (87 of 87) |
| segmented-control | `radius` | track | every member (3 of 3) |
| sign-in-button | `radius` | container | every member (96 of 96) |
| wallet-button | `radius` | container | every member (20 of 20) |

### `radius.none`

Type: dimension. Bound by 5 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| banner | `width.full.radius` | container | width: full (4 of 8) |
| dialog | `placement.bottom.radius-bottom`, `placement.end.radius-bottom`, `placement.end.radius-top`, `placement.full.radius-bottom`, `placement.full.radius-top` | panel | placement: bottom, end, full · size: medium (12 of 24) |
| flush-icon-button | `radius.flush` | container | shape: flush (30 of 60) |
| flush-icon-button-destructive | `radius.flush` | container | shape: flush (30 of 60) |
| flush-icon-button-neutral | `radius.flush` | container | shape: flush (30 of 60) |

### `radius.round`

Type: dimension. Bound by 13 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| _slider-thumb | `radius` | disc | every member (15 of 15) |
|  |  | frame | every member (15 of 15) |
|  |  | hoverHalo | every member (15 of 15) |
|  |  | pressHalo | every member (15 of 15) |
| badge | `count.radius`, `dot.radius` | surface | emphasis: bold · size: medium · type: count, dot (10 of 40) |
| flush-icon-button | `radius.round` | container | shape: round (30 of 60) |
| flush-icon-button-destructive | `radius.round` | container | shape: round (30 of 60) |
| flush-icon-button-neutral | `radius.round` | container | shape: round (30 of 60) |
| icon-button | `radius.circular` | container | shape: circular (108 of 216) |
| icon-button-destructive | `radius.circular` | container | shape: circular (108 of 216) |
| icon-button-neutral | `radius.circular` | container | shape: circular (108 of 216) |
| list-item | `radius` | bullet | type: unordered (3 of 9) |
| radio-control | `radius` | control | every member (60 of 60) |
|  |  | dot | selection: checked (30 of 60) |
| slider | `radius` | track | every member (30 of 30) |
| switch-control | `radius` | thumb | every member (40 of 40) |
|  |  | track | every member (40 of 40) |
| tag | `radius` | container | every member (45 of 45) |

### `radius.sm`

Type: dimension. Bound by 11 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| badge | `status.radius` | surface | type: status (30 of 40) |
| card-number-field | `radius` | control | every member (84 of 84) |
| code-input-cell | `size.large.radius`, `size.medium.radius`, `size.small.radius` | container | size: large, medium, small (21 of 28) |
| counter | `radius` | control | every member (18 of 18) |
| password-field | `radius` | control | every member (84 of 84) |
| provider-logo | `tile.radius` | glyph | name: payment/affirm, payment/amazon-pay, payment/amex, payment/apple-pay, payment/diners-club, payment/discover, payment/generic, payment/google-pay, payment/klarna, payment/maestro, payment/mastercard, payment/paypal, payment/shop-pay, payment/venmo, payment/visa (15 of 75) |
| search-field | `radius` | control | every member (84 of 84) |
| segmented-control-segment | `indicator-radius` | indicator | every member (30 of 30) |
| select | `radius` | control | every member (84 of 84) |
| text-field | `radius` | control | every member (84 of 84) |
| textarea | `radius` | control | every member (84 of 84) |

### `radius.xl`

Type: dimension. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| toast | `radius` | container | every member (2 of 2) |

### `shadow.lg`

Type: shadow. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| toast | `shadow` | container | every member (2 of 2) |

### `shadow.xl`

Type: shadow. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| dialog | `shadow` | panel | every member (24 of 24) |

### `size.lg.height`

Type: dimension. Bound by 24 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| accordion | `size.large.min-height` | header | size: large (16 of 48) |
| button | `size.large.height` | container | size: large (192 of 576) |
| button-destructive | `size.large.height` | container | size: large (192 of 576) |
| button-neutral | `size.large.height` | container | size: large (192 of 576) |
| card-number-field | `size.large.height` | control | size: large (28 of 84) |
| checkbox-row | `size.large.min-height` | row | size: large (2 of 6) |
| counter | `size.large.height` | control | size: large (6 of 18) |
| flush-icon-button | `size.large.round` | container | shape: round · size: large (10 of 60) |
| flush-icon-button-destructive | `size.large.round` | container | shape: round · size: large (10 of 60) |
| flush-icon-button-neutral | `size.large.round` | container | shape: round · size: large (10 of 60) |
| icon-button | `size.large.side` | container | size: large (72 of 216) |
| icon-button-destructive | `size.large.side` | container | size: large (72 of 216) |
| icon-button-neutral | `size.large.side` | container | size: large (72 of 216) |
| pagination-item | `size.large.height` | container | size: large (29 of 87) |
| password-field | `size.large.height` | control | size: large (28 of 84) |
| radio-row | `size.large.min-height` | row | size: large (2 of 6) |
| search-field | `size.large.height` | control | size: large (28 of 84) |
| segmented-control-segment | `size.large.height` | container | size: large (10 of 30) |
| select | `size.large.min-height` | control | size: large (28 of 84) |
| sign-in-button | `size.large.height` | container | size: large (32 of 96) |
| tab-item | `size.large.height` | container | size: large (10 of 30) |
| tag | `size.large.height` | container | size: large (15 of 45) |
|  |  | dismiss | selection: unselected · size: large · type: dismissible (5 of 45) |
| text-field | `size.large.height` | control | size: large (28 of 84) |
| wallet-button | `size.large.height` | container | provider: apple-pay, google-pay, shop-pay · size: large (6 of 20) |

### `size.md.height`

Type: dimension. Bound by 22 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button | `size.medium.height` | container | size: medium (192 of 576) |
| button-destructive | `size.medium.height` | container | size: medium (192 of 576) |
| button-neutral | `size.medium.height` | container | size: medium (192 of 576) |
| checkbox-row | `size.medium.min-height` | row | size: medium (2 of 6) |
| counter | `size.medium.height` | control | size: medium (6 of 18) |
| divider | `vertical.false.height` | container | inset: middle-inset, none · labeled: false · orientation: vertical (2 of 7) |
| flush-icon-button | `size.medium.round` | container | shape: round · size: medium (10 of 60) |
| flush-icon-button-destructive | `size.medium.round` | container | shape: round · size: medium (10 of 60) |
| flush-icon-button-neutral | `size.medium.round` | container | shape: round · size: medium (10 of 60) |
| focus-ring | `nominal-side` | ring | every member (2 of 2) |
| icon-button | `size.medium.side` | container | size: medium (72 of 216) |
| icon-button-destructive | `size.medium.side` | container | size: medium (72 of 216) |
| icon-button-neutral | `size.medium.side` | container | size: medium (72 of 216) |
| pagination-item | `size.medium.height` | container | size: medium (29 of 87) |
| radio-row | `size.medium.min-height` | row | size: medium (2 of 6) |
| segmented-control-segment | `size.medium.height` | container | size: medium (10 of 30) |
| sign-in-button | `size.medium.height` | container | size: medium (32 of 96) |
| switch-row | `size.medium.min-height` | row | size: medium (2 of 4) |
| tab-item | `size.medium.height` | container | size: medium (10 of 30) |
| tag | `size.medium.height` | container | size: medium (15 of 45) |
|  |  | dismiss | selection: unselected · size: medium · type: dismissible (5 of 45) |
| toast | `min-height` | container | every member (2 of 2) |
| wallet-button | `size.medium.height` | container | size: medium (8 of 20) |

### `size.md.min-height`

Type: dimension. Bound by 7 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| accordion | `size.medium.min-height`, `size.small.min-height` | header | size: medium, small (32 of 48) |
| card-number-field | `size.medium.height`, `size.small.height` | control | size: medium, small (56 of 84) |
| password-field | `size.medium.height`, `size.small.height` | control | size: medium, small (56 of 84) |
| search-field | `size.medium.height`, `size.small.height` | control | size: medium, small (56 of 84) |
| select | `size.medium.min-height`, `size.small.min-height` | control | size: medium, small (56 of 84) |
| slider | `control-height` | control | every member (30 of 30) |
| text-field | `size.medium.height`, `size.small.height` | control | size: medium, small (56 of 84) |

### `size.sm.height`

Type: dimension. Bound by 19 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button | `size.small.height` | container | size: small (192 of 576) |
| button-destructive | `size.small.height` | container | size: small (192 of 576) |
| button-neutral | `size.small.height` | container | size: small (192 of 576) |
| checkbox-row | `size.small.min-height` | row | size: small (2 of 6) |
| counter | `size.small.height` | control | size: small (6 of 18) |
| flush-icon-button | `size.small.round` | container | shape: round · size: small (10 of 60) |
| flush-icon-button-destructive | `size.small.round` | container | shape: round · size: small (10 of 60) |
| flush-icon-button-neutral | `size.small.round` | container | shape: round · size: small (10 of 60) |
| icon-button | `size.small.side` | container | size: small (72 of 216) |
| icon-button-destructive | `size.small.side` | container | size: small (72 of 216) |
| icon-button-neutral | `size.small.side` | container | size: small (72 of 216) |
| pagination-item | `size.small.height` | container | size: small (29 of 87) |
| radio-row | `size.small.min-height` | row | size: small (2 of 6) |
| segmented-control-segment | `size.small.height` | container | size: small (10 of 30) |
| sign-in-button | `size.small.height` | container | size: small (32 of 96) |
| switch-row | `size.small.min-height` | row | size: small (2 of 4) |
| tab-item | `size.small.height` | container | size: small (10 of 30) |
| tag | `size.small.height` | container | size: small (15 of 45) |
|  |  | dismiss | selection: unselected · size: small · type: dismissible (5 of 45) |
| wallet-button | `size.small.height` | container | provider: apple-pay, google-pay, paypal · size: small (6 of 20) |

### `size.xl.height`

Type: dimension. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| divider | `vertical.true.height` | container | inset: none · labeled: true · orientation: vertical (1 of 7) |

### `space.0`

Type: dimension. Bound by 22 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| accordion | `size.large.panel-pad-top`, `size.medium.panel-pad-top`, `size.small.panel-pad-top` | content | expansion: expanded (24 of 48) |
| badge | `size.medium.dot.pad-x`, `size.medium.dot.pad-y`, `size.small.dot.pad-x`, `size.small.dot.pad-y` | surface | emphasis: bold · size: medium · type: dot (5 of 40) |
| button | `inset.flush` | container | appearance: text · inset: flush (144 of 576) |
| button-destructive | `inset.flush` | container | appearance: text · inset: flush (144 of 576) |
| button-neutral | `inset.flush` | container | appearance: text · inset: flush (144 of 576) |
| checkbox-group | `gap`, `pad-x` | container | every member (6 of 6) |
|  |  | items | every member (6 of 6) |
| checkbox-row | `pad-x` | row | every member (6 of 6) |
| code-input-cell | `pad` | content | every member (28 of 28) |
| counter | `ghost.size.large.pad-x`, `ghost.size.medium.pad-x`, `ghost.size.small.pad-x`, `pad-y` | control | every member (18 of 18) |
|  |  | entry | every member (18 of 18) |
| dialog | `pad-none` | body | every member (24 of 24) |
|  |  | footer | footer: fill, inline, stacked (18 of 24) |
|  |  | header | every member (24 of 24) |
|  |  | panel | every member (24 of 24) |
| divider | `horizontal.inset.pad-block`, `horizontal.inset.pad-end`, `horizontal.middle-inset.pad-block`, `horizontal.none.pad-block`, `horizontal.none.pad-end`, `horizontal.none.pad-start`, `vertical.inset.pad-block`, `vertical.inset.pad-end`, `vertical.inset.pad-start`, `vertical.middle-inset.pad-end`, `vertical.middle-inset.pad-start`, `vertical.none.pad-block`, `vertical.none.pad-end`, `vertical.none.pad-start` | container | every member (7 of 7) |
| list-item | `gap` | row | every member (9 of 9) |
| pagination-item | `balance-width`, `pad-y`, `reserve-height` | balance | labeled: false · selection: selected · state: focus-visible, rest · style: underline · type: page (6 of 87) |
|  |  | container | every member (87 of 87) |
|  |  | reserve | labeled: false · state: focus-visible, hover, pressed, rest · type: page (24 of 87) |
|  |  | underlineReserve | labeled: false · selection: selected · state: focus-visible, rest · style: underline · type: page (6 of 87) |
| radio-group | `gap`, `pad-x` | container | every member (6 of 6) |
|  |  | items | every member (6 of 6) |
| radio-row | `pad-x` | row | every member (6 of 6) |
| segmented-control | `track-gap`, `track-pad` | items | every member (3 of 3) |
|  |  | track | every member (3 of 3) |
| segmented-control-segment | `pad-y`, `reserve-height` | content | every member (30 of 30) |
|  |  | reserve | every member (30 of 30) |
| slider | `header-gap` | field | every member (30 of 30) |
| switch-row | `pad-x` | row | every member (4 of 4) |
| tab-item | `pad-y`, `reserve-height` | container | every member (30 of 30) |
|  |  | content | every member (30 of 30) |
|  |  | reserve | every member (30 of 30) |
| tabs | `gap` | container | every member (6 of 6) |
|  |  | items | every member (6 of 6) |
| tag | `label-row.padding-end`, `pad-y`, `size.large.dismissible.padding-end`, `size.large.select.label-inset`, `size.medium.dismissible.padding-end`, `size.medium.select.label-inset`, `size.small.dismissible.padding-end`, `size.small.select.label-inset` | content | every member (45 of 45) |
|  |  | labelCheck | every member (45 of 45) |

### `space.025`

Type: dimension. Bound by 3 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| accordion | `size.large.title-offset`, `size.medium.title-offset`, `size.small.title-offset` | titleBox | every member (48 of 48) |
| badge | `size.medium.count.pad-y`, `size.small.count.pad-y`, `size.small.status.pad-y` | surface | type: count, status (20 of 40) |
| tag | `size.small.dismissible.gap` | content | selection: unselected · size: small · type: dismissible (5 of 45) |

### `space.050`

Type: dimension. Bound by 14 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| _slider-thumb | `halo-step` | hoverHalo | every member (15 of 15) |
|  |  | pressHalo | every member (15 of 15) |
| banner | `content-gap`, `title-offset` | content | every member (8 of 8) |
|  |  | titleBox | every member (8 of 8) |
| breadcrumb-item | `size.small.gap` | container | size: small (5 of 10) |
| breadcrumbs | `back-gap`, `size.small.gap` | container | every member (6 of 6) |
|  |  | items | path: full · size: small (2 of 6) |
| checkbox-row | `description-gap` | textStack | every member (6 of 6) |
| counter | `size.medium.value-pad`, `size.small.value-pad` | entry | size: medium, small (12 of 18) |
| field-label | `gap` | container | every member (24 of 24) |
| link | `size.medium.gap`, `size.small.gap` | container | size: medium, small (96 of 144) |
| pagination | `gap` | items | type: numbered (6 of 12) |
|  |  | row | type: compact, numbered (9 of 12) |
|  |  | simpleRow | style: border · type: simple (3 of 12) |
| pagination-item | `gap` | container | every member (87 of 87) |
| radio-row | `description-gap` | textStack | every member (6 of 6) |
| segmented-control-segment | `inset` | container | every member (30 of 30) |
| tag | `size.large.dismissible.gap`, `size.large.dismissible.label-inset`, `size.medium.dismissible.gap`, `size.medium.dismissible.label-inset`, `size.small.check-gap`, `size.small.dismissible.label-inset`, `size.small.underline.inset` | content | selection: unselected · size: large, medium · type: dismissible (10 of 45) |
|  |  | labelCheck | every member (25 of 45) |
| toast | `controls-gap` | controls | every member (2 of 2) |

### `space.075`

Type: dimension. Bound by 20 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| badge | `size.medium.count.pad-x`, `size.small.count.pad-x` | surface | emphasis: bold · size: medium · type: count (5 of 40) |
| button | `size.small.padding-y` | container | size: small (192 of 576) |
| button-destructive | `size.small.padding-y` | container | size: small (192 of 576) |
| button-neutral | `size.small.padding-y` | container | size: small (192 of 576) |
| card-number-field | `size.small.pad-y` | control | size: small (28 of 84) |
| checkbox-row | `size.small.pad-y` | row | size: small (2 of 6) |
| field-message | `gap` | message | every member (4 of 4) |
| list-item | `size.small.bullet` | bullet | size: small · type: unordered (1 of 9) |
| password-field | `size.small.pad-y` | control | size: small (28 of 84) |
| progress | `gap` | container | every member (12 of 12) |
| radio-row | `size.small.pad-y` | row | size: small (2 of 6) |
| search-field | `size.small.pad-y` | control | size: small (28 of 84) |
| segmented-control-segment | `size.small.gap` | content | size: small (10 of 30) |
| select | `size.small.pad-y` | control | size: small (28 of 84) |
| sign-in-button | `size.small.apple.padding-y`, `size.small.facebook.padding-y`, `size.small.google.padding-y` | container | size: small (32 of 96) |
| switch-row | `size.small.pad-y` | row | size: small (2 of 4) |
| tab-item | `size.small.gap` | content | size: small (10 of 30) |
| tag | `size.medium.check-gap`, `size.medium.underline.inset`, `size.small.dismissible.visible-gap`, `size.small.select.gap` | content | size: small · type: select (10 of 45) |
|  |  | labelCheck | size: medium (15 of 45) |
| text-field | `size.small.pad-y` | control | size: small (28 of 84) |
| textarea | `size.small.pad-y` | control | size: small (28 of 84) |

### `space.100`

Type: dimension. Bound by 34 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| accordion | `size.small.gap`, `size.small.pad-y` | header | size: small (16 of 48) |
|  |  | titleRow | size: small (16 of 48) |
| badge | `size.medium.status.pad-y`, `size.small.status.pad-x` | surface | type: status (30 of 40) |
| breadcrumb-item | `size.medium.gap` | container | size: medium (5 of 10) |
| breadcrumbs | `size.medium.gap` | items | path: full · size: medium (2 of 6) |
| button | `size.large.padding-y`, `size.medium.gap`, `size.medium.padding-y`, `size.small.gap` | container | every member (576 of 576) |
| button-destructive | `size.large.padding-y`, `size.medium.gap`, `size.medium.padding-y`, `size.small.gap` | container | every member (576 of 576) |
| button-group | `layout.stacked.gap` | items | layout: stacked (1 of 3) |
| button-neutral | `size.large.padding-y`, `size.medium.gap`, `size.medium.padding-y`, `size.small.gap` | container | every member (576 of 576) |
| card-number-field | `root-gap`, `size.large.gap`, `size.large.pad-y`, `size.medium.gap`, `size.medium.pad-y`, `size.small.gap` | container | every member (84 of 84) |
|  |  | content | every member (84 of 84) |
|  |  | control | every member (84 of 84) |
| checkbox-group | `pad-y` | container | every member (6 of 6) |
| checkbox-row | `size.medium.gap`, `size.medium.pad-y`, `size.small.gap` | content | size: medium, small (4 of 6) |
|  |  | row | size: medium (2 of 6) |
| code-input | `cell-gap`, `root-gap` | container | every member (48 of 48) |
|  |  | items | every member (48 of 48) |
| counter | `root-gap`, `size.large.value-pad` | container | every member (18 of 18) |
|  |  | entry | size: large (6 of 18) |
| dialog | `title-gap` | titleBox | every member (24 of 24) |
| divider | `vertical.middle-inset.pad-block` | container | inset: middle-inset · labeled: false · orientation: vertical (1 of 7) |
| link | `size.large.gap` | container | size: large (48 of 144) |
| list-item | `size.large.bullet`, `size.medium.bullet` | bullet | size: large, medium · type: unordered (2 of 9) |
| pagination-item | `padding-x` | container | every member (87 of 87) |
| password-field | `root-gap`, `size.large.gap`, `size.large.pad-y`, `size.medium.gap`, `size.medium.pad-y`, `size.small.gap` | container | every member (84 of 84) |
|  |  | content | every member (84 of 84) |
|  |  | control | every member (84 of 84) |
|  |  | labelRow | every member (84 of 84) |
| progress | `header-gap`, `ring-gap` | header | shape: linear · size: medium (4 of 12) |
|  |  | ringRow | shape: circular (8 of 12) |
| radio-group | `pad-y` | container | every member (6 of 6) |
| radio-row | `size.medium.gap`, `size.medium.pad-y`, `size.small.gap` | content | size: medium, small (4 of 6) |
|  |  | row | size: medium (2 of 6) |
| search-field | `root-gap`, `size.large.gap`, `size.large.pad-y`, `size.medium.gap`, `size.medium.pad-y`, `size.small.gap` | container | every member (84 of 84) |
|  |  | content | every member (84 of 84) |
|  |  | control | every member (84 of 84) |
| segmented-control | `gap` | container | every member (3 of 3) |
| segmented-control-segment | `size.large.gap`, `size.medium.gap` | content | size: large, medium (20 of 30) |
| select | `root-gap`, `size.large.gap`, `size.large.pad-y`, `size.medium.gap`, `size.medium.pad-y`, `size.small.gap` | container | every member (84 of 84) |
|  |  | content | every member (84 of 84) |
|  |  | control | every member (84 of 84) |
| sign-in-button | `size.large.apple.padding-y`, `size.large.facebook.padding-y`, `size.large.google.gap`, `size.large.google.padding-y`, `size.medium.apple.gap`, `size.medium.apple.padding-y`, `size.medium.facebook.gap`, `size.medium.facebook.padding-y`, `size.medium.google.gap`, `size.medium.google.padding-y`, `size.small.apple.gap`, `size.small.facebook.gap`, `size.small.google.gap` | container | every member (96 of 96) |
| slider | `gap` | container | every member (30 of 30) |
| switch-row | `size.medium.gap`, `size.medium.pad-y`, `size.small.gap` | content | every member (4 of 4) |
|  |  | row | size: medium (2 of 4) |
| tab-item | `size.large.gap`, `size.medium.gap` | content | size: large, medium (20 of 30) |
| tag | `group-gap`, `size.large.check-gap`, `size.large.dismissible.visible-gap`, `size.large.underline.inset`, `size.medium.dismissible.visible-gap`, `size.medium.select.gap`, `size.small.padding-x`, `size.small.select.padding-end` | content | size: medium, small (25 of 45) |
|  |  | labelCheck | size: large (15 of 45) |
| text-field | `root-gap`, `size.large.gap`, `size.large.pad-y`, `size.medium.gap`, `size.medium.pad-y`, `size.small.gap` | container | every member (84 of 84) |
|  |  | content | every member (84 of 84) |
|  |  | control | every member (84 of 84) |
| textarea | `root-gap`, `size.large.pad-y`, `size.medium.pad-y` | container | every member (84 of 84) |
|  |  | control | size: large, medium (56 of 84) |
|  |  | counterCell | every member (84 of 84) |
|  |  | messageCell | every member (84 of 84) |
|  |  | messageRow | every member (84 of 84) |
| toast | `gap`, `pad-end`, `pad-y` | container | every member (2 of 2) |

### `space.150`

Type: dimension. Bound by 18 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| accordion | `size.medium.gap`, `size.medium.pad-y`, `size.small.pad-x`, `size.small.panel-pad-end` | content | expansion: expanded · size: small (8 of 48) |
|  |  | header | size: medium, small (32 of 48) |
|  |  | titleRow | size: medium (16 of 48) |
| badge | `size.medium.status.pad-x` | surface | size: medium · type: status (15 of 40) |
| banner | `actions-gap`, `gap` | actions | every member (8 of 8) |
|  |  | container | every member (8 of 8) |
| button | `size.large.gap`, `size.medium.padding-x-visual`, `size.small.padding-x-visual` | container | every member (408 of 576) |
| button-destructive | `size.large.gap`, `size.medium.padding-x-visual`, `size.small.padding-x-visual` | container | every member (408 of 576) |
| button-group | `layout.fill.gap`, `layout.inline.gap` | items | layout: fill, inline (2 of 3) |
| button-neutral | `size.large.gap`, `size.medium.padding-x-visual`, `size.small.padding-x-visual` | container | every member (408 of 576) |
| checkbox-row | `size.large.gap`, `size.large.pad-y` | content | size: large (2 of 6) |
|  |  | row | size: large (2 of 6) |
| counter | `outline.size.medium.pad-x`, `outline.size.small.pad-x` | control | appearance: outline · size: medium, small (6 of 18) |
| divider | `vertical.gap` | container | inset: middle-inset, none · orientation: vertical (3 of 7) |
| list | `size.small.gap` | container | size: small (3 of 9) |
|  |  | items | size: small (3 of 9) |
| radio-row | `size.large.gap`, `size.large.pad-y` | content | size: large (2 of 6) |
|  |  | row | size: large (2 of 6) |
| segmented-control-segment | `size.small.padding-x` | content | size: small (10 of 30) |
| sign-in-button | `size.large.apple.gap`, `size.large.facebook.gap`, `size.large.google.padding-x`, `size.large.google.padding-x-visual`, `size.medium.apple.padding-x-visual`, `size.medium.facebook.padding-x-visual`, `size.medium.google.padding-x`, `size.medium.google.padding-x-visual`, `size.small.apple.padding-x-visual`, `size.small.facebook.padding-x-visual`, `size.small.google.padding-x`, `size.small.google.padding-x-visual` | container | every member (96 of 96) |
| slider | `inputs-gap` | inputs | every member (30 of 30) |
| tab-item | `size.small.padding-x` | content | size: small (10 of 30) |
| tag | `size.large.select.gap`, `size.medium.padding-x`, `size.medium.select.padding-end` | content | size: large, medium (25 of 45) |
| toast | `glyph-gap` | content | every member (2 of 2) |

### `space.200`

Type: dimension. Bound by 20 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| accordion | `size.large.gap`, `size.large.pad-y`, `size.medium.pad-x`, `size.medium.panel-pad-end` | content | expansion: expanded · size: medium (8 of 48) |
|  |  | header | size: large, medium (32 of 48) |
|  |  | titleRow | size: large (16 of 48) |
| banner | `pad` | container | every member (8 of 8) |
| button | `size.large.padding-x-visual`, `size.medium.padding-x`, `size.small.padding-x` | container | inset: default (324 of 576) |
| button-destructive | `size.large.padding-x-visual`, `size.medium.padding-x`, `size.small.padding-x` | container | inset: default (324 of 576) |
| button-neutral | `size.large.padding-x-visual`, `size.medium.padding-x`, `size.small.padding-x` | container | inset: default (324 of 576) |
| card-number-field | `size.medium.pad-x`, `size.small.pad-x` | control | size: medium, small (56 of 84) |
| counter | `outline.size.large.pad-x` | control | appearance: outline · size: large (3 of 18) |
| dialog | `gap`, `header-gap`, `placement.bottom.pad`, `placement.full.pad` | body | placement: bottom, full · size: medium (8 of 24) |
|  |  | footer | footer: fill, inline, stacked · placement: bottom, full · size: medium (6 of 24) |
|  |  | header | every member (24 of 24) |
|  |  | panel | every member (24 of 24) |
| divider | `horizontal.inset.pad-start`, `horizontal.middle-inset.pad-end`, `horizontal.middle-inset.pad-start` | container | inset: inset, middle-inset · labeled: false · orientation: horizontal (2 of 7) |
| list | `size.medium.gap` | container | size: medium (3 of 9) |
|  |  | items | size: medium (3 of 9) |
| password-field | `size.medium.pad-x`, `size.small.pad-x` | control | size: medium, small (56 of 84) |
| search-field | `size.medium.pad-x`, `size.small.pad-x` | control | size: medium, small (56 of 84) |
| segmented-control-segment | `size.medium.padding-x` | content | size: medium (10 of 30) |
| select | `size.medium.pad-x`, `size.small.pad-x` | control | size: medium, small (56 of 84) |
| sign-in-button | `size.large.apple.padding-x-visual`, `size.large.facebook.padding-x-visual`, `size.medium.apple.padding-x`, `size.medium.facebook.padding-x`, `size.small.apple.padding-x`, `size.small.facebook.padding-x` | container | provider: apple, facebook · style: black, blue, outline, white (60 of 96) |
| tab-item | `size.medium.padding-x` | content | size: medium (10 of 30) |
| tag | `size.large.padding-x`, `size.large.select.padding-end` | content | size: large (15 of 45) |
| text-field | `size.medium.pad-x`, `size.small.pad-x` | control | size: medium, small (56 of 84) |
| textarea | `size.medium.pad-x`, `size.small.pad-x` | control | size: medium, small (56 of 84) |
| toast | `pad-x` | container | every member (2 of 2) |

### `space.250`

Type: dimension. Bound by 5 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| accordion | `size.large.pad-x` | content | expansion: expanded · size: large (8 of 48) |
|  |  | header | size: large (16 of 48) |
| list | `size.large.gap` | container | size: large (3 of 9) |
|  |  | items | size: large (3 of 9) |
| list-item | `size.small.ordered.marker-column`, `size.small.unordered.marker-column` | markerBox | size: small · type: ordered, unordered (2 of 9) |
| segmented-control-segment | `size.large.padding-x` | content | size: large (10 of 30) |
| tab-item | `size.large.padding-x` | content | size: large (10 of 30) |

### `space.300`

Type: dimension. Bound by 14 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| accordion | `size.large.panel-pad-end` | content | expansion: expanded · size: large (8 of 48) |
| button | `size.large.padding-x` | container | inset: default · size: large (108 of 576) |
| button-destructive | `size.large.padding-x` | container | inset: default · size: large (108 of 576) |
| button-neutral | `size.large.padding-x` | container | inset: default · size: large (108 of 576) |
| card-number-field | `size.large.pad-x` | control | size: large (28 of 84) |
| dialog | `placement.center.pad`, `placement.end.pad` | body | placement: center, end (16 of 24) |
|  |  | footer | footer: fill, inline, stacked · placement: center, end (12 of 24) |
|  |  | header | placement: center, end (16 of 24) |
|  |  | panel | placement: center, end (16 of 24) |
| divider | `horizontal.gap` | container | orientation: horizontal (4 of 7) |
| list-item | `size.medium.ordered.marker-column`, `size.medium.unordered.marker-column` | markerBox | size: medium · type: ordered, unordered (2 of 9) |
| password-field | `size.large.pad-x` | control | size: large (28 of 84) |
| search-field | `size.large.pad-x` | control | size: large (28 of 84) |
| select | `size.large.pad-x` | control | size: large (28 of 84) |
| sign-in-button | `size.large.apple.padding-x`, `size.large.facebook.padding-x` | container | provider: apple, facebook · size: large · style: black, blue, outline, white (20 of 96) |
| text-field | `size.large.pad-x` | control | size: large (28 of 84) |
| textarea | `size.large.pad-x` | control | size: large (28 of 84) |

### `space.400`

Type: dimension. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| list-item | `size.large.ordered.marker-column`, `size.large.unordered.marker-column`, `size.small.icon.marker-column` | markerBox | size: large, small (3 of 9) |

### `space.500`

Type: dimension. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| list-item | `size.medium.icon.marker-column` | markerBox | size: medium · type: icon (1 of 9) |

### `space.600`

Type: dimension. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| list-item | `size.large.icon.marker-column` | markerBox | size: large · type: icon (1 of 9) |

### `type.body.lg.default`

Type: typography. Bound by 10 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| accordion | `size.large.panel-type` | placeholder | expansion: expanded · size: large (8 of 48) |
| card-number-field | `size.large.type` | placeholder | size: large · state: disabled, focus-visible, hover, rest (16 of 84) |
|  |  | value | size: large · state: filled, focus-visible-filled, read-only (12 of 84) |
| counter | `size.large.type` | value | size: large (6 of 18) |
| link | `size.large.type.default.standalone.selected.focus-visible`, `size.large.type.default.standalone.selected.hover`, `size.large.type.default.standalone.selected.pressed`, `size.large.type.default.standalone.selected.rest`, `size.large.type.default.standalone.unselected.rest` | label | size: large · style: standalone · weight: default (10 of 144) |
| list-item | `size.large.text` | label | size: large (3 of 9) |
|  |  | number | size: large · type: ordered (1 of 9) |
| password-field | `size.large.type` | placeholder | size: large · state: disabled, focus-visible, hover, rest (16 of 84) |
|  |  | value | size: large · state: filled, focus-visible-filled, read-only (12 of 84) |
| search-field | `size.large.type` | placeholder | size: large · state: disabled, focus-visible, hover, rest (16 of 84) |
|  |  | value | size: large · state: filled, focus-visible-filled, read-only (12 of 84) |
| select | `size.large.type` | placeholder | size: large · state: disabled, focus-visible, hover, rest (16 of 84) |
|  |  | value | size: large · state: filled, focus-visible-filled, read-only (12 of 84) |
| text-field | `size.large.type` | placeholder | size: large · state: disabled, focus-visible, hover, rest (16 of 84) |
|  |  | value | size: large · state: filled, focus-visible-filled, read-only (12 of 84) |
| textarea | `size.large.type` | placeholder | size: large · state: disabled, focus-visible, hover, rest (16 of 84) |
|  |  | value | size: large · state: filled, focus-visible-filled, read-only (12 of 84) |

### `type.body.lg.default-link`

Type: typography. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| link | `size.large.type.default.inline.selected.focus-visible`, `size.large.type.default.inline.selected.hover`, `size.large.type.default.inline.selected.pressed`, `size.large.type.default.inline.selected.rest`, `size.large.type.default.inline.unselected.focus-visible`, `size.large.type.default.inline.unselected.hover`, `size.large.type.default.inline.unselected.pressed`, `size.large.type.default.inline.unselected.rest`, `size.large.type.default.standalone.unselected.focus-visible`, `size.large.type.default.standalone.unselected.hover`, `size.large.type.default.standalone.unselected.pressed` | label | selection: unselected · size: large · weight: default (14 of 144) |

### `type.body.lg.strong`

Type: typography. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| link | `size.large.type.emphasis.standalone.selected.focus-visible`, `size.large.type.emphasis.standalone.selected.hover`, `size.large.type.emphasis.standalone.selected.pressed`, `size.large.type.emphasis.standalone.selected.rest`, `size.large.type.emphasis.standalone.unselected.rest` | label | size: large · style: standalone · weight: emphasis (10 of 144) |

### `type.body.lg.strong-link`

Type: typography. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| link | `size.large.type.emphasis.inline.selected.focus-visible`, `size.large.type.emphasis.inline.selected.hover`, `size.large.type.emphasis.inline.selected.pressed`, `size.large.type.emphasis.inline.selected.rest`, `size.large.type.emphasis.inline.unselected.focus-visible`, `size.large.type.emphasis.inline.unselected.hover`, `size.large.type.emphasis.inline.unselected.pressed`, `size.large.type.emphasis.inline.unselected.rest`, `size.large.type.emphasis.standalone.unselected.focus-visible`, `size.large.type.emphasis.standalone.unselected.hover`, `size.large.type.emphasis.standalone.unselected.pressed` | label | selection: unselected · size: large · weight: emphasis (14 of 144) |

### `type.body.md.default`

Type: typography. Bound by 18 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| accordion | `size.medium.panel-type` | placeholder | expansion: expanded · size: medium (8 of 48) |
| banner | `body-type` | placeholder | every member (8 of 8) |
| breadcrumb-item | `size.medium.type` | current | kind: current · separator: chevron · size: medium (1 of 10) |
| card-number-field | `size.medium.type` | placeholder | size: medium · state: disabled, focus-visible, hover, rest (16 of 84) |
|  |  | value | size: medium · state: filled, focus-visible-filled, read-only (12 of 84) |
| checkbox-row | `size.large.text` | label | size: large (2 of 6) |
| code-input-cell | `size.small.type` | digit | size: small · state: error, filled, focus-visible-filled (3 of 28) |
| counter | `size.medium.type` | value | size: medium (6 of 18) |
| dialog | `body-type`, `description-type` | description | every member (24 of 24) |
|  |  | placeholder | every member (24 of 24) |
| field-label | `size.large.regular.text` | indicator | size: large · weight: regular (4 of 24) |
|  |  | label | size: large · weight: regular (4 of 24) |
| link | `size.medium.type.default.standalone.selected.focus-visible`, `size.medium.type.default.standalone.selected.hover`, `size.medium.type.default.standalone.selected.pressed`, `size.medium.type.default.standalone.selected.rest`, `size.medium.type.default.standalone.unselected.rest` | label | size: medium · style: standalone · weight: default (10 of 144) |
| list-item | `size.medium.text` | label | size: medium (3 of 9) |
|  |  | number | size: medium · type: ordered (1 of 9) |
| password-field | `size.medium.type` | placeholder | size: medium · state: disabled, focus-visible, hover, rest (16 of 84) |
|  |  | value | size: medium · state: filled, focus-visible-filled, read-only (12 of 84) |
| radio-row | `size.large.text` | label | size: large (2 of 6) |
| search-field | `size.medium.type` | placeholder | size: medium · state: disabled, focus-visible, hover, rest (16 of 84) |
|  |  | value | size: medium · state: filled, focus-visible-filled, read-only (12 of 84) |
| select | `size.medium.type` | placeholder | size: medium · state: disabled, focus-visible, hover, rest (16 of 84) |
|  |  | value | size: medium · state: filled, focus-visible-filled, read-only (12 of 84) |
| text-field | `size.medium.type` | placeholder | size: medium · state: disabled, focus-visible, hover, rest (16 of 84) |
|  |  | value | size: medium · state: filled, focus-visible-filled, read-only (12 of 84) |
| textarea | `size.medium.type` | placeholder | size: medium · state: disabled, focus-visible, hover, rest (16 of 84) |
|  |  | value | size: medium · state: filled, focus-visible-filled, read-only (12 of 84) |

### `type.body.md.default-link`

Type: typography. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| link | `size.medium.type.default.inline.selected.focus-visible`, `size.medium.type.default.inline.selected.hover`, `size.medium.type.default.inline.selected.pressed`, `size.medium.type.default.inline.selected.rest`, `size.medium.type.default.inline.unselected.focus-visible`, `size.medium.type.default.inline.unselected.hover`, `size.medium.type.default.inline.unselected.pressed`, `size.medium.type.default.inline.unselected.rest`, `size.medium.type.default.standalone.unselected.focus-visible`, `size.medium.type.default.standalone.unselected.hover`, `size.medium.type.default.standalone.unselected.pressed` | label | selection: unselected · size: medium · weight: default (14 of 144) |

### `type.body.md.line-box`

Type: dimension. Bound by 2 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| checkbox-row | `size.large.control-box` | controlCell | size: large (2 of 6) |
| radio-row | `size.large.control-box` | controlCell | size: large (2 of 6) |

### `type.body.md.strong`

Type: typography. Bound by 2 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| field-label | `size.large.bold.text` | indicator | size: large · weight: bold (4 of 24) |
|  |  | label | size: large · weight: bold (4 of 24) |
| link | `size.medium.type.emphasis.standalone.selected.focus-visible`, `size.medium.type.emphasis.standalone.selected.hover`, `size.medium.type.emphasis.standalone.selected.pressed`, `size.medium.type.emphasis.standalone.selected.rest`, `size.medium.type.emphasis.standalone.unselected.rest` | label | size: medium · style: standalone · weight: emphasis (10 of 144) |

### `type.body.md.strong-link`

Type: typography. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| link | `size.medium.type.emphasis.inline.selected.focus-visible`, `size.medium.type.emphasis.inline.selected.hover`, `size.medium.type.emphasis.inline.selected.pressed`, `size.medium.type.emphasis.inline.selected.rest`, `size.medium.type.emphasis.inline.unselected.focus-visible`, `size.medium.type.emphasis.inline.unselected.hover`, `size.medium.type.emphasis.inline.unselected.pressed`, `size.medium.type.emphasis.inline.unselected.rest`, `size.medium.type.emphasis.standalone.unselected.focus-visible`, `size.medium.type.emphasis.standalone.unselected.hover`, `size.medium.type.emphasis.standalone.unselected.pressed` | label | selection: unselected · size: medium · weight: emphasis (14 of 144) |

### `type.body.sm.default`

Type: typography. Bound by 18 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| accordion | `size.small.panel-type` | placeholder | expansion: expanded · size: small (8 of 48) |
| breadcrumb-item | `size.small.type` | current | kind: current · separator: chevron · size: small (1 of 10) |
| card-number-field | `size.small.type` | placeholder | size: small · state: disabled, focus-visible, hover, rest (16 of 84) |
|  |  | value | size: small · state: filled, focus-visible-filled, read-only (12 of 84) |
| checkbox-row | `description.large.text`, `size.medium.text` | description | size: large (2 of 6) |
|  |  | label | size: medium (2 of 6) |
| counter | `size.small.type` | value | size: small (6 of 18) |
| field-label | `size.medium.regular.text` | indicator | size: medium · weight: regular (4 of 24) |
|  |  | label | size: medium · weight: regular (4 of 24) |
| link | `size.small.type.default.standalone.selected.focus-visible`, `size.small.type.default.standalone.selected.hover`, `size.small.type.default.standalone.selected.pressed`, `size.small.type.default.standalone.selected.rest`, `size.small.type.default.standalone.unselected.rest` | label | size: small · style: standalone · weight: default (10 of 144) |
| list-item | `size.small.text` | label | size: small (3 of 9) |
|  |  | number | size: small · type: ordered (1 of 9) |
| password-field | `size.small.type` | placeholder | size: small · state: disabled, focus-visible, hover, rest (16 of 84) |
|  |  | value | size: small · state: filled, focus-visible-filled, read-only (12 of 84) |
| progress | `value-type` | ringValue | shape: circular · status: active, error · type: determinate (4 of 12) |
|  |  | ringValueComplete | shape: circular · status: complete · type: determinate (2 of 12) |
|  |  | value | shape: linear · size: medium · status: active, error · type: determinate (2 of 12) |
|  |  | valueComplete | shape: linear · size: medium · status: complete · type: determinate (1 of 12) |
| radio-row | `description.large.text`, `size.medium.text` | description | size: large (2 of 6) |
|  |  | label | size: medium (2 of 6) |
| search-field | `size.small.type` | placeholder | size: small · state: disabled, focus-visible, hover, rest (16 of 84) |
|  |  | value | size: small · state: filled, focus-visible-filled, read-only (12 of 84) |
| select | `size.small.type` | placeholder | size: small · state: disabled, focus-visible, hover, rest (16 of 84) |
|  |  | value | size: small · state: filled, focus-visible-filled, read-only (12 of 84) |
| slider | `value-type` | valueRange | type: range (15 of 30) |
|  |  | valueSingle | type: single (15 of 30) |
| switch-row | `size.medium.text` | label | size: medium (2 of 4) |
| text-field | `size.small.type` | placeholder | size: small · state: disabled, focus-visible, hover, rest (16 of 84) |
|  |  | value | size: small · state: filled, focus-visible-filled, read-only (12 of 84) |
| textarea | `size.small.type` | placeholder | size: small · state: disabled, focus-visible, hover, rest (16 of 84) |
|  |  | value | size: small · state: filled, focus-visible-filled, read-only (12 of 84) |
| toast | `type` | message | every member (2 of 2) |

### `type.body.sm.default-link`

Type: typography. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| link | `size.small.type.default.inline.selected.focus-visible`, `size.small.type.default.inline.selected.hover`, `size.small.type.default.inline.selected.pressed`, `size.small.type.default.inline.selected.rest`, `size.small.type.default.inline.unselected.focus-visible`, `size.small.type.default.inline.unselected.hover`, `size.small.type.default.inline.unselected.pressed`, `size.small.type.default.inline.unselected.rest`, `size.small.type.default.standalone.unselected.focus-visible`, `size.small.type.default.standalone.unselected.hover`, `size.small.type.default.standalone.unselected.pressed` | label | selection: unselected · size: small · weight: default (14 of 144) |

### `type.body.sm.line-box`

Type: dimension. Bound by 3 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| checkbox-row | `size.medium.control-box` | controlCell | size: medium (2 of 6) |
| radio-row | `size.medium.control-box` | controlCell | size: medium (2 of 6) |
| switch-row | `size.medium.control-box` | controlCell | size: medium (2 of 4) |

### `type.body.sm.strong`

Type: typography. Bound by 2 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| field-label | `size.medium.bold.text` | indicator | size: medium · weight: bold (4 of 24) |
|  |  | label | size: medium · weight: bold (4 of 24) |
| link | `size.small.type.emphasis.standalone.selected.focus-visible`, `size.small.type.emphasis.standalone.selected.hover`, `size.small.type.emphasis.standalone.selected.pressed`, `size.small.type.emphasis.standalone.selected.rest`, `size.small.type.emphasis.standalone.unselected.rest` | label | size: small · style: standalone · weight: emphasis (10 of 144) |

### `type.body.sm.strong-link`

Type: typography. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| link | `size.small.type.emphasis.inline.selected.focus-visible`, `size.small.type.emphasis.inline.selected.hover`, `size.small.type.emphasis.inline.selected.pressed`, `size.small.type.emphasis.inline.selected.rest`, `size.small.type.emphasis.inline.unselected.focus-visible`, `size.small.type.emphasis.inline.unselected.hover`, `size.small.type.emphasis.inline.unselected.pressed`, `size.small.type.emphasis.inline.unselected.rest`, `size.small.type.emphasis.standalone.unselected.focus-visible`, `size.small.type.emphasis.standalone.unselected.hover`, `size.small.type.emphasis.standalone.unselected.pressed` | label | selection: unselected · size: small · weight: emphasis (14 of 144) |

### `type.body.xs.default`

Type: typography. Bound by 5 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| checkbox-row | `description.medium.text`, `description.small.text`, `size.small.text` | description | size: medium, small (4 of 6) |
|  |  | label | size: small (2 of 6) |
| field-label | `size.small.regular.text` | indicator | size: small · weight: regular (4 of 24) |
|  |  | label | size: small · weight: regular (4 of 24) |
| radio-row | `description.medium.text`, `description.small.text`, `size.small.text` | description | size: medium, small (4 of 6) |
|  |  | label | size: small (2 of 6) |
| slider | `milestone-type` | maxLabel | every member (30 of 30) |
|  |  | milestone | every member (30 of 30) |
|  |  | minLabel | every member (30 of 30) |
| switch-row | `size.small.text` | label | size: small (2 of 4) |

### `type.body.xs.line-box`

Type: dimension. Bound by 3 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| checkbox-row | `size.small.control-box` | controlCell | size: small (2 of 6) |
| radio-row | `size.small.control-box` | controlCell | size: small (2 of 6) |
| switch-row | `size.small.control-box` | controlCell | size: small (2 of 4) |

### `type.body.xs.strong`

Type: typography. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| field-label | `size.small.bold.text` | indicator | size: small · weight: bold (4 of 24) |
|  |  | label | size: small · weight: bold (4 of 24) |

### `type.caption.md.default`

Type: typography. Bound by 2 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| field-message | `type` | label | every member (4 of 4) |
| textarea | `counter-type` | counter | every member (84 of 84) |

### `type.caption.md.strong`

Type: typography. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| badge | `size.small.type` | label | size: small · type: status (15 of 40) |

### `type.label.lg.default`

Type: typography. Bound by 4 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| pagination | `size.large.type` | status | size: large · style: border · type: compact (1 of 12) |
| pagination-item | `size.large.type.unselected` | label | labeled: false · selection: unselected · size: large · state: focus-visible, hover, pressed, rest · style: border · type: page (4 of 87) |
|  |  | nextText | labeled: true · selection: unselected · size: large · style: border · type: next (5 of 87) |
|  |  | previousText | labeled: true · selection: unselected · size: large · style: border · type: previous (5 of 87) |
| segmented-control-segment | `size.large.type.unselected` | label | selection: unselected · size: large (5 of 30) |
| tab-item | `size.large.type.unselected` | label | selection: unselected · size: large (5 of 30) |

### `type.label.lg.emphasis`

Type: typography. Bound by 10 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| accordion | `size.large.type` | label | size: large (16 of 48) |
| button | `size.large.filled.type`, `size.large.outline.type` | label | appearance: filled, outline · inset: default · size: large (96 of 576) |
| button-destructive | `size.large.filled.type`, `size.large.outline.type` | label | appearance: filled, outline · inset: default · size: large (96 of 576) |
| button-neutral | `size.large.filled.type`, `size.large.outline.type` | label | appearance: filled, outline · inset: default · size: large (96 of 576) |
| dialog | `title-type` | title | every member (24 of 24) |
| pagination-item | `size.large.type.selected` | label | labeled: false · selection: selected · size: large · state: focus-visible, rest · type: page (4 of 87) |
|  |  | labelReserve | labeled: false · size: large · state: focus-visible, hover, pressed, rest · type: page (8 of 87) |
|  |  | underlineLabel | labeled: false · selection: selected · size: large · state: focus-visible, rest · style: underline · type: page (2 of 87) |
| segmented-control-segment | `size.large.type.selected` | label | selection: selected · size: large (5 of 30) |
|  |  | labelReserve | size: large (10 of 30) |
| sign-in-button | `size.large.type` | label | provider: apple, facebook · size: large · style: black, blue, outline, white (20 of 96) |
| tab-item | `size.large.type.selected` | label | selection: selected · size: large (5 of 30) |
|  |  | labelReserve | size: large (10 of 30) |
| tag | `size.large.type` | label | size: large (15 of 45) |

### `type.label.lg.emphasis-link`

Type: typography. Bound by 3 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button | `size.large.text.type` | label | appearance: text · size: large (96 of 576) |
| button-destructive | `size.large.text.type` | label | appearance: text · size: large (96 of 576) |
| button-neutral | `size.large.text.type` | label | appearance: text · size: large (96 of 576) |

### `type.label.md.default`

Type: typography. Bound by 5 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| divider | `label.type` | label | inset: none · labeled: true (2 of 7) |
| pagination | `size.medium.type` | status | size: medium · style: border · type: compact (1 of 12) |
| pagination-item | `size.medium.type.unselected` | label | labeled: false · selection: unselected · size: medium · state: focus-visible, hover, pressed, rest · style: border · type: page (4 of 87) |
|  |  | nextText | labeled: true · selection: unselected · size: medium · style: border · type: next (5 of 87) |
|  |  | previousText | labeled: true · selection: unselected · size: medium · style: border · type: previous (5 of 87) |
| segmented-control-segment | `size.medium.type.unselected` | label | selection: unselected · size: medium (5 of 30) |
| tab-item | `size.medium.type.unselected` | label | selection: unselected · size: medium (5 of 30) |

### `type.label.md.emphasis`

Type: typography. Bound by 11 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| accordion | `size.medium.type` | label | size: medium (16 of 48) |
| banner | `title-type` | title | every member (8 of 8) |
| button | `size.medium.filled.type`, `size.medium.outline.type` | label | appearance: filled, outline · inset: default · size: medium (96 of 576) |
| button-destructive | `size.medium.filled.type`, `size.medium.outline.type` | label | appearance: filled, outline · inset: default · size: medium (96 of 576) |
| button-neutral | `size.medium.filled.type`, `size.medium.outline.type` | label | appearance: filled, outline · inset: default · size: medium (96 of 576) |
| pagination-item | `size.medium.type.selected` | label | labeled: false · selection: selected · size: medium · state: focus-visible, rest · type: page (4 of 87) |
|  |  | labelReserve | labeled: false · size: medium · state: focus-visible, hover, pressed, rest · type: page (8 of 87) |
|  |  | underlineLabel | labeled: false · selection: selected · size: medium · state: focus-visible, rest · style: underline · type: page (2 of 87) |
| progress | `label-type` | label | shape: linear · size: medium (4 of 12) |
| segmented-control-segment | `size.medium.type.selected` | label | selection: selected · size: medium (5 of 30) |
|  |  | labelReserve | size: medium (10 of 30) |
| sign-in-button | `size.medium.type` | label | provider: apple, facebook · size: medium · style: black, blue, outline, white (20 of 96) |
| tab-item | `size.medium.type.selected` | label | selection: selected · size: medium (5 of 30) |
|  |  | labelReserve | size: medium (10 of 30) |
| tag | `size.medium.type` | label | size: medium (15 of 45) |

### `type.label.md.emphasis-link`

Type: typography. Bound by 3 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button | `size.medium.text.type` | label | appearance: text · size: medium (96 of 576) |
| button-destructive | `size.medium.text.type` | label | appearance: text · size: medium (96 of 576) |
| button-neutral | `size.medium.text.type` | label | appearance: text · size: medium (96 of 576) |

### `type.label.md.line-box`

Type: dimension. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| divider | `horizontal.true.height`, `vertical.true.width` | container | inset: none · labeled: true · orientation: horizontal (1 of 7) |

### `type.label.sm.default`

Type: typography. Bound by 4 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| pagination | `size.small.type` | status | size: small · style: border · type: compact (1 of 12) |
| pagination-item | `size.small.type.unselected` | label | labeled: false · selection: unselected · size: small · state: focus-visible, hover, pressed, rest · style: border · type: page (4 of 87) |
|  |  | nextText | labeled: true · selection: unselected · size: small · style: border · type: next (5 of 87) |
|  |  | previousText | labeled: true · selection: unselected · size: small · style: border · type: previous (5 of 87) |
| segmented-control-segment | `size.small.type.unselected` | label | selection: unselected · size: small (5 of 30) |
| tab-item | `size.small.type.unselected` | label | selection: unselected · size: small (5 of 30) |

### `type.label.sm.emphasis`

Type: typography. Bound by 10 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| accordion | `size.small.type` | label | size: small (16 of 48) |
| badge | `size.medium.type` | count | emphasis: bold · size: medium · type: count (5 of 40) |
|  |  | label | size: medium · type: status (15 of 40) |
| button | `size.small.filled.type`, `size.small.outline.type` | label | appearance: filled, outline · inset: default · size: small (96 of 576) |
| button-destructive | `size.small.filled.type`, `size.small.outline.type` | label | appearance: filled, outline · inset: default · size: small (96 of 576) |
| button-neutral | `size.small.filled.type`, `size.small.outline.type` | label | appearance: filled, outline · inset: default · size: small (96 of 576) |
| pagination-item | `size.small.type.selected` | label | labeled: false · selection: selected · size: small · state: focus-visible, rest · type: page (4 of 87) |
|  |  | labelReserve | labeled: false · size: small · state: focus-visible, hover, pressed, rest · type: page (8 of 87) |
|  |  | underlineLabel | labeled: false · selection: selected · size: small · state: focus-visible, rest · style: underline · type: page (2 of 87) |
| segmented-control-segment | `size.small.type.selected` | label | selection: selected · size: small (5 of 30) |
|  |  | labelReserve | size: small (10 of 30) |
| sign-in-button | `size.small.type` | label | provider: apple, facebook · size: small · style: black, blue, outline, white (20 of 96) |
| tab-item | `size.small.type.selected` | label | selection: selected · size: small (5 of 30) |
|  |  | labelReserve | size: small (10 of 30) |
| tag | `size.small.type` | label | size: small (15 of 45) |

### `type.label.sm.emphasis-link`

Type: typography. Bound by 3 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| button | `size.small.text.type` | label | appearance: text · size: small (96 of 576) |
| button-destructive | `size.small.text.type` | label | appearance: text · size: small (96 of 576) |
| button-neutral | `size.small.text.type` | label | appearance: text · size: small (96 of 576) |

### `type.title.2xl.strong`

Type: typography. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| code-input-cell | `size.xlarge.type` | digit | size: xlarge · state: error, filled, focus-visible-filled (3 of 28) |

### `type.title.md.strong`

Type: typography. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| code-input-cell | `size.large.type` | digit | size: large · state: error, filled, focus-visible-filled (3 of 28) |

### `type.title.sm.strong`

Type: typography. Bound by 1 component(s).

| Component | Keys | Part | Where |
|---|---|---|---|
| code-input-cell | `size.medium.type` | digit | size: medium · state: error, filled, focus-visible-filled (3 of 28) |

## By component

Every token each component uses. "Declared, not drawn" names tokens the definition binds that no design-file part draws; "drawn, not declared" names tokens the projection binds that the definition does not list (a value the projection derives, such as an inverse-surface twin or a corner rung).

### _accordion-indicator

4 token(s); 12 design-file member(s).

`color.interactive.neutral.icon.rest`, `icon.size.md`, `icon.size.sm`, `icon.size.xs`

### _breadcrumb-separator

2 token(s); 2 design-file member(s).

`color.icon.secondary`, `icon.size.xs`

### _slider-thumb

14 token(s); 15 design-file member(s).

`border-width.heavy`, `color.border.focus`, `color.border.primary`, `color.disabled.icon`, `color.interactive.neutral.border.hover`, `color.interactive.neutral.border.pressed`, `color.interactive.neutral.border.rest`, `control.size.lg.thumb`, `control.size.md.thumb`, `control.size.sm.thumb`, `focus.ring.offset`, `focus.ring.width`, `radius.round`, `space.050`

Declared, not drawn: `color.border.focus`

### accordion

18 token(s); 48 design-file member(s).

`color.interactive.neutral.text.rest`, `color.text.primary`, `focus.ring.offset-field`, `size.lg.height`, `size.md.min-height`, `space.0`, `space.025`, `space.100`, `space.150`, `space.200`, `space.250`, `space.300`, `type.body.lg.default`, `type.body.md.default`, `type.body.sm.default`, `type.label.lg.emphasis`, `type.label.md.emphasis`, `type.label.sm.emphasis`

### badge

37 token(s); 40 design-file member(s).

`border-width.hairline`, `color.background.primary`, `color.border.danger`, `color.border.info`, `color.border.success`, `color.border.tertiary`, `color.border.warning`, `color.foreground.danger`, `color.foreground.danger-subtle`, `color.foreground.info`, `color.foreground.info-subtle`, `color.foreground.secondary`, `color.foreground.success`, `color.foreground.success-subtle`, `color.foreground.warning`, `color.foreground.warning-subtle`, `color.inverse.foreground.tertiary`, `color.inverse.text.primary`, `color.text.danger`, `color.text.info`, `color.text.on-danger`, `color.text.on-info`, `color.text.on-success`, `color.text.on-warning`, `color.text.primary`, `color.text.success`, `color.text.warning`, `control.size.sm.dot`, `radius.round`, `radius.sm`, `space.0`, `space.025`, `space.075`, `space.100`, `space.150`, `type.caption.md.strong`, `type.label.sm.emphasis`

### banner

24 token(s); 8 design-file member(s).

`border-width.hairline`, `border-width.none`, `color.border.danger`, `color.border.info`, `color.border.success`, `color.border.warning`, `color.foreground.danger-subtle`, `color.foreground.info-subtle`, `color.foreground.success-subtle`, `color.foreground.warning-subtle`, `color.icon.danger`, `color.icon.info`, `color.icon.success`, `color.icon.warning`, `color.text.primary`, `container.min`, `icon.size.md`, `radius.md`, `radius.none`, `space.050`, `space.150`, `space.200`, `type.body.md.default`, `type.label.md.emphasis`

### breadcrumb-item

5 token(s); 10 design-file member(s).

`color.text.primary`, `space.050`, `space.100`, `type.body.md.default`, `type.body.sm.default`

### breadcrumbs

4 token(s); 6 design-file member(s).

`color.icon.link.default`, `icon.size.xs`, `space.050`, `space.100`

### button

63 token(s); 576 design-file member(s).

`border-width.hairline`, `color.border.focus`, `color.disabled.border`, `color.disabled.fill`, `color.disabled.icon`, `color.disabled.on-fill`, `color.disabled.text`, `color.interactive.primary.border.hover`, `color.interactive.primary.border.pressed`, `color.interactive.primary.border.rest`, `color.interactive.primary.fill.hover`, `color.interactive.primary.fill.pressed`, `color.interactive.primary.fill.rest`, `color.interactive.primary.icon.hover`, `color.interactive.primary.icon.pressed`, `color.interactive.primary.icon.rest`, `color.interactive.primary.on-fill`, `color.interactive.primary.overlay.hover`, `color.interactive.primary.overlay.pressed`, `color.interactive.primary.text.hover`, `color.interactive.primary.text.pressed`, `color.interactive.primary.text.rest`, `color.inverse.disabled.border`, `color.inverse.disabled.fill`, `color.inverse.disabled.icon`, `color.inverse.disabled.on-fill`, `color.inverse.disabled.text`, `color.inverse.interactive.primary.border.hover`, `color.inverse.interactive.primary.border.pressed`, `color.inverse.interactive.primary.border.rest`, `color.inverse.interactive.primary.fill.hover`, `color.inverse.interactive.primary.fill.pressed`, `color.inverse.interactive.primary.fill.rest`, `color.inverse.interactive.primary.icon.hover`, `color.inverse.interactive.primary.icon.pressed`, `color.inverse.interactive.primary.icon.rest`, `color.inverse.interactive.primary.on-fill`, `color.inverse.interactive.primary.overlay.hover`, `color.inverse.interactive.primary.overlay.pressed`, `color.inverse.interactive.primary.text.hover`, `color.inverse.interactive.primary.text.pressed`, `color.inverse.interactive.primary.text.rest`, `focus.ring.offset`, `focus.ring.width`, `icon.size.md`, `icon.size.sm`, `icon.size.xs`, `radius.md`, `size.lg.height`, `size.md.height`, `size.sm.height`, `space.0`, `space.075`, `space.100`, `space.150`, `space.200`, `space.300`, `type.label.lg.emphasis`, `type.label.lg.emphasis-link`, `type.label.md.emphasis`, `type.label.md.emphasis-link`, `type.label.sm.emphasis`, `type.label.sm.emphasis-link`

Declared, not drawn: `color.border.focus`

Drawn, not declared: `color.inverse.disabled.border`, `color.inverse.disabled.fill`, `color.inverse.disabled.icon`, `color.inverse.disabled.on-fill`, `color.inverse.disabled.text`, `color.inverse.interactive.primary.border.hover`, `color.inverse.interactive.primary.border.pressed`, `color.inverse.interactive.primary.border.rest`, `color.inverse.interactive.primary.fill.hover`, `color.inverse.interactive.primary.fill.pressed`, `color.inverse.interactive.primary.fill.rest`, `color.inverse.interactive.primary.icon.hover`, `color.inverse.interactive.primary.icon.pressed`, `color.inverse.interactive.primary.icon.rest`, `color.inverse.interactive.primary.on-fill`, `color.inverse.interactive.primary.overlay.hover`, `color.inverse.interactive.primary.overlay.pressed`, `color.inverse.interactive.primary.text.hover`, `color.inverse.interactive.primary.text.pressed`, `color.inverse.interactive.primary.text.rest`

### button-destructive

63 token(s); 576 design-file member(s).

`border-width.hairline`, `color.border.focus`, `color.disabled.border`, `color.disabled.fill`, `color.disabled.icon`, `color.disabled.on-fill`, `color.disabled.text`, `color.interactive.destructive.border.hover`, `color.interactive.destructive.border.pressed`, `color.interactive.destructive.border.rest`, `color.interactive.destructive.fill.hover`, `color.interactive.destructive.fill.pressed`, `color.interactive.destructive.fill.rest`, `color.interactive.destructive.icon.hover`, `color.interactive.destructive.icon.pressed`, `color.interactive.destructive.icon.rest`, `color.interactive.destructive.on-fill`, `color.interactive.destructive.overlay.hover`, `color.interactive.destructive.overlay.pressed`, `color.interactive.destructive.text.hover`, `color.interactive.destructive.text.pressed`, `color.interactive.destructive.text.rest`, `color.inverse.disabled.border`, `color.inverse.disabled.fill`, `color.inverse.disabled.icon`, `color.inverse.disabled.on-fill`, `color.inverse.disabled.text`, `color.inverse.interactive.destructive.border.hover`, `color.inverse.interactive.destructive.border.pressed`, `color.inverse.interactive.destructive.border.rest`, `color.inverse.interactive.destructive.fill.hover`, `color.inverse.interactive.destructive.fill.pressed`, `color.inverse.interactive.destructive.fill.rest`, `color.inverse.interactive.destructive.icon.hover`, `color.inverse.interactive.destructive.icon.pressed`, `color.inverse.interactive.destructive.icon.rest`, `color.inverse.interactive.destructive.on-fill`, `color.inverse.interactive.destructive.overlay.hover`, `color.inverse.interactive.destructive.overlay.pressed`, `color.inverse.interactive.destructive.text.hover`, `color.inverse.interactive.destructive.text.pressed`, `color.inverse.interactive.destructive.text.rest`, `focus.ring.offset`, `focus.ring.width`, `icon.size.md`, `icon.size.sm`, `icon.size.xs`, `radius.md`, `size.lg.height`, `size.md.height`, `size.sm.height`, `space.0`, `space.075`, `space.100`, `space.150`, `space.200`, `space.300`, `type.label.lg.emphasis`, `type.label.lg.emphasis-link`, `type.label.md.emphasis`, `type.label.md.emphasis-link`, `type.label.sm.emphasis`, `type.label.sm.emphasis-link`

Declared, not drawn: `color.border.focus`

Drawn, not declared: `color.inverse.disabled.border`, `color.inverse.disabled.fill`, `color.inverse.disabled.icon`, `color.inverse.disabled.on-fill`, `color.inverse.disabled.text`, `color.inverse.interactive.destructive.border.hover`, `color.inverse.interactive.destructive.border.pressed`, `color.inverse.interactive.destructive.border.rest`, `color.inverse.interactive.destructive.fill.hover`, `color.inverse.interactive.destructive.fill.pressed`, `color.inverse.interactive.destructive.fill.rest`, `color.inverse.interactive.destructive.icon.hover`, `color.inverse.interactive.destructive.icon.pressed`, `color.inverse.interactive.destructive.icon.rest`, `color.inverse.interactive.destructive.on-fill`, `color.inverse.interactive.destructive.overlay.hover`, `color.inverse.interactive.destructive.overlay.pressed`, `color.inverse.interactive.destructive.text.hover`, `color.inverse.interactive.destructive.text.pressed`, `color.inverse.interactive.destructive.text.rest`

### button-group

2 token(s); 3 design-file member(s).

`space.100`, `space.150`

### button-neutral

63 token(s); 576 design-file member(s).

`border-width.hairline`, `color.border.focus`, `color.disabled.border`, `color.disabled.fill`, `color.disabled.icon`, `color.disabled.on-fill`, `color.disabled.text`, `color.interactive.neutral.border.hover`, `color.interactive.neutral.border.pressed`, `color.interactive.neutral.border.rest`, `color.interactive.neutral.fill.hover`, `color.interactive.neutral.fill.pressed`, `color.interactive.neutral.fill.rest`, `color.interactive.neutral.icon.hover`, `color.interactive.neutral.icon.pressed`, `color.interactive.neutral.icon.rest`, `color.interactive.neutral.on-fill`, `color.interactive.neutral.overlay.hover`, `color.interactive.neutral.overlay.pressed`, `color.interactive.neutral.text.hover`, `color.interactive.neutral.text.pressed`, `color.interactive.neutral.text.rest`, `color.inverse.disabled.border`, `color.inverse.disabled.fill`, `color.inverse.disabled.icon`, `color.inverse.disabled.on-fill`, `color.inverse.disabled.text`, `color.inverse.interactive.neutral.border.hover`, `color.inverse.interactive.neutral.border.pressed`, `color.inverse.interactive.neutral.border.rest`, `color.inverse.interactive.neutral.fill.hover`, `color.inverse.interactive.neutral.fill.pressed`, `color.inverse.interactive.neutral.fill.rest`, `color.inverse.interactive.neutral.icon.hover`, `color.inverse.interactive.neutral.icon.pressed`, `color.inverse.interactive.neutral.icon.rest`, `color.inverse.interactive.neutral.on-fill`, `color.inverse.interactive.neutral.overlay.hover`, `color.inverse.interactive.neutral.overlay.pressed`, `color.inverse.interactive.neutral.text.hover`, `color.inverse.interactive.neutral.text.pressed`, `color.inverse.interactive.neutral.text.rest`, `focus.ring.offset`, `focus.ring.width`, `icon.size.md`, `icon.size.sm`, `icon.size.xs`, `radius.md`, `size.lg.height`, `size.md.height`, `size.sm.height`, `space.0`, `space.075`, `space.100`, `space.150`, `space.200`, `space.300`, `type.label.lg.emphasis`, `type.label.lg.emphasis-link`, `type.label.md.emphasis`, `type.label.md.emphasis-link`, `type.label.sm.emphasis`, `type.label.sm.emphasis-link`

Declared, not drawn: `color.border.focus`

Drawn, not declared: `color.inverse.disabled.border`, `color.inverse.disabled.fill`, `color.inverse.disabled.icon`, `color.inverse.disabled.on-fill`, `color.inverse.disabled.text`, `color.inverse.interactive.neutral.border.hover`, `color.inverse.interactive.neutral.border.pressed`, `color.inverse.interactive.neutral.border.rest`, `color.inverse.interactive.neutral.fill.hover`, `color.inverse.interactive.neutral.fill.pressed`, `color.inverse.interactive.neutral.fill.rest`, `color.inverse.interactive.neutral.icon.hover`, `color.inverse.interactive.neutral.icon.pressed`, `color.inverse.interactive.neutral.icon.rest`, `color.inverse.interactive.neutral.on-fill`, `color.inverse.interactive.neutral.overlay.hover`, `color.inverse.interactive.neutral.overlay.pressed`, `color.inverse.interactive.neutral.text.hover`, `color.inverse.interactive.neutral.text.pressed`, `color.inverse.interactive.neutral.text.rest`

### card-number-field

31 token(s); 84 design-file member(s).

`border-width.hairline`, `color.border.danger`, `color.border.focus`, `color.border.success`, `color.border.warning`, `color.disabled.border`, `color.disabled.fill`, `color.disabled.on-fill`, `color.field.border.hover`, `color.field.border.rest`, `color.field.fill`, `color.icon.primary`, `color.text.primary`, `color.text.secondary`, `control.size.lg.line-box`, `control.size.md.line-box`, `control.size.sm.line-box`, `focus.ring.offset-field`, `focus.ring.width`, `icon.size.md`, `icon.size.sm`, `radius.sm`, `size.lg.height`, `size.md.min-height`, `space.075`, `space.100`, `space.200`, `space.300`, `type.body.lg.default`, `type.body.md.default`, `type.body.sm.default`

### checkbox-control

20 token(s); 90 design-file member(s).

`border-width.thick`, `color.border.danger`, `color.border.focus`, `color.disabled.border`, `color.disabled.fill`, `color.disabled.on-fill`, `color.field.border.hover`, `color.field.border.rest`, `color.interactive.primary.fill.hover`, `color.interactive.primary.fill.pressed`, `color.interactive.primary.fill.selected`, `color.interactive.primary.on-fill`, `control.size.lg.height`, `control.size.lg.radius`, `control.size.md.height`, `control.size.md.radius`, `control.size.sm.height`, `control.size.sm.radius`, `focus.ring.offset`, `focus.ring.width`

Declared, not drawn: `color.border.focus`

### checkbox-group

2 token(s); 6 design-file member(s).

`space.0`, `space.100`

### checkbox-row

23 token(s); 6 design-file member(s).

`color.disabled.text`, `color.text.primary`, `color.text.secondary`, `control.size.lg.height`, `control.size.lg.label-inset`, `control.size.md.height`, `control.size.md.label-inset`, `control.size.sm.height`, `control.size.sm.label-inset`, `size.lg.height`, `size.md.height`, `size.sm.height`, `space.0`, `space.050`, `space.075`, `space.100`, `space.150`, `type.body.md.default`, `type.body.md.line-box`, `type.body.sm.default`, `type.body.sm.line-box`, `type.body.xs.default`, `type.body.xs.line-box`

Declared, not drawn: `color.disabled.text`

### code-input

1 token(s); 48 design-file member(s).

`space.100`

### code-input-cell

22 token(s); 28 design-file member(s).

`border-width.hairline`, `color.border.danger`, `color.border.focus`, `color.disabled.border`, `color.disabled.fill`, `color.field.border.hover`, `color.field.border.rest`, `color.field.fill`, `color.text.primary`, `focus.ring.offset-field`, `focus.ring.width`, `icon.size.md`, `icon.size.sm`, `icon.size.xl`, `icon.size.xs`, `radius.lg`, `radius.sm`, `space.0`, `type.body.md.default`, `type.title.2xl.strong`, `type.title.md.strong`, `type.title.sm.strong`

### counter

21 token(s); 18 design-file member(s).

`border-width.hairline`, `color.disabled.border`, `color.disabled.text`, `color.field.border.rest`, `color.field.fill`, `color.text.primary`, `focus.ring.offset`, `focus.ring.offset-field`, `focus.ring.width`, `radius.sm`, `size.lg.height`, `size.md.height`, `size.sm.height`, `space.0`, `space.050`, `space.100`, `space.150`, `space.200`, `type.body.lg.default`, `type.body.md.default`, `type.body.sm.default`

### dialog

12 token(s); 24 design-file member(s).

`color.foreground.raised`, `color.text.primary`, `color.text.secondary`, `radius.2xl`, `radius.none`, `shadow.xl`, `space.0`, `space.100`, `space.200`, `space.300`, `type.body.md.default`, `type.label.lg.emphasis`

### divider

14 token(s); 7 design-file member(s).

`border-width.hairline`, `color.border.secondary`, `color.border.tertiary`, `color.text.secondary`, `container.narrow`, `size.md.height`, `size.xl.height`, `space.0`, `space.100`, `space.150`, `space.200`, `space.300`, `type.label.md.default`, `type.label.md.line-box`

Declared, not drawn: `color.border.tertiary`

### field-label

10 token(s); 24 design-file member(s).

`color.disabled.text`, `color.text.primary`, `color.text.secondary`, `space.050`, `type.body.md.default`, `type.body.md.strong`, `type.body.sm.default`, `type.body.sm.strong`, `type.body.xs.default`, `type.body.xs.strong`

### field-message

11 token(s); 4 design-file member(s).

`color.icon.danger`, `color.icon.secondary`, `color.icon.success`, `color.icon.warning`, `color.text.danger`, `color.text.secondary`, `color.text.success`, `color.text.warning`, `icon.size.xs`, `space.075`, `type.caption.md.default`

Declared, not drawn: `color.icon.secondary`

### flush-icon-button

26 token(s); 60 design-file member(s).

`border-width.hairline`, `color.border.secondary`, `color.disabled.border`, `color.disabled.icon`, `color.interactive.primary.icon.hover`, `color.interactive.primary.icon.pressed`, `color.interactive.primary.icon.rest`, `color.interactive.primary.overlay.hover`, `color.interactive.primary.overlay.pressed`, `color.inverse.border.secondary`, `color.inverse.disabled.border`, `color.inverse.disabled.icon`, `color.inverse.interactive.primary.icon.hover`, `color.inverse.interactive.primary.icon.pressed`, `color.inverse.interactive.primary.icon.rest`, `color.inverse.interactive.primary.overlay.hover`, `color.inverse.interactive.primary.overlay.pressed`, `focus.ring.offset`, `focus.ring.width`, `icon.size.md`, `icon.size.sm`, `radius.none`, `radius.round`, `size.lg.height`, `size.md.height`, `size.sm.height`

Drawn, not declared: `color.inverse.border.secondary`, `color.inverse.disabled.border`, `color.inverse.disabled.icon`, `color.inverse.interactive.primary.icon.hover`, `color.inverse.interactive.primary.icon.pressed`, `color.inverse.interactive.primary.icon.rest`, `color.inverse.interactive.primary.overlay.hover`, `color.inverse.interactive.primary.overlay.pressed`

### flush-icon-button-destructive

26 token(s); 60 design-file member(s).

`border-width.hairline`, `color.border.secondary`, `color.disabled.border`, `color.disabled.icon`, `color.interactive.destructive.icon.hover`, `color.interactive.destructive.icon.pressed`, `color.interactive.destructive.icon.rest`, `color.interactive.destructive.overlay.hover`, `color.interactive.destructive.overlay.pressed`, `color.inverse.border.secondary`, `color.inverse.disabled.border`, `color.inverse.disabled.icon`, `color.inverse.interactive.destructive.icon.hover`, `color.inverse.interactive.destructive.icon.pressed`, `color.inverse.interactive.destructive.icon.rest`, `color.inverse.interactive.destructive.overlay.hover`, `color.inverse.interactive.destructive.overlay.pressed`, `focus.ring.offset`, `focus.ring.width`, `icon.size.md`, `icon.size.sm`, `radius.none`, `radius.round`, `size.lg.height`, `size.md.height`, `size.sm.height`

Drawn, not declared: `color.inverse.border.secondary`, `color.inverse.disabled.border`, `color.inverse.disabled.icon`, `color.inverse.interactive.destructive.icon.hover`, `color.inverse.interactive.destructive.icon.pressed`, `color.inverse.interactive.destructive.icon.rest`, `color.inverse.interactive.destructive.overlay.hover`, `color.inverse.interactive.destructive.overlay.pressed`

### flush-icon-button-neutral

26 token(s); 60 design-file member(s).

`border-width.hairline`, `color.border.secondary`, `color.disabled.border`, `color.disabled.icon`, `color.interactive.neutral.icon.hover`, `color.interactive.neutral.icon.pressed`, `color.interactive.neutral.icon.rest`, `color.interactive.neutral.overlay.hover`, `color.interactive.neutral.overlay.pressed`, `color.inverse.border.secondary`, `color.inverse.disabled.border`, `color.inverse.disabled.icon`, `color.inverse.interactive.neutral.icon.hover`, `color.inverse.interactive.neutral.icon.pressed`, `color.inverse.interactive.neutral.icon.rest`, `color.inverse.interactive.neutral.overlay.hover`, `color.inverse.interactive.neutral.overlay.pressed`, `focus.ring.offset`, `focus.ring.width`, `icon.size.md`, `icon.size.sm`, `radius.none`, `radius.round`, `size.lg.height`, `size.md.height`, `size.sm.height`

Drawn, not declared: `color.inverse.border.secondary`, `color.inverse.disabled.border`, `color.inverse.disabled.icon`, `color.inverse.interactive.neutral.icon.hover`, `color.inverse.interactive.neutral.icon.pressed`, `color.inverse.interactive.neutral.icon.rest`, `color.inverse.interactive.neutral.overlay.hover`, `color.inverse.interactive.neutral.overlay.pressed`

### focus-ring

7 token(s); 2 design-file member(s).

`color.border.focus`, `color.inverse.border.focus`, `focus.ring.offset`, `focus.ring.offset-field`, `focus.ring.style`, `focus.ring.width`, `size.md.height`

Declared, not drawn: `focus.ring.offset`, `focus.ring.offset-field`, `focus.ring.style`

Drawn, not declared: `color.inverse.border.focus`

### icon

12 token(s); 46 design-file member(s).

`color.icon.brand`, `color.icon.danger`, `color.icon.info`, `color.icon.primary`, `color.icon.secondary`, `color.icon.success`, `color.icon.tertiary`, `color.icon.warning`, `icon.size.lg`, `icon.size.md`, `icon.size.sm`, `icon.size.xs`

Declared, not drawn: `color.icon.brand`, `color.icon.danger`, `color.icon.info`, `color.icon.secondary`, `color.icon.success`, `color.icon.tertiary`, `color.icon.warning`, `icon.size.lg`, `icon.size.md`, `icon.size.sm`, `icon.size.xs`

### icon-button

42 token(s); 216 design-file member(s).

`border-width.hairline`, `color.border.focus`, `color.disabled.border`, `color.disabled.fill`, `color.disabled.icon`, `color.interactive.primary.border.hover`, `color.interactive.primary.border.pressed`, `color.interactive.primary.border.rest`, `color.interactive.primary.fill.hover`, `color.interactive.primary.fill.pressed`, `color.interactive.primary.fill.rest`, `color.interactive.primary.icon.hover`, `color.interactive.primary.icon.pressed`, `color.interactive.primary.icon.rest`, `color.interactive.primary.on-fill`, `color.interactive.primary.overlay.hover`, `color.interactive.primary.overlay.pressed`, `color.inverse.disabled.border`, `color.inverse.disabled.fill`, `color.inverse.disabled.icon`, `color.inverse.interactive.primary.border.hover`, `color.inverse.interactive.primary.border.pressed`, `color.inverse.interactive.primary.border.rest`, `color.inverse.interactive.primary.fill.hover`, `color.inverse.interactive.primary.fill.pressed`, `color.inverse.interactive.primary.fill.rest`, `color.inverse.interactive.primary.icon.hover`, `color.inverse.interactive.primary.icon.pressed`, `color.inverse.interactive.primary.icon.rest`, `color.inverse.interactive.primary.on-fill`, `color.inverse.interactive.primary.overlay.hover`, `color.inverse.interactive.primary.overlay.pressed`, `focus.ring.offset`, `focus.ring.width`, `icon.size.lg`, `icon.size.md`, `icon.size.sm`, `radius.md`, `radius.round`, `size.lg.height`, `size.md.height`, `size.sm.height`

Declared, not drawn: `color.border.focus`

Drawn, not declared: `color.inverse.disabled.border`, `color.inverse.disabled.fill`, `color.inverse.disabled.icon`, `color.inverse.interactive.primary.border.hover`, `color.inverse.interactive.primary.border.pressed`, `color.inverse.interactive.primary.border.rest`, `color.inverse.interactive.primary.fill.hover`, `color.inverse.interactive.primary.fill.pressed`, `color.inverse.interactive.primary.fill.rest`, `color.inverse.interactive.primary.icon.hover`, `color.inverse.interactive.primary.icon.pressed`, `color.inverse.interactive.primary.icon.rest`, `color.inverse.interactive.primary.on-fill`, `color.inverse.interactive.primary.overlay.hover`, `color.inverse.interactive.primary.overlay.pressed`

### icon-button-destructive

42 token(s); 216 design-file member(s).

`border-width.hairline`, `color.border.focus`, `color.disabled.border`, `color.disabled.fill`, `color.disabled.icon`, `color.interactive.destructive.border.hover`, `color.interactive.destructive.border.pressed`, `color.interactive.destructive.border.rest`, `color.interactive.destructive.fill.hover`, `color.interactive.destructive.fill.pressed`, `color.interactive.destructive.fill.rest`, `color.interactive.destructive.icon.hover`, `color.interactive.destructive.icon.pressed`, `color.interactive.destructive.icon.rest`, `color.interactive.destructive.on-fill`, `color.interactive.destructive.overlay.hover`, `color.interactive.destructive.overlay.pressed`, `color.inverse.disabled.border`, `color.inverse.disabled.fill`, `color.inverse.disabled.icon`, `color.inverse.interactive.destructive.border.hover`, `color.inverse.interactive.destructive.border.pressed`, `color.inverse.interactive.destructive.border.rest`, `color.inverse.interactive.destructive.fill.hover`, `color.inverse.interactive.destructive.fill.pressed`, `color.inverse.interactive.destructive.fill.rest`, `color.inverse.interactive.destructive.icon.hover`, `color.inverse.interactive.destructive.icon.pressed`, `color.inverse.interactive.destructive.icon.rest`, `color.inverse.interactive.destructive.on-fill`, `color.inverse.interactive.destructive.overlay.hover`, `color.inverse.interactive.destructive.overlay.pressed`, `focus.ring.offset`, `focus.ring.width`, `icon.size.lg`, `icon.size.md`, `icon.size.sm`, `radius.md`, `radius.round`, `size.lg.height`, `size.md.height`, `size.sm.height`

Declared, not drawn: `color.border.focus`

Drawn, not declared: `color.inverse.disabled.border`, `color.inverse.disabled.fill`, `color.inverse.disabled.icon`, `color.inverse.interactive.destructive.border.hover`, `color.inverse.interactive.destructive.border.pressed`, `color.inverse.interactive.destructive.border.rest`, `color.inverse.interactive.destructive.fill.hover`, `color.inverse.interactive.destructive.fill.pressed`, `color.inverse.interactive.destructive.fill.rest`, `color.inverse.interactive.destructive.icon.hover`, `color.inverse.interactive.destructive.icon.pressed`, `color.inverse.interactive.destructive.icon.rest`, `color.inverse.interactive.destructive.on-fill`, `color.inverse.interactive.destructive.overlay.hover`, `color.inverse.interactive.destructive.overlay.pressed`

### icon-button-neutral

42 token(s); 216 design-file member(s).

`border-width.hairline`, `color.border.focus`, `color.disabled.border`, `color.disabled.fill`, `color.disabled.icon`, `color.interactive.neutral.border.hover`, `color.interactive.neutral.border.pressed`, `color.interactive.neutral.border.rest`, `color.interactive.neutral.fill.hover`, `color.interactive.neutral.fill.pressed`, `color.interactive.neutral.fill.rest`, `color.interactive.neutral.icon.hover`, `color.interactive.neutral.icon.pressed`, `color.interactive.neutral.icon.rest`, `color.interactive.neutral.on-fill`, `color.interactive.neutral.overlay.hover`, `color.interactive.neutral.overlay.pressed`, `color.inverse.disabled.border`, `color.inverse.disabled.fill`, `color.inverse.disabled.icon`, `color.inverse.interactive.neutral.border.hover`, `color.inverse.interactive.neutral.border.pressed`, `color.inverse.interactive.neutral.border.rest`, `color.inverse.interactive.neutral.fill.hover`, `color.inverse.interactive.neutral.fill.pressed`, `color.inverse.interactive.neutral.fill.rest`, `color.inverse.interactive.neutral.icon.hover`, `color.inverse.interactive.neutral.icon.pressed`, `color.inverse.interactive.neutral.icon.rest`, `color.inverse.interactive.neutral.on-fill`, `color.inverse.interactive.neutral.overlay.hover`, `color.inverse.interactive.neutral.overlay.pressed`, `focus.ring.offset`, `focus.ring.width`, `icon.size.lg`, `icon.size.md`, `icon.size.sm`, `radius.md`, `radius.round`, `size.lg.height`, `size.md.height`, `size.sm.height`

Declared, not drawn: `color.border.focus`

Drawn, not declared: `color.inverse.disabled.border`, `color.inverse.disabled.fill`, `color.inverse.disabled.icon`, `color.inverse.interactive.neutral.border.hover`, `color.inverse.interactive.neutral.border.pressed`, `color.inverse.interactive.neutral.border.rest`, `color.inverse.interactive.neutral.fill.hover`, `color.inverse.interactive.neutral.fill.pressed`, `color.inverse.interactive.neutral.fill.rest`, `color.inverse.interactive.neutral.icon.hover`, `color.inverse.interactive.neutral.icon.pressed`, `color.inverse.interactive.neutral.icon.rest`, `color.inverse.interactive.neutral.on-fill`, `color.inverse.interactive.neutral.overlay.hover`, `color.inverse.interactive.neutral.overlay.pressed`

### image-placeholder

3 token(s); 7 design-file member(s).

`color.background.secondary`, `color.icon.tertiary`, `container.narrow`

### link

35 token(s); 144 design-file member(s).

`border-width.thick`, `color.icon.link.default`, `color.icon.link.focused`, `color.icon.link.hover`, `color.icon.link.pressed`, `color.inverse.icon.link.default`, `color.inverse.icon.link.focused`, `color.inverse.icon.link.hover`, `color.inverse.icon.link.pressed`, `color.inverse.text.link.default`, `color.inverse.text.link.focused`, `color.inverse.text.link.hover`, `color.inverse.text.link.pressed`, `color.text.link.default`, `color.text.link.focused`, `color.text.link.hover`, `color.text.link.pressed`, `focus.ring.offset`, `focus.ring.width`, `icon.size.sm`, `icon.size.xs`, `space.050`, `space.100`, `type.body.lg.default`, `type.body.lg.default-link`, `type.body.lg.strong`, `type.body.lg.strong-link`, `type.body.md.default`, `type.body.md.default-link`, `type.body.md.strong`, `type.body.md.strong-link`, `type.body.sm.default`, `type.body.sm.default-link`, `type.body.sm.strong`, `type.body.sm.strong-link`

Drawn, not declared: `color.inverse.icon.link.default`, `color.inverse.icon.link.focused`, `color.inverse.icon.link.hover`, `color.inverse.icon.link.pressed`, `color.inverse.text.link.default`, `color.inverse.text.link.focused`, `color.inverse.text.link.hover`, `color.inverse.text.link.pressed`

### list

3 token(s); 9 design-file member(s).

`space.150`, `space.200`, `space.250`

### list-item

20 token(s); 9 design-file member(s).

`color.icon.primary`, `color.text.primary`, `control.size.lg.line-box`, `control.size.md.line-box`, `control.size.sm.line-box`, `icon.size.lg`, `icon.size.md`, `icon.size.sm`, `radius.round`, `space.0`, `space.075`, `space.100`, `space.250`, `space.300`, `space.400`, `space.500`, `space.600`, `type.body.lg.default`, `type.body.md.default`, `type.body.sm.default`

### pagination

5 token(s); 12 design-file member(s).

`color.text.primary`, `space.050`, `type.label.lg.default`, `type.label.md.default`, `type.label.sm.default`

### pagination-item

34 token(s); 87 design-file member(s).

`border-width.hairline`, `border-width.thick`, `color.border.focus`, `color.border.secondary`, `color.border.tertiary`, `color.disabled.icon`, `color.disabled.text`, `color.icon.primary`, `color.interactive.neutral.icon.hover`, `color.interactive.neutral.icon.pressed`, `color.interactive.neutral.icon.rest`, `color.interactive.neutral.overlay.hover`, `color.interactive.neutral.overlay.pressed`, `color.interactive.neutral.text.hover`, `color.interactive.neutral.text.pressed`, `color.interactive.neutral.text.rest`, `focus.ring.offset`, `focus.ring.width`, `icon.size.md`, `icon.size.sm`, `icon.size.xs`, `radius.md`, `size.lg.height`, `size.md.height`, `size.sm.height`, `space.0`, `space.050`, `space.100`, `type.label.lg.default`, `type.label.lg.emphasis`, `type.label.md.default`, `type.label.md.emphasis`, `type.label.sm.default`, `type.label.sm.emphasis`

Declared, not drawn: `color.border.focus`

### password-field

30 token(s); 84 design-file member(s).

`border-width.hairline`, `color.border.danger`, `color.border.focus`, `color.border.success`, `color.border.warning`, `color.disabled.border`, `color.disabled.fill`, `color.disabled.on-fill`, `color.field.border.hover`, `color.field.border.rest`, `color.field.fill`, `color.icon.primary`, `color.text.primary`, `color.text.secondary`, `control.size.lg.line-box`, `control.size.md.line-box`, `control.size.sm.line-box`, `focus.ring.offset-field`, `focus.ring.width`, `icon.size.sm`, `radius.sm`, `size.lg.height`, `size.md.min-height`, `space.075`, `space.100`, `space.200`, `space.300`, `type.body.lg.default`, `type.body.md.default`, `type.body.sm.default`

### progress

14 token(s); 12 design-file member(s).

`border-width.heavy`, `color.background.tertiary`, `color.icon.brand`, `color.icon.danger`, `color.icon.success`, `color.text.primary`, `color.text.secondary`, `icon.size.md`, `icon.size.xl`, `radius.capsule`, `space.075`, `space.100`, `type.body.sm.default`, `type.label.md.emphasis`

### provider-logo

6 token(s); 75 design-file member(s).

`border-width.hairline`, `color.border.primary`, `icon.size.lg`, `icon.size.md`, `icon.size.sm`, `radius.sm`

Declared, not drawn: `icon.size.lg`, `icon.size.md`, `icon.size.sm`

### radio-control

20 token(s); 60 design-file member(s).

`border-width.thick`, `color.border.danger`, `color.border.focus`, `color.disabled.border`, `color.disabled.fill`, `color.field.border.hover`, `color.field.border.rest`, `color.interactive.primary.border.hover`, `color.interactive.primary.border.pressed`, `color.interactive.primary.border.rest`, `color.interactive.primary.fill.selected`, `control.size.lg.dot`, `control.size.lg.height`, `control.size.md.dot`, `control.size.md.height`, `control.size.sm.dot`, `control.size.sm.height`, `focus.ring.offset`, `focus.ring.width`, `radius.round`

Declared, not drawn: `color.border.focus`

### radio-group

2 token(s); 6 design-file member(s).

`space.0`, `space.100`

### radio-row

23 token(s); 6 design-file member(s).

`color.disabled.text`, `color.text.primary`, `color.text.secondary`, `control.size.lg.height`, `control.size.lg.label-inset`, `control.size.md.height`, `control.size.md.label-inset`, `control.size.sm.height`, `control.size.sm.label-inset`, `size.lg.height`, `size.md.height`, `size.sm.height`, `space.0`, `space.050`, `space.075`, `space.100`, `space.150`, `type.body.md.default`, `type.body.md.line-box`, `type.body.sm.default`, `type.body.sm.line-box`, `type.body.xs.default`, `type.body.xs.line-box`

Declared, not drawn: `color.disabled.text`

### search-field

30 token(s); 84 design-file member(s).

`border-width.hairline`, `color.border.danger`, `color.border.focus`, `color.border.success`, `color.border.warning`, `color.disabled.border`, `color.disabled.fill`, `color.disabled.on-fill`, `color.field.border.hover`, `color.field.border.rest`, `color.field.fill`, `color.icon.primary`, `color.text.primary`, `color.text.secondary`, `control.size.lg.line-box`, `control.size.md.line-box`, `control.size.sm.line-box`, `focus.ring.offset-field`, `focus.ring.width`, `icon.size.sm`, `radius.sm`, `size.lg.height`, `size.md.min-height`, `space.075`, `space.100`, `space.200`, `space.300`, `type.body.lg.default`, `type.body.md.default`, `type.body.sm.default`

### segmented-control

4 token(s); 3 design-file member(s).

`color.background.secondary`, `radius.md`, `space.0`, `space.100`

### segmented-control-segment

34 token(s); 30 design-file member(s).

`color.background.primary`, `color.border.focus`, `color.disabled.icon`, `color.disabled.text`, `color.interactive.neutral.icon.hover`, `color.interactive.neutral.icon.pressed`, `color.interactive.neutral.icon.rest`, `color.interactive.neutral.overlay.hover`, `color.interactive.neutral.overlay.pressed`, `color.interactive.neutral.text.hover`, `color.interactive.neutral.text.pressed`, `color.interactive.neutral.text.rest`, `focus.ring.offset`, `focus.ring.width`, `icon.size.md`, `icon.size.sm`, `icon.size.xs`, `radius.sm`, `size.lg.height`, `size.md.height`, `size.sm.height`, `space.0`, `space.050`, `space.075`, `space.100`, `space.150`, `space.200`, `space.250`, `type.label.lg.default`, `type.label.lg.emphasis`, `type.label.md.default`, `type.label.md.emphasis`, `type.label.sm.default`, `type.label.sm.emphasis`

Declared, not drawn: `color.border.focus`

### select

27 token(s); 84 design-file member(s).

`border-width.hairline`, `color.border.danger`, `color.border.focus`, `color.border.success`, `color.border.warning`, `color.disabled.border`, `color.disabled.fill`, `color.disabled.on-fill`, `color.field.border.hover`, `color.field.border.rest`, `color.field.fill`, `color.icon.primary`, `color.text.primary`, `color.text.secondary`, `focus.ring.offset-field`, `focus.ring.width`, `icon.size.sm`, `radius.sm`, `size.lg.height`, `size.md.min-height`, `space.075`, `space.100`, `space.200`, `space.300`, `type.body.lg.default`, `type.body.md.default`, `type.body.sm.default`

### sign-in-button

18 token(s); 96 design-file member(s).

`border-width.hairline`, `focus.ring.offset`, `focus.ring.width`, `icon.size.md`, `icon.size.sm`, `icon.size.xs`, `radius.md`, `size.lg.height`, `size.md.height`, `size.sm.height`, `space.075`, `space.100`, `space.150`, `space.200`, `space.300`, `type.label.lg.emphasis`, `type.label.md.emphasis`, `type.label.sm.emphasis`

### slider

17 token(s); 30 design-file member(s).

`border-width.heavy`, `border-width.thick`, `border-width.x-heavy`, `color.disabled.fill`, `color.disabled.icon`, `color.disabled.text`, `color.field.border.rest`, `color.interactive.neutral.border.rest`, `color.text.primary`, `color.text.secondary`, `radius.round`, `size.md.min-height`, `space.0`, `space.100`, `space.150`, `type.body.sm.default`, `type.body.xs.default`

### spinner

5 token(s); 4 design-file member(s).

`color.icon.primary`, `icon.size.lg`, `icon.size.md`, `icon.size.sm`, `icon.size.xs`

### switch-control

25 token(s); 40 design-file member(s).

`border-width.thick`, `color.background.tertiary`, `color.border.danger`, `color.border.focus`, `color.disabled.border`, `color.disabled.fill`, `color.disabled.on-fill`, `color.interactive.neutral.border.hover`, `color.interactive.neutral.border.pressed`, `color.interactive.neutral.border.rest`, `color.interactive.primary.fill.hover`, `color.interactive.primary.fill.pressed`, `color.interactive.primary.fill.selected`, `color.interactive.primary.on-fill`, `control.size.md.inset`, `control.size.md.thumb`, `control.size.md.track`, `control.size.md.width`, `control.size.sm.inset`, `control.size.sm.thumb`, `control.size.sm.track`, `control.size.sm.width`, `focus.ring.offset`, `focus.ring.width`, `radius.round`

Declared, not drawn: `color.border.focus`

### switch-row

13 token(s); 4 design-file member(s).

`color.disabled.text`, `color.text.primary`, `control.size.md.track`, `control.size.sm.track`, `size.md.height`, `size.sm.height`, `space.0`, `space.075`, `space.100`, `type.body.sm.default`, `type.body.sm.line-box`, `type.body.xs.default`, `type.body.xs.line-box`

Declared, not drawn: `color.disabled.text`

### tab-item

41 token(s); 30 design-file member(s).

`border-width.thick`, `color.border.focus`, `color.border.secondary`, `color.disabled.border`, `color.disabled.icon`, `color.disabled.text`, `color.interactive.neutral.icon.hover`, `color.interactive.neutral.icon.pressed`, `color.interactive.neutral.icon.rest`, `color.interactive.neutral.text.hover`, `color.interactive.neutral.text.pressed`, `color.interactive.neutral.text.rest`, `color.interactive.primary.border.hover`, `color.interactive.primary.border.pressed`, `color.interactive.primary.border.rest`, `color.interactive.primary.icon.hover`, `color.interactive.primary.icon.pressed`, `color.interactive.primary.icon.rest`, `color.interactive.primary.text.hover`, `color.interactive.primary.text.pressed`, `color.interactive.primary.text.rest`, `focus.ring.offset`, `focus.ring.width`, `icon.size.md`, `icon.size.sm`, `icon.size.xs`, `size.lg.height`, `size.md.height`, `size.sm.height`, `space.0`, `space.075`, `space.100`, `space.150`, `space.200`, `space.250`, `type.label.lg.default`, `type.label.lg.emphasis`, `type.label.md.default`, `type.label.md.emphasis`, `type.label.sm.default`, `type.label.sm.emphasis`

Declared, not drawn: `color.border.focus`

### tabs

3 token(s); 6 design-file member(s).

`border-width.hairline`, `color.border.primary`, `space.0`

### tag

40 token(s); 45 design-file member(s).

`border-width.hairline`, `border-width.thick`, `color.border.focus`, `color.disabled.border`, `color.disabled.icon`, `color.disabled.text`, `color.interactive.neutral.border.hover`, `color.interactive.neutral.border.pressed`, `color.interactive.neutral.border.rest`, `color.interactive.neutral.icon.hover`, `color.interactive.neutral.icon.pressed`, `color.interactive.neutral.icon.rest`, `color.interactive.neutral.overlay.hover`, `color.interactive.neutral.overlay.pressed`, `color.interactive.neutral.text.hover`, `color.interactive.neutral.text.pressed`, `color.interactive.neutral.text.rest`, `color.interactive.primary.border.hover`, `color.interactive.primary.border.pressed`, `color.interactive.primary.border.rest`, `color.interactive.primary.subtle-fill.selected`, `focus.ring.offset`, `focus.ring.width`, `icon.size.md`, `icon.size.sm`, `icon.size.xs`, `radius.round`, `size.lg.height`, `size.md.height`, `size.sm.height`, `space.0`, `space.025`, `space.050`, `space.075`, `space.100`, `space.150`, `space.200`, `type.label.lg.emphasis`, `type.label.md.emphasis`, `type.label.sm.emphasis`

Declared, not drawn: `color.border.focus`

### text-field

30 token(s); 84 design-file member(s).

`border-width.hairline`, `color.border.danger`, `color.border.focus`, `color.border.success`, `color.border.warning`, `color.disabled.border`, `color.disabled.fill`, `color.disabled.on-fill`, `color.field.border.hover`, `color.field.border.rest`, `color.field.fill`, `color.icon.primary`, `color.text.primary`, `color.text.secondary`, `control.size.lg.line-box`, `control.size.md.line-box`, `control.size.sm.line-box`, `focus.ring.offset-field`, `focus.ring.width`, `icon.size.sm`, `radius.sm`, `size.lg.height`, `size.md.min-height`, `space.075`, `space.100`, `space.200`, `space.300`, `type.body.lg.default`, `type.body.md.default`, `type.body.sm.default`

### textarea

30 token(s); 84 design-file member(s).

`border-width.hairline`, `color.border.danger`, `color.border.focus`, `color.border.success`, `color.border.warning`, `color.disabled.border`, `color.disabled.fill`, `color.disabled.on-fill`, `color.disabled.text`, `color.field.border.hover`, `color.field.border.rest`, `color.field.fill`, `color.icon.secondary`, `color.text.primary`, `color.text.secondary`, `control.size.lg.line-box`, `control.size.md.line-box`, `control.size.sm.line-box`, `focus.ring.offset-field`, `focus.ring.width`, `icon.size.xs`, `radius.sm`, `space.075`, `space.100`, `space.200`, `space.300`, `type.body.lg.default`, `type.body.md.default`, `type.body.sm.default`, `type.caption.md.default`

### toast

12 token(s); 2 design-file member(s).

`color.inverse.background.primary`, `color.inverse.icon.success`, `color.inverse.text.primary`, `icon.size.sm`, `radius.xl`, `shadow.lg`, `size.md.height`, `space.050`, `space.100`, `space.150`, `space.200`, `type.body.sm.default`

### veil

9 token(s); 30 design-file member(s).

`color.veil.dark.clear`, `color.veil.dark.medium`, `color.veil.dark.strong`, `color.veil.dark.subtle`, `color.veil.light.clear`, `color.veil.light.medium`, `color.veil.light.strong`, `color.veil.light.subtle`, `container.narrow`

### wallet-button

9 token(s); 20 design-file member(s).

`focus.ring.offset`, `focus.ring.width`, `icon.size.lg`, `icon.size.md`, `icon.size.sm`, `radius.md`, `size.lg.height`, `size.md.height`, `size.sm.height`

## Tokens no component binds

249 semantic token(s) and 280 primitive(s). Primitives (`core.*`) are listed apart — components bind semantic roles, which alias the primitives, so an unbound primitive is expected.

### Semantic

- **blur** — `blur.glass`
- **breakpoint** — `breakpoint.2xl`, `breakpoint.lg`, `breakpoint.md`, `breakpoint.sm`, `breakpoint.xl`
- **color.border** — `color.border.brand`
- **color.field** — `color.field.placeholder`
- **color.foreground** — `color.foreground.brand`, `color.foreground.brand-subtle`, `color.foreground.primary`, `color.foreground.tertiary`
- **color.glass** — `color.glass.surface`
- **color.icon** — `color.icon.brand-subtle`, `color.icon.danger-subtle`, `color.icon.info-subtle`, `color.icon.link.visited`, `color.icon.on-brand`, `color.icon.on-danger`, `color.icon.on-info`, `color.icon.on-success`, `color.icon.on-warning`, `color.icon.success-subtle`, `color.icon.warning-subtle`
- **color.interactive** — `color.interactive.destructive.fill.focused`, `color.interactive.destructive.fill.selected`, `color.interactive.destructive.overlay.selected`, `color.interactive.neutral.fill.focused`, `color.interactive.neutral.fill.selected`, `color.interactive.neutral.overlay.selected`, `color.interactive.primary.fill.focused`, `color.interactive.primary.overlay.selected`
- **color.inverse** — `color.inverse.background.secondary`, `color.inverse.background.tertiary`, `color.inverse.border.brand`, `color.inverse.border.danger`, `color.inverse.border.info`, `color.inverse.border.primary`, `color.inverse.border.success`, `color.inverse.border.tertiary`, `color.inverse.border.warning`, `color.inverse.field.border.hover`, `color.inverse.field.border.rest`, `color.inverse.field.fill`, `color.inverse.field.placeholder`, `color.inverse.foreground.brand`, `color.inverse.foreground.brand-subtle`, `color.inverse.foreground.danger`, `color.inverse.foreground.danger-subtle`, `color.inverse.foreground.info`, `color.inverse.foreground.info-subtle`, `color.inverse.foreground.primary`, `color.inverse.foreground.secondary`, `color.inverse.foreground.success`, `color.inverse.foreground.success-subtle`, `color.inverse.foreground.warning`, `color.inverse.foreground.warning-subtle`, `color.inverse.icon.brand`, `color.inverse.icon.brand-subtle`, `color.inverse.icon.danger`, `color.inverse.icon.danger-subtle`, `color.inverse.icon.info`, `color.inverse.icon.info-subtle`, `color.inverse.icon.link.visited`, `color.inverse.icon.primary`, `color.inverse.icon.secondary`, `color.inverse.icon.success-subtle`, `color.inverse.icon.tertiary`, `color.inverse.icon.warning`, `color.inverse.icon.warning-subtle`, `color.inverse.interactive.destructive.fill.focused`, `color.inverse.interactive.destructive.fill.selected`, `color.inverse.interactive.destructive.overlay.selected`, `color.inverse.interactive.neutral.fill.focused`, `color.inverse.interactive.neutral.fill.selected`, `color.inverse.interactive.neutral.overlay.selected`, `color.inverse.interactive.primary.fill.focused`, `color.inverse.interactive.primary.fill.selected`, `color.inverse.interactive.primary.overlay.selected`, `color.inverse.text.brand`, `color.inverse.text.brand-subtle`, `color.inverse.text.danger`, `color.inverse.text.danger-subtle`, `color.inverse.text.info`, `color.inverse.text.info-subtle`, `color.inverse.text.link.visited`, `color.inverse.text.secondary`, `color.inverse.text.success`, `color.inverse.text.success-subtle`, `color.inverse.text.tertiary`, `color.inverse.text.warning`, `color.inverse.text.warning-subtle`
- **color.scrim** — `color.scrim.default`
- **color.text** — `color.text.brand`, `color.text.brand-subtle`, `color.text.danger-subtle`, `color.text.info-subtle`, `color.text.link.visited`, `color.text.on-brand`, `color.text.success-subtle`, `color.text.tertiary`, `color.text.warning-subtle`
- **container** — `container.fluid`, `container.max`
- **control** — `control.size.lg.inset`, `control.size.lg.track`, `control.size.lg.width`
- **gradient** — `gradient.brand`, `gradient.glow`
- **grid** — `grid.2xl.columns`, `grid.2xl.gutter`, `grid.2xl.margin`, `grid.lg.columns`, `grid.lg.gutter`, `grid.lg.margin`, `grid.md.columns`, `grid.md.gutter`, `grid.md.margin`, `grid.sm.columns`, `grid.sm.gutter`, `grid.sm.margin`, `grid.xl.columns`, `grid.xl.gutter`, `grid.xl.margin`
- **motion** — `motion.duration-ms.0`, `motion.duration-ms.100`, `motion.duration-ms.1600`, `motion.duration-ms.200`, `motion.duration-ms.2600`, `motion.duration-ms.300`, `motion.duration-ms.40`, `motion.duration-ms.50`, `motion.duration-ms.500`, `motion.duration-ms.800`, `motion.duration-reduced.fast`, `motion.duration-reduced.instant`, `motion.duration-reduced.moderate`, `motion.duration-reduced.normal`, `motion.duration-reduced.slow`, `motion.duration-reduced.slower`, `motion.duration-reduced.spin`, `motion.duration-reduced.sweep`, `motion.duration.fast`, `motion.duration.instant`, `motion.duration.moderate`, `motion.duration.normal`, `motion.duration.slow`, `motion.duration.slower`, `motion.duration.spin`, `motion.duration.sweep`, `motion.easing-role.default`, `motion.easing-role.emphasized`, `motion.easing-role.enter`, `motion.easing-role.exit`, `motion.easing.accelerate`, `motion.easing.calm`, `motion.easing.decelerate`, `motion.easing.expressive`, `motion.easing.linear`, `motion.easing.standard`, `motion.spring.bouncy`, `motion.spring.gentle`, `motion.spring.snappy`, `motion.stagger`, `motion.transition.default`, `motion.transition.emphasized`, `motion.transition.enter`, `motion.transition.exit`
- **opacity** — `opacity.0`, `opacity.10`, `opacity.100`, `opacity.20`, `opacity.30`, `opacity.40`, `opacity.5`, `opacity.50`, `opacity.60`, `opacity.70`, `opacity.80`, `opacity.90`
- **radius** — `radius.3xl`, `radius.hairline`
- **shadow** — `shadow.2xl`, `shadow.inset`, `shadow.md`, `shadow.sm`, `shadow.xs`
- **size** — `size.xs.height`
- **space** — `space.1000`, `space.1100`, `space.1200`, `space.700`, `space.800`, `space.900`
- **type** — `type.body.lg.default-italic`, `type.body.lg.default-italic-link`, `type.body.lg.line-box`, `type.body.lg.strong-italic`, `type.body.lg.strong-italic-link`, `type.body.md.default-italic`, `type.body.md.default-italic-link`, `type.body.md.strong-italic`, `type.body.md.strong-italic-link`, `type.body.sm.default-italic`, `type.body.sm.default-italic-link`, `type.body.sm.strong-italic`, `type.body.sm.strong-italic-link`, `type.body.xs.default-italic`, `type.body.xs.default-italic-link`, `type.body.xs.default-link`, `type.body.xs.strong-italic`, `type.body.xs.strong-italic-link`, `type.body.xs.strong-link`, `type.caption.lg.default`, `type.caption.lg.default-link`, `type.caption.lg.strong`, `type.caption.lg.strong-link`, `type.caption.md.default-link`, `type.caption.md.strong-link`, `type.code.inline.default`, `type.display.2xl.emphasis`, `type.display.2xl.strong`, `type.display.3xl.emphasis`, `type.display.3xl.strong`, `type.display.lg.emphasis`, `type.display.lg.strong`, `type.display.md.emphasis`, `type.display.md.strong`, `type.display.sm.emphasis`, `type.display.sm.strong`, `type.display.xl.emphasis`, `type.display.xl.strong`, `type.eyebrow.lg.emphasis`, `type.eyebrow.md.emphasis`, `type.eyebrow.sm.emphasis`, `type.label.lg.default-link`, `type.label.lg.line-box`, `type.label.md.default-link`, `type.label.sm.default-link`, `type.label.sm.line-box`, `type.title.2xl.emphasis`, `type.title.lg.emphasis`, `type.title.lg.strong`, `type.title.md.emphasis`, `type.title.sm.emphasis`, `type.title.xl.emphasis`, `type.title.xl.strong`, `type.title.xs.emphasis`, `type.title.xs.strong`

### Primitive

- **core.dimension.0** — 1 token(s)
- **core.dimension.1** — 1 token(s)
- **core.dimension.10** — 1 token(s)
- **core.dimension.100** — 1 token(s)
- **core.dimension.104** — 1 token(s)
- **core.dimension.108** — 1 token(s)
- **core.dimension.112** — 1 token(s)
- **core.dimension.116** — 1 token(s)
- **core.dimension.12** — 1 token(s)
- **core.dimension.120** — 1 token(s)
- **core.dimension.124** — 1 token(s)
- **core.dimension.128** — 1 token(s)
- **core.dimension.16** — 1 token(s)
- **core.dimension.18** — 1 token(s)
- **core.dimension.2** — 1 token(s)
- **core.dimension.20** — 1 token(s)
- **core.dimension.24** — 1 token(s)
- **core.dimension.28** — 1 token(s)
- **core.dimension.3** — 1 token(s)
- **core.dimension.30** — 1 token(s)
- **core.dimension.32** — 1 token(s)
- **core.dimension.36** — 1 token(s)
- **core.dimension.4** — 1 token(s)
- **core.dimension.40** — 1 token(s)
- **core.dimension.44** — 1 token(s)
- **core.dimension.48** — 1 token(s)
- **core.dimension.5** — 1 token(s)
- **core.dimension.52** — 1 token(s)
- **core.dimension.56** — 1 token(s)
- **core.dimension.6** — 1 token(s)
- **core.dimension.60** — 1 token(s)
- **core.dimension.64** — 1 token(s)
- **core.dimension.68** — 1 token(s)
- **core.dimension.72** — 1 token(s)
- **core.dimension.76** — 1 token(s)
- **core.dimension.8** — 1 token(s)
- **core.dimension.80** — 1 token(s)
- **core.dimension.84** — 1 token(s)
- **core.dimension.88** — 1 token(s)
- **core.dimension.92** — 1 token(s)
- **core.dimension.96** — 1 token(s)
- **core.font.family** — 7 token(s)
- **core.font.letter-spacing** — 9 token(s)
- **core.font.letter-spacing-role** — 9 token(s)
- **core.font.line-height** — 7 token(s)
- **core.font.line-height-role** — 7 token(s)
- **core.font.size** — 22 token(s)
- **core.font.typeface** — 3 token(s)
- **core.font.weight** — 6 token(s)
- **core.font.weight-role** — 5 token(s)
- **core.palette.accent** — 20 token(s)
- **core.palette.black** — 1 token(s)
- **core.palette.black-alpha** — 10 token(s)
- **core.palette.danger** — 20 token(s)
- **core.palette.info** — 20 token(s)
- **core.palette.neutral** — 20 token(s)
- **core.palette.primary** — 20 token(s)
- **core.palette.success** — 20 token(s)
- **core.palette.transparent** — 1 token(s)
- **core.palette.warning** — 20 token(s)
- **core.palette.white** — 1 token(s)
- **core.palette.white-alpha** — 11 token(s)
