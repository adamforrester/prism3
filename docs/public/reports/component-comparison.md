# Component comparison

State sets, variant axes, props, size rungs and defaults, side by side. The findings list every place peers differ. A difference can be deliberate; this page reports it and leaves the call to the owner.

Peers come from three groupings, each derived from the definitions:

- **Variant family** — components named `X` or `X.<variant>` (Button, Button.Destructive).
- **Role peers** — components in different families that play the same role, by name suffix (`.Control`, `.Row`, `.Group`, `.Item`, `.Segment`, `.Indicator`).
- **Substrate** — a component and every component that `inherits` from it.

Generated from the component definitions and the emission by `packages/engine/emit-analysis-reports.ts`; `regen.ts --check` fails when this page is stale. The same data for agents: [component-comparison.json](component-comparison.json). All reports: [index](index.md).

## Findings (84)

### axis values

- **axis appearance** — the appearance axis takes 3 value sets — [filled, ghost, outline] in icon-button, icon-button-destructive, icon-button-neutral; [filled, outline, text] in button, button-destructive, button-neutral; [ghost, outline] in counter
- **axis emphasis** — the emphasis axis takes 2 value sets — [bold, subtle] in badge; [primary, secondary] in field-label
- **axis inset** — the inset axis takes 2 value sets — [default, flush] in button, button-destructive, button-neutral; [inset, middle-inset, none] in divider
- **axis selection** — the selection axis takes 4 value sets — [selected, unselected] in segmented-control-segment, tab, tag; [checked, indeterminate, unchecked] in checkbox-control; [checked, unchecked] in radio-control; [off, on] in switch-control
- **axis shape** — the shape axis takes 2 value sets — [circular, square] in icon-button, icon-button-destructive, icon-button-neutral; [flush, round] in flush-icon-button, flush-icon-button-destructive, flush-icon-button-neutral
- **axis size** — the size axis takes 4 value sets — [large, medium, small] in _accordion-indicator, accordion, button, button-destructive, button-neutral, checkbox-control, checkbox-group, checkbox-row, counter, dialog, field-label, flush-icon-button, flush-icon-button-destructive, flush-icon-button-neutral, icon-button, icon-button-destructive, icon-button-neutral, link, list, list-item, password-field, radio-control, radio-group, radio-row, segmented-control, segmented-control-segment, select, tab, tabs, tag, text-field, textarea; [large, medium, small, xlarge] in code-input, code-input-cell; [medium, small] in switch-control, switch-row; [large, medium, small, x-small] in spinner
- **axis status** — the status axis takes 2 value sets — [default, error, success, warning] in field-message, password-field, select, text-field, textarea; [default, error] in code-input
- **axis style** — the style axis takes 2 value sets — [outline] in password-field, text-field, textarea; [inline, standalone] in link
- **axis tone** — the tone axis takes 2 value sets — [brand, danger, info, inherit, primary, secondary, success, tertiary, warning] in icon; [danger, info, neutral, success, warning] in badge
- **axis type** — the type axis takes 3 value sets — [icon, ordered, unordered] in list, list-item; [count, dot, status] in badge; [dismissible, select] in tag
- **axis weight** — the weight axis takes 2 value sets — [bold, regular] in field-label; [default, emphasis] in link

### axis without prop

- **accordion** — accordion has the variant axis expansion and no prop of that name
- **button** — button has the variant axis width and no prop of that name
- **button-destructive** — button-destructive has the variant axis width and no prop of that name
- **button-neutral** — button-neutral has the variant axis width and no prop of that name
- **checkbox-control** — checkbox-control has the variant axis selection and no prop of that name
- **code-input** — code-input has the variant axis status and no prop of that name
- **password-field** — password-field has the variant axes style and status and no props of those names
- **radio-control** — radio-control has the variant axis selection and no prop of that name
- **segmented-control-segment** — segmented-control-segment has the variant axis selection and no prop of that name
- **select** — select has the variant axis status and no prop of that name
- **switch-control** — switch-control has the variant axis selection and no prop of that name
- **tab** — tab has the variant axis selection and no prop of that name
- **tag** — tag has the variant axis selection and no prop of that name
- **text-field** — text-field has the variant axes style and status and no props of those names
- **textarea** — textarea has the variant axes style and status and no props of those names

### prop default

- **prop showMessage** — showMessage defaults differ over the same values — false in counter; true in code-input, password-field, select, text-field, textarea

### size default

- **field-label** — field-label defaults size to small; 36 of 37 sized components default to medium

### size order

