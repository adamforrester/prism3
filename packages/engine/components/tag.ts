/**
 * Tag — the interactive token: something a user toggles or removes. KB brief: `components/tag.md`.
 * The active counterpart to `badge.ts`, and built against Badge's `notes.contested` entry "THE HOOK FOR THE
 * TAG LANE", which names the five properties the two must never share.
 *
 * ── THE OWNER'S DECISIONS (2026-09-27), and where each one lives ───────────────────────────────────────
 *
 *   1. INTERACTIVE ONLY. A static label is a Badge. Every Tag member has states (`states`, the projected
 *      `stateAxis`) and a focus ring, and nothing here paints a non-interactive color family.
 *   3. VISUALLY DISTINCT FROM BADGE, GATED. Every color binding is `color.interactive.*` (or the cross-cutting
 *      `color.disabled.*` and the focus ring). `test.ts` holds the difference as a cross-component arm against
 *      literals: the shape (Tag's pill against the status badge's small radius), the interactive family, and a
 *      cue at rest (an edge, a check mark or the × slot).
 *   4. TOUCH TARGET 44 BY DEFAULT. The container binds `size.{size}.height`, Button's rung, so medium is 44px
 *      on comfortable, 56px on spacious and 36px at compact. `lint-hit-target.ts` measures it in `INTERACTIVE`;
 *      small is a named below-floor exception beside the small Button, and compact density is the other.
 *   5. TAG GROUP. Not a def (held, #1739). Its API is carried as code-tier rules in `codeOnly`, and the owner's
 *      spacing decision is bound here as `group-gap` → `space.100` (8px), gated in `test.ts` at ≥ 8px.
 *
 * ── THE OWNER'S DECISIONS (2026-09-28): TWO TYPES, SELECT AND DISMISSIBLE ──────────────────────────────
 *
 * These replace 2026-09-27's decision 2 (one component switched by `interaction`: clickable | selectable |
 * removable) and decision 6 (the remove control a nested IconButton.Neutral). The plain clickable tag is
 * DROPPED: an action in place is a Button.
 *
 *   A. `type` (`select | dismissible`) is a VARIANT AXIS, owner-named — the `VARIANT_AXES` name Badge also
 *      carries (Badge's `genre` was renamed `type` the same day, so the two use one name),
 *      argued in the list's header — and the code prop of the same name replaces `interaction`. It is an
 *      AUTHORING axis: a tag's type is chosen when it is placed and never changes on screen.
 *   B. SELECT: an optional leading icon (the `leading icon` boolean), and the selected status as a CHECK MARK
 *      on the TRAILING side. The check is optional — the `Check icon` boolean, on by default — and exists
 *      only at `selection=selected`. It never sits beside the leading icon. No dismiss on Select at all, which
 *      removes #1743's dual hit target and its 2.09–2.86:1 × on the selected fill.
 *   C. DISMISSIBLE: the ×, and no selection state. `figmaProperties.excludeCoordinates` removes
 *      `dismissible × selected` (the sparse grid from #1736), so the Figma set is 3 × 3 × 5 = 45 members, not
 *      60. The × is a plain `close` glyph (NOT a nested IconButton) centered in a SQUARE trailing slot the size
 *      of the tag's height (`size.{size}.height`, 44 at medium on comfortable). Whether the whole tag or only
 *      the × slot takes the press is OPEN (the owner's later call): the Figma structure is the same either way,
 *      and `codeOnly` states both options without picking one.
 *   D. MINIMUM WIDTH = THE TAG'S HEIGHT, per size, bound (`minWidthKey` → `size.{size}.height`), so it follows
 *      the density the height follows.
 *   E. SELECTED = A SUBTLE TINT + A BOLD OUTLINE, the label weight CONSTANT (no bold on select, so the label
 *      keeps its width; the check mark, when shown, still adds a cell — `test.ts` pins that). The outline is `interactive.primary.border.*` at `border-width.thick` (2px), drawn INSIDE the
 *      box, so a selected member's box equals its unselected twin's where the check is off. Recorded as the
 *      system's SELECTION PATTERN in `skills/prism3-build-component` (segmented control, selectable cards and
 *      list options reuse it). The unselected look stays as it was: outlined in `interactive.neutral`.
 *   F. NO TRUNCATION (#1758): the label WRAPS in code. A `title` does not make truncated text reachable.
 *
 * ── THE OWNER'S DECISIONS (2026-09-29) ─────────────────────────────────────────────────────────────────
 *
 *   G. THE CHECK WIDENS THE TAG. A selected tag with the check shown is one glyph and one gap wider than its
 *      unselected twin (32px at medium); the width is not reserved. `test.ts` `tag selected width` pins it.
 *   H. THE FIGMA SWITCH IS `Check icon` (it was `check mark`). It toggles only the Select check; the code prop
 *      stays `showCheck`. The Dismissible × has no switch: it is the tag's action, present on every member.
 *   I. SELECTED HOVER AND PRESSED: the tint holds and the 2px outline steps darker
 *      (`interactive.primary.border.hover` / `.pressed`).
 *   J. THE TINT (owner, 2026-09-29, "respect `none`"): `interactive.primary.subtle-fill.selected`, the primary
 *      fill at an opacity step. Every brand whose `outlineInteraction` is not `none` emits it — the whole
 *      subtle-fill family on `solid-tint`, this one leaf on the default `overlay-neutral` (`modes.ts`,
 *      `resolveAllModes`), derived by one rule so the two agree. It is `brandDependent` in the token contract.
 *      On `none` it is not emitted, `applyOutlineInteraction` drops the binding, and a selected tag shows its 2px
 *      outline and its check only.
 *
 * The selected label and check keep the unselected NEUTRAL ink. The primary ink fails on the tint:
 * `interactive.primary.text.rest` measures 3.02:1 (aurora/light) against 4.5:1. The neutral ink clears 10.19:1.
 *
 * ── THE SCHEMA BOUNDARY ────────────────────────────────────────────────────────────────────────────────
 *
 * `STATES` has no `selected`, and none was added: `selection` is the family axis checkbox, radio and switch use,
 * and it crosses the state axis by construction (`{selection}.{slot}.{state}`). The check's boolean-plus-variant
 * presence (a boolean on a `presentWhen`-gated part) was refused until #1743; the composition is now defined in
 * `figmaPropertyErrors` and `present()`: the variant gate decides which members carry the node, the boolean
 * toggles it where it is.
 */
