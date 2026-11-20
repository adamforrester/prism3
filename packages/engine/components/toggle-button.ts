/**
 * ToggleButton and ToggleIconButton — a Button that stays pressed (#4112). KB brief: `components/toggle-button.md`.
 *
 * ── THE OWNER'S DECISIONS (#4112, 2026-11-19: OD-T1 to OD-T5, all A) ──────────────────────────────────────────
 *
 *   OD-T1 ON BUTTON, AS TWO NEW DEFS. Button's anatomy, sizes, spacing (`BUTTON_SPACING`), focus ring, density and
 *         the `controlShape` lever, reused through Button's own factory pieces (`intentTokens`, `BUTTON_SPACING_AT`,
 *         `iconButtonIntentTokens`, exported for this file), plus a `selection` axis and a `selected` prop. Button's
 *         own sets do not change: `lint-component-surface` holds every button def's member count and plan digest,
 *         and this PR's baseline diff only ADDS the two toggle rows.
 *   OD-T2 TAG'S SELECTED LOOK. A tint (`interactive.primary.subtle-fill.selected`) and a 2px outline
 *         (`interactive.primary.indicator.*` at `border-width.thick`) drawn inside the box, the label weight
 *         constant, no check glyph and no trailing visual. So a selected member's box equals its unselected twin's.
 *   OD-T3 OUTLINE AND TEXT APPEARANCES ONLY. No filled: a filled resting toggle leaves no stronger look for selected.
 *   OD-T4 TWO DEFS, ToggleButton and ToggleIconButton, mirroring Button and IconButton, so the icon-only toggle
 *         requires its accessible name at the type level.
 *   OD-T5 NO GROUP DEF. A row of independent toggles sits in a labeled `role="group"` in code; one-of-a-set is
 *         the Segmented control.
 *
 * ── HOW THE PAINT IS BUILT ON BUTTON ──────────────────────────────────────────────────────────────────────────
 *
 * Both selection values are built from Button.Neutral's outline and text paint (`intentTokens('neutral')`; the icon
 * toggle from `iconButtonIntentTokens('neutral')`), so neither can drift from it. `unselected.*` is that paint
 * unchanged; `selected.*` keeps its label and icon ink and lays Tag's look over the box (`selectionPaint`). Each value
 * carries its own prefix, as Tag's do: the validator refuses bare `{appearance}.*` keys beside the selection-led
 * ones. The tint has no state steps, so it holds at hover and pressed while the outline steps to `.hover` /
 * `.pressed` (Tag's I), and the label keeps the neutral ink, because the primary ink misses 4.5:1 on the tint.
 *
 * Disabled is the projector's cross-cutting branch. The tint is the `overlay` slot, which that branch does not
 * carry, so a disabled selected member is the 2px outline in `color.disabled.border` with no tint; a disabled
 * unselected text member has no edge, as Button's text appearance has none.
 *
 * BUTTON'S BRAND SETTINGS (owner decision 3 A on the PR, 2026-11-19). ToggleButton declares Button's `min-width`
 * derivation, so it is in the button family and all six settings reach it as they reach Button: min width (the
 * 104px medium floor at the default multiplier), icon placement, content size, label weight, text hover and border
 * weight. ToggleIconButton takes them as far as they reach IconButton, its own factory: "Outline button border",
 * through `levers.buttonBorderWeight`. The other five act on a label, an icon beside it or a width above the height,
 * none of which an icon-only square has, which is why IconButton is outside the family by construction. Under
 * "Outline button border: Thick" the unselected edge thickens to match a Button's; the selected edge is already
 * thick, so selected keeps its tint and indicator color as its difference. `outlineInteraction: opaque-fill` is not
 * joined, on Tag's reasoning (an opaque fill on an unselected toggle reads as selected).
 *
 * THE OTHER TWO OWNER DECISIONS ON THE PR (2026-11-19). 1 B: the icon toggle's quiet appearance is `ghost`, IconButton's
 * word (#1432), so the pair reads `outline`/`text` on ToggleButton and `outline`/`ghost` on ToggleIconButton, each as
 * its own factory spells it. 2 B: a text toggle's label is plain `emphasis`, not Button's underlined `emphasis-link`
 * (#2324): an underlined "Bold" in a toolbar reads as a link, and the toggle's states carry the affordance.
 */
import { ComponentDef } from '../component-schema';
import { intentTokens, BUTTON_SPACING_AT } from './button';
import { iconButtonIntentTokens } from './icon-button';

/** Each def's two appearances: Button's spelling on ToggleButton, IconButton's on ToggleIconButton (owner decision 1 B). */
const TEXT_APPEARANCES = ['outline', 'text'];
const ICON_APPEARANCES = ['outline', 'ghost'];

