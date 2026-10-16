# Component dependencies

What nests what, and which components a change reaches. An edge is a part in one component that places an instance of another: a nested part in the layout, an out-of-flow part such as the focus ring, or an overlay such as the spinner.

`inherits` is listed apart. It tells a reader which definition to read for the rest; the engine copies nothing across it, so it is not part of what a change reaches.

Generated from the component definitions and the emission by `packages/engine/emit-analysis-reports.ts`; `regen.ts --check` fails when this page is stale. The same data for agents: [component-dependencies.json](component-dependencies.json). All reports: [index](index.md).

## If a component changes

| Component | Nested by (direct) | Affected by a change (direct and transitive) |
|---|---|---|
| _accordion-indicator | accordion | accordion |
| _pagination-item | pagination | pagination |
| _slider-thumb | slider | slider |
| badge | tab | tab, tabs |
| breadcrumb-item | breadcrumbs | breadcrumbs |
| button | dialog, password-field, toast | dialog, password-field, toast |
| button-neutral | banner, pagination | banner, pagination |
| checkbox-control | checkbox-row | checkbox-group, checkbox-row |
| checkbox-row | checkbox-group | checkbox-group |
| code-input-cell | code-input | code-input |
| divider | accordion, dialog | accordion, dialog |
| field-label | checkbox-group, code-input, password-field, radio-group, segmented-control, select, slider, text-field, textarea | checkbox-group, code-input, password-field, radio-group, segmented-control, select, slider, text-field, textarea |
| field-message | code-input, password-field, progress, select, slider, text-field, textarea | code-input, password-field, progress, select, slider, text-field, textarea |
| flush-icon-button-neutral | breadcrumb-item | breadcrumb-item, breadcrumbs |
| focus-ring | _pagination-item, _slider-thumb, accordion, button, button-destructive, button-neutral, checkbox-control, code-input-cell, flush-icon-button, flush-icon-button-destructive, flush-icon-button-neutral, icon-button, icon-button-destructive, icon-button-neutral, link, password-field, radio-control, segmented-control-segment, select, switch-control, tab, tag, text-field, textarea | _pagination-item, _slider-thumb, accordion, banner, breadcrumb-item, breadcrumbs, button, button-destructive, button-neutral, checkbox-control, checkbox-group, checkbox-row, code-input, code-input-cell, dialog, flush-icon-button, flush-icon-button-destructive, flush-icon-button-neutral, icon-button, icon-button-destructive, icon-button-neutral, link, pagination, password-field, radio-control, radio-group, radio-row, segmented-control, segmented-control-segment, select, slider, switch-control, switch-row, tab, tabs, tag, text-field, textarea, toast |
| icon-button-neutral | banner, dialog, pagination, toast | banner, dialog, pagination, toast |
| link | breadcrumb-item, breadcrumbs | breadcrumb-item, breadcrumbs |
| list-item | list | list |
| radio-control | radio-row | radio-group, radio-row |
| radio-row | radio-group | radio-group |
| segmented-control-segment | segmented-control | segmented-control |
| spinner | button, button-destructive, button-neutral, icon-button, icon-button-destructive, icon-button-neutral | banner, button, button-destructive, button-neutral, dialog, icon-button, icon-button-destructive, icon-button-neutral, pagination, password-field, toast |
| switch-control | switch-row | switch-row |
| tab | tabs | tabs |
| text-field | slider | slider |

A component not in this table is nested by nothing; a change to it reaches only itself.

## What each component nests

