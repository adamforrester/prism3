/**
 * Button group — a set of one to three buttons laid out together: a row at the end edge, a column of full-width
 * buttons, or a row whose buttons share the width (#2661).
 *
 * No KB brief: the catalogue has none for a group of action buttons, and nothing below cites one. Category `form`,
 * the category of `button.md`, whose Buttons are all this component holds. Not Segmented control: that one joins
 * its buttons edge to edge as one choice, and its brief lists `toggle-button-group` and `connected-button-group` as
 * its own aliases; this group keeps its buttons apart, each its own action.
 *
 * ── THE OWNER'S SHAPE (the wireframe on #2661, approved by Q363, "all A" except calls 8 and 9) ──────────────────
 *
 * A shared, public container (Q363.1 A, Q363.2 A, named Button group, Q363.3 A) that Dialog nests now and Banner and
 * Card nest later, so the button patterns that repeat across larger components are one component rather than a
 * footer per host. Its content is a native `items` slot (#2649's pattern), so the count and the order live in the
 * slot, not in variants: one to three buttons, two by default (Q363.6 A). The slot prefers the Button family, and
 * only it (Q363.4 A).
 *
 * `layout` (`inline | stacked | fill`, Q363.9 B) is the one axis. Inline is a row at the end edge, Cancel before Save
 * (Q303.6 A); stacked is a column of full-width buttons with the main action on top, so the stacked default holds
 * Save then Cancel and code renders the array in that order (Q363.5 A); fill is a row whose buttons share the width.
 * The slot is ONE part whose direction follows the member (`directionWhen`), so a designer's buttons survive a layout
 * switch; the default buttons are one pair per layout, each gated to its members (`presentWhen`), because a default
 * child's sizing (hug, stretch or grow) is its own.
 *
 * ── THE HOST DECIDES THE SECONDARY (Q363.8 C as amended 2026-10-16, Q386 on #2808, Q418) ─────────────────────────
 *
 * On its own the group's Cancel is the outline primary Button, with no Neutral preference. The component that NESTS the
 * group decides its buttons' defaults (`nestItemPrefers` on its nest): Dialog prefers Button.Neutral for the Cancel
 * when the file has it, and Banner, Card and later hosts choose their own, primary outline, primary text or Neutral. A
 * preference is never a build dependency, so a team that skips the Neutral families still builds the group and every
 * host of it with no miss. Likewise the slot offers Button.Neutral, and Button.Destructive, only when the file has them
 * (`preferredWhenBuilt`). Save is the filled primary Button. A destructive confirm swaps Save to Button.Destructive,
 * filled, in the slot, and a designer can swap any button in the slot.
 */
import { ComponentDef, PartDef } from '../component-schema';

const COORD = (appearance: 'filled' | 'outline') =>
  ({ appearance, size: 'medium', surface: 'default', inset: 'default', state: 'rest', 'leading icon': 'false', 'trailing icon': 'false' });

/** One default button in the slot. Cancel nests the primary Button; a host that wants another Cancel says so on its nest of the group (Q418). */
const action = (role: 'cancel' | 'save', layout: 'inline' | 'stacked' | 'fill', note: string): PartDef => ({
  kind: 'nest',
  nests: 'button',
  presentWhen: { layout: [layout] },
  nesting: { kind: 'nest-fixed', variant: COORD(role === 'cancel' ? 'outline' : 'filled') },
  ...(layout === 'stacked' ? { crossAxisFill: true as const } : {}),
  ...(layout === 'fill' ? { grow: true as const } : {}),
  overrides: { texts: { label: role === 'cancel' ? 'Cancel' : 'Save' } },
  note,
});