- **_accordion-indicator** — _accordion-indicator declares its sizes as [medium, small, large], not smallest first
- **accordion** — accordion declares its sizes as [medium, small, large], not smallest first
- **button** — button declares its sizes as [medium, small, large], not smallest first
- **button-destructive** — button-destructive declares its sizes as [medium, small, large], not smallest first
- **button-neutral** — button-neutral declares its sizes as [medium, small, large], not smallest first
- **checkbox-control** — checkbox-control declares its sizes as [medium, small, large], not smallest first
- **checkbox-group** — checkbox-group declares its sizes as [medium, small, large], not smallest first
- **checkbox-row** — checkbox-row declares its sizes as [medium, small, large], not smallest first
- **code-input** — code-input declares its sizes as [medium, small, large, xlarge], not smallest first
- **code-input-cell** — code-input-cell declares its sizes as [medium, small, large, xlarge], not smallest first
- **counter** — counter declares its sizes as [medium, small, large], not smallest first
- **dialog** — dialog declares its sizes as [medium, small, large], not smallest first
- **flush-icon-button** — flush-icon-button declares its sizes as [medium, small, large], not smallest first
- **flush-icon-button-destructive** — flush-icon-button-destructive declares its sizes as [medium, small, large], not smallest first
- **flush-icon-button-neutral** — flush-icon-button-neutral declares its sizes as [medium, small, large], not smallest first
- **icon-button** — icon-button declares its sizes as [medium, small, large], not smallest first
- **icon-button-destructive** — icon-button-destructive declares its sizes as [medium, small, large], not smallest first
- **icon-button-neutral** — icon-button-neutral declares its sizes as [medium, small, large], not smallest first
- **link** — link declares its sizes as [medium, small, large], not smallest first
- **list** — list declares its sizes as [medium, small, large], not smallest first
- **list-item** — list-item declares its sizes as [medium, small, large], not smallest first
- **password-field** — password-field declares its sizes as [medium, small, large], not smallest first
- **radio-control** — radio-control declares its sizes as [medium, small, large], not smallest first
- **radio-group** — radio-group declares its sizes as [medium, small, large], not smallest first
- **radio-row** — radio-row declares its sizes as [medium, small, large], not smallest first
- **segmented-control** — segmented-control declares its sizes as [medium, small, large], not smallest first
- **segmented-control-segment** — segmented-control-segment declares its sizes as [medium, small, large], not smallest first
- **select** — select declares its sizes as [medium, small, large], not smallest first
- **switch-control** — switch-control declares its sizes as [medium, small], not smallest first
- **switch-row** — switch-row declares its sizes as [medium, small], not smallest first
- **tab** — tab declares its sizes as [medium, small, large], not smallest first
- **tabs** — tabs declares its sizes as [medium, small, large], not smallest first
- **tag** — tag declares its sizes as [medium, small, large], not smallest first
- **text-field** — text-field declares its sizes as [medium, small, large], not smallest first
- **textarea** — textarea declares its sizes as [medium, small, large], not smallest first

### state not drawn

- **button** — button declares the state inactive, which the design-file state axis does not draw
- **button-destructive** — button-destructive declares the state inactive, which the design-file state axis does not draw
- **button-neutral** — button-neutral declares the state inactive, which the design-file state axis does not draw
- **code-input** — code-input declares the state pending, which the design-file state axis does not draw
- **icon-button** — icon-button declares the state inactive, which the design-file state axis does not draw
- **icon-button-destructive** — icon-button-destructive declares the state inactive, which the design-file state axis does not draw
- **icon-button-neutral** — icon-button-neutral declares the state inactive, which the design-file state axis does not draw
- **password-field** — password-field declares the states pending and empty, which the design-file state axis does not draw
- **select** — select declares the states pending and empty, which the design-file state axis does not draw
- **tag** — tag declares the state read-only, which the design-file state axis does not draw
- **text-field** — text-field declares the states pending and empty, which the design-file state axis does not draw
- **textarea** — textarea declares the states pending and empty, which the design-file state axis does not draw

### state set

