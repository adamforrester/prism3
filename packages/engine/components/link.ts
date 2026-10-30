/**
 * Link — text that goes somewhere: another page, a place on the page, a file (#2580).
 *
 * KB brief: `components/link.md`
 *
 * Shape (owner decisions Q289, 2026-10-14; Q507, 2026-10-21; D-A5 A, 2026-10-30): `style` [standalone, inline] ×
 * `weight` [emphasis, default] × `size` [medium, x-small, small, large] × `surface` [default, inverse] × `selection`
 * [unselected, selected] × four states (rest, hover, pressed, focus-visible), less the inline × selected coordinates
 * = 192 members.
 *
 *   - Q289.1 A — the standalone link plus an inline look. A link inside a paragraph stays a text range in Figma with
 *     the existing `-link` text styles: Figma cannot place an instance inside a run of text.
 *   - Q289.2 A — `standalone` sets the plain label at rest and its underlined twin at hover, pressed and
 *     focus-visible; `inline` is underlined at every state. No `quiet` for now.
 *   - Q289.3 B, worded by Q297.3 — two weights, `emphasis` (the starting value) and `default` (lighter).
 *   - Q297.1 (revising Q289.3's label tier) — the BODY tier, 14 / 16 / 18px, for both styles, so a Link matches the
 *     body text and the text-range link (`type.body.*.default-link`) in the same paragraph. No 12px link then
 *     (revised by D-A5 A, below). `default` binds `type.body.<rung>.default[-link]`; `emphasis` binds the heaviest
 *     body weight the brand ships, through `weightIntent` (#1602): `strong[-link]` in a default brand,
 *     `emphasis[-link]` in one whose body weights are `[default, emphasis]`. The body tier has no `emphasis` role in a default brand, so a fixed binding would name a
 *     style some brand does not emit (the #1601 miss).
 *   - Q289.4 A — one text line tall in Figma; code expands the hit area to at least 24px.
 *   - Q297.2 — icons are trailing only and standalone only (Carbon's model): no leading icon, and the trailing slot is
 *     absent from every inline member (`presentWhen`). 16px with the 14px and 16px text, 20px with the 18px text, so
 *     the icon fits inside the body line (21 / 24 / 27px at the 1.5 line height).
 *   - Q289.5 A — visited and current are code only (`STATES` has neither). Reversed for current by Q507 (#2872), below.
 *   - Q289.6 A — Button takes `href` and renders `<a>`; no LinkButton def.
 *
 * THE EXTRA-SMALL SIZE (#3179, owner decision D-A5 A). `x-small` sets `type.body.xs.*` (12 / 18px) for dense metadata:
 * an order number's row, a legal line. Not for running body text. The word is Icon's and Spinner's for the rung below
 * `small` (Q3179.1 A). The icon stays `icon.size.xs` (16px), small and medium's rule: it is the smallest icon rung there
 * is, and it fits inside the 18px line. The 18px line is below SC 2.5.8's 24px, so a standalone x-small link meets it
 * through the code-side hit area (as small's 21px line already does); `lint-hit-target.ts` holds the sizes whose line
 * is under 24px to that `codeOnly` entry by name. It lands after `medium` and before `small` in the axis (medium first,
 * then the ladder, #2752); an Update adds the 48 x-small members and leaves the 144 in place.
 *
 * THE UNDERLINE MOVES WITH THE STATE, THE BOX DOES NOT. The label's type key names `{state}` (the type-only
 * extension in `component-schema.ts`, #2580), so a standalone member at hover binds the `-link` twin of the style it
 * binds at rest. The two differ only in `textDecoration`, so the width is the same and the footprint rule holds.
 *
 * THE CURRENT PAGE (#2872, owner decisions Q507). A navigation row marks the page the user is on. `selection`, the
 * runtime axis Tab, Tag and the segmented-control option share (Q507.3 A), on standalone links only: inline links stay
 * out through `excludeCoordinates` (Q507.2 A), so 96 → 144. The code prop is `current`, rendering
 * `aria-current="page"`. `unselected` comes FIRST: the plugin's Update gives existing members an added axis at the
 * value the set's first member carries (`update-plan.ts` §2), so a published set's 96 members become
 * `selection=unselected` in place, with nothing dropped or replaced (#2839's `breakingOf` stays empty, which
 * `test-update-apply.ts` asserts on a published Link). Selected first, the 48 inline members would land on a
 * coordinate the set excludes and be dropped.
 *
 *   - THE BAR (Q507.1 C): 2px (`border-width.thick`) at the foot of the line box, in `color.icon.link.*` stepped by
 *     state. A FILLED box, as Tab's selected bar is (Q178.1 A), never a stroke: the icon role is scoped to fills, and
 *     a stroke never binds an ink role (Q346, `lint-paint.ts` arm 5). It exists on selected members only
 *     (`presentWhen`), so the 96 unselected members gain no layer, and it sits OUT OF THE FLOW pinned to the row's
 *     bottom edge across its width (`PartDef.foot`), so the box does not move.
 *   - HOVER ON THE CURRENT ITEM (Q507.4): color only. The label keeps its plain style at every state, so the 1px
 *     hover underline never joins the bar; the type key names `{selection}` for that. It stays a real link in code.
 *
 * Ink is the link role, `color.text.link.*` and `color.icon.link.*` (an icon role for glyphs, #1471), stepped by
 * state; `focus-visible` takes the `focused` rung. `surface=inverse` takes the inverse twins through the projector's
 * one inverse rewrite, as Button does. Lowest measured against `background.primary` across brand and mode cells:
 * 4.94:1 at rest (proposal, from the committed emission).
 */
