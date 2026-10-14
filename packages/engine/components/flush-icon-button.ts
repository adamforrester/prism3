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
 *     − and + (#2427, Oct 9 §4). No new token.
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
 */
import { ComponentDef } from '../component-schema';

export const flushIconButton: ComponentDef = {
  id: 'flush-icon-button',
  name: 'FlushIconButton',
  aliases: ['flush-icon-btn', 'bare-icon-button'],
  category: 'form',
  status: 'draft',
  summary: 'Icon-only action with no padding or fill, set inside another component. Needs an accessible name.',
  description:
    'An icon-only button with no padding, no fill and no border: the glyph is the whole visible control, so it lines up with the content edge around it. It is made to sit inside another component, such as the minus and plus of a counter or the close on a card. Hover and press change the glyph color only. The visible box is the glyph, 20 or 24px, so in code the hit area extends past it to at least 44×44px. Because there is no visible text, an accessible name is required.',

  inherits: 'icon-button-neutral',

  props: [
    { name: 'icon', type: 'slot', required: true, description: 'The single icon. Rendered aria-hidden: the button owns the name.' },
    { name: 'aria-label', type: 'string', required: true, description: 'Required accessible name, a verb naming the action ("Close", "Increase quantity"). Required at the type level, since there is no visible text.' },
    { name: 'onClick', type: 'function', required: false, description: 'Action handler. Not called while disabled.' },
    { name: 'type', type: "enum: 'button' | 'submit' | 'reset'", values: ['button', 'submit', 'reset'], default: 'button', required: false, description: "Defaults to 'button', as Button does. The platform default is 'submit', so a flush icon button inside a form would submit it." },
    { name: 'size', type: "enum: 'small' | 'medium' | 'large'", values: ['small', 'medium', 'large'], default: 'medium', required: false, description: 'The glyph size: 20px at small and medium, 24px at large. The box is the glyph, with no padding; the hit area in code is at least 44×44px at every size.' },
    { name: 'disabled', type: 'boolean', default: false, required: false, description: 'Native disabled. Inside a component that sets it at a limit (a counter at its minimum), prefer aria-disabled so the button keeps its place in the accessibility tree.' },
  ],

  states: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled'],
  variants: {
    size: ['small', 'medium', 'large'],
  },
  axisKinds: { size: 'authoring' },

  // No appearance axis (ghost only), so the grammar is the slot and the state alone.
  paintKeys: ['{slot}.{state}', '{slot}'],

  tokens: {
    // The box IS the glyph square, one key on both axes, and the glyph inside it binds the same key: nothing is
    // left over to pad. Q283.13 A: 20 / 20 / 24.
    'size.small.side': 'icon.size.sm',
    'size.medium.side': 'icon.size.sm',
    'size.large.side': 'icon.size.md',
    'ring-width': 'focus.ring.width',
    'ring-offset': 'focus.ring.offset',
    // THE GLYPH INK — IconButton.Neutral's ghost ink, walking state (#1427, #2324: neutral reflects inward, so hover
    // and pressed do move). This is the whole of the hover and pressed treatment: no `overlay` key exists here.
    'icon': 'color.interactive.neutral.icon.rest',
    'icon.hover': 'color.interactive.neutral.icon.hover',
    'icon.pressed': 'color.interactive.neutral.icon.pressed',
    'disabled.icon': 'color.disabled.icon',
  },

  anatomy: {
    root: 'container',
    parts: {
      container: {
        kind: 'box',
        // NO `paintSlots`: the box paints nothing at any state (color-only hover). `test.ts` holds it, per member.
        role: 'target',
        children: ['icon', 'focusRing'],
        layout: { direction: 'row', align: 'center', justify: 'center', sizing: { x: 'fixed', y: 'fixed' } },
        // One key, both axes, the glyph's own rung: no padding is bound because there is none to bind.
        size: 'size.{size}.side',
        note: 'The glyph square, with no padding, fill or border. In code, an invisible overlay extends the hit area to at least 44×44px around it.',
      },
      icon: {
        kind: 'slot',
        size: 'size.{size}.side',
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
        note: 'The shared focus ring, offset from the glyph square as on IconButton.',
      },
    },
    codeOnly: [
      'touch-target-expansion — the visible box is the glyph square (20px at small and medium, 24px at large) and carries no padding, so the hit area is at least 44×44px at every size in code: an invisible extension, such as a transparent `::before` inset outward and centered on the glyph, reaches past the glyph into the space around it, while the box stays glyph-sized so the glyph still lines up with the content edge. Figma has no hit areas, so it draws the glyph square only. A host must leave the extension room: two flush icon buttons closer than 44px apart overlap their hit areas.',
      'focus-ring-offset — the ring geometry projects (an absolute sibling nesting the shared `focus-ring`), and its position is frozen at paste, as on IconButton: Figma\'s x and y accept no variable binding, so the build writes the sum of `focus.ring.offset` and `focus.ring.width`.',
      'aria-label — the required accessible name, held at the type level in code. Figma cannot hold "required", and a text property named for it would read as a name already given.',
      'Exposed state in a host — a host such as a counter nests this button with its `state` exposed, so the designer can show one side disabled at a limit. In code the host sets `aria-disabled="true"` on that button at the limit rather than native disabled, so it stays in the accessibility tree.',
      'RTL mirroring — only a directional glyph flips under RTL (a back or forward chevron); close, minus and plus stay as drawn.',
    ],
  },

  figmaProperties: {
    variantAxes: ['size'],
    stateAxis: { name: 'state', values: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled'] },
    gridAxis: 'state',
    booleans: {},
    swaps: { icon: { part: 'icon', figmaName: 'swap icon' } },
  },

  accessibility: {
    role: 'button (native <button>)',
    wcag: [
      '4.1.2 Name/Role/Value (the required accessible name)',
      '1.4.11 Non-text Contrast (the glyph and the focus ring at 3:1 against the page)',
      '2.4.7 Focus Visible (a :focus-visible ring, offset from the glyph square)',
      '2.5.8 Target Size (Minimum) (24×24, as intent — through the code-side hit area, since the glyph box alone is 20 or 24px)',
      '2.5.5 Target Size (Enhanced) (44×44, as intent — through the code-side hit area at every size; the glyph box alone is 20 or 24px)',
    ],
    keyboard: 'Native <button>: Enter on keydown, Space on keyup. A host may take it out of the tab order (tabindex="-1") where its own keys do the same job, as a counter\'s arrow keys do.',
    focus: 'An offset :focus-visible ring around the glyph square.',
    aria: 'aria-label is the accessible name (required), a verb naming the action. Inside a host that disables it at a limit, set aria-disabled="true" so it stays in the accessibility tree. Never nest it inside another interactive element, such as an accordion header or a tab: a button inside a button is invalid HTML and breaks assistive technology. Under RTL, only a directional glyph flips.',
  },

  content: {
    labelPattern: 'The accessible name is a verb naming the action ("Close", "Increase quantity"), never the glyph\'s shape ("X", "plus").',
  },

  docs: {
    usage: 'Use inside another component where the icon is itself the control and must line up with the content edge: the minus and plus of a counter, or the close on a card. For an icon action with its own padded box and hover wash, use IconButton.Neutral.',
    do: [
      'Always give it an accessible name (a verb)',
      'Extend its hit area in code to at least 44×44px at every size, with a transparent `::before` inset outward and centered on the glyph, so the target clears 44px while the box stays glyph-sized',
      'Leave 44px between two flush icon buttons, so their hit areas do not overlap',
    ],
    dont: [
      'Nest it inside a control whose whole row is already a button, such as an accordion header or a tab',
      'Add a fill or a wash on hover or press; only the glyph color changes',
      'Use it on its own in a toolbar, where IconButton.Neutral gives the action a visible box',
    ],
    contentGuidelines: 'The accessible name is a verb naming the action ("Close", "Increase quantity"), never the glyph\'s shape.',
  },

  ai: {
    primaryPurpose: 'Trigger an action with a bare glyph that sits flush with the content edge, inside another component.',
    whenToUse: 'The minus and plus of a counter, a card\'s close, or any icon action inside a component where the glyph must line up with the content edge.',
    avoidWhen: 'The action stands on its own in a toolbar or a header (use IconButton.Neutral, which has a visible box and a hover wash). It would sit inside an element that is already a button, such as an accordion header or a tab. You cannot supply an accessible name.',
    commonPartners: ['icon', 'focus-ring', 'icon-button-neutral'],
    triggerKeywords: ['flush icon button', 'bare icon button', 'counter plus minus', 'card close icon', 'stepper button'],
    generationPriority: 4,
  },

  composition: {
    composesWith: ['focus-ring'],
    alternativeTo: ['icon-button-neutral'],
    planned: ['counter', 'number-input', 'card'],
    replacesPatterns: ['an <svg> with a click handler and no button', 'an IconButton with its padding overridden to zero'],
  },

  motion: {
    enter: 'none (present on mount)',
    exit: 'none',
    reduceMotion: 'The glyph color change is meant to run about 100–150ms through the brand\'s motion tokens; none is bound yet, so the timing is code-side. Under prefers-reduced-motion the color change stays, instantly.',
  },

  notes: {
    contested: [
      'NAME AND ID (DRAFT, owner item): `FlushIconButton` / `flush-icon-button`, a sibling-free id. `IconButton.Flush` / `icon-button-flush` would read as a fourth IconButton family sibling, which it is not (it has no appearance axis and a different box); `_flush-icon-button` would hide it from a published library, but a card close may place it directly.',
      'THE COLOR FAMILY (DRAFT, owner item): neutral only, IconButton.Neutral\'s ghost glyph ink, as the quantity-stepper proposal drafted. A primary or destructive flush icon button is not built.',
      'THE SMALL HIT AREA (DRAFT, owner item): 44×44 at every size, as Q283.3 A states it. The flush TEXT button puts small at 24×24 (Q174 B); this def does not follow that, since its small and medium glyph boxes are the same 20px.',
      'TWO NESTS EXPOSING `state` ON ONE HOST are built and exposed on the shim (`test-roundtrip.ts`), but untested on a real host, where Figma lists each exposed instance\'s properties under its layer name.',
    ],
    evolution: [
      'Q283.3 A (2026-10-14): its own small def rather than an `inset` axis on IconButton\'s ghost appearance, so the three IconButton sets stay as they are.',
    ],
    unverified: [
      'motion timing — no motion token is bound, so nothing gates the 100–150ms target.',
      'The focus ring clears 3:1 against the page (gated, focus-ring.ts); against a host\'s fill it is not measured.',
    ],
  },
};