export const buttonGroup: ComponentDef = {
  id: 'button-group',
  name: 'Button.Group',
  aliases: ['button-set', 'action-group', 'actions'],
  category: 'form',
  status: 'draft',
  summary: 'One to three buttons laid out together: in a row at the end, stacked, or sharing the width.',
  description:
    'A set of one to three buttons for the actions that close a task: Cancel and Save at the foot of a dialog, the actions of a banner, the buttons under a form. Inline puts them in a row at the end edge with the main action last; stacked puts them in a column of full-width buttons with the main action on top; fill puts them in a row whose buttons share the width. The buttons are Button, Button.Destructive and Button.Neutral, each its own action and spaced apart. Not a segmented control, whose buttons join edge to edge as one choice, and not a toolbar.',

  props: [
    { name: 'items', type: 'slot', anyOf: ['button', 'button-destructive', 'button-neutral'], minItems: 1, maxItems: 3, required: true, description: 'The buttons, each a Button, Button.Destructive or Button.Neutral, in order. Two by default, three at most. Inline and fill, the main action last; stacked, the main action first.' },
    { name: 'layout', type: "enum: 'inline' | 'stacked' | 'fill'", values: ['inline', 'stacked', 'fill'], default: 'inline', required: false, description: 'inline is a row at the end edge; stacked is a column of full-width buttons, the main action on top; fill is a row whose buttons share the width. A row too wide for its space wraps; nothing switches layout by itself.' },
  ],

  // `[]` — the group has no hover, press or disabled of its own; each button carries its own.
  states: [],
  variants: {
    layout: ['inline', 'stacked', 'fill'],
  },
  axisKinds: { layout: 'authoring' },

  tokens: {
    // THE GAP between buttons (Dialog's footer, approved by Q303): 12px in a row, 8px between stacked buttons. Fill is
    // a row, so it takes the row's 12px (held for the owner on #2661).
    'layout.inline.gap': 'space.150',
    'layout.stacked.gap': 'space.100',
    'layout.fill.gap': 'space.150',
  },

  anatomy: {
    root: 'container',
    parts: {
      container: {
        kind: 'box',
        // `target` because the schema requires exactly one — not an interaction claim.
        role: 'target',
        layout: { direction: 'column', align: 'start', justify: 'start', sizing: { x: 'fill', y: 'hug' } },
        // BUILT AT 400, the narrow dialog's width, so the inline row shows its end edge and the fill row has a width
        // to share; a host that stretches it (Dialog's footer) sets its own. Held for the owner on #2661.
        placementWidth: 400,
        children: ['items'],
        note: 'The group: a column holding the items slot. It fills the width it is given.',
      },
      items: {
        kind: 'box',
        role: 'presentation',
        contentSlot: true,
        // Owner decisions Q363.4 A and Q363.6 A: one to three buttons, the Button family only. The primary Button is the
        // one the group needs; Button.Destructive and Button.Neutral are offered when the file has them, and a file
        // without them builds the group with no miss (Q386 for the Neutral families; the same reasoning for Destructive,
        // which no default button uses).
        slotSettings: { minChildren: 1, maxChildren: 3, allowPreferredValuesOnly: true },
        preferred: ['button'],
        preferredWhenBuilt: ['button-destructive', 'button-neutral'],
        layout: { direction: 'row', align: 'center', justify: 'end', sizing: { x: 'fill', y: 'hug' } },
        directionWhen: { axis: 'layout', values: { inline: 'row', stacked: 'column', fill: 'row' } },
        gap: 'layout.{layout}.gap',
        crossAxisFill: true,
        children: ['cancel', 'save', 'saveStacked', 'cancelStacked', 'cancelFill', 'saveFill'],
        note: 'The buttons: a native slot holding one to three Buttons, two by default. A row at the end edge inline, a column stacked, a row whose buttons share the width at fill.',
      },
      cancel: action('cancel', 'inline', 'Cancel, inline: an an outline Button; a host may prefer another.'),
      save: action('save', 'inline', 'Save, inline: a filled Button, the main action, last.'),
      saveStacked: action('save', 'stacked', 'Save, stacked: a filled Button, full width, on top.'),
      cancelStacked: action('cancel', 'stacked', 'Cancel, stacked: full width, under Save; an an outline Button; a host may prefer another.'),
      cancelFill: action('cancel', 'fill', 'Cancel, fill: sharing the width; an an outline Button; a host may prefer another.'),
      saveFill: action('save', 'fill', 'Save, fill: a filled Button sharing the width, last.'),
    },
    codeOnly: [
      'the element — a `<div>` holding the buttons in order, with no role: each button is its own control, and a group of separate actions is not a radio group or a toolbar. Give it `role="group"` and an `aria-label` only when the buttons need a shared name the page does not already give them.',
      'order — the DOM order is the order the buttons are given, which is also the focus order. Inline and fill take the main action last (Cancel, then Save); stacked takes it first (Save, then Cancel), so the visual order and the focus order match in every layout. Never reverse the order with CSS alone: focus would then move against what the eye reads.',
      'the inline row — `display: flex; justify-content: flex-end; flex-wrap: wrap` with the row gap, so a row too wide for its container wraps instead of overflowing; nothing switches to stacked by itself. Fill gives each button `flex: 1 1 0; min-width: 0` so the buttons share the width equally at every width, and a label too long for its share wraps inside its button, the row\'s buttons stretching to one height; stacked is a column with each button at full width. For long labels, pick stacked.',
      'button count — Figma holds the buttons in the native `items` slot, two by default and three at most; code takes `items` of one to three Button elements.',
      'Cancel — in Figma the group\'s own default Cancel is an outline Button; a host that nests the group (Dialog) may prefer another, such as Button.Neutral when the file has that set. In code, pass whichever the product uses.',
      'right-to-left — the row mirrors through logical properties: the end edge is the left, and the main action sits leftmost.',
    ],
  },

  figmaProperties: {
    variantAxes: ['layout'],
    booleans: {},
  },

  accessibility: {
    role: 'None of its own. Each button is a native <button> with its own name; add role="group" with an aria-label only when the buttons need a shared name.',
    wcag: [
      '1.3.2 Meaningful Sequence (the reading and focus order match the visual order in every layout)',
      '2.4.3 Focus Order (focus moves through the buttons in the order they are given)',
      '2.5.8 Target Size (Minimum) (each medium button meets the target size at the default density)',
    ],
    keyboard: 'Tab moves through the buttons in order. Enter and Space act on the focused one.',
    focus: 'Each button takes focus in turn and shows the shared focus ring.',
    aria: 'Nothing on the group by default. Name each button by what it does; translated labels make a row longer, and a row that no longer fits wraps.',
  },

  content: {
    labelPattern: 'Name each button by what it does, in sentence case: "Save address", "Delete", "Cancel". The main action echoes the task; never "OK" or "Yes".',
  },

  docs: {
    usage: 'Use a Button.Group for the actions that close a task: the foot of a dialog, the actions of a banner or a card, the buttons under a form. Inline for a row at the end edge on a wide surface; stacked for full-width buttons on a phone or a bottom sheet; fill for a row whose buttons share the width. Put the main action last inline and at fill, and first when stacked.',
    do: [
      'Keep to one main action, the filled Button',
      'Put the main action last in a row and on top when stacked',
      'Use Button.Destructive for an action that deletes or removes, with Cancel beside it',
      'Keep the group to three buttons or fewer',
    ],
    dont: [
      'Join the buttons edge to edge. Use a segmented control for one choice among options.',
      'Reverse the order with styling only. Pass the buttons in the order they read.',
      'Put links or icon buttons in the group',
      'Use a group for a toolbar of tools',
    ],
    contentGuidelines: 'Button labels are short verbs or verb phrases in sentence case, each naming its own action.',
  },

  ai: {
    primaryPurpose: 'Lay out the one to three buttons that close a task, as a row at the end edge, a full-width stack or a row that shares the width.',
    whenToUse: 'The actions at the foot of a dialog, banner, card or form: a main action with a Cancel beside it, or up to three related actions.',
    avoidWhen: 'One choice among joined options (segmented-control), a toolbar of tools, navigation (links), or a single action on its own (a Button by itself).',
    commonPartners: ['dialog', 'button', 'button-destructive', 'button-neutral'],
    triggerKeywords: ['button group', 'button set', 'actions', 'action buttons', 'dialog footer', 'form actions', 'cancel and save'],
    generationPriority: 2,
  },

  composition: {
    composesWith: ['button'],
    alternativeTo: ['segmented-control'],
    replacesPatterns: ['a footer of fixed nested buttons copied into each component', 'a button-set component with a variant per count and layout'],
    supersededBy: [],
    planned: ['banner', 'card', 'toolbar'],
  },

  motion: {
    enter: 'None of its own.',
    exit: 'None of its own.',
    reduceMotion: 'Nothing moves.',
  },

  notes: {
    contested: [
      'HELD FOR THE OWNER (#2661): the built width (400), the 12px gap at fill (the row\'s), the aliases, the summary and description, and the category `form`.',
      'HELD FOR THE OWNER (#2661): no size axis. The buttons are medium, which Dialog\'s footer needs; Banner\'s small actions (#2787) would add one, medium first (Q347).',
    ],
    unverified: [
      'A host built before Button.Neutral keeps the group\'s primary Cancel: the host\'s preference is read when the host is built, so a file that builds the Neutral families later rebuilds the host to pick them up.',
      'That Figma keeps the "Cancel" label when the host swaps the group\'s Cancel instance to Button.Neutral (`swapComponent` preserves overrides by property name; the shim models it, a real file has not been read).',
      'That a designer\'s buttons in the slot survive a layout switch on a real host, as the accordion\'s panel content survives its expansion switch (one SLOT property per part name).',
    ],
    evolution: [
      'Owner decision Q363 (2026-10-16, #2661): the wireframe approved, all calls A except 8 (Cancel is Button.Neutral) and 9 (a fill layout too); a shared public Button group that Dialog nests now and Banner and Card later; the Button family preferred, preferred-only; stacked with the main action first; one to three buttons, two by default; three inline all at the end edge.',
      'Owner decision (2026-10-16, #2661, amending Q363.8) and Q386 (#2808): Cancel uses Button.Neutral when the file has it and the primary Button otherwise; no component requires the Neutral families.',
      'Owner decision Q418 (2026-10-18, #2661): the component that nests the group decides its buttons\' defaults. Button.Group on its own defaults the secondary to the primary outline Button, with no Neutral preference; Dialog\'s nest prefers Button.Neutral, falling back to the primary Button; designers can still swap any button in the slot.',
      'Owner decision Q492 B, Q?3 A (2026-10-21, #2880): at fill the buttons keep equal shares at every width. `min-width: 0` lets a button shrink below its label, which wraps inside it, where `flex: 1 1 0` alone left a long label\'s button wider than the other and wrapped the row. Nothing switches to stacked by itself.',
    ],
  },
};