/**
 * The paint of both selection values, from one appearance-keyed source (Button.Neutral's, or IconButton.Neutral's).
 * The validator refuses bare `{appearance}.*` keys beside `{selection}.{appearance}.*` ones (one arity, two
 * templates), so each value carries its own prefix, as Tag's do. UNSELECTED is the source unchanged. SELECTED is
 * the source with Tag's look laid over it (OD-T2): the tint in the overlay slot, with no state steps so it holds at
 * hover and pressed, and the indicator outline stepping per state. The label and icon ink stay the unselected
 * neutral ink, because the primary ink misses 4.5:1 on the tint.
 */
const selectionPaint = (source: Record<string, string>, appearances: string[]): Record<string, string> => {
  const own = Object.entries(source).filter(([k]) => appearances.some((ap) => k.startsWith(`${ap}.`)));
  const unselected = own.map(([k, v]) => [`unselected.${k}`, v]);
  const selectedInk = own.filter(([k]) => /^[a-z]+\.(label|icon)(\.|$)/.test(k)).map(([k, v]) => [`selected.${k}`, v]);
  const selectedLook = appearances.flatMap((ap) => [
    [`selected.${ap}.overlay`, 'color.interactive.primary.subtle-fill.selected'],
    [`selected.${ap}.border`, 'color.interactive.primary.indicator.rest'],
    [`selected.${ap}.border.hover`, 'color.interactive.primary.indicator.hover'],
    [`selected.${ap}.border.pressed`, 'color.interactive.primary.indicator.pressed'],
  ]);
  return Object.fromEntries([...unselected, ...selectedInk, ...selectedLook]);
};


/** Shared by both defs: the edge weight per selection, the ring, the motion, and the cross-cutting disabled. */
const SHARED_TOKENS: Record<string, string> = {
  // 1px unselected (Button's hairline), 2px selected (Tag's `border-width.thick`); both drawn inside the box.
  // "Outline button border: Thick" rebinds the unselected key, the one at the hairline (`applyButtonLayout` step 6).
  'unselected.border-width': 'border-width.hairline',
  'selected.border-width': 'border-width.thick',
  'focus-ring': 'color.border.focus',
  'ring-width': 'focus.ring.width',
  'ring-offset': 'focus.ring.offset',
  // Button's motion bindings (#3408 Q146 A): the selected change and the press both run on `fast`.
  'motion.state': 'motion.duration.fast',
  'motion.state-easing': 'motion.easing-role.default',
  'motion.state-reduced': 'motion.duration-reduced.fast',
  'motion.press': 'motion.duration.fast',
  'motion.press-easing': 'motion.easing-role.default',
  // No `disabled.fill` and no on-fill ink: no toggle has a fill at rest (Tag's block). The label ink is ToggleButton's.
  'disabled.icon': 'color.disabled.icon',
  'disabled.border': 'color.disabled.border',
};

/** Button's two templates, led by the selection value. */
const PAINT_KEYS = ['{selection}.{appearance}.{slot}.{state}', '{selection}.{appearance}.{slot}'];

const SELECTION_PROPS = [
  { name: 'selected', type: 'boolean', default: false, required: false, description: 'Whether the toggle is on, in a controlled toggle. Rendered as aria-pressed. While selected it takes a tint and a 2px outline, so the state never rests on color alone.' },
  { name: 'defaultSelected', type: 'boolean', default: false, required: false, description: 'Whether an uncontrolled toggle starts on.' },
  { name: 'onSelectedChange', type: 'function', required: false, description: 'Called with the new value when the toggle is pressed. A controlled toggle without it never changes.' },
];

const STATE_PROPS = [
  { name: 'isInactive', type: 'boolean', default: false, required: false, description: 'Focusable disabled, as on Button: visually muted, keeps its place in the tab order, and surfaces the reason on focus.' },
  { name: 'disabled', type: 'boolean', default: false, required: false, description: 'Native disabled, as on Button: reserved for a toggle that has no meaning in the current view. Removes it from the tab order.' },
];

