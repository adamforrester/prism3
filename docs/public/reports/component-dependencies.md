# Component dependencies

What nests what, and which components a change reaches. An edge is a part in one component that places an instance of another: a nested part in the layout, an out-of-flow part such as the focus ring, or an overlay such as the spinner.

`inherits` is listed apart. It tells a reader which definition to read for the rest; the engine copies nothing across it, so it is not part of what a change reaches.

Generated from the component definitions and the emission by `packages/engine/emit-analysis-reports.ts`; `regen.ts --check` fails when this page is stale. The same data for agents: [component-dependencies.json](component-dependencies.json). All reports: [index](index.md).

## If a component changes

| Component | Nested by (direct) | Affected by a change (direct and transitive) |
|---|---|---|
| _accordion-indicator | accordion | accordion |
| badge | tab | tab, tabs |
| button | dialog, password-field, toast | dialog, password-field, toast |
| checkbox-control | checkbox-row | checkbox-group, checkbox-row |
| checkbox-row | checkbox-group | checkbox-group |
| divider | accordion, dialog | accordion, dialog |
| field-label | checkbox-group, password-field, radio-group, segmented-control, select, text-field, textarea | checkbox-group, password-field, radio-group, segmented-control, select, text-field, textarea |
| field-message | password-field, select, text-field, textarea | password-field, select, text-field, textarea |
| focus-ring | accordion, button, button-destructive, button-neutral, checkbox-control, flush-icon-button, flush-icon-button-destructive, flush-icon-button-neutral, icon-button, icon-button-destructive, icon-button-neutral, link, password-field, radio-control, segmented-control-segment, select, switch-control, tab, tag, text-field, textarea | accordion, button, button-destructive, button-neutral, checkbox-control, checkbox-group, checkbox-row, dialog, flush-icon-button, flush-icon-button-destructive, flush-icon-button-neutral, icon-button, icon-button-destructive, icon-button-neutral, link, password-field, radio-control, radio-group, radio-row, segmented-control, segmented-control-segment, select, switch-control, switch-row, tab, tabs, tag, text-field, textarea, toast |
| icon-button-neutral | dialog, toast | dialog, toast |
| list-item | list | list |
| radio-control | radio-row | radio-group, radio-row |
| radio-row | radio-group | radio-group |
| segmented-control-segment | segmented-control | segmented-control |
| spinner | button, button-destructive, button-neutral, icon-button, icon-button-destructive, icon-button-neutral | button, button-destructive, button-neutral, dialog, icon-button, icon-button-destructive, icon-button-neutral, password-field, toast |
| switch-control | switch-row | switch-row |
| tab | tabs | tabs |

A component not in this table is nested by nothing; a change to it reaches only itself.

## What each component nests

