/**
 * Menu, Menu.Item and Menu.Group — a list of actions on a raised panel, opened from a button.
 * KB brief: `components/menu.md`
 *
 * ── THE OWNER'S SHAPE (the proposal on #4007, decided by Q-FL2, 2026-11-19: "all as recommended") ─────────────────
 *
 * OD-M1 A, with K1 B: the menu-button dropdown, the overflow menu and submenus; a context menu is the same Menu with
 * another trigger (code only); a menubar stays out of scope, but `menubar` is kept as an alias (K1 B). OD-M2 A: Menu holds
 * no trigger; any Button or IconButton becomes a menu button through `aria-haspopup="menu"`. OD-M3 A: Menu.Item is 15
 * members, `type` [action, submenu] × `intent` [default, destructive] (action only) × five states, one size. OD-M4 A: a
 * check for checkbox and radio items alike. OD-M5 A: once any item is checkable, every item shows the `indicator` column.
 * OD-M6 A: an inset, rounded highlight. OD-M8 A, with K3 B: arrows wrap, and toggling a checkbox or radio item never
 * closes the menu, whatever the key. OD-X1 A: the panel binds Popover's raised-surface roles, and `test.ts` holds the
 * two sets equal. OD-X5 A: the shared Popover / open and Popover / close motion.
 *
 * ── K2: THE FOCUS LOOK, MEASURED ──────────────────────────────────────────────────────────────────────────────
 *
 * Q-FL2 K2 B was conditional: one highlight for hover and keyboard focus, and no item focus ring, only if the
 * highlight clears 3:1 against the panel (WCAG 1.4.11). Measured on this build over every committed brand and mode
 * (aurora, harbor, nb, prism3, wendys × light, dark, hc-light, hc-dark): `interactive.neutral.overlay.hover` composited
 * over `foreground.raised` reaches 1.20:1 to 1.33:1 against the panel, and `.pressed` 1.58:1 to 1.88:1. It does not
 * clear 3:1 anywhere, so K2 falls to A: a keyboard-focused item shows the highlight AND the shared FocusRing.
 * `test.ts` recomputes the ratio from the emitted values, so a brand that ever clears 3:1 is seen by name.
 *
 * ── TWO-LINE ITEMS (owner direction, 2026-11-18) ──────────────────────────────────────────────────────────────
 *
 * With a description, the indicator, the leading icon, the shortcut and the chevron align to the label's FIRST line.
 * The row is top-aligned. The check column and the leading icon sit in one cell that `firstLine` centers on the label's
 * first line, as FieldMessage's glyph does (#3360): the corpus's 20px glyph beside a 16.1px label line sets the label
 * down by half the difference. The trailing cell is 20px tall and top-aligned, so its chevron and shortcut center on
 * the same line as the leading glyphs. A leading cell with nothing in it would still take the row's gap, so it has its
 * own `leading` toggle (held for the owner): on, it shows the check column and the icon each behind their own toggle.
 */
import { ComponentDef, PartDef } from '../component-schema';

// ── Menu.Item ──────────────────────────────────────────────────────────────────────────────────────────────────