import { ComponentDef } from '../component-schema';

export const tag: ComponentDef = {
  id: 'tag',
  name: 'Tag',
  aliases: ['chip', 'filter-tag', 'filter-chip', 'input-tag', 'input-chip', 'removable-tag', 'dismissible-tag', 'selectable-tag', 'choice-chip', 'interaction-tag', 'checkable-tag', 'facet'],
  category: 'foundations',
  status: 'draft',
  summary: 'An interactive token a user toggles or removes. A static label is a badge.',
  description:
    'A compact, interactive token of one of two types. A select tag toggles on and off, such as a filter; while selected it takes a tint, a 2px outline and, by default, a check mark after the label. The label keeps its weight, so its own width does not change; the check mark, when shown, adds its width and one gap. A dismissible tag carries a remove control, a × in a square slot at its trailing end, named "Remove" followed by the tag\'s label, such as an applied filter or a recipient in a field. Tags usually sit in a group that owns the selection model, arrow-key movement between tags and where focus goes after a removal. At rest a tag always shows an outline.',

  props: [
    { name: 'label', type: 'string', required: true, description: 'The tag text. One word where possible, two or three for a specific entity such as a name or an email address. A long label wraps; it is never cut off.' },
    { name: 'type', type: "enum: 'select' | 'dismissible'", values: ['select', 'dismissible'], default: 'select', required: false, description: 'Which interaction the tag carries. select = toggles on and off, and shows its selected state. dismissible = carries a remove control and has no selected state. This is the component\'s own prop, not the HTML type attribute, and it is never passed to the element.' },
    { name: 'selected', type: 'boolean', default: 'false', required: false, description: 'Whether a select tag is on. A selected tag takes a tint and a 2px outline, and shows a check mark unless showCheck is off, so the state never rests on color alone. Ignored on a dismissible tag.' },
    { name: 'showCheck', type: 'boolean', default: 'true', required: false, description: 'Whether a selected select tag shows its check mark after the label. On by default. With it off, the tint and the 2px outline carry the selected state.' },
    { name: 'onClick', type: 'function', required: false, description: 'The toggle a select tag fires. Suppressed while disabled or read-only.' },
    { name: 'onRemove', type: 'function', required: false, description: 'Called when a dismissible tag\'s remove control is pressed, or when Delete or Backspace is pressed on the focused tag.' },
    { name: 'leadingIcon', type: 'slot', required: false, description: 'An icon or avatar before the label, for recognition at a glance. Decorative: the label carries the name.' },
    { name: 'size', type: "enum: 'small' | 'medium' | 'large'", values: ['small', 'medium', 'large'], default: 'medium', required: false, description: 'Tag height, padding and label type, on the same rungs as Button. Medium clears 44px on comfortable and spacious density, and is 36px at compact. A tag is never narrower than it is tall.' },
    { name: 'disabled', type: 'boolean', default: 'false', required: false, description: 'Removes the tag from interaction and dims it. Don\'t disable every tag in a group; hide the group instead.' },
    { name: 'readOnly', type: 'boolean', default: 'false', required: false, description: 'Keeps full visual weight but accepts no interaction, such as a filter the user cannot change. Distinct from disabled, which dims.' },
  ],

  states: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled', 'read-only'],
  variants: {
    // `select` LEADS: it is the code default and the Figma default member.
    type: ['select', 'dismissible'],
    // `unselected` LEADS: it is the rest coordinate and the Figma default member, and the code default of
    // `selected` is false. A dismissible tag is always unselected (`excludeCoordinates`).
    selection: ['unselected', 'selected'],
    size: ['small', 'medium', 'large'],
  },
  // WHEN each axis changes (#1611): selection moves live (a filter toggled), so it is runtime; the type and size
  // are picked once. The selected member is WIDER than the unselected one when the check shows — the check takes
  // a cell in the row — and `figmaProperties.footprintVaries` states it. The unselected tag does not reserve the
  // check's width (owner, 2026-09-29).
  axisKinds: { type: 'authoring', selection: 'runtime', size: 'authoring' },

  // The selection-control grammar, minus its bare `{slot}` fallback: every key names its selection value. The
  // state-qualified template leads so a hover or pressed key wins, and a state with no key of its own
  // (focus-visible, read-only) falls through to the rest key. `type` is not in the grammar: the two types paint
  // alike, and a dismissible tag is always at `unselected`.
  paintKeys: ['{selection}.{slot}.{state}', '{selection}.{slot}'],

  tokens: {
    // Geometry. `radius.round` (the pill) keeps the tag off Button's `radius.md` rectangle, which an outlined
    // neutral tag would otherwise match edge for edge, and off the status badge's `radius.sm`; it is the
    // brand-intrinsic round rung the controlShape lever leaves alone.
    'radius': 'radius.round',
    // THE EDGE WEIGHT, per selection (owner decision E): 1px unselected (Button's `border-width.hairline`), 2px
    // selected (`border-width.thick`, 2px in every corpus brand). Both are drawn INSIDE the box, so the weight
    // change moves no box.
    'unselected.border-width': 'border-width.hairline',
    'selected.border-width': 'border-width.thick',
    // NO BLOCK PADDING, on purpose: the height is FIXED (`size.{size}.height`) and the row centers its cells.
    'pad-y': 'space.0',
    // The group's spacing between tags (owner decision 5, 2026-09-27): at least 8px, bound to a spacing token.
    // No part of THIS def reads it — the group is code-only until the owner decides whether it is a def — so
    // it lives here as the one binding the group will read, and `test.ts` holds it at `space.100` and ≥ 8px.
    'group-gap': 'space.100',
    'focus-ring': 'color.border.focus',
    'ring-width': 'focus.ring.width',
    'ring-offset': 'focus.ring.offset',

    // Per size, Button's rungs: the hit-target height (`lint-hit-target.ts` reads `size.medium.height`), which
    // is also the minimum width and the × slot's side (owner decisions C and D), the label-side inset, the gap
    // between cells and the label type. The glyph rung is 1:1 with the control rung (small → icon.size.sm), the
    // corpus default; Button's one-rung-smaller glyph is an owner exception (`lint-rung-names.ts`
    // `ICON_OFFSET_DEFS`) and is held for the owner here rather than taken.
    'size.small.height': 'size.sm.height',
    'size.small.padding-x': 'size.sm.padding-x',
    'size.small.gap': 'size.sm.gap',
    'size.small.icon': 'icon.size.sm',
    'size.small.type': 'type.label.sm.emphasis',
    'size.medium.height': 'size.md.height',
    'size.medium.padding-x': 'size.md.padding-x',
    'size.medium.gap': 'size.md.gap',
    'size.medium.icon': 'icon.size.md',
    'size.medium.type': 'type.label.md.emphasis',
    'size.large.height': 'size.lg.height',
    'size.large.padding-x': 'size.lg.padding-x',
    'size.large.gap': 'size.lg.gap',
    'size.large.icon': 'icon.size.lg',
    'size.large.type': 'type.label.lg.emphasis',

    // UNSELECTED — outlined. The edge is the at-rest affordance Badge never has; hover and pressed are the
    // interactive overlay wash on the same node (Button's outline grammar), and the edge and ink step with
    // them. Neutral's ink is `walkable: false`, so its three steps resolve to one value today — keyed anyway,
    // so a brand whose neutral does walk gets the step. The × glyph of a dismissible tag is this `icon` ink.
    'unselected.border': 'color.interactive.neutral.border.rest',
    'unselected.border.hover': 'color.interactive.neutral.border.hover',
    'unselected.border.pressed': 'color.interactive.neutral.border.pressed',
    'unselected.overlay.hover': 'color.interactive.neutral.overlay.hover',
    'unselected.overlay.pressed': 'color.interactive.neutral.overlay.pressed',
    'unselected.label': 'color.interactive.neutral.text.rest',
    'unselected.label.hover': 'color.interactive.neutral.text.hover',
    'unselected.label.pressed': 'color.interactive.neutral.text.pressed',
    // #1471 — a glyph binds the `icon.*` twin, never `text.*`.
    'unselected.icon': 'color.interactive.neutral.icon.rest',
    'unselected.icon.hover': 'color.interactive.neutral.icon.hover',
    'unselected.icon.pressed': 'color.interactive.neutral.icon.pressed',

    // SELECTED — a tint and a 2px primary outline (owner decision E). THE TINT is the primary subtle fill at its
    // selected step (owner decision J, 2026-09-29), emitted on every brand but a `none` one, where
    // `applyOutlineInteraction` drops this entry. It stays in the `overlay` paint slot. One key, no state steps: hover and
    // pressed fall through to it (the template list's rest fallback), so the tint holds and the EDGE steps with
    // the interaction, as an outline's edge does. The label and the check keep the unselected neutral ink —
    // the primary ink fails 4.5:1 on the tint (header).
    'selected.overlay': 'color.interactive.primary.subtle-fill.selected',
    'selected.border': 'color.interactive.primary.border.rest',
    'selected.border.hover': 'color.interactive.primary.border.hover',
    'selected.border.pressed': 'color.interactive.primary.border.pressed',
    'selected.label': 'color.interactive.neutral.text.rest',
    'selected.label.hover': 'color.interactive.neutral.text.hover',
    'selected.label.pressed': 'color.interactive.neutral.text.pressed',
    'selected.icon': 'color.interactive.neutral.icon.rest',
    'selected.icon.hover': 'color.interactive.neutral.icon.hover',
    'selected.icon.pressed': 'color.interactive.neutral.icon.pressed',

    // Cross-cutting disabled — Button's outline block: the edge tracks the disabled glyph ink (#1349). No member
    // has a fill at rest any more (the selected tint is the overlay slot, which the disabled branch does not
    // carry), so there is no `disabled.fill` and no on-fill ink: a disabled tag is a dimmed outline.
    'disabled.label': 'color.disabled.text',
    'disabled.icon': 'color.disabled.icon',
    'disabled.border': 'color.disabled.icon',
  },

  anatomy: {
    root: 'container',
    parts: {
      container: {
        kind: 'box',
        role: 'target',
        // The overlay wash if it resolves (unselected hover/pressed, and the selected tint), with the edge on its
        // own stroke. No `fill` slot: no member has an opaque fill.
        paintSlots: ['overlay', 'border'],
        children: ['content', 'dismiss', 'focusRing'],
        layout: { direction: 'row', align: 'center', justify: 'center', sizing: { x: 'hug', y: 'fixed' } },
        height: 'size.{size}.height',
        // Owner decision D: never narrower than it is tall, per size, on the height's own token.
        minWidthKey: 'size.{size}.height',
        radius: 'radius',
        strokeWidth: '{selection}.border-width',
        note: 'The tag body, a pill of fixed height that hugs its content and is never narrower than it is tall. Unselected, it is a 1px outline with no fill; selected, it takes a tint and a 2px outline, drawn inside the pill so the box does not grow.',
      },
      content: {
        kind: 'box',
        role: 'presentation',
        // The inset row: the label-side padding on both sides, and the cells in visual order. A dismissible tag's
        // × slot sits OUTSIDE it, flush against the pill's trailing edge.
        children: ['leadingVisual', 'label', 'check'],
        layout: { direction: 'row', align: 'center', justify: 'center', sizing: { x: 'hug', y: 'hug' } },
        padding: { block: 'pad-y', inlineLabel: 'size.{size}.padding-x' },
        gap: 'size.{size}.gap',
        note: 'The label row inside the pill: the optional leading icon, the label and, on a selected select tag, the check mark, with the tag\'s inline padding on both sides.',
      },
      leadingVisual: {
        kind: 'slot',
        optional: true,
        size: 'size.{size}.icon',
        nesting: { kind: 'swap' },
        note: 'An optional icon or avatar before the label. Decorative: the label carries the name.',
      },
      label: {
        kind: 'text',
        type: 'size.{size}.type',
        note: 'The tag text, at the same weight whether or not the tag is selected, so the label keeps its width when the tag is selected; the check mark, when shown, adds a cell after it. In code a long label wraps; Figma holds one line.',
      },
      check: {
        kind: 'vector',
        glyph: 'check',
        size: 'size.{size}.icon',
        // Present only on a selected tag, and switchable there (`figmaProperties.booleans.showCheck`, on by
        // default). Only a select tag is ever selected: the exclusion removes dismissible × selected, so the one
        // gate on `selection` is the whole rule and no second gate on `type` is needed.
        presentWhen: { selection: ['selected'] },
        optional: true,
        note: 'The selected indicator, a check mark after the label. It exists only on a selected select tag and is on by default; the Check icon switch hides it, leaving the tint and the 2px outline.',
      },
      dismiss: {
        kind: 'box',
        role: 'presentation',
        // A SQUARE the tag's height: 44 at medium on comfortable density (owner decision C). Present only on a
        // dismissible tag. Unpainted: the glyph inside it carries the ink.
        size: 'size.{size}.height',
        // A second pointer target inside the tag, or part of a whole-tag one (the owner's open call). Marked so
        // `lint-hit-target.ts` finds it from the def and measures it; the gate's INNER_TARGETS must list it.
        innerTarget: true,
        layout: { direction: 'row', align: 'center', justify: 'center', sizing: { x: 'fixed', y: 'fixed' } },
        presentWhen: { type: ['dismissible'] },
        children: ['dismissGlyph'],
        note: 'The remove slot of a dismissible tag: a square as tall as the tag, at its trailing end, holding the × glyph.',
      },
      dismissGlyph: {
        kind: 'vector',
        glyph: 'close',
        size: 'size.{size}.icon',
        // Its slot's own gate, restated on the glyph so the part says where it is drawn (`lint-glyph-geometry.ts`
        // reads a vector's gate from the part itself, and counts one × at each dismissible member).
        presentWhen: { type: ['dismissible'] },
        note: 'The × of a dismissible tag, a plain glyph centered in the remove slot, in the tag\'s icon ink.',
      },
      focusRing: {
        kind: 'absolute',
        when: 'focus-visible',
        nests: 'focus-ring',
        inset: 'ring-offset',
        strokeInset: 'ring-width',
        nesting: { kind: 'nest-fixed', variant: { surface: 'default' } },
        note: 'The shared focus ring, around the whole tag while it has keyboard focus.',
      },
    },
    codeOnly: [
      'read-only — a real state (readOnly), deliberately NOT a Figma variant: a read-only tag keeps the rest paint at full weight and only refuses interaction, so a member would be byte-identical to rest. It is not dimmed and is not disabled; it keeps its place in the tab order so its label stays reachable.',
      'The Tag prop named type — the component\'s own prop (select | dismissible), the same values as the Figma type axis. It is NOT the HTML type attribute and is never forwarded to the element: a select tag rendered as a <button> sets type="button" itself, so a tag inside a form never submits it. In React, destructure type out of the props before spreading the rest onto the element.',
      'The select tag in code — a <button> with aria-pressed, or a role="checkbox" or listbox option when a group owns the selection (a radiogroup for single choice). The label weight is the same selected and unselected. The check mark follows showCheck; with it off, the tint and the 2px outline carry the state.',
      'The dismissible tag\'s hit target is not decided yet, and both options build from the same Figma structure. (1) The whole tag is one <button> named "Remove" followed by the label, and pressing anywhere on it removes the tag. (2) Only the × slot is the button, named the same, and the body is not interactive; the tag is then a row in a role="grid" group, the label one gridcell and the × slot a second. Either way the × slot is a square as tall as the tag, 44px at medium on comfortable density, and its click does not reach any handler on the tag body.',
      'The selected tint — `interactive.primary.subtle-fill.selected`, the primary fill at an opacity step, over the page ground. A brand whose outline interaction is none has no tint, and a selected tag there shows the 2px outline and the check mark only. The outline is `interactive.primary.border` at 2px, drawn inside the box (an inset outline, outline-offset: -2px, or an inset box-shadow), never a border that would grow the tag. In forced-colors mode the tint drops out and the 2px outline and the check mark carry the state.',
      'The group contract (the tag group is not built yet) — the group owns the selection model (multiple: a listbox with aria-multiselectable, or pressed buttons; single: a radiogroup), and it lays tags out as a wrapping flex row with the `group-gap` binding (space.100, 8px) between tags on both axes. A dismissible group is role="grid" when the × slot alone is the target: each tag is a row, its label a gridcell and its remove control a second gridcell; the row and gridcell wrappers take display: contents so the tags wrap in the flex layout. One tab stop enters the group, Left and Right arrows move between tags (Up and Down across wrapped lines), and Delete or Backspace removes the focused tag. Never a listbox for dismissible tags: ARIA does not allow an interactive child inside role="option".',
      'Focus after removal — capture the removed tag\'s index before it goes; after the list updates, focus the next tag, else the previous one, else the group or the input that owns it. Never let focus fall to <body>.',
      'Overflow — a group wraps by default. A group that must stay on one line measures the available width against the tags (a ResizeObserver) and ends in a computed "+N more" tag that opens a popover of the rest; the popover is keyboard and screen-reader reachable. The measurement moves when web fonts load.',
      'Combobox composition — a multi-select combobox renders its values as a group of dismissible tags inside the field. At an empty caret, Backspace focuses the last tag and a second Backspace removes it.',
      'RTL — logical properties (padding-inline, gap) mirror the row, so the leading icon moves to the right edge and the check mark and the × slot to the left. No physical directions, and no script.',
      'text expansion — the tag has no fixed width and never truncates: a long label WRAPS onto more lines and the tag grows taller, and the full text stays visible at 200% zoom. Truncation would need the full text reachable by keyboard, touch and screen reader, and a title attribute is none of those. Set min-inline-size equal to the tag\'s block size so a one-letter tag is square. Translations run 30–50% longer. Figma holds one line of placeholder text.',
      'The hit-target expansion — a small tag is 36px tall on comfortable density and 28px at compact, and a medium tag is 36px at compact. Reaching 44px there is a code-side hit area larger than the visible box, which Figma cannot hold.',
    ],
  },

  figmaProperties: {
    variantAxes: ['type', 'selection', 'size'],
    // Owner decision C: a dismissible tag has no selection state. 2 × 2 × 3 = 12 coordinates, less the 3
    // dismissible × selected, is 9; × 5 states = 45 members.
    excludeCoordinates: [{ type: ['dismissible'], selection: ['selected'] }],
    // Five of the six states: `read-only` is admitted in `codeOnly` (it paints as rest).
    stateAxis: { name: 'state', values: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled'] },
    gridAxis: 'state',
    // The check mark is a flow child gated on `selection`, so a selected member is one glyph and one gap wider
    // while the check shows.
    footprintVaries: ['selection'],
    texts: { label: { part: 'label', default: 'Tag' } },
    booleans: {
      leadingIcon: { part: 'leadingVisual', figmaName: 'leading icon', default: false },
      // Owner, 2026-09-29: `Check icon`. It toggles the Select check only; the Dismissible × has no switch.
      showCheck: { part: 'check', figmaName: 'Check icon', default: true },
    },
    swaps: { leadingIcon: { part: 'leadingVisual', figmaName: '↳ swap leading icon' } },
  },

  accessibility: {
    role: 'By type. Select: a <button> with aria-pressed, or a role="checkbox" or listbox option when a group owns the selection (a radiogroup for single choice). Dismissible: the remove control is a real button named "Remove" followed by the label; in a group of dismissible tags it sits in a role="grid" row.',
    wcag: [
      '1.4.1 Use of Color (a selected tag adds a 2px outline and, by default, a check mark to its tint, never color alone)',
      '1.4.3 Contrast (the label ink clears 4.5:1 on the tag at rest in every mode, on the page unselected and on the tint selected)',
      '1.4.11 Non-text Contrast (the unselected outline and the selected 2px outline clear 3:1 against the page; the check mark clears 3:1 on the tint and the × clears 3:1 on its ground)',
      '1.4.4 Resize Text / 1.4.10 Reflow (a long label wraps rather than truncating, so the full text stays visible at 200% zoom)',
      '2.1.1 Keyboard (every tag can be toggled or removed from the keyboard)',
      '2.4.3 Focus Order (after a removal, focus moves to the next tag, the previous one or the group, never to the top of the page)',
      '2.4.7 Focus Visible (a focus ring around the tag on keyboard focus)',
      '2.5.8 Target Size (Minimum) (24×24 — a small tag and its × slot are 36px on comfortable density and 28px at compact)',
      '2.5.5 Target Size (Enhanced) (44×44, as intent — a medium tag and its × slot clear 44px on comfortable and spacious density and miss it at compact (36px); a small tag reaches 44 only at spacious density, and elsewhere through a code-side hit area)',
      '1.1.1 Non-text Content / 4.1.2 Name, Role, Value (the remove control is named "Remove" followed by the label, and a select tag exposes its state)',
    ],
    keyboard: 'Select: Space or Enter toggles. In a single-choice group, arrows move and select, as radios do. Dismissible: Enter or Space on the remove control removes the tag; in a group, one tab stop enters the group, Left and Right arrows move between tags, and Delete or Backspace removes the focused tag.',
    focus: 'A focus ring around the whole tag on :focus-visible. In a group of dismissible tags, focus moves to the next tag after a removal, else the previous one, else the group or its input, and never to <body>.',
    aria: 'Name the remove control "Remove" followed by the label ("Remove Marketing"), or aria-label="Remove" plus aria-labelledby pointing at the label. Never a bare "Remove" or "×". A select tag exposes its state with aria-pressed, aria-checked or aria-selected, matching the role its group gives it. The check mark and a leading icon are aria-hidden. Every name is translatable, and the row mirrors under right-to-left layout.',
  },

  content: {
    labelPattern: 'One word where possible; two or three short words only for a specific entity, such as a name, an email address or a category. Sentence case, or the casing the user typed, the same across the set. The remove control is "Remove" followed by the label.',
  },

  docs: {
    usage: 'Use a tag for something a user acts on in place. Use a select tag for a lightweight filter or choice the user toggles; use a dismissible tag for an applied filter they can remove, or a recipient or keyword entered into a field. Put tags in a group with at least 8px between them, and let the group own selection, arrow-key movement and focus after removal. If nobody acts on it, it is a badge; if it runs an action, it is a button.',
    do: [
      'Name the remove control "Remove" followed by the label',
      'Move focus to the next tag after a removal, else the previous one, else the group',
      'Keep the check mark on a selected tag unless the tint and outline already read clearly in context',
      'Keep at least 8px between tags in a group',
      'Let a long label wrap, so the full text stays visible',
    ],
    dont: [
      'Use a tag for a status nobody can act on. That is a badge.',
      'Use a tag to run an action. That is a button.',
      'Use tags for a long list of choices in a form. That is a checkbox group or radio group.',
      'Put a dismissible tag list in a listbox. A listbox option cannot contain the remove control.',
      'Truncate a label with an ellipsis. A title attribute does not make the full text reachable by keyboard, touch or screen reader.',
      'Disable every tag in a group. Hide the group instead.',
    ],
    contentGuidelines: 'Keep the label to one word where possible. Use the words the data or the user supplies, such as a category, a name or a filter value, not system status words like "Failed" or "Processing"; those belong on a badge. A long label wraps onto a second line rather than being cut off.',
  },

  ai: {
    primaryPurpose: 'Render a small interactive token the user toggles or removes in place.',
    whenToUse: 'Inline filters toggled on and off (select), applied filters the user can remove, or recipients or keywords entered into a field (dismissible), usually in a group.',
    avoidWhen: 'Nobody can act on it (use a badge), it runs an action (use a button), or it is a structured choice in a form submission (use a checkbox group or radio group).',
    commonPartners: ['badge', 'icon', 'checkbox-group', 'radio-group'],
    triggerKeywords: ['tag', 'chip', 'filter tag', 'filter chip', 'input tag', 'input chip', 'removable tag', 'dismissible tag', 'selectable tag', 'select tag', 'choice chip', 'facet', 'applied filter', 'recipient token'],
    generationPriority: 3,
  },

  composition: {
    // Exactly what the anatomy nests: the ring (an `absolute`). The × is a glyph of the tag's own, not a nest.
    composesWith: ['focus-ring'],
    alternativeTo: ['badge', 'button', 'checkbox-group', 'radio-group'],
    planned: ['tag-group', 'combobox', 'toggle-button', 'avatar', 'popover'],
    replacesPatterns: ['a removable token list built as a listbox', 'a clickable div styled as a pill', 'a bare × glyph with no accessible name'],
  },

  motion: {
    enter: 'A tag added to a group scales from 90% to 100% as it fades in. On selection, the tint and the outline crossfade and the check mark scales in.',
    exit: 'A removed tag fades out first, then its width and margin collapse, so the tags after it slide into the space.',
    reduceMotion: 'Under prefers-reduced-motion, scale, slide and collapse are instant and only the opacity change remains, since the state change is the information.',
  },

  notes: {
    contested: [
      'The selected label and check ink stay the unselected neutral ink. The owner fixed the tint and the outline, not the ink; the primary ink fails 4.5:1 on the tint in 13 of 20 cells (lowest 3.02:1, aurora/light). Held for the owner.',
      'The dismissible hit target: the whole tag, or only the × slot. Open by owner decision C; `codeOnly` states both. The Figma structure is the same, and the × slot is 44px at medium on comfortable density either way.',
      'The × glyph size in its slot binds the tag\'s own icon rung (`size.{size}.icon`, 24px at medium), the same rung the check and the leading icon use. Held for the owner, with the slot\'s inner padding it implies.',
      'A long label wraps in code, and the row centers the leading icon, the check mark and the × slot on the label block (`align: center`, as in Figma, where the label is one line). Whether they should sit on the first line instead is held for the owner.',
      'The label row keeps its full trailing inset before the × slot, so the × sits one inset plus half the slot\'s spare width from the label. A tighter trailing inset beside the slot would need Button\'s slot-aware inset (#326). Held for the owner as a visual call.',
      'A dismissible tag keeps the optional leading icon (the `leading icon` switch is on every member). The owner named it for Select; nothing says Dismissible drops it. Held for the owner.',
      'The selection axis values `[unselected, selected]` (brief §4 and §15 words) against checkbox\'s `[unchecked, checked]`. A filter tag\'s ARIA state is aria-pressed, aria-checked or aria-selected depending on the group\'s role, so no one ARIA word fits; recorded as `disjoint` in `lint-axis-values.ts` and held for the owner.',
      'Tone (§4, §15: neutral + info/success/warning/error) is NOT built. The owner requires the interactive family, which has no status hues, and the brief itself warns against status vocabulary in a tag (§7). A status-encoding tag is held for the owner.',
      '`removing` (§4, the transient state) is not a state: it is motion only, and `STATES` has no such name. `unselected` is the selection axis value, not a state.',
      'Tag group: held for the owner (#1739) — a second def (like checkbox-group) or code-only. The group is code-only, and the owner\'s ≥ 8px spacing is bound as `group-gap`.',
    ],
    unverified: [
      'The check mark is the first part carrying both a boolean and a variant presence gate. The offline shim builds it (the node exists only at selected members, and the switch toggles it there); a real Figma host has not been checked for a boolean property that some members of a set have no node for.',
      'The minimum width is a BOUND `minWidth` (`minWidthKey`), the first in the corpus. The offline shim honors it; a real Figma host binding a variable to an auto-layout `minWidth` has not been checked.',
      'A medium tag is 44px tall on comfortable density, a medium Button\'s height (owner decision 4), and a dismissible tag adds a 44px square. Whether a pill that tall still reads as a tag beside buttons of the same height is a visual question no gate asks.',
      'The selected tint is the primary fill at an opacity step over the page. Whether it reads as "selected" beside the 10% neutral hover wash of an unselected tag is a visual question no gate asks; the 2px primary outline is the measured separation.',
    ],
    evolution: [
      'Owner, 2026-09-29 ("respect none"): the selected tint binds `interactive.primary.subtle-fill.selected`, which every brand whose outline interaction is not none now emits — one leaf on overlay-neutral, the family on solid-tint. It replaced `interactive.primary.overlay.selected`, a 20% neutral wash on the default lever rather than a primary tint. On none there is no tint.',
      'Owner, 2026-09-29: a selected tag with the check shown is one glyph and one gap wider than its unselected twin (32px at medium), and the width is not reserved, so a group reflows on toggle. It was held as a contested item against decision E\'s "nothing reflows".',
      'Owner, 2026-09-29: selected hover and pressed keep the tint and step the 2px outline (`interactive.primary.border.hover` / `.pressed`). It was held as a contested item.',
      'Owner, 2026-09-29: the Figma switch for the Select check is `Check icon` (it was `check mark`); the code prop stays `showCheck`. The Dismissible × has no switch: it is the tag\'s action and is on every member.',
      'Badge\'s hook, answered point by point. (1) Tag binds `color.interactive.*` only (plus disabled and the focus ring). (2) Tag has hover, pressed, focus-visible and disabled members, and selection as an axis. (3) Tag is in `lint-hit-target.ts` INTERACTIVE, 44px at medium. (4) Tag is a pill with an outline at rest, a tint and a 2px primary outline when selected; the status badge has a small radius and a tone fill, and binds no interactive role. (5) Tag no longer nests IconButton.Neutral: the × is a glyph in a square slot. `test.ts` holds (1) and (4) against Badge\'s projected rest paint.',
      'Two types, Select and Dismissible (owner, 2026-09-28), replace the three interactions (clickable | selectable | removable) of 2026-09-27. The plain clickable tag is dropped: an action in place is a Button. `type` is the variant axis name Badge shares (Badge\'s `genre` was renamed to match), and the code prop of the same name replaces `interaction`.',
      'The dual-action tag (select the body, remove with the ×, brief §2) is gone: Select has no dismiss at all (#1743), which also removed the × on the selected fill that measured 2.09–2.86:1.',
      'The remove control stopped nesting IconButton.Neutral (#1741): the nested 36px small icon button inside a 44px tag was the one target `lint-hit-target.ts` could not see. The × is now a plain glyph in a square slot the tag\'s height, which the gate measures.',
      'Selected is a tint and a 2px outline, no longer the primary fill with on-fill ink, and the label weight is the same both ways (owner, 2026-09-28). The check mark moved from before the label to after it and became switchable.',
      'The label wraps rather than truncating (#1758): the earlier guidance, an ellipsis paired with a title or tooltip, left the full text unreachable by keyboard, touch and screen reader.',
      'The brief\'s `Token` alias is not carried as a bare alias: in this repo "token" means a design token, and an agent asked for one would land here. "recipient token" is kept as a trigger phrase.',
      'A leading icon rung one smaller than the control rung (Button\'s #1350 offset) would suit a text-bearing tag; it is an owner exception in `lint-rung-names.ts`, so the 1:1 rung ships and the offset is held.',
    ],
  },
};
