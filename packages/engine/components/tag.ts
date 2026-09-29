/**
 * Tag — the interactive token: something a user clicks, toggles or removes. KB brief: `components/tag.md`.
 * The active counterpart to `badge.ts`, and built against Badge's `notes.contested` entry "THE HOOK FOR THE
 * TAG LANE", which names the five properties the two must never share.
 *
 * ── THE OWNER'S DECISIONS (2026-09-27), and where each one lives ───────────────────────────────────────
 *
 *   1. INTERACTIVE ONLY. A static label is a Badge. Every Tag member has states (`states`, the projected
 *      `stateAxis`) and a focus ring, and nothing here paints a non-interactive color family.
 *   2. ONE COMPONENT SWITCHED BY PROPS. `props.interaction` carries `clickable | selectable | removable` —
 *      the brief's three archetypes (action / selection / input), spelled as what the user can DO to the
 *      tag so the values describe themselves. `clickable` leads because it is the code default and the Figma
 *      default member (unselected, no remove button). "chip", "filter tag", "input tag" and "removable tag"
 *      are carried in `aliases` / `ai.triggerKeywords`; `Chip` is the first alias.
 *   3. VISUALLY DISTINCT FROM BADGE, GATED. Every color binding is `color.interactive.*` (or the cross-cutting
 *      `color.disabled.*` and the focus ring). At rest an unselected tag is OUTLINED — a 1px
 *      `interactive.neutral.border` stroke on no fill — and a selected tag is FILLED from
 *      `interactive.primary.fill.rest` with a check mark. Badge is a tone fill with no glyph (a subtle badge
 *      adds a 1px tone edge), and binds no interactive role.
 *      `test.ts` holds the difference as a cross-component arm against literals.
 *   4. TOUCH TARGET 44 BY DEFAULT. The container binds `size.{size}.height`, Button's rung, so medium is 44px
 *      on comfortable, 56px on spacious and 36px at compact. `lint-hit-target.ts` measures it in `INTERACTIVE`;
 *      small is a named below-floor exception beside the small Button, and compact density is the other.
 *   5. TAG GROUP. Not a def in this PR (held for the owner — see the PR). The group's API (selection model,
 *      grid keyboard pattern, overflow, focus after removal) is carried as code-tier rules in `codeOnly`, and
 *      the owner's spacing decision is bound here as `group-gap` → `space.100` (8px), gated in `test.ts` at
 *      ≥ 8px in every corpus brand and density.
 *   6. THE REMOVE CONTROL IS ITS OWN CONTROL. The `remove` part nests `icon-button-neutral` — a real button
 *      with its own accessible name ("Remove <label>") — rather than drawing a bare × glyph.
 *
 * ── THE SCHEMA BOUNDARY: NO NEW NAMES ─────────────────────────────────────────────────────────────────────
 *
 * `STATES` has no `selected`, and none was added. The existing mechanism fits: `selection` is the family axis
 * checkbox, radio and switch already use for "which selection value is showing", and an axis crosses the
 * state axis by construction (`{selection}.{slot}.{state}`), which a `selected` STATE could not — a hovered
 * selected tag would resolve `hover` and paint the unselected hover (the argument `VARIANT_AXES` records).
 * Its values are `[unselected, selected]`, the brief's own words; the spelling is an axis-VALUE choice held
 * for the owner (`lint-axis-values.ts` records it as `disjoint` from checkbox's `[unchecked, checked, …]`).
 *
 * The interaction archetype is NOT an axis, for Badge's `genre` reason: no name in the closed `VARIANT_AXES`
 * expresses it, and a new axis name is the owner's call. So `interaction` is a code prop and the Figma set is
 * selection × size × state, with the remove button as a node-visibility boolean (`remove button`) on the
 * nested instance — the mechanism `select` uses for its nested message.
 */
import { ComponentDef } from '../component-schema';