import { ComponentDef } from '../component-schema';

const SIZES = ['x-small', 'small', 'medium', 'large'] as const;
const RUNG: Record<(typeof SIZES)[number], string> = { 'x-small': 'xs', small: 'sm', medium: 'md', large: 'lg' };
const WEIGHTS = ['emphasis', 'default'] as const;
/** The default-brand body role per weight; `weightIntent` repoints `emphasis` per brand. */
const ROLE: Record<(typeof WEIGHTS)[number], string> = { emphasis: 'strong', default: 'default' };
const STYLES = ['standalone', 'inline'] as const;
const STATES = ['rest', 'hover', 'pressed', 'focus-visible'] as const;
const SELECTIONS = ['unselected', 'selected'] as const;

/** The label's text style per (size, weight, style, selection, state): the `-link` twin wherever the link is
 *  underlined. The current page (`selected`) is never underlined: its bar is its line, and hover changes the color
 *  only (Q507.4). */
const typeKeys: Record<string, string> = Object.fromEntries(
  SIZES.flatMap((size) => WEIGHTS.flatMap((weight) => STYLES.flatMap((style) => SELECTIONS.flatMap((selection) => STATES.map((state) => {
    const underlined = style === 'inline' || (selection === 'unselected' && state !== 'rest');
    return [`size.${size}.type.${weight}.${style}.${selection}.${state}`, `type.body.${RUNG[size]}.${ROLE[weight]}${underlined ? '-link' : ''}`];
  }))))),
);

