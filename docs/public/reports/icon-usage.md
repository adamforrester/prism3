# Icon usage

Which glyphs each component draws. The icon set holds 45 glyphs; a component draws a glyph from it at a fixed part, starts an icon slot at one, or draws a glyph it owns (the spinner ring), which is kept out of the icon set.

Generated from the component definitions and the emission by `packages/engine/emit-analysis-reports.ts`; `regen.ts --check` fails when this page is stale. The same data for agents: [icon-usage.json](icon-usage.json). All reports: [index](index.md).

## By component

| Component | Part | Glyph | Source | How | Shown when |
|---|---|---|---|---|---|
| _accordion-indicator | chevronDownGlyph | `chevron-down` | icon set | drawn | indicator: chevron; expansion: collapsed |
|  | chevronUpGlyph | `chevron-up` | icon set | drawn | indicator: chevron; expansion: expanded |
|  | minusGlyph | `minus` | icon set | drawn | indicator: plus-minus; expansion: expanded |
|  | plusGlyph | `plus` | icon set | drawn | indicator: plus-minus; expansion: collapsed |
| checkbox-control | checkGlyph | `check` | icon set | drawn | selection: checked |
|  | dashGlyph | `minus` | icon set | drawn | selection: indeterminate |
| field-message | errorGlyph | `warning-triangle` | icon set | drawn | status: error |
|  | successGlyph | `check-circle` | icon set | drawn | status: success |
|  | warningGlyph | `error-circle` | icon set | drawn | status: warning |
| icon | glyph | `{name}` | any (prop) | drawn | always |
| image-placeholder | markerGlyph | `image` | icon set | drawn | always |
| list-item | icon | `check` | icon set | swap default | type: icon |
| pagination-item | gapGlyph | `more-horizontal-filled` | icon set | drawn | type: ellipsis |
|  | nextGlyph | `chevron-right` | icon set | drawn | type: next |
|  | previousGlyph | `chevron-left` | icon set | drawn | type: previous |
| select | chevronGlyph | `chevron-down` | icon set | drawn | always |
| spinner | ringGlyph | `spinner` | component-owned | drawn | always |
| switch-control | offGlyph | `close` | icon set | drawn | selection: off |
|  | onGlyph | `check` | icon set | drawn | selection: on |
| tag | checkGlyph | `check` | icon set | drawn | selection: selected |
|  | dismissGlyph | `close` | icon set | drawn | type: dismissible |
| textarea | gripGlyph | `resize-grip` | icon set | drawn | always |

### Icon slots

Parts that take any icon from the set. The file nominates the default unless the definition names one (a swap default above).

| Component | Slots |
|---|---|
| button | leadingVisual, trailingVisual |
| button-destructive | leadingVisual, trailingVisual |
| button-neutral | leadingVisual, trailingVisual |
| flush-icon-button | icon |
| flush-icon-button-destructive | icon |
| flush-icon-button-neutral | icon |
| icon-button | icon |
| icon-button-destructive | icon |
| icon-button-neutral | icon |
| link | trailingVisual |
| list-item | icon |
| password-field | leadingVisual |
| segmented-control-segment | leadingVisual |
| select | leadingVisual |
| tab-item | leadingVisual |
| tag | leadingVisual |
| text-field | leadingVisual, trailingVisual |

## By glyph

| Glyph | Drawn by |
|---|---|
| `check` | checkbox-control, list-item, switch-control, tag |
| `check-circle` | field-message |
| `chevron-down` | _accordion-indicator, select |
| `chevron-left` | pagination-item |
| `chevron-right` | pagination-item |
| `chevron-up` | _accordion-indicator |
| `close` | switch-control, tag |
| `error-circle` | field-message |
| `image` | image-placeholder |
| `minus` | _accordion-indicator, checkbox-control |
| `more-horizontal-filled` | pagination-item |
| `plus` | _accordion-indicator |
| `resize-grip` | textarea |
| `spinner` | spinner |
| `warning-triangle` | field-message |

## Glyphs no component names (31)

Each is still reachable through Icon and through every icon slot.

`FPO-default-icon`, `arrow-down`, `arrow-down-left`, `arrow-down-right`, `arrow-left`, `arrow-right`, `arrow-up`, `arrow-up-left`, `arrow-up-right`, `check-circle-filled`, `close-filled`, `error-circle-filled`, `external-link-filled`, `eye`, `eye-filled`, `eye-off`, `eye-off-filled`, `home`, `info-circle`, `info-circle-filled`, `link`, `menu`, `minus-filled`, `more-vertical-filled`, `pause-circle`, `play-circle`, `plus-circle`, `plus-circle-filled`, `plus-filled`, `search`, `warning-triangle-filled`
