/**
 * FlushIconButton — a glyph-only action with no padding, no fill and no edge, made to be nested (#2457).
 * KB brief: `components/button.md` (the Button brief's icon-only case, as for IconButton; there is no separate brief).
 *
 * ── THE SHAPE (owner decision Q283.3 A on #2427, 2026-10-14) ────────────────────────────────────────────────
 *
 * "Its own small def: ghost only, no padding, color-only hover, code-side 44×44 hit area." So this is NOT an
 * `inset` axis on IconButton (Q283.3 B would have grown the three icon-button sets): the three IconButton sets
 * stay exactly as they are, and this def is the whole of the flush icon-only control.
 *
 *   · GHOST ONLY — no `appearance` axis. The glyph is the only thing painted. The paint is IconButton.Neutral's
 *     ghost glyph ink (`color.interactive.neutral.icon.*`), the role the quantity-stepper proposal named for its
 *     − and + (#2427, Oct 9 §4). No new token. (Since Q295.2 B, each family's own ghost ink: see the foot.)
 *   · NO PADDING — the box IS the glyph square, bound to the `icon.size.*` rung, so the glyph's artboard sits on
 *     the content edge. The glyph's own artboard margin stays as drawn (Q283.11 A, "optical flush").
 *   · COLOR-ONLY HOVER — hover and pressed walk the glyph ink (`icon.{hover,pressed}`), and the box paints
 *     NOTHING at any state: no overlay wash, no fill. The flush text button's rule (#2350, Q143 item 2 / Q145 A):
 *     with no padding a wash would hug the glyph.
 *   · CODE-SIDE 44×44 HIT AREA — the box is 20 or 24px, so the target is extended in code by an invisible
 *     overlay, and Figma draws only the glyph square (it has no hit areas). `lint-hit-target.ts` requires the
 *     def to state it, in `codeOnly` and in the shipped `docs.do`, as literals it holds (CODE_SIDE_TARGETS).
 *
 * SIZES (Q283.13 A, "glyphs 20/20/24"): small and medium on `icon.size.sm`, large on `icon.size.md`. Axis order is
 * small, medium, large (the #2509 rule; this is not a field), with medium the code default.
 *
 * NESTING: a host nests it `nest-exposed` with `expose: ['state']`, so the designer can set one side to
 * `disabled` at a limit (Q283.7 note). `apps/plugin/test-roundtrip.ts` builds a fixture host nesting it twice that
 * way, the shape the Counter will take, and reads both exposures back off the shim.
 *
 * REACTIONS: the `state` axis carries rest, hover and pressed, so the built set carries Rest → Hover → Pressed
 * (#2574, Q238 A) with nothing authored here: `apps/plugin/src/reactions.ts` derives scope from the member names.
 *
 * ── THE SECOND SHAPE (owner decision Q287 A on #2457, 2026-10-14) ───────────────────────────────────────────
 *
 * "One component with two shapes": a `shape` axis, `flush | round`, flush first because it is the shape built
 * first and the code default. The Counter's outlined appearance nests `flush`, its ghost appearance `round`
 * (the wireframe's treatment B: a circle with a light edge and a hover fill).
 *
 *   · FLUSH IS UNCHANGED — the same glyph-square box, the same roles, the same paint: nothing at any state. Its
 *     box key is renamed (`size.{size}.side` → `size.{size}.flush`, resolving to the same `icon.size.*` rung) and
 *     it gains `radius.none`, a 0 corner, because the shape axis now keys the corner. Neither changes a pixel.
 *   · ROUND — a circle whose diameter IS the Counter's height at that size, `size.{sm,md,lg}.height` (36 / 44 /
 *     56), so a ghost Counter's row is the circle and needs no height of its own; the medium default lands on
 *     the `md` rung, so no rung-name exception is needed. The glyph inside stays 20 / 20 / 24 (Q283.13 A).
 *   · ROUND'S EDGE IS DECORATIVE — `color.border.secondary`, the decorative rung of the edge ladder (#2569, Q259
 *     C; about 2:1 against the page, no floor). The glyph is the control and carries the 3:1, as it does on the
 *     flush shape; the edge only draws the circle. At disabled it takes `color.disabled.border`.
 *   · ROUND'S HOVER AND PRESSED — the neutral overlay wash, `color.interactive.neutral.overlay.{hover,pressed}`,
 *     IconButton.Neutral's ghost wash, on top of the glyph's ink walk. Rest paints no fill. (Per family since Q295.2 B.)
 *
 * The paint grammar leads with `{shape}`, and every box paint key is `round.*`, so the flush members resolve
 * none of them: `test.ts` holds, per member, that flush paints nothing and round paints exactly its edge plus the
 * wash at hover and pressed, against literals.
 *
 * ── THREE COLOR FAMILIES (owner decision Q295.2 B on #2457, 2026-10-14) ─────────────────────────────────────
 *
 * "Also primary and destructive, not neutral only", built on IconButton's own family pattern (#1225): the family
 * is the COMPONENT, not an axis. One factory, `makeFlushIconButton`, makes three defs that are byte-identical but
 * for the `color.interactive.<family>.*` bindings and the selection fields an agent picks a sibling by, exactly as
 * `makeIconButton` does, and with IconButton's naming: the bare id is the primary component (`flush-icon-button`,
 * FlushIconButton), and the siblings are `flush-icon-button-destructive` (FlushIconButton.Destructive) and
 * `flush-icon-button-neutral` (FlushIconButton.Neutral). Each family takes its IconButton's GHOST roles: the glyph
 * ink `interactive.<family>.icon.*` and, on round, the wash `interactive.<family>.overlay.{hover,pressed}`. The
 * round edge is not a family color: IconButton's ghost has no edge to take one from, so it stays the decorative
 * `color.border.secondary` on all three (Q295.2 B's default). `test.ts` holds the factory's safety (#1225's guard,
 * repeated) and each family's glyph contrast against the page.
 */