export const tag: ComponentDef = {
  id: 'tag',
  name: 'Tag',
  aliases: ['chip', 'filter-tag', 'filter-chip', 'input-tag', 'input-chip', 'removable-tag', 'selectable-tag', 'choice-chip', 'action-chip', 'interaction-tag', 'checkable-tag', 'facet'],
  category: 'foundations',
  status: 'draft',
  summary: 'An interactive token a user clicks, toggles or removes. A static label is a badge.',
  description:
    'A compact, interactive token in one of three interactions. A clickable tag runs an action in place, such as a suggested reply. A selectable tag toggles on and off, such as a filter, and shows a check mark while selected. A removable tag carries its own remove button, named "Remove" followed by the tag\'s label, such as an applied filter or a recipient in a field. Tags usually sit in a group that owns the selection model, arrow-key movement between tags and where focus goes after a removal. At rest a tag always shows an outline or an interactive fill.',

  props: [
    { name: 'label', type: 'string', required: true, description: 'The tag text. One word where possible, two or three for a specific entity such as a name or an email address.' },
    { name: 'interaction', type: "enum: 'clickable' | 'selectable' | 'removable'", values: ['clickable', 'selectable', 'removable'], default: 'clickable', required: false, description: 'What the user can do to the tag. clickable = runs an action, as a button. selectable = toggles on and off, and shows a check mark while selected. removable = carries a remove button with its own accessible name. Pick it deliberately: each interaction takes a different role and keyboard model.' },
    { name: 'selected', type: 'boolean', default: 'false', required: false, description: 'Whether a selectable tag is on. A selected tag is filled and shows a check mark, so the state never rests on color alone.' },
    { name: 'onClick', type: 'function', required: false, description: 'The action a clickable tag runs, or the toggle a selectable tag fires. Suppressed while disabled or read-only.' },
    { name: 'onRemove', type: 'function', required: false, description: 'Called when a removable tag\'s remove button is pressed, or when Delete or Backspace is pressed on the focused tag. Its click does not also fire onClick.' },
    { name: 'leadingIcon', type: 'slot', required: false, description: 'An icon or avatar before the label, for recognition at a glance. Decorative: the label carries the name.' },
    { name: 'size', type: "enum: 'small' | 'medium' | 'large'", values: ['small', 'medium', 'large'], default: 'medium', required: false, description: 'Tag height, padding and label type, on the same rungs as Button. Medium clears 44px on comfortable and spacious density, and is 36px at compact.' },
    { name: 'disabled', type: 'boolean', default: 'false', required: false, description: 'Removes the tag from interaction and dims it. Don\'t disable every tag in a group; hide the group instead.' },
    { name: 'readOnly', type: 'boolean', default: 'false', required: false, description: 'Keeps full visual weight but accepts no interaction, such as a filter the user cannot change. Distinct from disabled, which dims.' },
  ],

  states: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled', 'read-only'],
  variants: {
    // `unselected` LEADS: it is the rest coordinate and the Figma default member (a clickable or removable tag
    // is always unselected), and the code default of `selected` is false.
    selection: ['unselected', 'selected'],
    size: ['small', 'medium', 'large'],
  },
  // WHEN each axis changes (#1611): selection moves live (a filter toggled), so it is runtime; size is picked
  // once. The selected member is WIDER than the unselected one — the check mark takes a cell in the row — which
  // is the M3 filter-chip behavior the brief describes, and `figmaProperties.footprintVaries` states it.
  axisKinds: { selection: 'runtime', size: 'authoring' },

  // The selection-control grammar (`checkbox-control`'s), minus its bare `{slot}` fallback: every key here
  // names its selection value. The state-qualified template leads so a hover or pressed key wins, and a state
  // with no key of its own (focus-visible, read-only) falls through to the rest key.
  paintKeys: ['{selection}.{slot}.{state}', '{selection}.{slot}'],

  tokens: {
    // Geometry. `radius.round` (the pill) keeps the tag off Button's `radius.md` rectangle, which an outlined
    // neutral tag would otherwise match edge for edge; it is the brand-intrinsic round rung the controlShape
    // lever leaves alone. The 1px edge is Button's `border-width.hairline`.
    'radius': 'radius.round',
    'border-width': 'border-width.hairline',
    // NO BLOCK PADDING, on purpose: the height is FIXED (`size.{size}.height`) and the row centers its cells,
    // so block padding would only shrink the box the remove button has to fit in. The remove button is the
    // small IconButton at every tag size, whose side binds the same `size.sm.height` rung a small tag's height
    // does (36px comfortable, 28 compact, 44 spacious), so it exactly fills a small tag; any block inset
    // would push it past the tag's edge. `space.0` states the zero through a token rather than a literal.
    'pad-y': 'space.0',
    // The group's spacing between tags (owner decision 5, 2026-09-27): at least 8px, bound to a spacing token.
    // No part of THIS def reads it — the group is code-only until the owner decides whether it is a def — so
    // it lives here as the one binding the group will read, and `test.ts` holds it at `space.100` and ≥ 8px.
    'group-gap': 'space.100',
    'focus-ring': 'color.border.focus',
    'ring-width': 'focus.ring.width',
    'ring-offset': 'focus.ring.offset',

    // Per size, Button's rungs: the hit-target height (`lint-hit-target.ts` reads `size.medium.height`), the
    // label-side inset, the gap between cells and the label type. The glyph rung is 1:1 with the control rung
    // (small → icon.size.sm), the corpus default; Button's one-rung-smaller glyph is an owner exception
    // (`lint-rung-names.ts` `ICON_OFFSET_DEFS`) and is held for the owner here rather than taken.
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
    // so a brand whose neutral does walk gets the step.
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

    // SELECTED — filled from the primary family with its on-fill ink, and the fill self-bounds, so no edge is
    // painted. The REST fill, which the engine contracts `on-fill` against (4.5:1 in every mode, measured again in
    // `test.ts`). Chosen when `fill.selected` still walked to the pressed step and put on-fill text at 2.60:1 (nb)
    // and 2.62:1 (harbor) in dark; since #1626 `fill.selected` resolves to the rest step too, so the two agree.
    // Hover and pressed step from there, exactly as a filled Button's do.
    'selected.fill': 'color.interactive.primary.fill.rest',
    'selected.fill.hover': 'color.interactive.primary.fill.hover',
    'selected.fill.pressed': 'color.interactive.primary.fill.pressed',
    'selected.label': 'color.interactive.primary.on-fill',
    'selected.icon': 'color.interactive.primary.on-fill',

    // Cross-cutting disabled — Button's block verbatim: the edge tracks the disabled glyph ink (#1349), and the
    // on-fill ink applies only where the member has a fill at rest (the selected tag).
    'disabled.fill': 'color.disabled.fill',
    'disabled.label': 'color.disabled.text',
    'disabled.icon': 'color.disabled.icon',
    'disabled.label.on-fill': 'color.disabled.on-fill',
    'disabled.icon.on-fill': 'color.disabled.on-fill',
    'disabled.border': 'color.disabled.icon',
  },

  anatomy: {
    root: 'container',
    parts: {
      container: {
        kind: 'box',
        role: 'target',
        // Button's precedence: the overlay wash if it resolves (unselected hover/pressed), otherwise the fill
        // (selected), with the edge on its own stroke.
        paintSlots: ['overlay', 'fill', 'border'],
        children: ['check', 'leadingVisual', 'label', 'remove', 'focusRing'],
        layout: { direction: 'row', align: 'center', justify: 'center', sizing: { x: 'hug', y: 'fixed' } },
        padding: { block: 'pad-y', inlineLabel: 'size.{size}.padding-x' },
        gap: 'size.{size}.gap',
        height: 'size.{size}.height',
        radius: 'radius',
        strokeWidth: 'border-width',
        note: 'The tag body and its hit target, a pill of fixed height that hugs its content. Unselected, it is an outline with no fill; selected, it is an interactive fill. Either way it shows a cue at rest that a static badge does not.',
      },
      check: {
        kind: 'vector',
        glyph: 'check',
        size: 'size.{size}.icon',
        presentWhen: { selection: ['selected'] },
        note: 'The selected indicator, a check mark before the label. It exists only while the tag is selected, so selection never rests on color alone.',
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
        note: 'The tag text. One line; in code it truncates with an ellipsis and the full text is available on hover and focus.',
      },
      remove: {
        kind: 'nest',
        nests: 'icon-button-neutral',
        // The small, circular, ghost IconButton.Neutral at every tag size: a real button with its own name, a
        // square on the small rung (36px comfortable, 28 compact — above the 24px minimum target), whose glyph shows
        // with no fill or edge of its own at rest.
        // `nest-exposed` on `state` so a designer can show the remove button focused on its own — the brief's
        // split-target focus case — or disabled beside a disabled tag; it rests at `rest` otherwise.
        nesting: { kind: 'nest-exposed', variant: { appearance: 'ghost', size: 'small', shape: 'circular', surface: 'default', state: 'rest' }, expose: ['state'] },
        // The `remove button` boolean toggles it (`figmaProperties.booleans`), so the anatomy must allow it absent.
        optional: true,
        note: 'The remove button of a removable tag: a nested neutral icon button with its own accessible name, "Remove" followed by the tag\'s label. Hidden by default; the remove button switch shows it.',
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
      'The interaction switch — `interaction` (clickable | selectable | removable) is a code prop, not a variant axis: no name in the closed axis vocabulary expresses an interaction archetype, and a new name is an owner decision. In Figma a clickable tag is the default member, a selectable tag is the selection axis, and a removable tag is the remove button switch. In code each interaction takes its own role: clickable is a native <button>; selectable is a <button> with aria-pressed, or a role="checkbox" or listbox option inside a group; removable is a row in a grid.',
      'The group contract (the tag group is not built yet) — the group owns the selection model (multiple: a listbox with aria-multiselectable, or pressed buttons; single: a radiogroup), and it lays tags out as a wrapping flex row with the `group-gap` binding (space.100, 8px) between tags on both axes. A removable group is role="grid": each tag is a row, its label a gridcell and its remove button a second gridcell; the row and gridcell wrappers take display: contents so the tags wrap in the flex layout. One tab stop enters the group, Left and Right arrows move between tags (Up and Down across wrapped lines), and Delete or Backspace removes the focused tag. Never a listbox for removable tags: ARIA does not allow an interactive child inside role="option".',
      'Focus after removal — capture the removed tag\'s index before it goes; after the list updates, focus the next tag, else the previous one, else the group or the input that owns it. Never let focus fall to <body>.',
      'The remove button — a real <button>, named "Remove" followed by the label (or aria-label="Remove" with aria-labelledby pointing at the label). Its hit area grows with padding on the button, never margin, and its click stops propagation so a removal does not also fire the tag\'s action. A tag that is both clickable and removable cannot be a <button> containing a <button>: use the grid, or a non-button container holding two real buttons. In Figma the nested IconButton.Neutral shows the file\'s default icon; swap it to `close` on the instance.',
      'Overflow — a group that must stay on one line measures the available width against the tags (a ResizeObserver) and ends in a computed "+N more" tag that opens a popover of the rest. The measurement moves when web fonts load. The default is to wrap.',
      'Combobox composition — a multi-select combobox renders its values as a group of removable tags inside the field. At an empty caret, Backspace focuses the last tag and a second Backspace removes it.',
      'RTL — logical properties (padding-inline, gap) mirror the row, so the leading icon moves to the right edge and the remove button to the left. No physical directions, and no script.',
      'text expansion — the tag has no fixed width: it sizes to its content up to a max-width, then truncates with an ellipsis (overflow: hidden, white-space: nowrap), always paired with a title or tooltip carrying the full text. Translations run 30–50% longer. Figma holds one line of placeholder text.',
      'The hit-target expansion — a small tag is 36px tall on comfortable density and 28px at compact, and a medium tag is 36px at compact. Reaching 44px there is a code-side hit area larger than the visible box, which Figma cannot hold.',
    ],
  },

  figmaProperties: {
    variantAxes: ['selection', 'size'],
    // Five of the six states: `read-only` is admitted in `codeOnly` (it paints as rest).
    stateAxis: { name: 'state', values: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled'] },
    gridAxis: 'state',
    // The check mark is a flow child gated on `selection`, so a selected member is one glyph and one gap wider.
    footprintVaries: ['selection'],
    texts: { label: { part: 'label', default: 'Tag' } },
    booleans: {
      leadingIcon: { part: 'leadingVisual', figmaName: 'leading icon', default: false },
      onRemove: { part: 'remove', figmaName: 'remove button', default: false },
    },
    swaps: { leadingIcon: { part: 'leadingVisual', figmaName: '↳ swap leading icon' } },
  },

  accessibility: {
    role: 'By interaction. Clickable: a native <button>. Selectable: a <button> with aria-pressed, or a role="checkbox" or listbox option when a group owns the selection (a radiogroup for single choice). Removable: a row in a role="grid" group, with the label in one gridcell and the remove button in another.',
    wcag: [
      '1.4.1 Use of Color (a selected tag shows a check mark and a fill change, never color alone)',
      '1.4.3 Contrast (the label ink clears 4.5:1 on the tag at rest in every mode, selected and unselected)',
      '1.4.11 Non-text Contrast (the unselected outline clears 3:1 against the page)',
      '2.1.1 Keyboard (every tag can be activated, toggled or removed from the keyboard)',
      '2.4.3 Focus Order (after a removal, focus moves to the next tag, the previous one or the group, never to the top of the page)',
      '2.4.7 Focus Visible (a focus ring around the tag on keyboard focus)',
      '2.5.8 Target Size (Minimum) (24×24 — the remove button is a 36px square and a small tag is 36px tall, both 28px at compact density)',
      '2.5.5 Target Size (Enhanced) (44×44, as intent — a medium tag clears 44px on comfortable and spacious density and misses it at compact (36px); a small tag and the remove button reach 44 only at spacious density, and elsewhere through a code-side hit area)',
      '1.1.1 Non-text Content / 4.1.2 Name, Role, Value (the remove button is named "Remove" followed by the label, and a selectable tag exposes its state)',
    ],
    keyboard: 'Clickable: Enter or Space activates. Selectable: Space or Enter toggles. In a removable group: one tab stop enters the group, Left and Right arrows move between tags, and Delete or Backspace removes the focused tag. In a single-choice group, arrows move and select, as radios do.',
    focus: 'A focus ring around the whole tag on :focus-visible. In a removable group, focus moves to the next tag after a removal, else the previous one, else the group or its input, and never to <body>.',
    aria: 'Name the remove button "Remove" followed by the label ("Remove Marketing"), or aria-label="Remove" plus aria-labelledby pointing at the label. Never a bare "Remove" or "×". A selectable tag exposes its state with aria-pressed, aria-checked or aria-selected, matching the role its group gives it. A leading icon is aria-hidden. Every name is translatable, and the row mirrors under right-to-left layout.',
  },

  content: {
    labelPattern: 'One word where possible; two or three short words only for a specific entity, such as a name, an email address or a category. Sentence case, or the casing the user typed, the same across the set. The remove button is "Remove" followed by the label.',
  },

  docs: {
    usage: 'Use a tag for something a user acts on in place: an applied filter they can remove, a lightweight filter they toggle, a recipient or keyword entered into a field, or a suggested action inline with content. Set interaction to match: clickable, selectable or removable. Put tags in a group with at least 8px between them, and let the group own selection, arrow-key movement and focus after removal. If nobody acts on it, it is a badge.',
    do: [
      'Name the remove button "Remove" followed by the label',
      'Move focus to the next tag after a removal, else the previous one, else the group',
      'Show a check mark on a selected tag, so selection is not color alone',
      'Keep at least 8px between tags in a group',
      'Truncate a long label with an ellipsis and show the full text on hover and focus',
    ],
    dont: [
      'Use a tag for a status nobody can act on. That is a badge.',
      'Use a tag for a page\'s main action. That is a button.',
      'Use tags for a long list of choices in a form. That is a checkbox group or radio group.',
      'Put a removable tag list in a listbox. A listbox option cannot contain the remove button.',
      'Disable every tag in a group. Hide the group instead.',
    ],
    contentGuidelines: 'Keep the label to one word where possible. Use the words the data or the user supplies, such as a category, a name or a filter value, not system status words like "Failed" or "Processing"; those belong on a badge. Truncate past the maximum width and always show the full text on hover and focus.',
  },

  ai: {
    primaryPurpose: 'Render a small interactive token the user clicks, toggles or removes in place.',
    whenToUse: 'Applied filters the user can remove, inline filters toggled on and off, recipients or keywords entered into a field, or contextual actions inline with content, usually in a group.',
    avoidWhen: 'Nobody can act on it (use a badge), it is the page\'s main action (use a button), or it is a structured choice in a form submission (use a checkbox group or radio group).',
    commonPartners: ['badge', 'icon', 'checkbox-group', 'radio-group'],
    triggerKeywords: ['tag', 'chip', 'filter tag', 'filter chip', 'input tag', 'input chip', 'removable tag', 'selectable tag', 'choice chip', 'action chip', 'suggestion chip', 'facet', 'applied filter', 'recipient token'],
    generationPriority: 3,
  },

  composition: {
    // Exactly what the anatomy nests: the remove button (a `nest`) and the ring (an `absolute`).
    composesWith: ['icon-button-neutral', 'focus-ring'],
    alternativeTo: ['badge', 'button', 'checkbox-group', 'radio-group'],
    planned: ['tag-group', 'combobox', 'toggle-button', 'avatar', 'popover'],
    replacesPatterns: ['a removable token list built as a listbox', 'a clickable div styled as a pill', 'a bare × glyph with no accessible name'],
  },

  motion: {
    enter: 'A tag added to a group scales from 90% to 100% as it fades in. On selection, the fill crossfades and the check mark scales in.',
    exit: 'A removed tag fades out first, then its width and margin collapse, so the tags after it slide into the space.',
    reduceMotion: 'Under prefers-reduced-motion, scale, slide and collapse are instant and only the opacity change remains, since the state change is the information.',
  },

  notes: {
    contested: [
      'One component switched by `interaction` (owner, 2026-09-27) against the brief\'s practice default (§3, §10), which derives the archetype from callbacks (onClick / onRemove / selected). An enum makes the three exclusive, so the brief\'s dual-action tag (select the body, remove with the ×, §2) is not expressible here. Held for the owner: an enum value for it, or a separate boolean.',
      'The selection axis values `[unselected, selected]` (brief §4 and §15 words) against checkbox\'s `[unchecked, checked]`. A filter tag\'s ARIA state is aria-pressed, aria-checked or aria-selected depending on the group\'s role, so no one ARIA word fits; recorded as `disjoint` in `lint-axis-values.ts` and held for the owner.',
      'Tone (§4, §15: neutral + info/success/warning/error) is NOT built. The owner requires the interactive family, which has no status hues, and the brief itself warns against status vocabulary in a tag (§7). A status-encoding tag is held for the owner.',
      'Fill (filled / outlined / subtle, §4) is not an axis: unselected is outlined and selected is filled, which is the brief\'s own selected treatment ("a high-contrast fill + checkmark"). Held with the visual choices.',
      'The focus ring wraps the whole tag. The brief (§4) says a split-target removable tag lights only the × when the remove action has keyboard focus; the nested remove button exposes its own `state`, so a designer can show that, but no member does it by default.',
      '`removing` (§4, the transient state) is not a state: it is motion only, and `STATES` has no such name. `unselected` is the selection axis value, not a state.',
      'The remove button is the small IconButton at every tag size, so a large tag carries the same small-rung remove button as a small one, and it sits inside the full label-side inset (no remove-aware trailing inset — that would need a variant axis, as Button\'s #326 inset does).',
      'Tag group: held for the owner — a second def (like checkbox-group) or code-only. This PR carries it code-only and binds the owner\'s ≥ 8px spacing as `group-gap`.',
    ],
    unverified: [
      'The remove part is a boolean-toggled `nest` that is also `nest-exposed` on the nested state. `select` toggles a nested message and `checkbox-row` exposes a nested state, but no def did both on one part before; the offline shim builds it, a real Figma host has not been checked.',
      'The nested IconButton.Neutral shows the file\'s default (placeholder) icon, not a ×, because a nest cannot set the nested instance\'s swap. Nothing measures what a designer sees there.',
      'A medium tag is 44px tall on comfortable density, a medium Button\'s height (owner decision 4). Whether a pill that tall still reads as a tag beside buttons of the same height is a visual question no gate asks.',
    ],
    evolution: [
      'Badge\'s hook, answered point by point. (1) Tag binds `color.interactive.*` only (plus disabled and the focus ring). (2) Tag has hover, pressed, focus-visible and disabled members, and selection as an axis. (3) Tag is in `lint-hit-target.ts` INTERACTIVE, 44px at medium. (4) An unselected tag is outlined and a selected one filled with a check mark; Badge is a tone fill, with a 1px tone edge when subtle, and binds no interactive role. (5) The remove control nests IconButton.Neutral. `test.ts` holds (1) and (4) against Badge\'s projected rest paint.',
      'The brief\'s `Token` alias is not carried as a bare alias: in this repo "token" means a design token, and an agent asked for one would land here. "recipient token" is kept as a trigger phrase.',
      'A leading icon rung one smaller than the control rung (Button\'s #1350 offset) would suit a text-bearing tag; it is an owner exception in `lint-rung-names.ts`, so the 1:1 rung ships and the offset is held.',
    ],
  },
};