- **variant family: CodeInput** — no state set is shared by most of the group — code-input [rest, hover, pending, filled, focus-visible, focus-visible-filled, disabled]; code-input-cell [rest, hover, filled, focus-visible, focus-visible-filled, disabled, error]
- **role peers: *.Control** — radio-control differs from the group's common set [disabled, error, focus-visible, hover, pressed, rest] — lacks error
- **role peers: *.Row** — no state set is shared by most of the group — checkbox-row [rest, hover, pressed, focus-visible, disabled, read-only, error]; radio-row [rest, hover, pressed, focus-visible, disabled, read-only]; switch-row [rest, hover, pressed, pending, focus-visible, disabled, read-only, error]
- **role peers: *.Group** — button-group differs from the group's common set [rest] — lacks rest
- **substrate: button** — flush-icon-button differs from the group's common set [disabled, focus-visible, hover, inactive, pending, pressed, rest] — lacks inactive, pending
- **substrate: button-destructive** — flush-icon-button-destructive differs from the group's common set [disabled, focus-visible, hover, inactive, pending, pressed, rest] — lacks inactive, pending
- **substrate: button-neutral** — flush-icon-button-neutral differs from the group's common set [disabled, focus-visible, hover, inactive, pending, pressed, rest] — lacks inactive, pending
- **substrate: text-field** — no state set is shared by most of the group — checkbox-row [rest, hover, pressed, focus-visible, disabled, read-only, error]; radio-row [rest, hover, pressed, focus-visible, disabled, read-only]; switch-row [rest, hover, pressed, pending, focus-visible, disabled, read-only, error]; text-field [rest, hover, pending, filled, focus-visible, focus-visible-filled, disabled, read-only, empty]; textarea [rest, hover, pending, filled, focus-visible, focus-visible-filled, disabled, read-only, empty]

### variant axes

- **variant family: CodeInput** — code-input-cell's variant axes differ from the family's common set

## Peer groups

| Grouping | Name | Members |
|---|---|---|
| variant family | Button | button, button-destructive, button-neutral |
| variant family | CodeInput | code-input, code-input-cell |
| variant family | FlushIconButton | flush-icon-button, flush-icon-button-destructive, flush-icon-button-neutral |
| variant family | IconButton | icon-button, icon-button-destructive, icon-button-neutral |
| role peers | *.Control | checkbox-control, radio-control, switch-control |
| role peers | *.Row | checkbox-row, radio-row, switch-row |
| role peers | *.Group | button-group, checkbox-group, radio-group |
| substrate | button | button, flush-icon-button, icon-button |
| substrate | button-destructive | button-destructive, flush-icon-button-destructive, icon-button-destructive |
| substrate | button-neutral | button-neutral, flush-icon-button-neutral, icon-button-neutral |
| substrate | text-field | checkbox-row, radio-row, switch-row, text-field, textarea |

## States