const STATES: ComponentDef['states'] = ['rest', 'hover', 'pressed', 'focus-visible', 'disabled', 'inactive'];
const STATE_AXIS: NonNullable<ComponentDef['figmaProperties']>['stateAxis'] = { name: 'state', values: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled'] };

/** The focus ring, as Button nests it. No `surface` axis on a toggle, so the ring is the default one. */
const FOCUS_RING = {
  kind: 'absolute' as const,
  when: 'focus-visible',
  nests: 'focus-ring',
  inset: 'ring-offset',
  strokeInset: 'ring-width',
  nesting: { kind: 'nest-fixed' as const, variant: { surface: 'default' } },
  note: 'The shared focus ring, shown on keyboard focus; it sits outside the button and moves nothing in its layout.',
};

const SHARED_MOTION = {
  enter: 'none (present on mount)',
  exit: 'none',
  reduceMotion: 'The selected change (tint and outline) and the other state changes run on motion.duration.fast with motion.easing-role.default. The press is Button\'s subtle scale (0.98) on the same duration and curve, and it stays separate from the selected look. Under prefers-reduced-motion, resolve the scale to none and keep the color change, on motion.duration-reduced.fast, so the state stays perceivable.',
};

const SHARED_NOTES = {
  contested: [
    'constant name and aria-pressed (practice) against a label that flips with the state (brief §6, §15) — this component takes the constant name and has no selectedLabel prop.',
  ],
  evolution: [
    '2026-11-19 (#4112, owner OD-T1 to OD-T5 A): built on Button as two defs, with Tag\'s selected look, outline and text appearances only, and no group def. Button\'s own sets are unchanged.',
    '2026-11-19 (#4353, owner decisions 1 B, 2 B, 3 A): the icon toggle\'s quiet appearance is ghost, IconButton\'s word; a text toggle\'s label is plain emphasis, with no link underline; and Button\'s six brand settings reach ToggleButton through Button\'s min-width derivation, and ToggleIconButton as far as they reach IconButton (Outline button border).',
    'The brief lists a solid appearance and an icon-only versus icon-and-label shape axis (§15 variants). This component omits solid (OD-T3) and splits the icon-only shape into ToggleIconButton (OD-T4), as Button and IconButton split.',
    'The brief\'s `toggle` alias is not taken: switch-row holds it, and one alias names one component.',
  ],
  unverified: [
    'The neutral label on the tint is measured on Tag (10.19:1 on one corpus brand); this component reuses the same pair, and its own contrast is held by the paint census and the contrast arms, not by a separate measurement.',
  ],
};

export const toggleButton: ComponentDef = {
  id: 'toggle-button',
  name: 'ToggleButton',
  aliases: ['pressable-button', 'selectable-button', 'toggle-btn'],
  category: 'form',
  status: 'draft',
  inherits: 'button-neutral',
  // DRAFT copy (#4112), for the owner.
  summary: 'A button that stays pressed, for a mode that persists, such as Pin or Show archived.',
  description:
    'A Button that stays pressed: an action or mode that persists between presses, such as Pin, Mute or a view filter that stays on. While selected it takes a tint and a 2px outline drawn inside the button, so the button keeps its size, and the label keeps its weight. Pressing it changes the selected state; the label never changes. Not a Button (fires once), not a Switch.Row (a system setting), not a Checkbox.Row (a form value submitted later), and not a SegmentedControl (one of a set). For an icon-only toggle, use ToggleIconButton.',

  props: [
    { name: 'label', type: 'node (label)', required: true, description: 'Visible label naming the action or mode, such as "Pin" or "Show archived". It stays the same in both states: the selected state is carried by the pressed state, not by new words.' },
    ...SELECTION_PROPS,
    { name: 'appearance', type: "enum: 'outline' | 'text'", values: ['outline', 'text'], default: 'outline', required: false, description: 'outline = a neutral border, for a toggle on its own; text = no border at rest, for a quiet toolbar. There is no filled appearance, so selected stays the strongest look.' },
    { name: 'size', type: "enum: 'small' | 'medium' | 'large'", values: ['small', 'medium', 'large'], default: 'medium', required: false, description: 'Control size, as on Button: drives height, padding and label type.' },
    { name: 'leadingVisual', type: 'slot', required: false, description: 'An icon before the label.' },
    ...STATE_PROPS,
    { name: 'aria-label', type: 'string', required: false, description: 'Extends the visible label with context it does not carry, as on Button. Start it with the visible text (WCAG 2.5.3 Label in Name), and keep it the same in both states.' },
  ],

  states: STATES,
  variants: {
    // `unselected` LEADS: the code default (`defaultSelected` is false) and the Figma default member.
    selection: ['unselected', 'selected'],
    // `outline` LEADS: the code default (OD-T3).
    appearance: ['outline', 'text'],
    size: ['medium', 'small', 'large'],
  },
  // Selection and appearance are runtime, held to one footprint: the selected look is paint only (OD-T2).
  axisKinds: { selection: 'runtime', appearance: 'runtime', size: 'authoring' },

  paintKeys: PAINT_KEYS,
  densitySpacing: ['size.{size}.padding-x', 'size.{size}.padding-x-visual', 'size.{size}.padding-y', 'size.{size}.gap'],
  levers: { controlShape: { capsules: ['radius.md'] } },

  tokens: {
    'radius': 'radius.md',
    ...SHARED_TOKENS,
    'disabled.label': 'color.disabled.text',
    // Button's per-size geometry and label type for the two appearances a toggle has. The text appearance's label is
    // plain `emphasis`, not Button's underlined `emphasis-link` (#2324): owner decision 2 B on the PR.
    ...(BUTTON_SPACING_AT['small']),
    'size.small.height': 'size.sm.height',
    'size.small.hit-target': 'space.300',
    'size.small.icon': 'icon.size.xs',
    'size.small.outline.type': 'type.label.sm.emphasis',
    'size.small.text.type': 'type.label.sm.emphasis',
    ...(BUTTON_SPACING_AT['medium']),
    'size.medium.height': 'size.md.height',
    'size.medium.hit-target': 'space.550',
    'size.medium.icon': 'icon.size.sm',
    'size.medium.outline.type': 'type.label.md.emphasis',
    'size.medium.text.type': 'type.label.md.emphasis',
    ...(BUTTON_SPACING_AT['large']),
    'size.large.height': 'size.lg.height',
    'size.large.hit-target': 'space.550',
    'size.large.icon': 'icon.size.md',
    'size.large.outline.type': 'type.label.lg.emphasis',
    'size.large.text.type': 'type.label.lg.emphasis',
    ...selectionPaint(intentTokens('neutral'), TEXT_APPEARANCES),
  },

  anatomy: {
    root: 'container',
    parts: {
      container: {
        kind: 'box', mirror: 'reverses',
        // Button's slots and precedence: the overlay (the hover wash, or the selected tint) if it resolves.
        paintSlots: ['overlay', 'fill', 'border'],
        role: 'target',
        children: ['leadingVisual', 'label', 'focusRing'],
        layout: { direction: 'row', align: 'center', justify: 'center', sizing: { x: 'hug', y: 'fixed' } },
        padding: {
          block: 'size.{size}.padding-y',
          inlineLabel: 'size.{size}.padding-x',
          inlineVisual: 'size.{size}.padding-x-visual',
        },
        gap: 'size.{size}.gap',
        height: 'size.{size}.height',
        radius: 'radius',
        strokeWidth: '{selection}.border-width',
        note: 'The button body. Unselected, it is Button.Neutral at the same appearance; selected, it takes a tint and a 2px outline, drawn inside the box so the button does not grow.',
      },
      leadingVisual: { kind: 'slot', mirror: 'per-glyph', optional: true, size: 'size.{size}.icon', nesting: { kind: 'swap' }, note: 'An icon before the label.' },
      label: { kind: 'text', optional: false, type: 'size.{size}.{appearance}.type', note: 'The label, at the same weight whether or not the toggle is selected, so the button keeps its width.' },
      focusRing: FOCUS_RING,
    },
    derived: {
      // Button's derivation, word for word: its PRESENCE opts this def into Button's six brand settings
      // (`isButtonFamily`, owner decision 3 A), so a toggle beside a Button takes the same floor, icons, content,
      // weight, text hover and edge. At the default multiplier the medium floor is 104px, as on Button.
      'min-width': 'height × minWidthMultiplier — Spectrum computes it rather than authoring it, so a short label ("OK") cannot produce a stubby button',
      // Description only: `levers.controlShape.capsules` decides the reach, as on Button.
      'pill-radius': 'height ÷ 2 — only when the brand\'s control shape is pill; a literal radius token would be wrong at more than one height',
    },
    codeOnly: [
      {
        class: 'hit-target',
        disposition: 'unsupported',
        description:
          'touch-target-expansion — as on Button: the hit box is decoupled from the optical box, at least `size.<size>.hit-target` in code (24×24 at small, 44×44 at medium and large) through an invisible extension. Figma has no hit areas.',
      },
      {
        class: 'focus-ring',
        disposition: 'lowered',
        description:
          'focus-ring-offset — as on Button: the ring projects as an absolute sibling nesting the shared `focus-ring`, and its position is frozen at paste from `focus.ring.offset` plus `focus.ring.width`.',
      },
      {
        class: 'localization',
        disposition: 'lowered',
        description:
          'Label overflow (button brief §9) — the label wraps rather than truncating, and the button takes no fixed English width. Figma holds one line of placeholder text.',
      },
      // The code-tier rules both toggles carry from the brief (§6, §9, §11), inline so the plugin build can cut each
      // description to its subject. None leads with an axis or state name.
      {
        class: 'semantics',
        disposition: 'refused',
        description:
          'Pressed semantics (brief §6, §11) — a native `<button type="button">` with `aria-pressed="true"` or `"false"`, toggled on activation through Button\'s press primitive. Never `role="switch"`, `aria-checked` or `aria-selected`. The accessible name is constant: no label that flips between "Mute" and "Unmute". Figma has no pressed attribute; it carries the look as the selection axis.',
      },
      {
        class: 'runtime-behavior',
        disposition: 'refused',
        description:
          'Controlled and uncontrolled (brief §11) — `selected` with `onSelectedChange`, or `defaultSelected`; a controlled toggle without a handler is frozen. The persistent selected look and the transient press are separate in both state and style: the press is Button\'s overlay step and its 0.98 scale, and it never stands in for selected.',
      },
      {
        class: 'composition',
        disposition: 'refused',
        description:
          'Grouping (brief §5, §11; owner OD-T5 A) — no group component. A row of independent toggles (Bold, Italic, Underline) sits in a container with `role="group"` and an accessible label; each toggle keeps its own tab stop. A set where exactly one is on is the Segmented control, with its own keyboard model.',
      },
      {
        class: 'right-to-left',
        disposition: 'unsupported',
        description:
          'RTL mirroring (brief §9) — logical properties mirror the row, as on Button, and a toolbar of toggles reorders through logical layout. The selected look has no direction. Only directional glyphs flip, set per icon; pin, mute and format glyphs stay as drawn.',
      },
      {
        class: 'visual-treatment',
        disposition: 'lowered',
        description:
          'The selected tint and outline — the tint is `interactive.primary.subtle-fill.selected`; a brand whose outline interaction is none emits no tint, and the 2px `interactive.primary.indicator` outline carries the selected state alone. In code the outline is drawn inside the box (`outline-offset: -2px` or an inset box-shadow), never a border that grows the button. In forced-colors mode the tint drops out and the 2px outline carries the state.',
      },
      {
        class: 'not-projected',
        disposition: 'refused',
        description:
          'inactive — not projected: its whole delta from `disabled` is behavioral, so a variant has nothing to encode, and the emitter special-cases `state === \'disabled\'` only, so an `inactive` column would read as a normal enabled toggle. In code (isInactive) it keeps tab order and the accessibility tree, carries aria-disabled, and surfaces the reason on focus.',
      },
    ],
  },

  figmaProperties: {
    variantAxes: ['selection', 'appearance', 'size'],
    stateAxis: STATE_AXIS,
    // Button's leading slot axis, for Button's reason: presence moves the container's padding. No trailing slot.
    slotAxes: [{ name: 'leading', part: 'leadingVisual', figmaName: 'leading icon' }],
    swaps: { leadingVisual: { part: 'leadingVisual', figmaName: '↳ swap leading icon' } },
    // DRAFT placeholder copy (#4112), for the owner.
    texts: { label: { part: 'label', default: 'Toggle' } },
    booleans: {},
    gridAxis: 'state',
  },

  accessibility: {
    role: 'button (native `<button>` with `aria-pressed`; never `role="switch"` and never a checkbox)',
    wcag: [
      '4.1.2 Name/Role/Value (the role is button, the label is the name, and aria-pressed carries the state)',
      '1.4.1 Use of Color (selected is a tint and a 2px outline, not color alone)',
      '1.4.3 Contrast (Minimum) (the neutral label on the tint, as on Tag)',
      '1.4.11 Non-text Contrast (the 2px outline and the focus ring at 3:1)',
      '2.4.7 Focus Visible (a :focus-visible ring on every member, never suppressed)',
      '2.4.13 Focus Appearance (AAA, intent — the ring is offset from the edge)',
      '2.5.3 Label in Name (an aria-label starts with the visible label text)',
      '2.5.8 Target Size (Minimum) (24×24 — small is 36px tall, 28px at compact density)',
    ],
    keyboard: 'Native `<button>`: Space and Enter both toggle. Each toggle is its own tab stop. (A Switch takes Space only.)',
    focus: 'Button\'s `:focus-visible` ring (`color.border.focus`), offset from the edge, never suppressed, and kept through inactive (`aria-disabled`, not native disabled).',
    aria: 'Set aria-pressed="true" or "false" on the button, never aria-checked, aria-selected or role="switch". Keep the accessible name the same in both states. A row of independent toggles goes in a container with role="group" and an accessible label. Localization: the label wraps rather than truncating, and under RTL the row mirrors through logical properties; only directional glyphs flip.',
  },

  content: {
    labelPattern: 'A short verb or noun naming the action or mode ("Pin", "Mute", "Show archived"), sentence case, the same in both states — never "Pin" / "Unpin".',
  },

  docs: {
    usage: 'Use for an action or mode that stays on until pressed again, usually in a command surface: Pin, Mute, Favorite, a view filter that stays on. For a system setting use Switch.Row; for a form value submitted later use Checkbox.Row; for one choice out of a set use SegmentedControl.',
    do: [
      'Keep the label the same in both states and let `aria-pressed` carry the state',
      'Use appearance=outline for a toggle on its own, and appearance=text for a row of toggles in a quiet toolbar',
      'Group a row of independent toggles in a container with `role="group"` and an accessible label, each toggle its own tab stop',
      'Keep the selected look separate from the press: the tint and the 2px outline persist, and the press is Button\'s brief overlay step',
    ],
    dont: [
      'Use it for a system setting such as notifications on or off — use Switch.Row',
      'Use a row of toggles where exactly one can be on — use SegmentedControl',
      'Flip the label between two words to show the state ("Mute" / "Unmute")',
      'Put `role="switch"` or `aria-checked` on a toggle button',
    ],
    contentGuidelines: 'A short verb or noun naming the action or mode, sentence case, constant across both states.',
  },

  ai: {
    primaryPurpose: 'Turn an action or mode on and off in place, with a visible label, as a button that stays pressed.',
    whenToUse: 'A command or mode that persists between presses, such as Pin, Mute, Favorite or a view filter, on a toolbar or beside the content it affects.',
    avoidWhen: 'A one-time action → use Button.Neutral. A system setting → use Switch.Row. A form value submitted later → use Checkbox.Row. Exactly one of a set → use SegmentedControl. A filter value in a set of chips → use Tag. Icon-only with no visible text → use ToggleIconButton.',
    commonPartners: ['icon', 'focus-ring', 'button'],
    triggerKeywords: ['toggle button', 'pressed button', 'pin button', 'mute button', 'favorite toggle', 'aria-pressed'],
    generationPriority: 3,
  },

  composition: {
    composesWith: ['focus-ring'],
    alternativeTo: ['button', 'button-neutral', 'switch-row', 'checkbox-row', 'segmented-control', 'tag', 'toggle-icon-button'],
    planned: ['tooltip'],
    replacesPatterns: ['a Button hand-wired with an "active" class and no `aria-pressed`', '`role="switch"` on a toolbar mode'],
  },

  motion: SHARED_MOTION,
  notes: SHARED_NOTES,
};

export const toggleIconButton: ComponentDef = {
  id: 'toggle-icon-button',
  name: 'ToggleIconButton',
  aliases: ['toggle-icon-btn'],
  category: 'form',
  status: 'draft',
  inherits: 'icon-button-neutral',
  // DRAFT copy (#4112), for the owner.
  summary: 'An icon-only button that stays pressed, such as Bold or Mute. Needs an accessible name.',
  description:
    'An IconButton that stays pressed: an icon-only action or mode that persists between presses, such as Bold, Italic or Mute in a toolbar. While selected it takes a tint and a 2px outline drawn inside the square, so the button keeps its size. Because there is no visible label, an accessible name is required, and it stays the same in both states. For a toggle with a visible label, use ToggleButton.',

  props: [
    { name: 'icon', type: 'slot', required: true, description: 'The single icon. Rendered aria-hidden: the button carries the name.' },
    { name: 'aria-label', type: 'string', required: true, description: 'Required accessible name, a verb or noun naming the action or mode ("Bold", "Mute"). It stays the same in both states: the selected state is carried by the pressed state.' },
    ...SELECTION_PROPS,
    { name: 'appearance', type: "enum: 'outline' | 'ghost'", values: ['outline', 'ghost'], default: 'outline', required: false, description: 'outline = a neutral border, for a toggle on its own; ghost = no border at rest, for a row of toggles in a toolbar. There is no filled appearance, so selected stays the strongest look.' },
    { name: 'size', type: "enum: 'small' | 'medium' | 'large'", values: ['small', 'medium', 'large'], default: 'medium', required: false, description: 'Square control, as on IconButton: the height drives both dimensions.' },
    ...STATE_PROPS,
  ],

  states: STATES,
  variants: {
    selection: ['unselected', 'selected'],
    // `outline` LEADS, the code default; `ghost` is IconButton's word for the quiet treatment (owner decision 1 B).
    appearance: ['outline', 'ghost'],
    size: ['medium', 'small', 'large'],
  },
  axisKinds: { selection: 'runtime', appearance: 'runtime', size: 'authoring' },

  paintKeys: PAINT_KEYS,
  // `buttonBorderWeight`, as on IconButton (#576 Q6): of Button's six settings, the one an icon-only square can take
  // (owner decision 3 A). The other five need a label or a width above the height.
  levers: { controlShape: { capsules: ['radius.md'] }, buttonBorderWeight: { edge: true } },

  tokens: {
    'radius': 'radius.md',
    ...SHARED_TOKENS,
    // IconButton's square and its 1:1 glyph ladder, unchanged.
    'size.small.side': 'size.sm.height',
    'size.medium.side': 'size.md.height',
    'size.large.side': 'size.lg.height',
    'size.small.icon': 'icon.size.sm',
    'size.medium.icon': 'icon.size.md',
    'size.large.icon': 'icon.size.lg',
    ...selectionPaint(iconButtonIntentTokens('neutral'), ICON_APPEARANCES),
  },

  anatomy: {
    root: 'container',
    parts: {
      container: {
        kind: 'box',
        paintSlots: ['overlay', 'fill', 'border'],
        role: 'target',
        children: ['icon', 'focusRing'],
        layout: { direction: 'row', align: 'center', justify: 'center', sizing: { x: 'fixed', y: 'fixed' } },
        size: 'size.{size}.side',
        radius: 'radius',
        strokeWidth: '{selection}.border-width',
        note: 'The square body. Unselected, it is IconButton.Neutral at the same appearance; selected, it takes a tint and a 2px outline, drawn inside the square so it does not grow.',
      },
      icon: {
        kind: 'slot', mirror: 'per-glyph',
        size: 'size.{size}.icon',
        nesting: { kind: 'swap' },
        note: 'The one icon and the whole content, hidden from screen readers because the button carries the name.',
      },
      focusRing: FOCUS_RING,
    },
    derived: {
      // Description only, as on IconButton: the lever repoints `radius.md`, which on this square reads as a circle.
      'pill-radius': 'height ÷ 2 — the pill control shape repoints the rounded rung to radius.capsule, which on this width = height control is a circle',
    },
    codeOnly: [
      {
        class: 'hit-target',
        disposition: 'unsupported',
        description:
          'touch-target-expansion — as on IconButton: the small square is 36px in every example brand (28px at compact density), and the hit box in code is decoupled from it. Figma has no hit areas.',
      },
      {
        class: 'focus-ring',
        disposition: 'lowered',
        description:
          'focus-ring-offset — as on IconButton: the ring projects as an absolute sibling nesting the shared `focus-ring`, frozen at paste from `focus.ring.offset` plus `focus.ring.width`.',
      },
      {
        class: 'semantics',
        disposition: 'refused',
        description:
          'aria-label — the required accessible name, enforced at the type level in code. Figma cannot hold "required", and an empty text property would read as a name that had been provided. A tooltip may show the same words.',
      },
      // The code-tier rules both toggles carry from the brief (§6, §9, §11), inline so the plugin build can cut each
      // description to its subject. None leads with an axis or state name.
      {
        class: 'semantics',
        disposition: 'refused',
        description:
          'Pressed semantics (brief §6, §11) — a native `<button type="button">` with `aria-pressed="true"` or `"false"`, toggled on activation through Button\'s press primitive. Never `role="switch"`, `aria-checked` or `aria-selected`. The accessible name is constant: no label that flips between "Mute" and "Unmute". Figma has no pressed attribute; it carries the look as the selection axis.',
      },
      {
        class: 'runtime-behavior',
        disposition: 'refused',
        description:
          'Controlled and uncontrolled (brief §11) — `selected` with `onSelectedChange`, or `defaultSelected`; a controlled toggle without a handler is frozen. The persistent selected look and the transient press are separate in both state and style: the press is Button\'s overlay step and its 0.98 scale, and it never stands in for selected.',
      },
      {
        class: 'composition',
        disposition: 'refused',
        description:
          'Grouping (brief §5, §11; owner OD-T5 A) — no group component. A row of independent toggles (Bold, Italic, Underline) sits in a container with `role="group"` and an accessible label; each toggle keeps its own tab stop. A set where exactly one is on is the Segmented control, with its own keyboard model.',
      },
      {
        class: 'right-to-left',
        disposition: 'unsupported',
        description:
          'RTL mirroring (brief §9) — only a directional glyph flips, set per icon (`autoMirror`); bold, mute and pin glyphs stay as drawn. The selected look has no direction, and a toolbar of toggles is reordered by its container, not by the toggle. Figma draws the glyph once.',
      },
      {
        class: 'visual-treatment',
        disposition: 'lowered',
        description:
          'The selected tint and outline — the tint is `interactive.primary.subtle-fill.selected`; a brand whose outline interaction is none emits no tint, and the 2px `interactive.primary.indicator` outline carries the selected state alone. In code the outline is drawn inside the box (`outline-offset: -2px` or an inset box-shadow), never a border that grows the button. In forced-colors mode the tint drops out and the 2px outline carries the state.',
      },
      {
        class: 'not-projected',
        disposition: 'refused',
        description:
          'inactive — not projected: its whole delta from `disabled` is behavioral, so a variant has nothing to encode, and the emitter special-cases `state === \'disabled\'` only, so an `inactive` column would read as a normal enabled toggle. In code (isInactive) it keeps tab order and the accessibility tree, carries aria-disabled, and surfaces the reason on focus.',
      },
    ],
  },

  figmaProperties: {
    variantAxes: ['selection', 'appearance', 'size'],
    stateAxis: STATE_AXIS,
    gridAxis: 'state',
    booleans: {},
    swaps: { icon: { part: 'icon', figmaName: 'swap icon' } },
  },

  accessibility: {
    role: 'button (native `<button>` with `aria-pressed`; never `role="switch"` and never a checkbox)',
    wcag: [
      '4.1.2 Name/Role/Value (the required accessible name, and aria-pressed carries the state)',
      '1.4.1 Use of Color (selected is a tint and a 2px outline, not color alone)',
      '1.4.11 Non-text Contrast (the glyph, the 2px outline and the focus ring at 3:1)',
      '2.4.7 Focus Visible (a :focus-visible ring on every member, never suppressed)',
      '2.4.13 Focus Appearance (AAA, intent — the ring is offset from the edge)',
      '2.5.3 Label in Name (a visible tooltip and the aria-label carry the same words)',
      '1.4.13 Content on Hover or Focus (only where a tooltip is attached)',
      '2.5.8 Target Size (Minimum) (24×24 — the small square is 36px, 28px at compact density)',
    ],
    keyboard: 'Native `<button>`: Space and Enter both toggle. Each toggle is its own tab stop. (A Switch takes Space only.)',
    focus: 'IconButton\'s `:focus-visible` ring, offset from the edge, never suppressed, and kept through inactive.',
    aria: 'aria-label is the accessible name (required), the same in both states. Set aria-pressed="true" or "false", never aria-checked, aria-selected or role="switch". A tooltip may show the name on hover and focus. A row of independent toggles goes in a container with role="group" and an accessible label. Under RTL, only a directional glyph flips.',
  },

  content: {
    labelPattern: 'The accessible name is a short verb or noun naming the action or mode ("Bold", "Mute", "Pin"), the same in both states — never the glyph\'s shape.',
  },

  docs: {
    usage: 'Use for an icon-only action or mode that stays on until pressed again, usually in a toolbar: Bold, Italic, Underline, Mute, Pin. Always give it an accessible name; a tooltip can show it on hover and focus. With room for a label, use ToggleButton.',
    do: [
      'Always give it an accessible name, and keep it the same in both states',
      'Use appearance=ghost for a row of toggles in a toolbar, and appearance=outline for one on its own',
      'Group a row of independent toggles in a container with `role="group"` and an accessible label, each toggle its own tab stop',
      'Use a recognizable icon; pair a novel one with a visible label instead (ToggleButton)',
    ],
    dont: [
      'Ship it without an accessible name',
      'Swap the icon to show the state; the tint and the 2px outline show it',
      'Use a row of toggles where exactly one can be on — use SegmentedControl',
      'Put `role="switch"` or `aria-checked` on a toggle button',
    ],
    contentGuidelines: 'The accessible name is a short verb or noun naming the action or mode, constant across both states. A tooltip, where one is attached, shows the same words.',
  },

  ai: {
    primaryPurpose: 'Turn an action or mode on and off in place with an icon alone, as a button that stays pressed.',
    whenToUse: 'An icon-only command or mode that persists between presses, such as Bold, Italic or Mute, usually in a toolbar.',
    avoidWhen: 'A visible label would fit and aid recognition → use ToggleButton. A one-time icon action → use IconButton.Neutral. A system setting → use Switch.Row. Exactly one of a set → use SegmentedControl. Never when you cannot supply an accessible name.',
    commonPartners: ['icon', 'focus-ring', 'icon-button'],
    triggerKeywords: ['icon toggle', 'toolbar toggle', 'bold button', 'format toggle', 'pressed icon button'],
    generationPriority: 3,
  },

  composition: {
    composesWith: ['focus-ring'],
    alternativeTo: ['toggle-button'],
    planned: ['tooltip'],
    replacesPatterns: ['an IconButton hand-wired with an "active" class and no `aria-pressed`', 'a glyph that swaps to show the state'],
  },

  motion: SHARED_MOTION,
  notes: SHARED_NOTES,
};