export const menuItem: ComponentDef = {
  id: 'menu-item',
  name: 'Menu.Item',
  aliases: ['menuitem', 'menu-option', 'action-item'],
  category: 'overlay',
  status: 'draft',
  summary: 'One action in a menu: a label, an optional icon, check, description, shortcut or submenu arrow.',
  description:
    'One row of a Menu: an action, a checkbox or radio choice, or the way into a submenu. It holds a label, and can add a leading icon, a check column, a second line of description, a keyboard shortcut hint at the end, or an arrow that opens a submenu. The row highlights under the pointer and while it has keyboard focus. A destructive action takes the destructive ink. Menu places the items and owns the keyboard.',

  props: [
    { name: 'label', type: 'string', required: true, description: 'What the action does, in a few words: "Rename", "Move to folder".' },
    { name: 'type', type: "enum: 'action' | 'checkbox' | 'radio' | 'submenu'", values: ['action', 'checkbox', 'radio', 'submenu'], default: 'action', required: false, description: 'action runs something; checkbox turns an option on or off; radio picks one option of a group; submenu opens a further menu.' },
    { name: 'intent', type: "enum: 'default' | 'destructive'", values: ['default', 'destructive'], default: 'default', required: false, description: 'destructive for an action that deletes or cannot be undone. Actions only.' },
    { name: 'checked', type: 'boolean', default: false, required: false, description: 'Whether a checkbox or radio item is on. Checkbox and radio items only.' },
    { name: 'disabled', type: 'boolean', default: false, required: false, description: 'Dims the item and stops it acting. It stays in the keyboard order, so a person can still find it.' },
    { name: 'leadingIcon', type: 'slot', required: false, description: 'An icon before the label. Decorative: the label carries the meaning.' },
    { name: 'description', type: 'string', required: false, description: 'A short second line under the label that says more about the action.' },
    { name: 'shortcut', type: 'string', required: false, description: 'A keyboard shortcut shown at the end, as a hint. The app owns the binding itself.' },
    { name: 'href', type: 'string', required: false, description: 'For an action that goes to a page: the address it opens.' },
    { name: 'textValue', type: 'string', required: false, description: 'The text typing a letter matches, when the label is not plain text. Defaults to the label.' },
    { name: 'onSelect', type: 'function', required: false, description: 'Called when the item is chosen: a press, Enter, or Space on a checkbox or radio item.' },
    { name: 'closeOnSelect', type: 'boolean', required: false, description: 'Whether choosing the item closes the menu. True for an action; checkbox and radio items keep the menu open.' },
  ],

  states: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled'],
  variants: {
    type: ['action', 'submenu'],
    intent: ['default', 'destructive'],
  },
  axisKinds: { type: 'authoring', intent: 'authoring' },

  paintKeys: ['{intent}.{slot}.{state}', '{intent}.{slot}', '{slot}'],
  densitySpacing: ['padding-x', 'gap'],

  tokens: {
    'min-height': 'size.md.min-height',
    'padding-x': 'space.150',
    'padding-y': 'space.150',
    'gap': 'space.100',
    'zero': 'space.0',
    'radius': 'radius.md',
    'icon': 'icon.size.sm',
    'label-type': 'type.label.md.default',
    'secondary-type': 'type.body.sm.default',
    'ring-width': 'focus.ring.width',
    'ring-offset': 'focus.ring.offset',

    // ── THE HIGHLIGHT (OD-M6 A, K2 A): the neutral wash at hover, pressed and focus-visible, on both intents.
    'default.overlay.hover': 'color.interactive.neutral.overlay.hover',
    'default.overlay.pressed': 'color.interactive.neutral.overlay.pressed',
    'default.overlay.focus-visible': 'color.interactive.neutral.overlay.hover',
    'destructive.overlay.hover': 'color.interactive.neutral.overlay.hover',
    'destructive.overlay.pressed': 'color.interactive.neutral.overlay.pressed',
    'destructive.overlay.focus-visible': 'color.interactive.neutral.overlay.hover',

    // ── INK: the neutral interactive ink, or the destructive one.
    'default.label': 'color.interactive.neutral.text.rest',
    'default.label.hover': 'color.interactive.neutral.text.hover',
    'default.label.pressed': 'color.interactive.neutral.text.pressed',
    'default.icon': 'color.interactive.neutral.icon.rest',
    'default.icon.hover': 'color.interactive.neutral.icon.hover',
    'default.icon.pressed': 'color.interactive.neutral.icon.pressed',
    'destructive.label': 'color.interactive.destructive.text.rest',
    'destructive.label.hover': 'color.interactive.destructive.text.hover',
    'destructive.label.pressed': 'color.interactive.destructive.text.pressed',
    'destructive.icon': 'color.interactive.destructive.icon.rest',
    'destructive.icon.hover': 'color.interactive.destructive.icon.hover',
    'destructive.icon.pressed': 'color.interactive.destructive.icon.pressed',
    // The description and the shortcut, in secondary text on either intent.
    // The `indicator` PAINT slot is the secondary ink the description and shortcut take, not the check column
    // (`indicatorCell` and the `indicator` Figma boolean): `indicator` is a canonical PAINT_SLOTS name.
    'indicator': 'color.text.secondary',

    'disabled.label': 'color.disabled.text',
    'disabled.icon': 'color.disabled.icon',
    'disabled.indicator': 'color.disabled.text',
  },

  anatomy: {
    root: 'row',
    parts: {
      row: {
        kind: 'box', mirror: 'reverses',   // #3986: the check and icon move to the right, the shortcut and chevron to the left
        role: 'target',
        paintSlots: ['overlay'],
        radius: 'radius',
        // TOP-ALIGNED (owner direction, 2026-11-18): a two-line item keeps its glyphs beside the label's first line.
        layout: { direction: 'row', align: 'start', justify: 'start', sizing: { x: 'fill', y: 'hug' } },
        placementWidth: 240,
        minHeight: 'min-height',
        padding: { block: 'padding-y', inlineLabel: 'padding-x' },
        gap: 'gap',
        firstLine: { glyph: 'icon', text: 'label', glyphCell: 'leadCell', textCell: 'textCell' },
        children: ['leadCell', 'textCell', 'trailCell', 'focusRing'],
        note: 'The item: the whole row is the target. It highlights with a light neutral wash at hover, press and keyboard focus, inset from the panel with rounded corners.',
      },
      leadCell: {
        kind: 'box', mirror: 'reverses',
        role: 'presentation',
        optional: true,
        layout: { direction: 'row', align: 'center', justify: 'start', sizing: { x: 'hug', y: 'hug' } },
        gap: 'gap',
        children: ['indicatorCell', 'leadingVisual'],
        note: 'The check column and the leading icon, centered on the label\'s first line. Off when an item has neither.',
      },
      indicatorCell: {
        kind: 'box',
        role: 'presentation',
        optional: true,
        size: 'icon',
        layout: { direction: 'row', align: 'center', justify: 'center', sizing: { x: 'fixed', y: 'fixed' } },
        children: ['checkGlyph'],
        note: 'The check column: an icon-wide cell that holds the check, so labels line up whether an item is checked or not.',
      },
      checkGlyph: {
        kind: 'vector',
        glyph: 'check',
        size: 'icon',
        optional: true,
        note: 'The check, shown on a checkbox or radio item that is on.',
      },
      leadingVisual: {
        kind: 'slot',
        size: 'icon',
        optional: true,
        nesting: { kind: 'swap' },
        note: 'An optional icon before the label.',
      },
      textCell: {
        kind: 'box',
        role: 'presentation',
        layout: { direction: 'column', align: 'start', justify: 'start', sizing: { x: 'fill', y: 'hug' } },
        grow: true,
        children: ['label', 'description'],
        note: 'The label and, under it, the optional description. It fills the row.',
      },
      label: {
        kind: 'text',
        type: 'label-type',
        wrap: true,
        note: 'The action\'s name.',
      },
      description: {
        kind: 'text',
        type: 'secondary-type',
        paintSlot: 'indicator',
        wrap: true,
        optional: true,
        note: 'An optional second line under the label, in secondary text.',
      },
      trailCell: {
        kind: 'box', mirror: 'reverses',
        role: 'presentation',
        layout: { direction: 'row', align: 'center', justify: 'end', sizing: { x: 'hug', y: 'hug' } },
        minHeight: 'icon',
        gap: 'gap',
        children: ['shortcut', 'chevronGlyph'],
        note: 'The shortcut and the submenu arrow, at the end of the row, beside the label\'s first line.',
      },
      shortcut: {
        kind: 'text',
        type: 'secondary-type',
        paintSlot: 'indicator',
        optional: true,
        note: 'The keyboard shortcut, as a hint, in secondary text.',
      },
      chevronGlyph: {
        kind: 'vector', mirror: 'mirrors',   // points left in RTL, as Breadcrumbs' separator does
        glyph: 'chevron-right',
        size: 'icon',
        presentWhen: { type: ['submenu'] },
        note: 'The arrow that marks a submenu. It points the other way in right-to-left text.',
      },
      focusRing: {
        kind: 'absolute',
        when: 'focus-visible',
        nests: 'focus-ring',
        inset: 'ring-offset',
        strokeInset: 'ring-width',
        nesting: { kind: 'nest-fixed', variant: { surface: 'default' } },
        note: 'The shared focus ring, around the item while it has keyboard focus, beside the highlight.',
      },
    },
    codeOnly: [
      {
        class: 'semantics',
        disposition: 'refused',
        description:
          'the item in code — `role="menuitem"`, `menuitemcheckbox` or `menuitemradio` (the last two with `aria-checked`), focusable by roving `tabindex`. A submenu item carries `aria-haspopup="menu"` and `aria-expanded`. The check, the chevron and the leading icon are `aria-hidden`; the visible shortcut text is `aria-hidden` and a real shortcut is exposed through `aria-keyshortcuts`. An item with `href` renders an `<a>` with the menuitem role.',
      },
      {
        class: 'not-projected',
        disposition: 'refused',
        description:
          'checkbox — not projected as a member: a checkbox or radio item is an action item with the `indicator` and `checked` toggles on, because they show or hide one node each. In code `type` takes action, checkbox, radio or submenu, and the role follows it.',
      },
      {
        class: 'keyboard-and-focus',
        disposition: 'refused',
        description:
          'a disabled item stays focusable — `aria-disabled="true"`, never the `disabled` attribute, so arrowing still reaches it and a screen reader announces it as unavailable. It takes no action.',
      },
      {
        class: 'runtime-behavior',
        disposition: 'refused',
        description:
          'activation — one path for a press, Enter, Space and typeahead. An action runs and closes the menu, returning focus to the trigger. A checkbox or radio item toggles and the menu stays open, whatever the key. A radio item turns the others in its group off.',
      },
      {
        class: 'visual-treatment',
        disposition: 'unsupported',
        description:
          'the highlight follows focus — in code the highlight is the item that has focus, whether the pointer or the arrow keys put it there, so there is one highlight in a menu at a time. A submenu item keeps the highlight while its submenu is open. Keyboard focus adds the shared focus ring, because the wash alone does not clear 3:1 against the panel.',
      },
      {
        class: 'live-geometry',
        disposition: 'lowered',
        description:
          'first-line alignment — the leading cells sit `max(0px, (icon − 1lh) / 2)` down from the top and the label `max(0px, (1lh − icon) / 2)`, so a two-line item keeps its glyphs on the first line; the trailing cell takes the same offset. Figma freezes the leading offset at paste and top-aligns the trailing cell.',
      },
      {
        class: 'motion',
        disposition: 'refused',
        description:
          'motion — the highlight moves with no transition, so a person arrowing through sees it land at once, and a check appears at once. The menu itself opens and closes on the Popover / open and Popover / close pattern.',
      },
      {
        class: 'right-to-left',
        disposition: 'unsupported',
        description:
          'right-to-left — the row mirrors through logical properties: the check and icon move to the right, the shortcut and chevron to the left, and the chevron points left.',
      },
      {
        class: 'localization',
        disposition: 'unsupported',
        description:
          'text expansion — the label and description wrap rather than truncate, and the menu grows to its max width before they do. Shortcut text follows the platform (Ctrl on Windows, ⌘ on macOS).',
      },
      {
        class: 'hit-target',
        disposition: 'carried',
        description:
          'the target — the whole row, at least `size.md.min-height` tall and the panel\'s width less its padding, so it clears 24px everywhere and 44px at comfortable and spacious density.',
      },
      {
        class: 'deferred',
        disposition: 'refused',
        description:
          'Plain HTML/CSS: wire this behavior contract up in your framework. The web component includes it. In plain HTML/CSS that covers roving focus, typeahead and submenu timing.',
      },
    ],
  },

  figmaProperties: {
    variantAxes: ['type', 'intent'],
    stateAxis: { name: 'state', values: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled'] },
    gridAxis: 'state',
    // A submenu item is never destructive (OD-M3 A).
    excludeCoordinates: [{ type: ['submenu'], intent: ['destructive'] }],
    texts: {
      label: { part: 'label', default: 'Menu item' },
      description: { part: 'description', default: 'Supporting text', figmaName: 'description text' },
      shortcut: { part: 'shortcut', default: '⌘K', figmaName: 'shortcut text' },
    },
    booleans: {
      leading: { part: 'leadCell', default: false, figmaName: 'leading', figmaOnly: true },
      indicator: { part: 'indicatorCell', default: false, figmaName: 'indicator', figmaOnly: true },
      checked: { part: 'checkGlyph', default: false },
      leadingIcon: { part: 'leadingVisual', default: true, figmaName: 'leading icon' },
      description: { part: 'description', default: false },
      shortcut: { part: 'shortcut', default: false },
    },
    swaps: { leadingIcon: { part: 'leadingVisual', figmaName: '↳ swap leading icon' } },
  },

  accessibility: {
    role: '`role="menuitem"`, `role="menuitemcheckbox"` or `role="menuitemradio"`, inside a `role="menu"`.',
    wcag: [
      '1.4.3 Contrast (the label and secondary text clear 4.5:1 on the panel and on the highlight)',
      '1.4.11 Non-text Contrast (the check, icon and chevron clear 3:1; the keyboard-focused item adds the focus ring, because the highlight alone does not)',
      '2.1.1 Keyboard (every item is reachable with the arrow keys and acts on Enter)',
      '2.4.7 Focus Visible (the focused item shows the highlight and the shared focus ring)',
      '2.5.8 Target Size (Minimum) (the whole row is the target, well above 24px)',
      '4.1.2 Name, Role, Value (the role, the checked state and a submenu\'s expanded state are set)',
    ],
    keyboard: 'Set by the menu: Arrow Up and Down move between items, Enter acts, Space toggles a checkbox or radio item, Arrow Right opens a submenu (Arrow Left in right-to-left text).',
    focus: 'Roving focus: the focused item has `tabindex="0"`, the rest -1. A disabled item stays focusable. The focused item shows the highlight and the focus ring.',
    aria: 'aria-checked on a checkbox or radio item; aria-haspopup="menu" and aria-expanded on a submenu item; aria-disabled="true" on a disabled item; aria-keyshortcuts for a real shortcut. The check, chevron, icon and visible shortcut text are aria-hidden.',
  },

  content: {
    labelPattern: 'Start with a verb for an action ("Rename", "Move to folder"); name the option for a checkbox or radio item ("Show grid"). Sentence case, no ending punctuation. Add an ellipsis only when the action opens something that asks for more ("Rename…").',
  },

  docs: {
    usage: 'Use Menu.Item inside a Menu or a Menu.Group: one per action or option. Mark a destructive action with the destructive intent, and put it last or in its own group.',
    do: [
      'Start each action with a verb',
      'Turn on the check column for every item once any item in the menu is checkable',
      'Put a destructive action last, after a divider',
      'Keep a disabled item in place so people learn where it lives',
    ],
    dont: [
      'Use a menu item to navigate a site. Use a link.',
      'Nest a submenu inside a submenu',
      'Hide a disabled item\'s reason. Say why in the description, or enable it and explain on use.',
    ],
    contentGuidelines: 'Labels are short, start with a verb for an action, and use sentence case. A description is one short line.',
  },

  ai: {
    primaryPurpose: 'One action or option in a menu.',
    whenToUse: 'Only as a child of Menu. Generate Menu, which places one item per action, inside a Menu.Group where the menu has sections.',
    avoidWhen: 'The row navigates to a page (a link), or picks a form value (a select).',
    commonPartners: ['menu', 'menu-group', 'icon', 'divider'],
    triggerKeywords: ['menu item', 'menu option', 'menu action', 'checkable menu item', 'submenu item'],
    generationPriority: 9,
  },

  composition: {
    composesWith: ['focus-ring'],
    alternativeTo: [],
    replacesPatterns: ['a div in a dropdown with an onclick and no menuitem role'],
    supersededBy: [],
    planned: [],
  },

  motion: {
    enter: 'The highlight lands at once, with no transition, as a person arrows through the menu.',
    exit: 'The highlight leaves at once.',
    reduceMotion: 'Nothing changes under prefers-reduced-motion: the highlight and the check already appear at once.',
  },

  notes: {
    contested: [
      'HELD FOR THE OWNER: the chevron takes the item\'s icon ink (neutral, or destructive), not `color.icon.secondary` as the proposal\'s table drew it. The paint grammar gives an item one icon ink, which the check and the leading icon also take.',
      'HELD FOR THE OWNER: the focus ring sits outside the row at the corpus offset (2px out, 2px wide). It fits inside the panel\'s 4px padding, and overlaps a neighbor by 4px. The proposal said inset; the engine has no inset ring.',
      'HELD FOR THE OWNER: the item\'s built width, 240px; the shortcut placeholder, ⌘K; the panel names "description text" and "shortcut text".',
    ],
    unverified: [
      'That the trailing cell centers on the first line in every brand: it does where the label\'s line is 20px, as in the corpus\'s `type.label.md`; elsewhere Figma top-aligns it and code offsets it.',
    ],
    evolution: [
      'Owner decision Q-FL2 (2026-11-19, on #4007): every OD at its recommendation, with K1 B (menubar kept as an alias), K2 measured and so A (the highlight plus the focus ring), K3 B (checkable items never close the menu). Owner direction (2026-11-18): two-line items align to the first line.',
    ],
  },
};

// ── Menu.Group ─────────────────────────────────────────────────────────────────────────────────────────────────

const itemNest = (note: string): PartDef => ({
  kind: 'nest',
  nests: 'menu-item',
  crossAxisFill: true,
  nesting: { kind: 'nest-fixed', variant: { type: 'action', intent: 'default', state: 'rest' } },
  note,
});

export const menuGroup: ComponentDef = {
  id: 'menu-group',
  name: 'Menu.Group',
  aliases: ['menu-section', 'menu-radio-group'],
  category: 'overlay',
  status: 'draft',
  summary: 'A labeled run of items inside a menu: a section, or a set of radio choices.',
  description:
    'A run of Menu.Item rows inside a Menu, with an optional heading above them. Use it to split a long menu into sections, or to hold a set of radio items where one is on. A Divider between groups separates them further.',

  props: [
    { name: 'heading', type: 'string', required: false, description: 'A short heading above the items. It names the group for a screen reader too. A radio set may go without one.' },
    { name: 'items', type: 'slot', anyOf: ['menu-item'], minItems: 1, required: true, description: 'The items in the group.' },
    { name: 'value', type: 'string', required: false, description: 'For a radio set: the value of the item that is on.' },
    { name: 'onValueChange', type: 'function', required: false, description: 'For a radio set: called with the new value when a person picks another item.' },
  ],

  states: [],
  // ONE MEMBER (the proposal: a heading boolean and a slot). The engine projects no set without an axis, so the member
  // carries a one-value axis, the plain section; a radio set is the same drawing (held for the owner, as Popover's).
  variants: { type: ['section'] },
  axisKinds: { type: 'authoring' },

  paintKeys: ['{slot}'],

  tokens: {
    'heading-type': 'type.label.sm.emphasis',
    'label': 'color.text.secondary',
    'padding-x': 'space.150',
    'heading-top': 'space.100',
    'heading-bottom': 'space.050',
    'zero': 'space.0',
  },

  anatomy: {
    root: 'container',
    parts: {
      container: {
        kind: 'box',
        role: 'target',
        layout: { direction: 'column', align: 'start', justify: 'start', sizing: { x: 'fill', y: 'hug' } },
        placementWidth: 240,
        children: ['headingCell', 'items'],
        note: 'The group: an optional heading over its items.',
      },
      headingCell: {
        kind: 'box', mirror: 'reverses',   // #3986: the heading aligns to the right
        role: 'presentation',
        optional: true,
        layout: { direction: 'row', align: 'start', justify: 'start', sizing: { x: 'fill', y: 'hug' } },
        crossAxisFill: true,
        padding: { block: 'heading-top', blockEnd: 'heading-bottom', inlineLabel: 'padding-x' },
        children: ['heading'],
        note: 'Holds the heading, inset to line up with the items\' labels.',
      },
      heading: {
        kind: 'text',
        type: 'heading-type',
        wrap: true,
        note: 'The group heading, small and in secondary text. It is not an item and takes no focus.',
      },
      items: {
        kind: 'box',
        role: 'presentation',
        contentSlot: true,
        slotSettings: { minChildren: 1, allowPreferredValuesOnly: true },
        preferred: ['menu-item'],
        layout: { direction: 'column', align: 'start', justify: 'start', sizing: { x: 'fill', y: 'hug' } },
        crossAxisFill: true,
        children: ['item1', 'item2', 'item3'],
        note: 'The items: a native slot holding Menu.Item instances, three by default.',
      },
      item1: itemNest('The first item.'),
      item2: itemNest('The second item.'),
      item3: itemNest('The third item.'),
    },
    codeOnly: [
      {
        class: 'implementation',
        disposition: 'lowered',
        description:
          'the one-value axis — the one Figma member carries `type=section` because the design file needs an axis to build a set; code has no type prop, and a radio set is a section whose items are radio items.',
      },
      {
        class: 'semantics',
        disposition: 'refused',
        description:
          'the group in code — `role="group"` with `aria-labelledby` on the heading, or `aria-label` when it has none. A radio set is always a group, so the radio items it holds are one set.',
      },
      {
        class: 'runtime-behavior',
        disposition: 'refused',
        description:
          'a radio set — `value` and `onValueChange` on the group; the item whose value matches has `aria-checked="true"` and shows the check. Choosing an item keeps the menu open.',
      },
      {
        class: 'keyboard-and-focus',
        disposition: 'refused',
        description:
          'the heading — not focusable and skipped by the arrow keys; focus moves from the last item of one group to the first of the next.',
      },
      {
        class: 'right-to-left',
        disposition: 'unsupported',
        description:
          'right-to-left — the heading aligns to the right through logical properties.',
      },
    ],
  },

  figmaProperties: {
    variantAxes: ['type'],
    texts: { heading: { part: 'heading', default: 'Group heading', figmaName: 'heading text' } },
    booleans: { heading: { part: 'headingCell', default: true } },
  },

  accessibility: {
    role: '`role="group"`, named by its heading.',
    wcag: [
      '1.3.1 Info and Relationships (the heading names the group it sits over)',
      '1.4.3 Contrast (the heading in secondary text clears 4.5:1 on the panel)',
    ],
    keyboard: 'The heading takes no focus. The arrow keys move through the items of every group in order.',
    focus: 'Never focused itself; its items are.',
    aria: 'aria-labelledby pointing at the heading, or aria-label when there is none.',
  },

  content: {
    labelPattern: 'A heading names what the items have in common in one or two words ("Sort by", "View"). Sentence case.',
  },

  docs: {
    usage: 'Use Menu.Group to split a long menu into named sections, and always for a set of radio items, so one of them is on. Put a Divider between groups when they have no headings.',
    do: [
      'Name a group with a short heading',
      'Hold radio items in their own group',
    ],
    dont: [
      'Put a single item in a group',
      'Use a heading as an item. It does nothing when chosen.',
    ],
    contentGuidelines: 'Headings are one or two words, in sentence case.',
  },

  ai: {
    primaryPurpose: 'Group related items in a menu under a heading, or hold a set of radio items.',
    whenToUse: 'To name a section of a long menu, or to hold a set of radio items, placed in a Menu\'s items. A short menu needs none.',
    avoidWhen: 'The menu is short and its items need no sections (place the items in the Menu directly).',
    commonPartners: ['menu', 'divider'],
    triggerKeywords: ['menu group', 'menu section', 'menu radio group', 'menu heading'],
    generationPriority: 3,
  },

  composition: {
    composesWith: ['menu-item'],
    alternativeTo: [],
    replacesPatterns: ['a bold item used as a section title in a menu'],
    supersededBy: [],
    planned: [],
  },

  notes: {
    contested: [
      'HELD FOR THE OWNER: the heading\'s inset (space.100 above, space.050 below, space.150 at the side to line up with the labels), its placeholder copy, and its panel name, "heading text".',
    ],
    unverified: [],
    evolution: [
      'Owner decision Q-FL2 (2026-11-19, on #4007): the group as proposed, with an optional heading and a native items slot; a radio set takes value and onValueChange at the group, as the brief says.',
    ],
  },
};

// ── Menu ───────────────────────────────────────────────────────────────────────────────────────────────────────

export const menu: ComponentDef = {
  id: 'menu',
  name: 'Menu',
  aliases: ['dropdown-menu', 'action-menu', 'action-list', 'overflow-menu', 'kebab-menu', 'popup-menu', 'context-menu', 'menubar'],
  category: 'overlay',
  status: 'draft',
  summary: 'A list of actions on a raised panel, opened from a button. It closes once an action is chosen.',
  description:
    'A list of actions that opens from a button: the menu behind a "More" button, a dropdown of commands, or the menu a secondary click opens. It sits on a raised panel beside its trigger and closes when a person chooses an action, presses Escape or clicks outside. Items can be grouped under headings, split by dividers, turned on and off with a check, or open a submenu. Not a select (a menu does things, it does not choose a form value), not navigation (use links), and not a popover (a popover holds content, a menu holds actions).',

  props: [
    { name: 'items', type: 'slot', anyOf: ['menu-item', 'menu-group', 'divider'], minItems: 1, required: true, description: 'The menu\'s items, groups and dividers, in order.' },
    { name: 'open', type: 'boolean', default: false, required: false, description: 'Whether the menu is showing. Leave it unset and use defaultOpen for a menu that manages its own state.' },
    { name: 'defaultOpen', type: 'boolean', default: false, required: false, description: 'Whether the menu starts open, when open is not set.' },
    { name: 'onOpenChange', type: 'function', required: false, description: 'Called with true when the trigger opens the menu, and with false when an action, Escape, a click outside or Tab closes it.' },
    { name: 'placement', type: "enum: 'top' | 'bottom' | 'start' | 'end'", values: ['top', 'bottom', 'start', 'end'], default: 'bottom', required: false, description: 'The side of the trigger it opens on. start and end follow the writing direction. When there is no room it moves to the opposite side.' },
    { name: 'align', type: "enum: 'start' | 'center' | 'end'", values: ['start', 'center', 'end'], default: 'start', required: false, description: 'Where it lines up along that side: with the start edge of the trigger, its center, or its end edge.' },
    { name: 'loop', type: 'boolean', default: true, required: false, description: 'Whether the arrow keys wrap from the last item to the first and back.' },
  ],

  states: [],
  // ONE MEMBER (OD-M3 A: the items slot does the work). As Popover's: the engine projects no set without an axis, so the
  // member carries the default side, `placement: bottom` (held for the owner on #4008 and #4007).
  variants: { placement: ['bottom'] },
  axisKinds: { placement: 'authoring' },

  paintKeys: ['{slot}'],

  tokens: {
    // ── THE RAISED SURFACE (OD-X1 A): Popover's five roles, held equal in `test.ts`.
    'fill': 'color.foreground.raised',
    'border': 'color.border.secondary',
    'border-width': 'border-width.hairline',
    'shadow': 'shadow.lg',
    'radius': 'radius.lg',
    // OD-M6 A: the items sit inset 4px, so their rounded highlight clears the panel's edge.
    'pad': 'space.050',
  },

  anatomy: {
    root: 'panel',
    parts: {
      panel: {
        kind: 'box',
        role: 'target',
        paintSlots: ['fill', 'border'],
        strokeWidth: 'border-width',
        elevation: 'shadow',
        radius: 'radius',
        layout: { direction: 'column', align: 'start', justify: 'start', sizing: { x: 'fill', y: 'hug' } },
        placementWidth: 240,
        minWidth: 180,
        padding: { block: 'pad', inlineLabel: 'pad' },
        children: ['items'],
        note: 'The panel: the raised surface, its edge, its shadow and its corners, with the items inset 4px inside it.',
      },
      items: {
        kind: 'box',
        role: 'presentation',
        contentSlot: true,
        slotSettings: { minChildren: 1, allowPreferredValuesOnly: true },
        // The item always; the group and the Divider where the file has built them, as Button group offers the other
        // button families (Q386): Menu nests only the item, so a file can build Menu without them.
        preferred: ['menu-item'],
        preferredWhenBuilt: ['menu-group', 'divider'],
        layout: { direction: 'column', align: 'start', justify: 'start', sizing: { x: 'fill', y: 'hug' } },
        crossAxisFill: true,
        children: ['item1', 'item2', 'item3'],
        note: 'The items: a native slot holding Menu.Item, Menu.Group and Divider instances, three items by default.',
      },
      item1: itemNest('The first item.'),
      item2: itemNest('The second item.'),
      item3: itemNest('The third item.'),
    },
    codeOnly: [
      {
        class: 'semantics',
        disposition: 'refused',
        description:
          'the menu in code — `role="menu"`, labeled by its trigger through `aria-labelledby`. The trigger, any Button or IconButton, carries `aria-haspopup="menu"`, `aria-expanded` and `aria-controls`. A divider inside it is the Divider at `decorative=false`, with `role="separator"`.',
      },
      {
        class: 'keyboard-and-focus',
        disposition: 'refused',
        description:
          'the keyboard — on the trigger, Enter, Space or Arrow Down opens the menu on the first item and Arrow Up on the last. In the menu, Arrow Up and Down move (wrapping under `loop`), Home and End jump, Enter acts, Space toggles a checkbox or radio item, a printable character jumps to the next item whose text starts with it (a buffer of about 500ms), Escape closes the menu and returns focus to the trigger, and Tab closes every open menu and moves on. Roving `tabindex`, not `aria-activedescendant`.',
      },
      {
        class: 'keyboard-and-focus',
        disposition: 'refused',
        description:
          'submenus — Arrow Right opens a submenu on its first item and Arrow Left or Escape closes it back to its parent item (mirrored in right-to-left text). A submenu opens on the end side, its first item level with the parent, and flips to the start side when there is no room. On hover it opens after a short intent delay, and a pointer moving toward it keeps it open. One level deep at most.',
      },
      {
        class: 'responsive-layout',
        disposition: 'unsupported',
        description:
          'collision — the design file builds the panel alone. In code it opens on `placement` and `align`, offset `space.050` from the trigger, flips to the other side when there is no room and shifts to stay in the viewport. It is at least as wide as its trigger, between 180px and 320px, and at most the viewport height less its margins, the items scrolling inside.',
      },
      {
        class: 'implementation',
        disposition: 'refused',
        description:
          'the floating layer — Popover\'s: the `popover` attribute for the top layer and light dismiss, CSS anchor positioning with `position-try-fallbacks` for the flip, and an owned shift fallback. No positioning library.',
      },
      {
        class: 'runtime-behavior',
        disposition: 'refused',
        description:
          'a context menu — the same Menu opened by a secondary click or Shift+F10, placed at the pointer. Nothing in the design file changes.',
      },
      {
        class: 'motion',
        disposition: 'refused',
        description:
          'motion — the Popover / open and Popover / close pattern: opening fades in and scales up from a little under full size from the trigger\'s side, on `motion.duration.fast` and `motion.easing-role.enter`; closing fades out on `motion.duration.instant` and `motion.easing-role.exit`. A submenu fades only, on the same timings. Under `prefers-reduced-motion` it fades only, on `motion.duration-reduced.fast` to open and to close.',
      },
      {
        class: 'right-to-left',
        disposition: 'unsupported',
        description:
          'right-to-left — start and end placements swap sides and submenus open to the left; the items mirror.',
      },
      {
        class: 'deferred',
        disposition: 'refused',
        description:
          'Plain HTML/CSS: wire this behavior contract up in your framework. The web component includes it. In plain HTML/CSS that covers roving focus, typeahead, submenu timing and dismissal.',
      },
    ],
  },

  figmaProperties: {
    variantAxes: ['placement'],
  },

  accessibility: {
    role: '`role="menu"`, labeled by its trigger, holding items with `role="menuitem"`, `role="menuitemcheckbox"` or `role="menuitemradio"`.',
    wcag: [
      '1.4.11 Non-text Contrast (the panel\'s edge and the focused item\'s focus ring)',
      '1.4.13 Content on Hover or Focus (a submenu opened on hover stays while the pointer moves to it, and Escape closes it)',
      '2.1.1 Keyboard (every item is reachable with the arrow keys)',
      '2.1.2 No Keyboard Trap (Escape and Tab leave the menu)',
      '2.4.3 Focus Order (focus moves into the menu on open and returns to the trigger on close)',
      '2.4.7 Focus Visible (the focused item shows the highlight and the shared focus ring)',
      '4.1.2 Name, Role, Value (the trigger states its popup and whether it is expanded)',
    ],
    keyboard: 'Enter, Space or Arrow Down on the trigger opens the menu. Arrow Up and Down move, Home and End jump, Enter acts, Space toggles, typing a letter jumps to an item, Escape closes and returns focus to the trigger, and Tab closes the menu and moves on.',
    focus: 'Moves to the first item on open (the last, from Arrow Up) and returns to the trigger when the menu closes by Escape or an action.',
    aria: 'On the trigger: aria-haspopup="menu", aria-expanded, and aria-controls pointing at the menu. The menu: aria-labelledby pointing at the trigger.',
  },

  content: {
    labelPattern: 'The trigger names what the menu holds ("Sort", "More actions"); an icon-only trigger needs an accessible name. Items start with a verb.',
  },

  docs: {
    usage: 'Use a Menu for a set of actions that do not fit on the page: the actions on a row, a "More" button, or the commands for a selection. Group related items, put a destructive action last after a divider, and keep it short. To choose a form value use a select; to move between pages use links.',
    do: [
      'Open it from a button that says what it holds',
      'Group related items, with a heading or a divider',
      'Put a destructive action last, after a divider',
      'Keep it to one level of submenu',
    ],
    dont: [
      'Use a menu for site navigation. Use links.',
      'Use a menu to pick a form value. Use a select.',
      'Hide the main action of a page in a menu',
      'Nest a submenu inside a submenu',
    ],
    contentGuidelines: 'Items start with a verb, in sentence case, with no ending punctuation. Headings are one or two words.',
  },

  ai: {
    primaryPurpose: 'Offer a list of actions from a button, without taking room on the page.',
    whenToUse: 'A button opens a set of actions or options: an overflow "More" menu, a dropdown of commands, a context menu, or a list of view options with checks.',
    avoidWhen: 'The choice is a form value (a select), the items go to other pages (links), the content is not a list of actions (a popover), or there are only one or two actions (show them as buttons).',
    commonPartners: ['button', 'button-neutral', 'icon-button', 'icon-button-neutral', 'divider', 'popover'],
    triggerKeywords: ['menu', 'dropdown menu', 'overflow menu', 'more menu', 'kebab menu', 'context menu', 'action menu', 'actions dropdown'],
    generationPriority: 2,
  },

  composition: {
    composesWith: ['menu-item'],
    alternativeTo: ['select', 'popover'],
    replacesPatterns: ['a select used to run commands', 'a hand-built dropdown with no menu role or keyboard support'],
    supersededBy: [],
    planned: ['split-button', 'listbox'],
  },

  motion: {
    enter: 'Fades in and scales up from a little under full size, from the trigger\'s side (motion.duration.fast, motion.easing-role.enter). A submenu fades only.',
    exit: 'Fades out (motion.duration.instant, motion.easing-role.exit), quicker than it opened.',
    reduceMotion: 'Under prefers-reduced-motion it fades only, with no scale, on motion.duration-reduced.fast to open and to close. A fade is not movement, and it keeps the cue that the menu opened or closed.',
  },

  notes: {
    contested: [
      'HELD FOR THE OWNER: the panel\'s built width, 240px between the proposal\'s 180px floor and 320px cap, and the default content (three plain items).',
      'A split button is a Menu variant in the brief; it gets its own issue, #4296 (planned here).',
    ],
    unverified: [
      'The Popover / open and Popover / close motion preset is described here but not built: the starter set exists only as a wireframe.',
    ],
    evolution: [
      'Owner decision Q-FL2 (2026-11-19, on #4007): every OD at its recommendation, with K1 B (menubar kept as an alias), K2 measured and so A, K3 B. OD-X1 A: the panel binds Popover\'s five raised-surface roles, and test.ts holds them equal.',
    ],
  },
};