| Component | Category | States | Drawn in the design file |
|---|---|---|---|
| _accordion-indicator | navigation | — | — |
| accordion | navigation | rest, focus-visible | rest, focus-visible |
| badge | foundations | — | — |
| button | form | rest, hover, pressed, pending, focus-visible, disabled, inactive | rest, hover, pressed, pending, focus-visible, disabled |
| button-destructive | form | rest, hover, pressed, pending, focus-visible, disabled, inactive | rest, hover, pressed, pending, focus-visible, disabled |
| button-group | form | — | — |
| button-neutral | form | rest, hover, pressed, pending, focus-visible, disabled, inactive | rest, hover, pressed, pending, focus-visible, disabled |
| checkbox-control | form | rest, hover, pressed, focus-visible, disabled, error | rest, hover, pressed, focus-visible, disabled, error |
| checkbox-group | form | rest | — |
| checkbox-row | form | rest, hover, pressed, focus-visible, disabled, read-only, error | — |
| code-input | form | rest, hover, pending, filled, focus-visible, focus-visible-filled, disabled | rest, hover, filled, focus-visible, focus-visible-filled, disabled |
| code-input-cell | form | rest, hover, filled, focus-visible, focus-visible-filled, disabled, error | rest, hover, filled, focus-visible, focus-visible-filled, disabled, error |
| counter | form | rest, focus-visible, disabled | rest, focus-visible, disabled |
| dialog | overlay | — | — |
| divider | foundations | — | — |
| field-label | form | rest, disabled | rest, disabled |
| field-message | feedback | — | — |
| flush-icon-button | form | rest, hover, pressed, focus-visible, disabled | rest, hover, pressed, focus-visible, disabled |
| flush-icon-button-destructive | form | rest, hover, pressed, focus-visible, disabled | rest, hover, pressed, focus-visible, disabled |
| flush-icon-button-neutral | form | rest, hover, pressed, focus-visible, disabled | rest, hover, pressed, focus-visible, disabled |
| focus-ring | foundations | — | — |
| icon | foundations | — | — |
| icon-button | form | rest, hover, pressed, pending, focus-visible, disabled, inactive | rest, hover, pressed, pending, focus-visible, disabled |
| icon-button-destructive | form | rest, hover, pressed, pending, focus-visible, disabled, inactive | rest, hover, pressed, pending, focus-visible, disabled |
| icon-button-neutral | form | rest, hover, pressed, pending, focus-visible, disabled, inactive | rest, hover, pressed, pending, focus-visible, disabled |
| image-placeholder | foundations | — | — |
| link | navigation | rest, hover, pressed, focus-visible | rest, hover, pressed, focus-visible |
| list | data | — | — |
| list-item | data | — | — |
| password-field | form | rest, hover, pending, filled, focus-visible, focus-visible-filled, disabled, read-only, empty | rest, hover, filled, focus-visible, focus-visible-filled, disabled, read-only |
| radio-control | form | rest, hover, pressed, focus-visible, disabled | rest, hover, pressed, focus-visible, disabled |
| radio-group | form | rest | — |
| radio-row | form | rest, hover, pressed, focus-visible, disabled, read-only | — |
| segmented-control | form | rest | — |
| segmented-control-segment | form | rest, hover, pressed, focus-visible, disabled | rest, hover, pressed, focus-visible, disabled |
| select | form | rest, hover, pending, filled, focus-visible, focus-visible-filled, disabled, read-only, empty | rest, hover, filled, focus-visible, focus-visible-filled, disabled, read-only |
| spinner | foundations | — | — |
| switch-control | form | rest, hover, pressed, focus-visible, disabled, error | rest, hover, pressed, focus-visible, disabled, error |
| switch-row | form | rest, hover, pressed, pending, focus-visible, disabled, read-only, error | — |
| tab | navigation | rest, hover, pressed, focus-visible, disabled | rest, hover, pressed, focus-visible, disabled |
| tabs | navigation | rest | — |
| tag | foundations | rest, hover, pressed, focus-visible, disabled, read-only | rest, hover, pressed, focus-visible, disabled |
| text-field | form | rest, hover, pending, filled, focus-visible, focus-visible-filled, disabled, read-only, empty | rest, hover, filled, focus-visible, focus-visible-filled, disabled, read-only |
| textarea | form | rest, hover, pending, filled, focus-visible, focus-visible-filled, disabled, read-only, empty | rest, hover, filled, focus-visible, focus-visible-filled, disabled, read-only |
| veil | foundations | — | — |

### State vocabulary

| State | Components |
|---|---|
| disabled | button, button-destructive, button-neutral, checkbox-control, checkbox-row, code-input, code-input-cell, counter, field-label, flush-icon-button, flush-icon-button-destructive, flush-icon-button-neutral, icon-button, icon-button-destructive, icon-button-neutral, password-field, radio-control, radio-row, segmented-control-segment, select, switch-control, switch-row, tab, tag, text-field, textarea |
| empty | password-field, select, text-field, textarea |
| error | checkbox-control, checkbox-row, code-input-cell, switch-control, switch-row |
| filled | code-input, code-input-cell, password-field, select, text-field, textarea |
| focus-visible | accordion, button, button-destructive, button-neutral, checkbox-control, checkbox-row, code-input, code-input-cell, counter, flush-icon-button, flush-icon-button-destructive, flush-icon-button-neutral, icon-button, icon-button-destructive, icon-button-neutral, link, password-field, radio-control, radio-row, segmented-control-segment, select, switch-control, switch-row, tab, tag, text-field, textarea |
| focus-visible-filled | code-input, code-input-cell, password-field, select, text-field, textarea |
| hover | button, button-destructive, button-neutral, checkbox-control, checkbox-row, code-input, code-input-cell, flush-icon-button, flush-icon-button-destructive, flush-icon-button-neutral, icon-button, icon-button-destructive, icon-button-neutral, link, password-field, radio-control, radio-row, segmented-control-segment, select, switch-control, switch-row, tab, tag, text-field, textarea |
| inactive | button, button-destructive, button-neutral, icon-button, icon-button-destructive, icon-button-neutral |
| pending | button, button-destructive, button-neutral, code-input, icon-button, icon-button-destructive, icon-button-neutral, password-field, select, switch-row, text-field, textarea |
| pressed | button, button-destructive, button-neutral, checkbox-control, checkbox-row, flush-icon-button, flush-icon-button-destructive, flush-icon-button-neutral, icon-button, icon-button-destructive, icon-button-neutral, link, radio-control, radio-row, segmented-control-segment, switch-control, switch-row, tab, tag |
| read-only | checkbox-row, password-field, radio-row, select, switch-row, tag, text-field, textarea |
| rest | accordion, button, button-destructive, button-neutral, checkbox-control, checkbox-group, checkbox-row, code-input, code-input-cell, counter, field-label, flush-icon-button, flush-icon-button-destructive, flush-icon-button-neutral, icon-button, icon-button-destructive, icon-button-neutral, link, password-field, radio-control, radio-group, radio-row, segmented-control, segmented-control-segment, select, switch-control, switch-row, tab, tabs, tag, text-field, textarea |

