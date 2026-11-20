/**
 * Tag.Group — the set that owns what a lone Tag cannot: which tags are pressed, the one Tab stop with arrow keys,
 * removal from the keyboard and where focus goes after a removal (#1739). KB brief: `components/tag.md`.
 *
 * ── THE OWNER'S DECISION (#1739, 2026-11-18: A, A, A), and where each part lives ──────────────────────────────
 *
 *   1. SELECTION: multiple, each select tag a pressed toggle button (`aria-pressed`). No listbox, no radiogroup.
 *      The `value` / `onChange` props and the `accessibility` fields; `codeOnly` carries the derivation.
 *   2. OVERFLOW: wrap. No "+N more". The `items` row declares `layout.wrap`, and its line gap is `rowGap`, the
 *      schema field this def added (CSS `row-gap`): without it a wrapped line takes the host's default, none, and the
 *      lines of tags would touch.
 *   3. FIGMA: a component set holding a row of three nested tags, built like `checkbox-group` (a container over a
 *      native `items` slot), with the gap bound to `space.100` — the binding `tag.tokens['group-gap']` holds — on both
 *      axes. `test.ts` holds both bindings against the literal and against Tag's own key.
 *
 * The keyboard, removal and focus-after-removal contract is Tag's `codeOnly`, carried here unchanged. The brief's own
 * line — "the selection genres take different roles (no embedded remove, so no grid)" — means a group of pressed
 * buttons is not a grid. The owner decided the container role (#3949, 2026-11-18, Q-TG1 B): a select group is
 * `role="toolbar"`, one Tab stop with arrow keys across the toggle tags; a dismissible group keeps `role="grid"`.
 * `test.ts` holds both roles against literals from the decision.
 *
 * ── CONFIRMED AS BUILT (Q-TG1 confirm) ─────────────────────────────────────────────────────────────────────────────
 *
 *   · the `size` axis (carried, as Checkbox.Group carries it, so the group scales its tags by `follow`);
 *   · no visible heading (the `label` prop is the accessible name only), and the prop list itself;
 *   · no group-level `disabled`; three identical unselected default tags; the Tag page.
 *
 * ── STILL HELD ──────────────────────────────────────────────────────────────────────────────────────────────────────
 *
 *   · `generationPriority` 2 (Button.Group's tier) and the 320px placement width; all shipped prose is DRAFT.
 */
import { ComponentDef } from '../component-schema';

/** One default item: a select tag at rest, unselected, following the group's size. The designer edits each instance in
 *  place (type, selection, label), as on Checkbox.Group's rows. */
const item = (n: string) => ({
  kind: 'nest' as const,
  nests: 'tag',
  nesting: { kind: 'nest-fixed' as const, variant: { type: 'select', selection: 'unselected', size: 'medium', state: 'rest' }, follow: ['size'] },
  note: `The ${n} default item: a select Tag, unselected, at the group's size.`,
});