import { ComponentDef } from '../component-schema';

type IntentFamily = 'primary' | 'neutral' | 'destructive';

/**
 * The per-family PAINT, authored once and spread into each sibling (#1225's pattern). The glyph ink is IconButton's
 * ghost ink for the family, the same on both shapes; the wash is IconButton's ghost overlay for the family, on round
 * only. Nothing else differs between the three defs.
 */
const flushIconButtonIntentTokens = (family: IntentFamily): Record<string, string> => ({
  // THE GLYPH INK, walking state (#1427, #2324), the same on both shapes. On flush this is the whole of the hover and
  // pressed treatment.
  'flush.icon': `color.interactive.${family}.icon.rest`,
  'flush.icon.hover': `color.interactive.${family}.icon.hover`,
  'flush.icon.pressed': `color.interactive.${family}.icon.pressed`,
  'round.icon': `color.interactive.${family}.icon.rest`,
  'round.icon.hover': `color.interactive.${family}.icon.hover`,
  'round.icon.pressed': `color.interactive.${family}.icon.pressed`,
  // ROUND ONLY (Q287 A): IconButton's ghost wash for the family.
  'round.overlay.hover': `color.interactive.${family}.overlay.hover`,
  'round.overlay.pressed': `color.interactive.${family}.overlay.pressed`,
});

/** What each sibling says for itself (#1697's split): the fields an agent chooses between the three by. */
type FlushIconButtonSibling = {
  /** The IconButton of the same family: `inherits` and `composition.alternativeTo`. */
  iconButton: string;
  triggerKeywords: string[];
  avoidWhen: string;
  generationPriority: number;
  /** Appended to the shared `docs.do`. */
  do: string[];
};

const AVOID_WHEN = 'It would sit inside an element that is already a button, such as an accordion header or a tab. You cannot supply an accessible name.';