## Variant axes

| Axis | Values | Components |
|---|---|---|
| alignment | center, start | tabs |
| appearance | filled, ghost, outline | icon-button, icon-button-destructive, icon-button-neutral |
|  | filled, outline, text | button, button-destructive, button-neutral |
|  | ghost, outline | counter |
| direction | from-bottom, from-left, from-right, from-top, full | veil |
| emphasis | bold, subtle | badge |
|  | primary, secondary | field-label |
| expansion | collapsed, expanded | _accordion-indicator, accordion |
| footer | inline, none, stacked | dialog |
| iconPosition | leading, trailing | accordion |
| indicator | chevron, plus-minus | _accordion-indicator |
| inset | default, flush | button, button-destructive, button-neutral |
|  | inset, middle-inset, none | divider |
| intensity | medium, strong, subtle | veil |
| layout | fill, inline, stacked | button-group |
| offset | control, field | focus-ring |
| orientation | horizontal, vertical | divider |
| placement | bottom, center, full | dialog |
| ratio | 16:9, 1:1, 2:3, 3:2, 3:4, 4:3, 4:5 | image-placeholder |
| selection | selected, unselected | segmented-control-segment, tab, tag |
|  | checked, indeterminate, unchecked | checkbox-control |
|  | checked, unchecked | radio-control |
|  | off, on | switch-control |
| shape | circular, square | icon-button, icon-button-destructive, icon-button-neutral |
|  | flush, round | flush-icon-button, flush-icon-button-destructive, flush-icon-button-neutral |
| size | large, medium, small | _accordion-indicator, accordion, button, button-destructive, button-neutral, checkbox-control, checkbox-group, checkbox-row, counter, dialog, field-label, flush-icon-button, flush-icon-button-destructive, flush-icon-button-neutral, icon-button, icon-button-destructive, icon-button-neutral, link, list, list-item, password-field, radio-control, radio-group, radio-row, segmented-control, segmented-control-segment, select, tab, tabs, tag, text-field, textarea |
|  | large, medium, small, xlarge | code-input, code-input-cell |
|  | medium, small | switch-control, switch-row |
|  | large, medium, small, x-small | spinner |
| status | default, error, success, warning | field-message, password-field, select, text-field, textarea |
|  | default, error | code-input |
| style | outline | password-field, text-field, textarea |
|  | inline, standalone | link |
| surface | default, inverse | button, button-destructive, button-neutral, focus-ring, icon-button, icon-button-destructive, icon-button-neutral, link |
| tone | brand, danger, info, inherit, primary, secondary, success, tertiary, warning | icon |
|  | danger, info, neutral, success, warning | badge |
| type | icon, ordered, unordered | list, list-item |
|  | count, dot, status | badge |
|  | dismissible, select | tag |
| value | dark, light | veil |
| weight | bold, regular | field-label |
|  | default, emphasis | link |
| width | auto, full | button, button-destructive, button-neutral |

Icon's `name` axis is the icon set itself and is covered by the [icon usage](icon-usage.md) report.

## Size rungs and defaults

| Component | Sizes, as declared | Default |
|---|---|---|
| _accordion-indicator | medium, small, large | medium |
| accordion | medium, small, large | medium |
| button | medium, small, large | medium |
| button-destructive | medium, small, large | medium |
| button-neutral | medium, small, large | medium |
| checkbox-control | medium, small, large | medium |
| checkbox-group | medium, small, large | medium |
| checkbox-row | medium, small, large | medium |
| code-input | medium, small, large, xlarge | medium |
| code-input-cell | medium, small, large, xlarge | medium |
| counter | medium, small, large | medium |
| dialog | medium, small, large | medium |
| field-label | small, medium, large | small |
| flush-icon-button | medium, small, large | medium |
| flush-icon-button-destructive | medium, small, large | medium |
| flush-icon-button-neutral | medium, small, large | medium |
| icon-button | medium, small, large | medium |
| icon-button-destructive | medium, small, large | medium |
| icon-button-neutral | medium, small, large | medium |
| link | medium, small, large | medium |
| list | medium, small, large | medium |
| list-item | medium, small, large | medium |
| password-field | medium, small, large | medium |
| radio-control | medium, small, large | medium |
| radio-group | medium, small, large | medium |
| radio-row | medium, small, large | medium |
| segmented-control | medium, small, large | medium |
| segmented-control-segment | medium, small, large | medium |
| select | medium, small, large | medium |
| spinner | x-small, small, medium, large | medium |
| switch-control | medium, small | medium |
| switch-row | medium, small | medium |
| tab | medium, small, large | medium |
| tabs | medium, small, large | medium |
| tag | medium, small, large | medium |
| text-field | medium, small, large | medium |
| textarea | medium, small, large | medium |