export const tagGroup: ComponentDef = {
  id: 'tag-group',
  name: 'Tag.Group',
  aliases: ['chip-group', 'chip-set', 'tag-list', 'filter-chips', 'filter-bar', 'token-list'],
  category: 'foundations',
  status: 'draft',
  summary: 'A wrapping row of Tags. The group owns which tags are pressed, arrow keys and removal. Size applies to the items you haven\'t edited. After editing an item, select the items and set their size.',
  description:
    'A labeled set of tags in a row that wraps onto more lines, with the same space between tags across and down. Any number of select tags can be pressed at once, each a toggle button. A dismissible tag in the group is removed with its × or with Delete. The group owns the pressed values, one Tab stop with arrow keys between tags, and where focus goes after a removal. Not a form choice submitted with other fields (Checkbox.Group), not exactly one choice (SegmentedControl or Radio.Group), and not a single tag on its own (Tag).',

  props: [
    { name: 'label', type: 'string', required: true, description: 'The group\'s accessible name, naming the decision its tags answer ("Filter by color"). It is not drawn; a visible heading above the group belongs to the page.' },
    { name: 'items', type: 'slot', anyOf: ['tag'], minItems: 1, required: true, description: 'The tags, each a Tag, in order. Three by default; a designer adds, removes and reorders them in place.' },
    { name: 'value', type: 'string[]', required: false, description: 'The controlled array of pressed tag values. The group owns it, and each select tag\'s pressed state is derived from it, never wired on the tag. Pair with onChange; use defaultValue for the uncontrolled form.' },
    { name: 'defaultValue', type: 'string[]', required: false, description: 'The uncontrolled initial set of pressed tag values.' },
    { name: 'onChange', type: '(value: string[], event) => void', required: false, description: 'Fires with the new array of pressed values when a select tag toggles. The group dispatches it; a tag inside the group never owns its own toggle.' },
    { name: 'onRemove', type: '(value: string, event) => void', required: false, description: 'Fires with the tag\'s value when a dismissible tag is removed, by its × or by Delete or Backspace on the focused tag. The group then moves focus to the next tag, else the previous one, else the group.' },
    { name: 'size', type: "enum: 'small' | 'medium' | 'large'", values: ['small', 'medium', 'large'], default: 'medium', required: false, description: 'Scales every tag in the group, passed to each one. The space between tags is the same at every size.' },
  ],

  // No interaction state of the group's own: each tag carries its own hover, pressed, focus and disabled.
  states: [],
  variants: {
    size: ['medium', 'small', 'large'],
  },
  axisKinds: { size: 'authoring' },

  tokens: {
    // THE GAP BETWEEN TAGS, across and down (owner, #1739 decision 3): Tag's `group-gap`, `space.100` (8px). Not in
    // `densitySpacing`: Tag's owner decision holds the group gap at no less than 8px, and a compact step would take it
    // to 6px.
    'group-gap': 'space.100',
  },

  anatomy: {
    root: 'container',
    parts: {
      container: {
        kind: 'box',
        // `target` because the schema requires exactly one — not an interaction claim (Button.Group's reading).
        role: 'target',
        layout: { direction: 'column', align: 'start', justify: 'start', sizing: { x: 'fill', y: 'hug' } },
        // BUILT AT 320 (Checkbox.Group's width), so three medium tags sit on one line and a fourth has room to wrap
        // onto the next; it fills its column down to the fields' 120 floor. Held for the owner.
        placementWidth: 320,
        minWidth: 120,
        children: ['items'],
        note: 'The group: a column holding the items slot. It fills the width it is given.',
      },
      // THE ITEMS SLOT (owner, #1739 decision 3; the `items` rule, Q307): a native slot, three tags by default, a row
      // that WRAPS (decision 2) with the group gap between tags and between lines.
      items: {
        kind: 'box',
        role: 'presentation',
        contentSlot: true,
        slotSettings: { minChildren: 1, allowPreferredValuesOnly: true },
        preferred: ['tag'],
        layout: { direction: 'row', align: 'center', justify: 'start', sizing: { x: 'fill', y: 'hug' }, wrap: true },
        gap: 'group-gap',
        rowGap: 'group-gap',
        crossAxisFill: true,
        children: ['tag1', 'tag2', 'tag3'],
        note: 'The items: a native slot holding the Tag instances, three by default, in a row that wraps onto more lines. A designer adds, removes and reorders tags in place.',
      },
      tag1: item('first'),
      tag2: item('second'),
      tag3: item('third'),
    },
    codeOnly: [
      {
        class: 'runtime-behavior',
        disposition: 'refused',
        description:
          'value / onChange — the group owns the array of pressed values (`value: string[]`), and each select tag\'s `aria-pressed` is derived from it (`pressed = value.includes(tag.value)`), never wired on a tag inside the group. Any number may be pressed (owner, #1739: multiple, as pressed toggle buttons; no listbox, no radiogroup). Figma has no data model, so the projected tags show one fixed default, all unselected.',
      },
      {
        class: 'semantics',
        disposition: 'refused',
        description:
          'The group element — a container named by `aria-label` (the `label` prop) or `aria-labelledby`, holding each select tag as a `<button type="button" aria-pressed>`. A select group is `role="toolbar"` (owner, #3949, Q-TG1 B): one Tab stop with arrow keys across the toggle tags, Tag\'s recorded keyboard contract. Not `role="group"`, which would make each tag its own Tab stop, and not `role="grid"`, which the brief keeps for the dismissible genre, since a select tag carries no embedded remove control.',
      },
      {
        class: 'composition',
        disposition: 'refused',
        description:
          'The dismissible group — when the × slot alone is the target, the group is `role="grid"`: each tag a `role="row"`, its label one `gridcell` and its remove control a second. The row and gridcell wrappers take `display: contents`, so the tags still wrap in the flex layout. Never a listbox for dismissible tags: ARIA does not allow an interactive child inside `role="option"`.',
      },
      {
        class: 'keyboard-and-focus',
        disposition: 'refused',
        description:
          'The keyboard — one Tab stop enters the group (a roving tabindex: the last-focused tag holds `tabindex="0"`, every other `-1`). Left and Right arrows move between tags, Up and Down across wrapped lines, mirrored under right-to-left layout. Space or Enter toggles a select tag; Delete or Backspace removes the focused dismissible tag. Tag\'s own contract, unchanged by the owner\'s decision.',
      },
      {
        class: 'keyboard-and-focus',
        disposition: 'refused',
        description:
          'Focus after removal — capture the removed tag\'s index before it goes; after the list updates, focus the next tag, else the previous one, else the group or the input that owns it. Never let focus fall to `<body>`.',
      },
      {
        class: 'responsive-layout',
        disposition: 'lowered',
        description:
          'Overflow — the group wraps (owner, #1739: no "+N more"): `display: flex; flex-wrap: wrap` with `gap` bound to `space.100` on both axes, so tags sit 8px apart across and down. Figma carries the same wrap and both gaps; a designer sees a second line only once the row runs out of width.',
      },
      {
        class: 'static-placeholder',
        disposition: 'lowered',
        description:
          'variable tag count — in code the tags are `items: Tag[]`, any number from one up. Figma holds them in the native `items` slot, three by default: a designer adds, removes and reorders tags on an instance in place, and only a tag belongs there.',
      },
      {
        class: 'composition',
        disposition: 'refused',
        description:
          'Combobox composition — a multi-select combobox renders its values as a group of dismissible tags inside the field. At an empty caret, Backspace focuses the last tag and a second Backspace removes it.',
      },
      {
        class: 'right-to-left',
        disposition: 'unsupported',
        description:
          'RTL — the row runs from the reading start and wraps toward the reading end, and the arrow keys follow the reading direction. Figma members are drawn left to right.',
      },
      {
        class: 'localization',
        disposition: 'lowered',
        description:
          'text expansion — tag labels expand like any string (30–50% in translation); a longer tag pushes the tags after it onto the next line rather than shrinking. The Figma members carry the English placeholder only.',
      },
    ],
  },

  figmaProperties: {
    variantAxes: ['size'],
  },

  accessibility: {
    role: 'A group of select tags is `role="toolbar"`, named by `aria-label` or `aria-labelledby`, holding the tags in order. Each select tag is a `<button>` with `aria-pressed`, and any number may be pressed. A group of dismissible tags whose × slot alone is the target is `role="grid"`: each tag a row, its label one gridcell and its remove control a second.',
    wcag: [
      '1.3.1 Info and Relationships (the group\'s name ties its tags to the decision they answer)',
      '1.4.10 Reflow (the row wraps rather than scrolling sideways, so every tag stays visible in a narrow column)',
      '2.1.1 Keyboard (every tag can be reached, toggled or removed from the keyboard)',
      '2.4.3 Focus Order (after a removal, focus moves to the next tag, the previous one or the group, never to the top of the page)',
      '4.1.2 Name, Role, Value (each select tag exposes its pressed state; each remove control is named)',
    ],
    keyboard: 'One Tab stop enters the group. Left and Right arrows move focus between tags without toggling them, and Up and Down move across wrapped lines. Space or Enter toggles a select tag; Delete or Backspace removes the focused dismissible tag.',
    focus: 'The focus ring is on the focused tag; the group itself draws none. After a removal, focus moves to the next tag, else the previous one, else the group or the input that owns it, and never to `<body>`.',
    aria: 'Name the group for the decision its tags answer ("Filter by color"). Each select tag exposes its state with `aria-pressed`, set from the group\'s value. Each remove control is named "Remove" followed by the tag\'s label. Every name is translatable, and the row and the arrow keys mirror under right-to-left layout.',
  },

  content: {
    labelPattern: 'Name the group for the decision its tags answer ("Filter by color"). Each tag keeps its own short label, one word where possible, in the same casing across the set.',
  },

  docs: {
    usage: 'Use a tag group for a set of tags the user toggles or removes in place: filters above a list, applied filters, or recipients in a field. Any number of select tags can be pressed. Give the group a name, let it own the pressed values, and let the row wrap. For a structured choice submitted with a form, use Checkbox.Group; for exactly one choice, SegmentedControl or Radio.Group.',
    do: [
      'Name the group for the decision its tags answer',
      'Let the group own the pressed values, and derive each tag\'s pressed state from them',
      'Move focus to the next tag after a removal, else the previous one, else the group',
      'Let the row wrap, so every tag stays visible',
    ],
    dont: [
      'Wire a pressed state or a toggle handler on a tag inside the group. Both belong to the group.',
      'Put dismissible tags in a listbox. A listbox option cannot contain the remove control.',
      'Use a tag group for exactly one choice. That is a segmented control or a radio group.',
      'Disable every tag in a group. Hide the group instead.',
    ],
    contentGuidelines: 'The group name says what the tags filter or hold; the tags carry the short values, in the words the data or the user supplies.',
  },

  ai: {
    primaryPurpose: 'Lay out a set of Tags in a wrapping row, with the group owning which select tags are pressed, the one Tab stop with arrow keys, and removal with focus kept in the group.',
    whenToUse: 'A set of filters the user toggles in place, any number at once (above a list or search results), or a set of applied filters, recipients or keywords the user removes.',
    avoidWhen: 'One tag on its own (Tag), a structured choice submitted with a form (Checkbox.Group), exactly one choice (SegmentedControl or Radio.Group), or a row of actions (Button.Group).',
    commonPartners: ['tag', 'search-field', 'list', 'popover'],
    triggerKeywords: ['tag group', 'chip group', 'chip set', 'filter chips', 'filter bar', 'tag list', 'token list', 'applied filters', 'multi-select tags'],
    generationPriority: 2,
  },

  composition: {
    // Exactly what the anatomy nests: the three default tags.
    composesWith: ['tag'],
    alternativeTo: ['checkbox-group'],
    replacesPatterns: [
      'a removable token list built as a listbox',
      'a row of tags each its own Tab stop, with no group name',
      'tags that scroll sideways out of view instead of wrapping',
    ],
    supersededBy: [],
    planned: ['combobox'],
  },

  motion: {
    enter: 'None for the group. A tag added to it takes Tag\'s own entrance.',
    exit: 'A removed tag takes Tag\'s exit; the tags after it then slide into its place, and a tag that changes line moves there on the same duration.',
    reduceMotion: 'Under prefers-reduced-motion the tags after a removal take their new places at once; only the fade remains.',
  },

  notes: {
    contested: [
      '`generationPriority` 2 (a top-level component placed on its own, Button.Group\'s tier) and the 320px placement width (Checkbox.Group\'s). Held for the owner.',
    ],
    unverified: [
      'The line gap (`rowGap`, bound as `counterAxisSpacing`) is new to the projection. The shim builds it and reads it back; whether a real host keeps a variable bound to the line gap of a wrapping native slot is not checked. The symptom: a second line of tags touching the first.',
      'The default tags are nested instances inside a native slot, as on Checkbox.Group. Whether a real host keeps each tag\'s followed `size` once a designer has edited that tag\'s type or selection is the same open question Checkbox.Group records.',
    ],
    evolution: [
      'Owner, 2026-11-18 (#1739, A, A, A): multiple selection as pressed toggle buttons, wrap overflow, and a Figma set holding a row of three nested tags with the gap bound to `space.100`. Until then the group was code-only, its contract carried in Tag\'s `codeOnly` and its gap bound on Tag as `group-gap`.',
      'Owner, 2026-11-18 (#3949, Q-TG1 B): a select group is `role="toolbar"`, one Tab stop with arrow keys across the toggle tags, keeping Tag\'s recorded keyboard contract; a dismissible group keeps `role="grid"`. The options weighed were (A) `role="group"`, each tag its own Tab stop, and (C) `role="grid"` for both types. Until then the shipped fields named no container role for a select group.',
      'Owner, 2026-11-18 (#3949, Q-TG1 confirm), confirmed as built: the `size` axis carried as Checkbox.Group carries it, so the group scales its tags by `follow`; no visible heading, `label` the accessible name only, and the prop list `label`, `items`, `value`, `defaultValue`, `onChange`, `onRemove`, `size`; no group-level `disabled` (the brief hides a group whose every tag is inoperable rather than dim it; each tag keeps its own `disabled`); three identical unselected default tags; the Tag page in the file taxonomy.',
    ],
  },
};