export const link: ComponentDef = {
  id: 'link',
  name: 'Link',
  aliases: ['text-link', 'anchor', 'hyperlink'],
  category: 'navigation',
  status: 'draft',
  summary: 'Text that goes to another page, a place on the page or a file. Underlined in running text.',
  description:
    'Text that goes to another page, a place on the page, a file or another site. A link is always a real anchor with an href; an action in place is a button, however light it looks. The standalone style sits on its own line, below a form, in a footer or beside a control, and shows its underline at hover, pressed and keyboard focus. The inline style is underlined at every state, for a link that sits in body copy, so it is never told apart by color alone. Both come in two weights: emphasis, the starting value, and default, which is lighter. In a navigation, the standalone link to the page the user is on is current: it shows a 2px bar under the text, and at hover only its color changes. A link inside a paragraph is a text range with that text\'s own link style rather than this component.',

  props: [
    { name: 'label', type: 'string', required: true, description: 'The link text. It names the destination and makes sense read on its own, without the sentence around it.' },
    { name: 'href', type: 'string', required: true, description: 'The destination: a URL, a fragment such as "#main", or a file. With no href, render plain text rather than a link.' },
    { name: 'style', type: "enum: 'standalone' | 'inline'", values: ['standalone', 'inline'], default: 'standalone', required: false, description: 'Standalone shows its underline at hover, pressed and focus; inline is underlined at every state, for a link in body copy.' },
    { name: 'weight', type: "enum: 'emphasis' | 'default'", values: ['emphasis', 'default'], default: 'emphasis', required: false, description: 'Emphasis is the starting value; choose Default for a lighter weight link.' },
    { name: 'size', type: "enum: 'x-small' | 'small' | 'medium' | 'large'", values: ['x-small', 'small', 'medium', 'large'], default: 'medium', required: false, description: 'The body type size: 12, 14, 16 or 18px. The box is one text line tall; the icon (16px at x-small, small and medium, 20px at large) sits inside it.' },
    { name: 'current', type: 'boolean', default: false, required: false, description: 'Marks the link to the page the user is on, in a navigation: a 2px bar under the text and aria-current="page". Standalone links only. It stays a link with its href.' },
    { name: 'surface', type: "enum: 'default' | 'inverse'", values: ['default', 'inverse'], default: 'default', required: false, description: 'The ground the link sits on: the page, or a dark or brand-filled band, which takes the inverse link colors.' },
    { name: 'isExternal', type: 'boolean', default: false, required: false, description: 'Opens in a new tab: adds the trailing external icon, visually hidden "(opens in new tab)" text and rel="noopener noreferrer". Keep it for narrow cases.' },
    { name: 'asChild', type: 'boolean', default: false, required: false, description: 'Merges the link\'s styling and accessibility onto a router\'s link child, so one anchor renders and the component depends on no router.' },
    { name: 'trailingIcon', type: 'slot', required: false, description: 'An icon after the label, such as an arrow or the external icon. Not for inline links.' },
  ],

  states: ['rest', 'hover', 'pressed', 'focus-visible'],
  variants: {
    style: ['standalone', 'inline'],
    weight: ['emphasis', 'default'],
    // Medium first, then the ladder (#2752). x-small (#3179) joins below small; an Update adds its members in place.
    size: ['medium', 'x-small', 'small', 'large'],
    surface: ['default', 'inverse'],
    // `unselected` first: an Update gives existing members an added axis at the set's first value (Q507, #2872).
    selection: ['unselected', 'selected'],
  },
  axisKinds: { style: 'authoring', weight: 'authoring', size: 'authoring', surface: 'authoring', selection: 'runtime' },
  // Emphasis resolves to the heaviest body weight the brand ships, default to its reading weight (Q297.1, #1602).
  weightIntent: { axis: 'weight', group: 'body', intents: { emphasis: 'bold', default: 'regular' } },

  // The current-page bar's fill keys name the selection (#2872); three segments, so they never shape-match the label's two.
  paintKeys: ['{slot}.{selection}.{state}', '{slot}.{state}', '{slot}'],
  densitySpacing: ['size.{size}.gap'],

  tokens: {
    'ring-width': 'focus.ring.width',
    'ring-offset': 'focus.ring.offset',

    'size.x-small.gap': 'space.050',
    'size.x-small.icon': 'icon.size.xs',
    'size.small.gap': 'space.050',
    'size.small.icon': 'icon.size.xs',
    'size.medium.gap': 'space.050',
    'size.medium.icon': 'icon.size.xs',
    'size.large.gap': 'space.100',
    'size.large.icon': 'icon.size.sm',
    ...typeKeys,

    // THE CURRENT-PAGE BAR (Q507.1 C): 2px, Tab's bar thickness.
    'bar-height': 'border-width.thick',

    // The link ink, stepped by state. `focus-visible` takes the `focused` rung.
    'label': 'color.text.link.default',
    'label.hover': 'color.text.link.hover',
    'label.pressed': 'color.text.link.pressed',
    'label.focus-visible': 'color.text.link.focused',
    'icon': 'color.icon.link.default',
    'icon.hover': 'color.icon.link.hover',
    'icon.pressed': 'color.icon.link.pressed',
    'icon.focus-visible': 'color.icon.link.focused',
    // The bar's fill: the link icon role, stepped with the label (a non-text mark, so the 3:1 icon role). Keyed on
    // `selected` only; the bar exists on selected members only.
    'fill.selected.rest': 'color.icon.link.default',
    'fill.selected.hover': 'color.icon.link.hover',
    'fill.selected.pressed': 'color.icon.link.pressed',
    'fill.selected.focus-visible': 'color.icon.link.focused',
  },

  anatomy: {
    root: 'container',
    parts: {
      container: {
        kind: 'box',
        role: 'target',
        children: ['label', 'trailingVisual', 'bar', 'focusRing'],
        layout: { direction: 'row', align: 'center', justify: 'start', sizing: { x: 'hug', y: 'hug' } },
        gap: 'size.{size}.gap',
        note: 'The link: a row that hugs its label and any icon, with no padding and no fill.',
      },
      label: {
        kind: 'text',
        type: 'size.{size}.type.{weight}.{style}.{selection}.{state}',
        note: 'The link text in the link color. Standalone: plain at rest, underlined at hover, pressed and focus. Inline: underlined at every state. The current page stays plain at every state: the bar is its line.',
      },
      trailingVisual: {
        kind: 'slot',
        optional: true,
        presentWhen: { style: ['standalone'] },
        size: 'size.{size}.icon',
        nesting: { kind: 'swap' },
        note: 'An optional icon after the label, in the link color, such as an arrow or the external icon for a link that opens a new tab. Standalone links only; an inline link carries none.',
      },
      bar: {
        kind: 'box',
        role: 'presentation',
        paintSlots: ['fill'],
        height: 'bar-height',
        foot: true,
        presentWhen: { selection: ['selected'] },
        note: 'The current page\'s 2px bar in the link color, across the foot of the line box. Out of the flow, so the link keeps its size. Current links only.',
      },
      focusRing: {
        kind: 'absolute',
        when: 'focus-visible',
        nests: 'focus-ring',
        inset: 'ring-offset',
        strokeInset: 'ring-width',
        nesting: { kind: 'nest-fixed', variant: { surface: 'default' }, follow: ['surface'] },
        note: 'The shared focus ring, around the whole link while it has keyboard focus. It follows the surface, so an inverse link keeps a ring that reads on the dark band.',
      },
    },
    codeOnly: [
      'code delivery pending: behavior layer. The entries below are a framework-neutral behavior contract for whichever layer the project\'s developers choose.',
      'The anchor — always a real <a href> with the label text inside it; Enter activates and Space scrolls the page. With no href, render plain text: never an <a> without one, href="#", javascript:void(0) or a click handler on a div.',
      'Router integration — asChild merges the link\'s classes, ref and handlers onto the router\'s own link child, so one <a href> renders and the design system depends on no router.',
      'The external link — isExternal adds target="_blank", rel="noopener noreferrer", the trailing external icon and visually hidden "(opens in new tab)" text.',
      'The visited color — :visited uses color.text.link.visited for content and docs links, usually omitted in app navigation. Browsers allow only color properties under :visited. Figma carries no visited member.',
      'The current page — current renders aria-current="page" on the current item in a navigation and on a breadcrumb\'s last item; a visual style alone is not enough. It stays a real <a> with its href, so hover, focus and the focus ring still work. The 2px bar sits at the foot of the line box, inside it (an inset box-shadow or a positioned pseudo-element, not a border that adds height), and hover changes the color only: no underline joins the bar.',
      'The underline — text-decoration-skip-ink: auto, text-decoration-thickness: calc(var(--<root>-core-font-underline-thickness) * 1em) and text-underline-offset: calc(var(--<root>-core-font-underline-offset) * 1em), so the line clears descenders. core.font.underline.thickness and .offset are shares of the font size, emitted only when the brand sets them; unset, the var() is invalid at computed-value time and both properties fall back to auto, the same as Figma\'s AUTO. Standalone shows it at :hover, :active and :focus-visible; inline at every state.',
      'The hit-target expansion — the box is one text line tall; where the line is under 24px (x-small, 18px, and small, 21px, at the 1.5 line height), a code-side hit area (padding with a matching negative margin, or a pseudo-element) reaches 24px on both axes without moving the text around it, so a standalone link meets the 24px target. An inline link in a sentence is exempt.',
      'The skip link — "Skip to main content", the first focusable element, href="#main", visually hidden by clipping until it has focus. A pattern built from Link, not a separate component.',
      'The color transition — about 150ms on color and the underline at hover and focus; under prefers-reduced-motion it snaps.',
      'RTL — logical properties move the trailing icon to the leading edge, and directional glyphs (the arrow, the external icon) mirror.',
      'text expansion — links wrap across lines and keep the underline, and the trailing icon stays inline with the last word rather than centered on the wrapped block (Figma shows one line, so it centers there); never white-space: nowrap on a link.',
    ],
  },

  figmaProperties: {
    variantAxes: ['style', 'weight', 'size', 'surface', 'selection'],
    // The current page is a navigation link's state; an inline link in running text is never one (Q507.2 A).
    excludeCoordinates: [{ style: ['inline'], selection: ['selected'] }],
    stateAxis: { name: 'state', values: ['rest', 'hover', 'pressed', 'focus-visible'] },
    gridAxis: 'state',
    texts: { label: { part: 'label', default: 'Link text' } },
    booleans: {
      trailingIcon: { part: 'trailingVisual', figmaName: 'trailing icon', default: false },
    },
    swaps: {
      trailingIcon: { part: 'trailingVisual', figmaName: '↳ swap trailing icon' },
    },
  },

  accessibility: {
    role: 'link (a real <a href>, with the label text inside the anchor)',
    wcag: [
      '1.4.1 Use of Color (an inline link is underlined at every state, never told apart by color alone)',
      '2.4.4 Link Purpose (the link text names the destination)',
      '4.1.2 Name, Role, Value (the link role from a real anchor)',
      '1.4.3 Contrast (targets 4.5:1 for the link text against the page)',
      '1.4.11 Non-text Contrast (targets 3:1 for an icon and the current-page bar against the page)',
      '2.4.7 Focus Visible and 2.4.13 Focus Appearance (the shared focus ring)',
      '2.5.8 Target Size (targets 24px through a code-side hit area at x-small and small, whose line is shorter; an inline link in a sentence is exempt)',
      '3.2.5 Change on Request (a link that opens a new tab says so)',
      '2.4.1 Bypass Blocks (the skip link)',
    ],
    keyboard: 'Tab moves to the link; Enter follows it. Space does not activate a link: it scrolls the page.',
    focus: 'The shared focus ring at :focus-visible, so a mouse click leaves no ring behind.',
    aria: 'Usually none: the anchor and its text carry the role and the name. aria-current="page" marks the current page in a navigation, set by current; the bar shows it. A link that opens a new tab adds visually hidden "(opens in new tab)" text; the icons are aria-hidden. Where space forces generic text such as "Read more", an aria-label names the destination. The hidden text and any aria-label are translated; in right-to-left text the trailing icon moves to the leading edge and directional icons mirror.',
  },

  content: {
    labelPattern: 'Names the destination and makes sense on its own: "Shipping and returns", "Annual report (PDF, 2 MB)". Link the noun phrase, not the whole sentence. Never a bare "click here" or "learn more", and never a raw URL.',
  },

  docs: {
    usage: 'Use a link to go somewhere: another page, a place on the page, a file or another site. Use standalone on its own line and inline in body copy. For an action in place, such as submit, open a dialog or toggle, use a button. Keep x-small for dense metadata, such as an order row or a legal line, not running body text. A link inside small print is a text range with that text\'s own link style.',
    do: [
      'Write link text that names the destination',
      'State the format and size of a file link',
      'Keep opening in a new tab for narrow cases, and say so',
      'Use the inline style for a link in body copy, so it is underlined at rest',
      'Use x-small only for dense metadata, such as an order row or a legal line',
      'Mark the page the user is on in a navigation with current, which also sets aria-current="page"',
    ],
    dont: [
      'Use a link for an action that does not change the address; that is a button',
      'Make a disabled link; render plain text instead',
      'Add an icon to an inline link',
      'Set running body text in x-small',
      'Tell a link in running text apart by color alone',
      'Mark the current page with the inline style; it reads as a link in running text',
    ],
    contentGuidelines: 'Descriptive text that stands alone, sentence case. Front-load the words that name the destination. File links state format and size.',
  },

  ai: {
    primaryPurpose: 'Text that navigates to a URL, a fragment or a file, rendered as a real <a href>.',
    whenToUse: 'The interaction changes the address or the place on the page: a page, an in-page anchor, a document, another site. Standalone for a link on its own line (below a form, in a footer, beside a control); inline for a link that sits in body copy.',
    avoidWhen: 'The interaction acts in place without changing the address: submit, open a dialog, toggle, show a password (use Button, or Button.Neutral for a light look). A navigation that needs a button\'s weight, such as "Continue to checkout", is a Button given an href, which renders an <a>. Switching panels in place is Tabs.',
    commonPartners: ['icon', 'button', 'text-field', 'breadcrumbs'],
    triggerKeywords: ['link', 'text link', 'hyperlink', 'anchor', 'inline link', 'standalone link', 'skip link', 'external link', 'current page link', 'navigation link'],
    generationPriority: 2,
  },

  composition: {
    composesWith: ['focus-ring'],
    alternativeTo: ['button'],
    replacesPatterns: ['a click handler on a div or span styled as a link', 'an <a> with no href, href="#" or javascript:void(0)', 'a[role=button] used for navigation'],
    supersededBy: [],
    planned: ['menu'],
  },

  motion: {
    enter: 'None. At hover and focus the color changes over about 150ms, and a standalone link shows its underline.',
    exit: 'None.',
    reduceMotion: 'The color and underline change at once, with no transition.',
  },

  notes: {
    contested: [
      'The brief lists a quiet style (no underline, muted) and an inverse static-color style. Q289.2 A: no quiet for now; inverse is the `surface` axis, which takes the theme\'s inverse link roles rather than forced white or black.',
      'The brief lists a link-button alias. Q289.6 A: Button takes href and renders <a>, so link-button is not an alias of this component.',
    ],
    unverified: [
      'The contrast floors (4.94:1 lowest at rest on background.primary, 4.56:1 on background.secondary) were measured for the proposal from the committed emission; no gate holds Link\'s ink to them beyond the shared link roles\' own contracts.',
    ],
    evolution: [
      '2026-10-30 (#3179, owner decision D-A5 A): an x-small size at 12px, bound to type.body.xs.*, for dense metadata (the reference brand sets an order number and its Track order link at about 12px). 144 → 192 members. Revises Q297.1\'s "no 12px link". The icon stays 16px (icon.size.xs, the smallest rung, inside the 18px line). The word is x-small, Icon\'s and Spinner\'s (Q3179.1 A). The 18px line meets SC 2.5.8 through the code-side hit area, which lint-hit-target now holds by size.',
      '2026-10-21 (#2872, owner decisions Q507): a current state for navigation rows. The runtime selection axis (unselected | selected, as Tab and Tag) on standalone links only, 96 → 144 members (2 A, 3 A); a 2px bar at the foot of the line box in the link icon color (1 C); hover on the current item changes the color only, with no underline (4). The code prop is current, rendering aria-current="page". Reverses Q289.5 A for current; visited stays code only.',
      '2026-10-14 (#2580, owner decisions Q289): a standalone Link plus an inline look (1 A); style standalone | inline, standalone underlined at hover, pressed and focus, inline always (2 A); two weights, emphasis first and the default (3 B); one line tall with a code-side 24px hit area (4 A); visited and current code only (5 A); Button takes href, no LinkButton (6 A); Link / link, navigation, aliases text-link, anchor, hyperlink (7 A); the wording "Link text", "(opens in new tab)" and the summary (8 A).',
      '2026-10-14 (#2580, owner decisions Q297): the body type tier for both styles, 14 / 16 / 18px, with no 12px link (1); a trailing icon only, on standalone links only, 16px with 14px and 16px text and 20px with 18px text (2); the weight wording, with the values kept as emphasis | default (3).',
    ],
  },
};