## Props shared by more than one component

| Prop | Component | Default | Values |
|---|---|---|---|
| appearance | button | filled | filled, outline, text |
|  | button-destructive | filled | filled, outline, text |
|  | button-neutral | filled | filled, outline, text |
|  | counter | outline | outline, ghost |
|  | icon-button | ghost | filled, outline, ghost |
|  | icon-button-destructive | ghost | filled, outline, ghost |
|  | icon-button-neutral | ghost | filled, outline, ghost |
| aria-label | button | — | — |
|  | button-destructive | — | — |
|  | button-neutral | — | — |
|  | checkbox-control | — | — |
|  | flush-icon-button | — | — |
|  | flush-icon-button-destructive | — | — |
|  | flush-icon-button-neutral | — | — |
|  | icon-button | — | — |
|  | icon-button-destructive | — | — |
|  | icon-button-neutral | — | — |
|  | radio-control | — | — |
|  | switch-control | — | — |
| autoComplete | code-input | one-time-code | — |
|  | password-field | — | current-password, new-password |
|  | text-field | — | — |
| checked | checkbox-control | — | — |
|  | checkbox-row | — | — |
|  | radio-control | — | — |
|  | switch-control | — | — |
|  | switch-row | — | — |
| children | accordion | — | — |
|  | dialog | — | — |
|  | list-item | — | — |
| defaultValue | checkbox-group | — | — |
|  | code-input | — | — |
|  | counter | — | — |
|  | password-field | — | — |
|  | radio-group | — | — |
|  | segmented-control | — | — |
|  | tabs | — | — |
|  | text-field | — | — |
| description | checkbox-row | — | — |
|  | dialog | — | — |
|  | radio-row | — | — |
|  | switch-row | — | — |
| disabled | button | false | — |
|  | button-destructive | false | — |
|  | button-neutral | false | — |
|  | checkbox-control | false | — |
|  | checkbox-group | false | — |
|  | checkbox-row | false | — |
|  | code-input | false | — |
|  | code-input-cell | false | — |
|  | counter | false | — |
|  | flush-icon-button | false | — |
|  | flush-icon-button-destructive | false | — |
|  | flush-icon-button-neutral | false | — |
|  | icon-button | false | — |
|  | icon-button-destructive | false | — |
|  | icon-button-neutral | false | — |
|  | password-field | false | — |
|  | radio-control | false | — |
|  | radio-group | false | — |
|  | radio-row | false | — |
|  | segmented-control | false | — |
|  | segmented-control-segment | false | — |
|  | select | false | — |
|  | switch-control | false | — |
|  | switch-row | false | — |
|  | tab | false | — |
|  | tag | false | — |
|  | text-field | false | — |
|  | textarea | false | — |
| emphasis | badge | subtle | subtle, bold |
|  | field-label | secondary | secondary, primary |
| fullWidth | button | false | — |
|  | button-destructive | false | — |
|  | button-neutral | false | — |
| helpText | code-input | — | — |
|  | password-field | — | — |
|  | select | — | — |
|  | text-field | — | — |
|  | textarea | — | — |
| href | button | — | — |
|  | button-destructive | — | — |
|  | button-neutral | — | — |
|  | link | — | — |
| icon | field-message | — | — |
|  | flush-icon-button | — | — |
|  | flush-icon-button-destructive | — | — |
|  | flush-icon-button-neutral | — | — |
|  | icon-button | — | — |
|  | icon-button-destructive | — | — |
|  | icon-button-neutral | — | — |
|  | list-item | — | — |
| id | code-input | — | — |
|  | field-message | — | — |
|  | password-field | — | — |
|  | select | — | — |
|  | text-field | — | — |
|  | textarea | — | — |
| indeterminate | checkbox-control | false | — |
|  | checkbox-row | false | — |
| indicator | _accordion-indicator | chevron | chevron, plus-minus |
|  | accordion | chevron | chevron, plus-minus |
| inputMode | code-input | numeric | numeric, text |
|  | text-field | — | text, numeric, decimal, tel, email, url, search |
| inset | button | default | default, flush |
|  | button-destructive | default | default, flush |
|  | button-neutral | default | default, flush |
|  | divider | none | none, inset, middle-inset |
| isInactive | button | false | — |
|  | button-destructive | false | — |
|  | button-neutral | false | — |
|  | icon-button | false | — |
|  | icon-button-destructive | false | — |
|  | icon-button-neutral | false | — |
| isPending | button | false | — |
|  | button-destructive | false | — |
|  | button-neutral | false | — |
|  | code-input | false | — |
|  | icon-button | false | — |
|  | icon-button-destructive | false | — |
|  | icon-button-neutral | false | — |
|  | password-field | false | — |
|  | select | false | — |
|  | switch-row | false | — |
|  | text-field | false | — |
|  | textarea | false | — |
| items | button-group | — | — |
|  | checkbox-group | — | — |
|  | list | — | — |
|  | radio-group | — | — |
|  | segmented-control | — | — |
|  | tabs | — | — |
| label | badge | — | — |
|  | button | — | — |
|  | button-destructive | — | — |
|  | button-neutral | — | — |
|  | checkbox-group | — | — |
|  | checkbox-row | — | — |
|  | code-input | — | — |
|  | counter | — | — |
|  | field-label | — | — |
|  | icon | — | — |
|  | link | — | — |
|  | password-field | — | — |
|  | radio-group | — | — |
|  | radio-row | — | — |
|  | segmented-control | — | — |
|  | segmented-control-segment | — | — |
|  | select | — | — |
|  | spinner | Loading | — |
|  | switch-row | — | — |
|  | tab | — | — |
|  | tabs | — | — |
|  | tag | — | — |
|  | text-field | — | — |
|  | textarea | — | — |
| leadingIcon | password-field | — | — |
|  | segmented-control-segment | — | — |
|  | select | — | — |
|  | tab | — | — |
|  | tag | — | — |
|  | text-field | — | — |
| leadingVisual | button | — | — |
|  | button-destructive | — | — |
|  | button-neutral | — | — |
| max | badge | 99 | — |
|  | counter | — | — |
| message | counter | — | — |
|  | field-message | — | — |
| name | checkbox-group | — | — |
|  | code-input | — | — |
|  | counter | — | — |
|  | icon | — | 45 values |
|  | password-field | — | — |
|  | radio-group | — | — |
|  | segmented-control | — | — |
|  | select | — | — |
|  | text-field | — | — |
|  | textarea | — | — |
| onChange | checkbox-group | — | — |
|  | checkbox-row | — | — |
|  | code-input | — | — |
|  | counter | — | — |
|  | password-field | — | — |
|  | radio-group | — | — |
|  | segmented-control | — | — |
|  | select | — | — |
|  | tabs | — | — |
|  | text-field | — | — |
|  | textarea | — | — |
| onClick | button | — | — |
|  | button-destructive | — | — |
|  | button-neutral | — | — |
|  | flush-icon-button | — | — |
|  | flush-icon-button-destructive | — | — |
|  | flush-icon-button-neutral | — | — |
|  | icon-button | — | — |
|  | icon-button-destructive | — | — |
|  | icon-button-neutral | — | — |
|  | tag | — | — |
| placeholder | password-field | — | — |
|  | select | — | — |
|  | text-field | — | — |
|  | textarea | — | — |
| readOnly | checkbox-row | false | — |
|  | password-field | false | — |
|  | radio-row | false | — |
|  | select | false | — |
|  | switch-row | false | — |
|  | tag | false | — |
|  | text-field | false | — |
|  | textarea | false | — |
| required | checkbox-group | false | — |
|  | field-label | false | — |
|  | password-field | false | — |
|  | radio-group | false | — |
|  | select | false | — |
|  | text-field | false | — |
|  | textarea | false | — |
| selected | segmented-control-segment | false | — |
|  | tab | false | — |
|  | tag | false | — |
| shape | flush-icon-button | flush | flush, round |
|  | flush-icon-button-destructive | flush | flush, round |
|  | flush-icon-button-neutral | flush | flush, round |
|  | icon-button | square | square, circular |
|  | icon-button-destructive | square | square, circular |
|  | icon-button-neutral | square | square, circular |
| showMessage | code-input | true | — |
|  | counter | false | — |
|  | password-field | true | — |
|  | select | true | — |
|  | text-field | true | — |
|  | textarea | true | — |
| showStateLabel | switch-control | true | — |
|  | switch-row | true | — |
| size | _accordion-indicator | medium | small, medium, large |
|  | accordion | medium | small, medium, large |
|  | button | medium | small, medium, large |
|  | button-destructive | medium | small, medium, large |
|  | button-neutral | medium | small, medium, large |
|  | checkbox-control | medium | small, medium, large |
|  | checkbox-group | medium | small, medium, large |
|  | checkbox-row | medium | small, medium, large |
|  | code-input | medium | small, medium, large, xlarge |
|  | code-input-cell | medium | small, medium, large, xlarge |
|  | counter | medium | small, medium, large |
|  | dialog | medium | small, medium, large |
|  | field-label | small | small, medium, large |
|  | flush-icon-button | medium | small, medium, large |
|  | flush-icon-button-destructive | medium | small, medium, large |
|  | flush-icon-button-neutral | medium | small, medium, large |
|  | icon | medium | x-small, small, medium, large |
|  | icon-button | medium | small, medium, large |
|  | icon-button-destructive | medium | small, medium, large |
|  | icon-button-neutral | medium | small, medium, large |
|  | link | medium | small, medium, large |
|  | list | medium | small, medium, large |
|  | list-item | medium | small, medium, large |
|  | password-field | medium | small, medium, large |
|  | radio-control | medium | small, medium, large |
|  | radio-group | medium | small, medium, large |
|  | radio-row | medium | small, medium, large |
|  | segmented-control | medium | small, medium, large |
|  | segmented-control-segment | medium | small, medium, large |
|  | select | medium | small, medium, large |
|  | spinner | medium | x-small, small, medium, large |
|  | switch-control | medium | small, medium |
|  | switch-row | medium | small, medium |
|  | tab | medium | small, medium, large |
|  | tabs | medium | small, medium, large |
|  | tag | medium | small, medium, large |
|  | text-field | medium | small, medium, large |
|  | textarea | medium | small, medium, large |
| surface | button | default | default, inverse |
|  | button-destructive | default | default, inverse |
|  | button-neutral | default | default, inverse |
|  | focus-ring | default | default, inverse |
|  | icon-button | default | default, inverse |
|  | icon-button-destructive | default | default, inverse |
|  | icon-button-neutral | default | default, inverse |
|  | link | default | default, inverse |
| title | accordion | — | — |
|  | dialog | — | — |
| tone | badge | neutral | neutral, info, success, warning, danger |
|  | icon | inherit | 9 values |
| trailingIcon | link | — | — |
|  | text-field | — | — |
| trailingVisual | button | — | — |
|  | button-destructive | — | — |
|  | button-neutral | — | — |
| type | badge | status | status, count, dot |
|  | button | button | button, submit, reset |
|  | button-destructive | button | button, submit, reset |
|  | button-neutral | button | button, submit, reset |
|  | flush-icon-button | button | button, submit, reset |
|  | flush-icon-button-destructive | button | button, submit, reset |
|  | flush-icon-button-neutral | button | button, submit, reset |
|  | icon-button | button | button, submit, reset |
|  | icon-button-destructive | button | button, submit, reset |
|  | icon-button-neutral | button | button, submit, reset |
|  | list | unordered | unordered, ordered, icon |
|  | list-item | unordered | unordered, ordered, icon |
|  | tag | select | select, dismissible |
|  | text-field | text | text, email, url, tel, search, password |
| validation | code-input | default | default, error |
|  | password-field | default | default, error, warning, success |
|  | select | default | default, error, warning, success |
|  | text-field | default | default, error, warning, success |
|  | textarea | default | default, error, warning, success |
| validationMessage | code-input | — | — |
|  | password-field | — | — |
|  | select | — | — |
|  | text-field | — | — |
|  | textarea | — | — |
| value | accordion | — | — |
|  | badge | — | — |
|  | checkbox-group | — | — |
|  | checkbox-row | — | — |
|  | code-input | — | — |
|  | counter | — | — |
|  | list-item | — | — |
|  | password-field | — | — |
|  | radio-group | — | — |
|  | radio-row | — | — |
|  | segmented-control | — | — |
|  | segmented-control-segment | — | — |
|  | select | — | — |
|  | tab | — | — |
|  | tabs | — | — |
|  | text-field | — | — |
|  | textarea | — | — |
|  | veil | dark | dark, light |
| weight | field-label | regular | regular, bold |
|  | link | emphasis | emphasis, default |
| width | code-input | auto | auto, full |
|  | segmented-control | auto | auto, full |