const makeFlushIconButton = (id: string, name: string, summary: string, description: string, family: IntentFamily, sibling: FlushIconButtonSibling): ComponentDef => ({

  id,
  name,
  aliases: ['flush-icon-btn', 'bare-icon-button'],
  category: 'form',
  status: 'draft',
  summary,
  description,

  inherits: sibling.iconButton,

  props: [
    { name: 'icon', type: 'slot', required: true, description: 'The single icon. Rendered aria-hidden: the button owns the name.' },
    { name: 'aria-label', type: 'string', required: true, description: 'Required accessible name, a verb naming the action ("Close", "Increase quantity"). Required at the type level, since there is no visible text.' },
    { name: 'onClick', type: 'function', required: false, description: 'Action handler. Not called while disabled.' },
    { name: 'type', type: "enum: 'button' | 'submit' | 'reset'", values: ['button', 'submit', 'reset'], default: 'button', required: false, description: "Defaults to 'button', as Button does. The platform default is 'submit', so a flush icon button inside a form would submit it." },
    { name: 'shape', type: "enum: 'flush' | 'round'", values: ['flush', 'round'], default: 'flush', required: false, description: 'flush is the bare glyph, with no padding, fill or border, for a glyph that lines up with the content edge. round is a circle around the glyph with a light edge and a soft fill on hover and press, for a counter whose buttons stand on their own.' },
    { name: 'size', type: "enum: 'small' | 'medium' | 'large'", values: ['small', 'medium', 'large'], default: 'medium', required: false, description: 'The glyph size: 20px at small and medium, 24px at large. A flush box is the glyph, with no padding. A round circle is 36, 44 or 56px across. The hit area in code is at least 44×44px at every size.' },
    { name: 'disabled', type: 'boolean', default: false, required: false, description: 'Native disabled. Inside a component that sets it at a limit (a counter at its minimum), prefer aria-disabled so the button keeps its place in the accessibility tree.' },
  ],

  states: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled'],
  variants: {
    // Q287 A: flush first, the shape built first and the code default, so Figma's inserted member is flush.
    shape: ['flush', 'round'],
    size: ['medium', 'small', 'large'],
  },
  axisKinds: { shape: 'authoring', size: 'authoring' },

  // No appearance axis, so the shape leads: a `round.*` key answers the round members only, and every box paint key
  // is `round.*`, so a flush member resolves no box paint. The glyph ink is stated once per shape, identical.
  paintKeys: ['{shape}.{slot}.{state}', '{shape}.{slot}'],

  tokens: {
    // THE GLYPH, both shapes. Q283.13 A: 20 / 20 / 24.
    'size.small.icon': 'icon.size.sm',
    'size.medium.icon': 'icon.size.sm',
    'size.large.icon': 'icon.size.md',
    // THE BOX, per shape. A flush box IS the glyph square, the same rung as the glyph, so nothing is left over to
    // pad. A round box is the Counter's height at that size (Q287 A: "sizes fit the Counter's 36/44/56").
    'size.small.flush': 'icon.size.sm',
    'size.medium.flush': 'icon.size.sm',
    'size.large.flush': 'icon.size.md',
    'size.small.round': 'size.sm.height',
    'size.medium.round': 'size.md.height',
    'size.large.round': 'size.lg.height',
    // The corner, per shape: none on the glyph square, full-round on the circle (IconButton's `circular` rung).
    'radius.flush': 'radius.none',
    'radius.round': 'radius.round',
    'border-width': 'border-width.hairline',
    'ring-width': 'focus.ring.width',
    'ring-offset': 'focus.ring.offset',
    // THE PER-FAMILY PAINT (Q295.2 B): the glyph ink on both shapes and the round wash, from IconButton's ghost roles
    // for the family. Authored once in `flushIconButtonIntentTokens` so the three siblings cannot drift (#1225).
    ...flushIconButtonIntentTokens(family),
    'disabled.icon': 'color.disabled.icon',
    // ROUND ONLY (Q287 A). The edge is DECORATIVE: the decorative rung of the edge ladder (#2569, Q259 C), not a
    // 3:1 border, because the glyph carries the control. It is the same on all three families: IconButton's ghost
    // draws no edge, so there is no family edge to follow (Q295.2 B).
    'round.border': 'color.border.secondary',
    // The disabled edge. The cross-cutting `disabled.*` branch applies a structural paint only where the shape has
    // it at rest, so flush (no `flush.border`) still draws no edge at disabled.
    'disabled.border': 'color.disabled.border',
  },

  anatomy: {
    root: 'container',
    parts: {
      container: {
        kind: 'box',
        // The round shape's edge and wash. Every key these slots resolve is `round.*` (or `disabled.border`, gated on
        // a rest edge), so a flush member's box paints nothing at any state. `test.ts` holds both shapes, per member.
        paintSlots: ['overlay', 'border'],
        role: 'target',
        children: ['icon', 'focusRing'],
        layout: { direction: 'row', align: 'center', justify: 'center', sizing: { x: 'fixed', y: 'fixed' } },
        // One key, both axes, per shape: the glyph's own rung on flush, the Counter's height on round. No padding
        // is bound on either: flush has none, and round centers its glyph in a fixed circle.
        size: 'size.{size}.{shape}',
        radius: 'radius.{shape}',
        strokeWidth: 'border-width',
        note: 'Flush: the glyph square, with no padding, fill or border; in code, an invisible overlay extends the hit area to at least 44×44px around it. Round: a circle with a light edge, the glyph centered in it.',
      },
      icon: {
        kind: 'slot',
        size: 'size.{size}.icon',
        nesting: { kind: 'swap' },
        note: 'The single icon, and the entire visible control. Rendered aria-hidden; the button owns the accessible name.',
      },
      focusRing: {
        kind: 'absolute',
        when: 'focus-visible',
        nests: 'focus-ring',
        inset: 'ring-offset',
        strokeInset: 'ring-width',
        nesting: { kind: 'nest-fixed', variant: { surface: 'default' } },
        note: 'The shared focus ring, offset from the glyph square or the circle as on IconButton.',
      },
    },
    codeOnly: [
      'touch-target-expansion — the visible box is the glyph square (20px at small and medium, 24px at large) and carries no padding, so the hit area is at least 44×44px at every size in code: an invisible extension, such as a transparent `::before` inset outward and centered on the glyph, reaches past the glyph into the space around it, while the box stays glyph-sized so the glyph still lines up with the content edge. Figma has no hit areas, so it draws the glyph square only. A host must leave the extension room: two flush icon buttons closer than 44px apart, center to center, overlap their hit areas.',
      'focus-ring-offset — the ring geometry projects (an absolute sibling nesting the shared `focus-ring`), and its position is frozen at paste, as on IconButton: Figma\'s x and y accept no variable binding, so the build writes the sum of `focus.ring.offset` and `focus.ring.width`.',
      'aria-label — the required accessible name, held at the type level in code. Figma cannot hold "required", and a text property named for it would read as a name already given.',
      'Exposed state in a host — a host such as a counter nests this button with its `state` exposed, so the designer can show one side disabled at a limit. In code the host sets `aria-disabled="true"` on that button at the limit rather than native disabled, so it stays in the accessibility tree.',
      'RTL mirroring — only a directional glyph flips under RTL (a back or forward chevron); close, minus and plus stay as drawn.',
      'the round focus ring — on the circle, the ring is round too: its radius is the host radius plus the ring offset, derived in code as on IconButton\'s circular shape, since the shared ring binds no radius of its own.',
    ],
  },

  figmaProperties: {
    variantAxes: ['shape', 'size'],
    stateAxis: { name: 'state', values: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled'] },
    gridAxis: 'state',
    booleans: {},
    swaps: { icon: { part: 'icon', figmaName: 'swap icon' } },
  },

  accessibility: {
    role: 'button (native <button>)',
    wcag: [
      '4.1.2 Name/Role/Value (the required accessible name)',
      '1.4.11 Non-text Contrast (the glyph and the focus ring at 3:1 against the page; the round edge is decorative and is not held to it, since the glyph identifies the control)',
      '2.4.7 Focus Visible (a :focus-visible ring, offset from the glyph square)',
      '2.5.8 Target Size (Minimum) (24×24, as intent — through the code-side hit area, since the flush glyph box alone is 20 or 24px)',
      '2.5.5 Target Size (Enhanced) (44×44, as intent — through the code-side hit area at every size; the flush glyph box alone is 20 or 24px, and the small round circle 36px)',
    ],
    keyboard: 'Native <button>: Enter on keydown, Space on keyup. A host may take it out of the tab order (tabindex="-1") where its own keys do the same job, as a counter\'s arrow keys do.',
    focus: 'An offset :focus-visible ring around the glyph square, or around the circle on the round shape.',
    aria: 'aria-label is the accessible name (required), a verb naming the action. Inside a host that disables it at a limit, set aria-disabled="true" so it stays in the accessibility tree. Never nest it inside another interactive element, such as an accordion header or a tab: a button inside a button is invalid HTML and breaks assistive technology. Under RTL, only a directional glyph flips.',
  },

  content: {
    labelPattern: 'The accessible name is a verb naming the action ("Close", "Increase quantity"), never the glyph\'s shape ("X", "plus").',
  },

  docs: {
    usage: 'Use inside another component where the icon is itself the control: the minus and plus of a counter, or the close on a card. Use flush where the glyph must line up with the content edge, such as inside a counter that draws its own box. Use round where the buttons stand on their own beside a value, such as a counter with no box. For an icon action with its own padded box in a toolbar, use the IconButton of the same color.',
    do: [
      'Always give it an accessible name (a verb)',
      'Extend its hit area in code to at least 44×44px at every size, with a transparent ::before inset outward and centered on the glyph, so the target clears 44px while the box stays glyph-sized',
      'Space two flush icon buttons at least 44px apart, center to center, so their tap areas don\'t overlap',
      ...sibling.do,
    ],
    dont: [
      'Nest it inside a control whose whole row is already a button, such as an accordion header or a tab',
      'Add a fill or a wash to the flush shape on hover or press; only the glyph color changes. Use the round shape for a fill',
      'Use it on its own in a toolbar, where the IconButton of the same color gives the action a visible box',
    ],
    contentGuidelines: 'The accessible name is a verb naming the action ("Close", "Increase quantity"), never the glyph\'s shape.',
  },

  ai: {
    primaryPurpose: 'Trigger an action inside another component, with a bare glyph that sits flush with the content edge or a glyph in a light circle.',
    whenToUse: 'The minus and plus of a counter, a card\'s close, or any icon action inside a component. shape=flush where the glyph must line up with the content edge; shape=round where the buttons stand on their own beside a value.',
    avoidWhen: `${sibling.avoidWhen} ${AVOID_WHEN}`,
    commonPartners: ['icon', 'focus-ring'],
    triggerKeywords: sibling.triggerKeywords,
    generationPriority: sibling.generationPriority,
  },

  composition: {
    composesWith: ['focus-ring'],
    alternativeTo: [sibling.iconButton],
    planned: ['counter', 'number-input', 'card'],
    replacesPatterns: ['an <svg> with a click handler and no button', 'an IconButton with its padding overridden to zero'],
  },

  motion: {
    enter: 'none (present on mount)',
    exit: 'none',
    reduceMotion: 'The glyph color change, and the round shape\'s fill, are meant to run about 100–150ms through the brand\'s motion tokens; none is bound yet, so the timing is code-side. Under prefers-reduced-motion the change stays, instantly.',
  },

  notes: {
    contested: [
      'TWO NESTS EXPOSING `state` ON ONE HOST are built and exposed on the shim (`test-roundtrip.ts`), but untested on a real host, where Figma lists each exposed instance\'s properties under its layer name.',
    ],
    evolution: [
      'Q283.3 A (2026-10-14): its own small def rather than an `inset` axis on IconButton\'s ghost appearance, so the three IconButton sets stay as they are.',
      'Q287 A (2026-10-14): one component with two shapes, `flush` and `round`, rather than a second def. The Counter\'s outlined appearance nests flush and its ghost appearance nests round.',
      'Q295 (2026-10-14): the name `FlushIconButton` / `flush-icon-button` (A); a 44×44 code-side hit area at every size, small included (A); sizes small, medium, large (A); `shape: flush | round` (A); round 36 / 44 / 56 (A); the glyph 20 / 20 / 24 on both shapes (A); the neutral roles as built (A).',
      'Q295.2 B (2026-10-14): primary and destructive beside neutral, on both shapes, as IconButton\'s three components: the bare id is primary, the siblings `-destructive` and `-neutral`, and each takes its IconButton\'s ghost ink and wash.',
      'Q296 A (2026-10-14): the 44px spacing between two flush icon buttons is center to center, so their 44×44 hit areas touch without overlapping.',
      'Q305.1 A (2026-10-14): the round edge stays the decorative color.border.secondary (color.disabled.border at disabled) on all three families; the glyph carries the family color.',
    ],
    unverified: [
      'motion timing — no motion token is bound, so nothing gates the 100–150ms target.',
      'The focus ring clears 3:1 against the page (gated, focus-ring.ts); against a host\'s fill it is not measured.',
      'The round edge, `color.border.secondary`, is about 2:1 against the page by design (decorative, no floor). The glyph ink clears 3:1 against the page per family (gated, `test.ts` #2457); on the round shape\'s hover and pressed wash it keeps its contrast through the overlay contract (`interactive.<family>.overlay.*` against the family\'s text ink), which is gated for text ink, not the icon ink.',
    ],
  },
});

// The approved neutral wording (Q295.9 A), and the body all three share after their first sentence.
const DESCRIPTION_BODY = 'It has two shapes. Flush has no padding, no fill and no border: the glyph is the whole visible control, so it lines up with the content edge around it, and hover and press change the glyph color only. Round draws a circle around the glyph with a light edge, and hover and press add a soft fill; its diameter matches the height of a counter at the same size. The flush box is the glyph, 20 or 24px, so in code the hit area extends past it to at least 44×44px. Because there is no visible text, an accessible name is required.';

// ── THE THREE COMPONENTS (Q295.2 B, IconButton's #1225 pattern) ───────────────────────────────────────────────
// `test.ts` holds that they share every field but the family paint and the selection fields, as it does for IconButton.
export const flushIconButton: ComponentDef = makeFlushIconButton(
  'flush-icon-button',
  'FlushIconButton',
  'Icon-only brand action inside a component: a bare glyph or a light circle. Needs an accessible name.',
  `An icon-only button in the brand's primary color, made to sit inside another component where the action carries the brand, such as the add on a list row. ${DESCRIPTION_BODY}`,
  'primary',
  {
    iconButton: 'icon-button',
    triggerKeywords: ['primary flush icon button', 'brand icon action in a component', 'inline add button', 'round brand icon button'],
    avoidWhen: 'The action deletes or removes something (use FlushIconButton.Destructive). It carries no brand emphasis, such as the minus and plus of a counter or the close on a card (use FlushIconButton.Neutral). It stands on its own in a toolbar or a header (use IconButton, which has a visible box).',
    generationPriority: 5,
    do: [],
  },
);

export const flushIconButtonDestructive: ComponentDef = makeFlushIconButton(
  'flush-icon-button-destructive',
  'FlushIconButton.Destructive',
  'Icon-only destructive action in a component: a bare glyph or light circle. Needs an accessible name.',
  `An icon-only button in the destructive color, made to sit inside another component where the action deletes or removes something, such as the remove on a list row. ${DESCRIPTION_BODY}`,
  'destructive',
  {
    iconButton: 'icon-button-destructive',
    triggerKeywords: ['destructive flush icon button', 'danger icon in a component', 'inline remove button', 'row delete icon'],
    avoidWhen: 'The action is not destructive (use FlushIconButton, or FlushIconButton.Neutral for one with no brand emphasis). It stands on its own in a toolbar or a header (use IconButton.Destructive, which has a visible box).',
    generationPriority: 5,
    do: [
      'Confirm a destructive action that cannot be undone, and give the confirmation a neutral way out ("Cancel" or "Keep"), since a lone glyph offers none',
    ],
  },
);

export const flushIconButtonNeutral: ComponentDef = makeFlushIconButton(
  'flush-icon-button-neutral',
  'FlushIconButton.Neutral',
  'Icon-only action inside another component: a bare glyph or a light circle. Needs an accessible name.',
  `An icon-only button made to sit inside another component, such as the minus and plus of a counter or the close on a card. ${DESCRIPTION_BODY}`,
  'neutral',
  {
    iconButton: 'icon-button-neutral',
    triggerKeywords: ['flush icon button', 'bare icon button', 'round icon button in a counter', 'counter plus minus', 'card close icon', 'stepper button'],
    avoidWhen: 'The action carries the brand (use FlushIconButton) or deletes something (use FlushIconButton.Destructive). It stands on its own in a toolbar or a header (use IconButton.Neutral, which has a visible box and a hover wash).',
    generationPriority: 4,
    do: [],
  },
);