| Component | Depth | Nests (direct) | Nests (transitive) |
|---|---|---|---|
| _accordion-indicator | 0 | — | — |
| accordion | 1 | _accordion-indicator, divider, focus-ring | _accordion-indicator, divider, focus-ring |
| badge | 0 | — | — |
| button | 1 | focus-ring, spinner | focus-ring, spinner |
| button-destructive | 1 | focus-ring, spinner | focus-ring, spinner |
| button-neutral | 1 | focus-ring, spinner | focus-ring, spinner |
| checkbox-control | 1 | focus-ring | focus-ring |
| checkbox-group | 3 | checkbox-row, field-label | checkbox-control, checkbox-row, field-label, focus-ring |
| checkbox-row | 2 | checkbox-control | checkbox-control, focus-ring |
| dialog | 2 | button, divider, icon-button-neutral | button, divider, focus-ring, icon-button-neutral, spinner |
| divider | 0 | — | — |
| field-label | 0 | — | — |
| field-message | 0 | — | — |
| flush-icon-button | 1 | focus-ring | focus-ring |
| flush-icon-button-destructive | 1 | focus-ring | focus-ring |
| flush-icon-button-neutral | 1 | focus-ring | focus-ring |
| focus-ring | 0 | — | — |
| icon | 0 | — | — |
| icon-button | 1 | focus-ring, spinner | focus-ring, spinner |
| icon-button-destructive | 1 | focus-ring, spinner | focus-ring, spinner |
| icon-button-neutral | 1 | focus-ring, spinner | focus-ring, spinner |
| image-placeholder | 0 | — | — |
| link | 1 | focus-ring | focus-ring |
| list | 1 | list-item | list-item |
| list-item | 0 | — | — |
| password-field | 2 | button, field-label, field-message, focus-ring | button, field-label, field-message, focus-ring, spinner |
| radio-control | 1 | focus-ring | focus-ring |
| radio-group | 3 | field-label, radio-row | field-label, focus-ring, radio-control, radio-row |
| radio-row | 2 | radio-control | focus-ring, radio-control |
| segmented-control | 2 | field-label, segmented-control-segment | field-label, focus-ring, segmented-control-segment |
| segmented-control-segment | 1 | focus-ring | focus-ring |
| select | 1 | field-label, field-message, focus-ring | field-label, field-message, focus-ring |
| spinner | 0 | — | — |
| switch-control | 1 | focus-ring | focus-ring |
| switch-row | 2 | switch-control | focus-ring, switch-control |
| tab | 1 | badge, focus-ring | badge, focus-ring |
| tabs | 2 | tab | badge, focus-ring, tab |
| tag | 1 | focus-ring | focus-ring |
| text-field | 1 | field-label, field-message, focus-ring | field-label, field-message, focus-ring |
| textarea | 1 | field-label, field-message, focus-ring | field-label, field-message, focus-ring |
| toast | 2 | button, icon-button-neutral | button, focus-ring, icon-button-neutral, spinner |
| veil | 0 | — | — |

Depth is 0 for a component that nests nothing, and one more than its deepest child otherwise.

## Edges