| Component | Depth | Nests (direct) | Nests (transitive) |
|---|---|---|---|
| _accordion-indicator | 0 | — | — |
| _pagination-item | 1 | focus-ring | focus-ring |
| _slider-thumb | 1 | focus-ring | focus-ring |
| accordion | 1 | _accordion-indicator, divider, focus-ring | _accordion-indicator, divider, focus-ring |
| badge | 0 | — | — |
| banner | 2 | button-neutral, icon-button-neutral | button-neutral, focus-ring, icon-button-neutral, spinner |
| breadcrumb-item | 2 | flush-icon-button-neutral, link | flush-icon-button-neutral, focus-ring, link |
| breadcrumbs | 3 | breadcrumb-item, link | breadcrumb-item, flush-icon-button-neutral, focus-ring, link |
| button | 1 | focus-ring, spinner | focus-ring, spinner |
| button-destructive | 1 | focus-ring, spinner | focus-ring, spinner |
| button-neutral | 1 | focus-ring, spinner | focus-ring, spinner |
| checkbox-control | 1 | focus-ring | focus-ring |
| checkbox-group | 3 | checkbox-row, field-label | checkbox-control, checkbox-row, field-label, focus-ring |
| checkbox-row | 2 | checkbox-control | checkbox-control, focus-ring |
| code-input | 2 | code-input-cell, field-label, field-message | code-input-cell, field-label, field-message, focus-ring |
| code-input-cell | 1 | focus-ring | focus-ring |
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
| pagination | 2 | _pagination-item, button-neutral, icon-button-neutral | _pagination-item, button-neutral, focus-ring, icon-button-neutral, spinner |
| password-field | 2 | button, field-label, field-message, focus-ring | button, field-label, field-message, focus-ring, spinner |
| progress | 1 | field-message | field-message |
| radio-control | 1 | focus-ring | focus-ring |
| radio-group | 3 | field-label, radio-row | field-label, focus-ring, radio-control, radio-row |
| radio-row | 2 | radio-control | focus-ring, radio-control |
| segmented-control | 2 | field-label, segmented-control-segment | field-label, focus-ring, segmented-control-segment |
| segmented-control-segment | 1 | focus-ring | focus-ring |
| select | 1 | field-label, field-message, focus-ring | field-label, field-message, focus-ring |
| slider | 2 | _slider-thumb, field-label, field-message, text-field | _slider-thumb, field-label, field-message, focus-ring, text-field |
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
| _pagination-item | focusRing | absolute | focus-ring | nest-fixed | surface=default | — | — |
| _slider-thumb | focusRing | absolute | focus-ring | nest-fixed | surface=default | — | — |
| accordion | divider | nest | divider | nest-fixed | orientation=horizontal, inset=none | — | — |
| accordion | focusRing | absolute | focus-ring | nest-fixed | surface=default | — | — |
| accordion | leadingGlyph | nest | _accordion-indicator | nest-exposed | indicator=chevron, expansion=collapsed, size=medium | expansion, size | indicator |
| accordion | trailingGlyph | nest | _accordion-indicator | nest-exposed | indicator=chevron, expansion=collapsed, size=medium | expansion, size | indicator |
| banner | action1 | nest | button-neutral | nest-fixed | appearance=outline, size=small, surface=default, inset=default, state=rest, leading icon=false, trailing icon=false | — | — |
| banner | action2 | nest | button-neutral | nest-fixed | appearance=text, size=small, surface=default, inset=default, state=rest, leading icon=false, trailing icon=false | — | — |
| banner | dismiss | nest | icon-button-neutral | nest-fixed | appearance=ghost, size=small, shape=square, surface=default, state=rest | — | — |
| breadcrumb-item | crumb | nest | link | nest-exposed | style=inline, weight=default, size=medium, surface=default, state=rest | size | state |
| breadcrumb-item | overflow | nest | flush-icon-button-neutral | nest-exposed | shape=flush, size=small, state=rest | — | state |
| breadcrumbs | item1 | nest | breadcrumb-item | nest-fixed | kind=ancestor, size=medium | size | — |
| breadcrumbs | item2 | nest | breadcrumb-item | nest-fixed | kind=ancestor, size=medium | size | — |
| breadcrumbs | item3 | nest | breadcrumb-item | nest-fixed | kind=current, size=medium | size | — |
| breadcrumbs | parentLink | nest | link | nest-exposed | style=inline, weight=default, size=medium, surface=default, state=rest | size | state |
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
| checkbox-row | control | nest | checkbox-control | nest-exposed | selection=unchecked, state=rest | size | selection, state |
| code-input | cell1 | nest | code-input-cell | nest-fixed | size=medium, state=rest | size | — |
| code-input | cell2 | nest | code-input-cell | nest-fixed | size=medium, state=rest | size | — |
| code-input | cell3 | nest | code-input-cell | nest-fixed | size=medium, state=rest | size | — |
| code-input | cell4 | nest | code-input-cell | nest-fixed | size=medium, state=rest | size | — |
| code-input | cell5 | nest | code-input-cell | nest-fixed | size=medium, state=rest | size | — |
| code-input | cell6 | nest | code-input-cell | nest-fixed | size=medium, state=rest | size | — |
| code-input | label | nest | field-label | nest-exposed | size=medium, emphasis=secondary, weight=regular, state=rest | — | emphasis, weight |
| code-input | message | nest | field-message | nest-fixed | status=default | status | — |
| code-input-cell | focusRing | absolute | focus-ring | nest-fixed | surface=default | — | — |
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
| pagination | item1 | nest | _pagination-item | nest-fixed | type=page, selection=unselected, size=medium, state=rest | size | — |
| pagination | item2 | nest | _pagination-item | nest-fixed | type=ellipsis, selection=unselected, size=medium, state=rest | size | — |
| pagination | item3 | nest | _pagination-item | nest-fixed | type=page, selection=unselected, size=medium, state=rest | size | — |
| pagination | item4 | nest | _pagination-item | nest-fixed | type=page, selection=selected, size=medium, state=rest | size | — |
| pagination | item5 | nest | _pagination-item | nest-fixed | type=page, selection=unselected, size=medium, state=rest | size | — |
| pagination | item6 | nest | _pagination-item | nest-fixed | type=ellipsis, selection=unselected, size=medium, state=rest | size | — |
| pagination | item7 | nest | _pagination-item | nest-fixed | type=page, selection=unselected, size=medium, state=rest | size | — |
| pagination | next | nest | icon-button-neutral | nest-exposed | appearance=ghost, size=medium, shape=square, surface=default, state=rest | size | state |
| pagination | nextButton | nest | button-neutral | nest-exposed | appearance=text, size=medium, surface=default, inset=default, state=rest, leading icon=false, trailing icon=true | size | state |
| pagination | previous | nest | icon-button-neutral | nest-exposed | appearance=ghost, size=medium, shape=square, surface=default, state=rest | size | state |
| pagination | previousButton | nest | button-neutral | nest-exposed | appearance=text, size=medium, surface=default, inset=default, state=rest, leading icon=true, trailing icon=false | size | state |
| password-field | focusRing | absolute | focus-ring | nest-fixed | surface=default | — | — |
| password-field | label | nest | field-label | nest-exposed | size=medium, emphasis=secondary, weight=regular, state=rest | size | emphasis, weight |
| password-field | message | nest | field-message | nest-fixed | status=default | status | — |
| password-field | toggle | nest | button | nest-exposed | appearance=text, size=medium, surface=default, inset=flush, state=rest, leading icon=false, trailing icon=false | size | label |
| progress | messageComplete | nest | field-message | nest-fixed | status=success | — | — |
| progress | messageError | nest | field-message | nest-fixed | status=error | — | — |
| radio-control | focusRing | absolute | focus-ring | nest-fixed | surface=default | — | — |
| radio-group | label | nest | field-label | nest-fixed | size=medium, emphasis=secondary, weight=bold, state=rest | size | — |
| radio-group | row1 | nest | radio-row | nest-fixed | size=medium | size | — |
| radio-group | row2 | nest | radio-row | nest-fixed | size=medium | size | — |
| radio-group | row3 | nest | radio-row | nest-fixed | size=medium | size | — |
| radio-row | control | nest | radio-control | nest-exposed | selection=unchecked, state=rest | size | selection, state |
| segmented-control | label | nest | field-label | nest-fixed | size=medium, emphasis=secondary, weight=bold, state=rest | size | — |
| segmented-control | segment1 | nest | segmented-control-segment | nest-fixed | selection=selected, size=medium, state=rest | size | — |
| segmented-control | segment2 | nest | segmented-control-segment | nest-fixed | selection=unselected, size=medium, state=rest | size | — |
| segmented-control | segment3 | nest | segmented-control-segment | nest-fixed | selection=unselected, size=medium, state=rest | size | — |
| segmented-control-segment | focusRing | absolute | focus-ring | nest-fixed | surface=default | — | — |
| select | focusRing | absolute | focus-ring | nest-fixed | surface=default | — | — |
| select | label | nest | field-label | nest-exposed | size=medium, emphasis=secondary, weight=regular, state=rest | size | emphasis, weight |
| select | message | nest | field-message | nest-fixed | status=default | status | — |
| slider | inputMax | nest | text-field | nest-fixed | size=medium, status=default, state=filled | — | — |
| slider | inputMin | nest | text-field | nest-fixed | size=medium, status=default, state=filled | — | — |
| slider | inputSingle | nest | text-field | nest-fixed | size=medium, status=default, state=filled | — | — |
| slider | label | nest | field-label | nest-fixed | size=medium, emphasis=secondary, weight=bold, state=rest | — | — |
| slider | message | nest | field-message | nest-fixed | status=default | — | — |
| slider | thumb | nest | _slider-thumb | nest-fixed | state=rest | — | — |
| slider | thumbMin | nest | _slider-thumb | nest-fixed | state=rest | — | — |
| switch-control | focusRing | absolute | focus-ring | nest-fixed | surface=default | — | — |
| switch-row | control | nest | switch-control | nest-exposed | selection=off, state=rest | size | selection, state, showStateLabel |
| tab | count | nest | badge | nest-fixed | type=count, emphasis=bold, tone=neutral | — | — |
| tab | focusRing | absolute | focus-ring | nest-fixed | surface=default | — | — |
| tabs | tab1 | nest | tab | nest-fixed | selection=selected, size=medium, state=rest | size | — |
| tabs | tab2 | nest | tab | nest-fixed | selection=unselected, size=medium, state=rest | size | — |
| tabs | tab3 | nest | tab | nest-fixed | selection=unselected, size=medium, state=rest | size | — |
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