| From | Part | Kind | To | Relation | Fixed variant | Follows | Exposes |
|---|---|---|---|---|---|---|---|
| accordion | divider | nest | divider | nest-fixed | orientation=horizontal, inset=none | — | — |
| accordion | focusRing | absolute | focus-ring | nest-fixed | surface=default | — | — |
| accordion | leadingGlyph | nest | _accordion-indicator | nest-exposed | indicator=chevron, expansion=collapsed, size=medium | expansion, size | indicator |
| accordion | trailingGlyph | nest | _accordion-indicator | nest-exposed | indicator=chevron, expansion=collapsed, size=medium | expansion, size | indicator |
| button | focusRing | absolute | focus-ring | nest-fixed | surface=default | surface | — |
| button | spinner | overlay | spinner | swap | — | — | — |
| button-destructive | focusRing | absolute | focus-ring | nest-fixed | surface=default | surface | — |
| button-destructive | spinner | overlay | spinner | swap | — | — | — |
| button-neutral | focusRing | absolute | focus-ring | nest-fixed | surface=default | surface | — |
| button-neutral | spinner | overlay | spinner | swap | — | — | — |
| checkbox-control | focusRing | absolute | focus-ring | nest-fixed | surface=default | — | — |
| checkbox-group | label | nest | field-label | nest-fixed | size=medium, emphasis=secondary, weight=bold, state=rest | size | — |
| checkbox-group | row1 | nest | checkbox-row | nest-fixed | size=medium | size | — |
| checkbox-group | row2 | nest | checkbox-row | nest-fixed | size=medium | size | — |
| checkbox-group | row3 | nest | checkbox-row | nest-fixed | size=medium | size | — |
| checkbox-group | row4 | nest | checkbox-row | nest-fixed | size=medium | size | — |
| checkbox-group | row5 | nest | checkbox-row | nest-fixed | size=medium | size | — |
| checkbox-group | row6 | nest | checkbox-row | nest-fixed | size=medium | size | — |
| checkbox-group | row7 | nest | checkbox-row | nest-fixed | size=medium | size | — |
| checkbox-group | row8 | nest | checkbox-row | nest-fixed | size=medium | size | — |
| checkbox-row | control | nest | checkbox-control | nest-exposed | selection=unchecked, state=rest | size | selection, state |
| dialog | cancelInline | nest | button | nest-fixed | appearance=outline, size=medium, surface=default, inset=default, state=rest, leading icon=false, trailing icon=false | — | — |
| dialog | cancelStacked | nest | button | nest-fixed | appearance=outline, size=medium, surface=default, inset=default, state=rest, leading icon=false, trailing icon=false | — | — |
| dialog | close | nest | icon-button-neutral | nest-fixed | appearance=ghost, size=medium, shape=square, surface=default, state=rest | — | — |
| dialog | confirmInline | nest | button | nest-fixed | appearance=filled, size=medium, surface=default, inset=default, state=rest, leading icon=false, trailing icon=false | — | — |
| dialog | confirmStacked | nest | button | nest-fixed | appearance=filled, size=medium, surface=default, inset=default, state=rest, leading icon=false, trailing icon=false | — | — |
| dialog | footerDivider | nest | divider | nest-fixed | orientation=horizontal, inset=none | — | — |
| dialog | headerDivider | nest | divider | nest-fixed | orientation=horizontal, inset=none | — | — |
| flush-icon-button | focusRing | absolute | focus-ring | nest-fixed | surface=default | — | — |
| flush-icon-button-destructive | focusRing | absolute | focus-ring | nest-fixed | surface=default | — | — |
| flush-icon-button-neutral | focusRing | absolute | focus-ring | nest-fixed | surface=default | — | — |
| icon-button | focusRing | absolute | focus-ring | nest-fixed | surface=default | surface | — |
| icon-button | spinner | overlay | spinner | swap | — | — | — |
| icon-button-destructive | focusRing | absolute | focus-ring | nest-fixed | surface=default | surface | — |
| icon-button-destructive | spinner | overlay | spinner | swap | — | — | — |
| icon-button-neutral | focusRing | absolute | focus-ring | nest-fixed | surface=default | surface | — |
| icon-button-neutral | spinner | overlay | spinner | swap | — | — | — |
| link | focusRing | absolute | focus-ring | nest-fixed | surface=default | surface | — |
| list | item1 | nest | list-item | nest-fixed | type=unordered, size=medium | type, size | — |
| list | item2 | nest | list-item | nest-fixed | type=unordered, size=medium | type, size | — |
| list | item3 | nest | list-item | nest-fixed | type=unordered, size=medium | type, size | — |
| list | item4 | nest | list-item | nest-fixed | type=unordered, size=medium | type, size | — |
| list | item5 | nest | list-item | nest-fixed | type=unordered, size=medium | type, size | — |
| list | item6 | nest | list-item | nest-fixed | type=unordered, size=medium | type, size | — |
| list | item7 | nest | list-item | nest-fixed | type=unordered, size=medium | type, size | — |
| list | item8 | nest | list-item | nest-fixed | type=unordered, size=medium | type, size | — |
| password-field | focusRing | absolute | focus-ring | nest-fixed | surface=default | — | — |
| password-field | label | nest | field-label | nest-exposed | size=medium, emphasis=secondary, weight=regular, state=rest | size | emphasis, weight |
| password-field | message | nest | field-message | nest-fixed | status=default | status | — |
| password-field | toggle | nest | button | nest-exposed | appearance=text, size=medium, surface=default, inset=flush, state=rest, leading icon=false, trailing icon=false | size | label |
| radio-control | focusRing | absolute | focus-ring | nest-fixed | surface=default | — | — |
| radio-group | label | nest | field-label | nest-fixed | size=medium, emphasis=secondary, weight=bold, state=rest | size | — |
| radio-group | row1 | nest | radio-row | nest-fixed | size=medium | size | — |
| radio-group | row2 | nest | radio-row | nest-fixed | size=medium | size | — |
| radio-group | row3 | nest | radio-row | nest-fixed | size=medium | size | — |
| radio-group | row4 | nest | radio-row | nest-fixed | size=medium | size | — |
| radio-group | row5 | nest | radio-row | nest-fixed | size=medium | size | — |
| radio-group | row6 | nest | radio-row | nest-fixed | size=medium | size | — |
| radio-group | row7 | nest | radio-row | nest-fixed | size=medium | size | — |
| radio-group | row8 | nest | radio-row | nest-fixed | size=medium | size | — |
| radio-row | control | nest | radio-control | nest-exposed | selection=unchecked, state=rest | size | selection, state |
| segmented-control | label | nest | field-label | nest-fixed | size=medium, emphasis=secondary, weight=bold, state=rest | size | — |
| segmented-control | segment1 | nest | segmented-control-segment | nest-exposed | selection=selected, size=medium, state=rest | size | selection, state |
| segmented-control | segment2 | nest | segmented-control-segment | nest-exposed | selection=unselected, size=medium, state=rest | size | selection, state |
| segmented-control | segment3 | nest | segmented-control-segment | nest-exposed | selection=unselected, size=medium, state=rest | size | selection, state |
| segmented-control | segment4 | nest | segmented-control-segment | nest-exposed | selection=unselected, size=medium, state=rest | size | selection, state |
| segmented-control | segment5 | nest | segmented-control-segment | nest-exposed | selection=unselected, size=medium, state=rest | size | selection, state |
| segmented-control-segment | focusRing | absolute | focus-ring | nest-fixed | surface=default | — | — |
| select | focusRing | absolute | focus-ring | nest-fixed | surface=default | — | — |
| select | label | nest | field-label | nest-exposed | size=medium, emphasis=secondary, weight=regular, state=rest | size | emphasis, weight |
| select | message | nest | field-message | nest-fixed | status=default | status | — |
| switch-control | focusRing | absolute | focus-ring | nest-fixed | surface=default | — | — |
| switch-row | control | nest | switch-control | nest-exposed | selection=off, state=rest | size | selection, state, showStateLabel |
| tab | count | nest | badge | nest-fixed | type=count, emphasis=bold, tone=neutral | — | — |
| tab | focusRing | absolute | focus-ring | nest-fixed | surface=default | — | — |
| tabs | tab1 | nest | tab | nest-fixed | selection=selected, size=medium, state=rest | size | — |
| tabs | tab2 | nest | tab | nest-fixed | selection=unselected, size=medium, state=rest | size | — |
| tabs | tab3 | nest | tab | nest-fixed | selection=unselected, size=medium, state=rest | size | — |
| tabs | tab4 | nest | tab | nest-fixed | selection=unselected, size=medium, state=rest | size | — |
| tabs | tab5 | nest | tab | nest-fixed | selection=unselected, size=medium, state=rest | size | — |
| tabs | tab6 | nest | tab | nest-fixed | selection=unselected, size=medium, state=rest | size | — |
| tag | focusRing | absolute | focus-ring | nest-fixed | surface=default | — | — |
| text-field | focusRing | absolute | focus-ring | nest-fixed | surface=default | — | — |
| text-field | label | nest | field-label | nest-exposed | size=medium, emphasis=secondary, weight=regular, state=rest | size | emphasis, weight |
| text-field | message | nest | field-message | nest-fixed | status=default | status | — |
| textarea | focusRing | absolute | focus-ring | nest-fixed | surface=default | — | — |
| textarea | label | nest | field-label | nest-exposed | size=medium, emphasis=secondary, weight=regular, state=rest | size | emphasis, weight |
| textarea | message | nest | field-message | nest-fixed | status=default | status | — |
| toast | action | nest | button | nest-fixed | appearance=text, size=small, surface=inverse, inset=default, state=rest, leading icon=false, trailing icon=false | — | — |
| toast | close | nest | icon-button-neutral | nest-fixed | appearance=ghost, size=small, shape=square, surface=inverse, state=rest | — | — |

## Inherits

| Component | Inherits from |
|---|---|
| checkbox-row | text-field |
| flush-icon-button | icon-button |
| flush-icon-button-destructive | icon-button-destructive |
| flush-icon-button-neutral | icon-button-neutral |
| icon-button | button |
| icon-button-destructive | button-destructive |
| icon-button-neutral | button-neutral |
| radio-row | checkbox-row |
| switch-row | checkbox-row |
| textarea | text-field |
