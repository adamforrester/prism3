/**
 * Badge — a small, static marker: a status label in the flow of text, a count over a host, or a presence
 * dot over a host. KB brief: `components/badge.md`. It is the brief's three genres (§1) — here the three
 * values of the `type` axis — as one component,
 * which is the owner's decision (2026-09-27) and the brief's contested alternative (§10, §15): the brief's
 * practice default is three sibling components (a count badge, a dot and a status label), and the owner
 * chose one component switched by props, with each type's accessibility contract carried precisely.
 *
 * ── THE OWNER'S FOUR DECISIONS (2026-09-27), and where each one lives ─────────────────────────────────
 *
 *   1. STATIC. No hover, pressed, focus or disabled of its own, no focus ring, never a link. `states: []`.
 *      Anything a user can click, toggle or remove is a Tag, which is a different component. A static
 *      keyword, category or file size ("PDF 262 KB") is a Badge.
 *   2. ONE COMPONENT, SWITCHED BY PROPS. `props.type` carries `status | count | dot`, with the self-
 *      describing value names the owner asked for (`status`, not `default`). The two accessibility
 *      contracts are in `accessibility.aria`: a count or dot is aria-hidden and its meaning is in the
 *      HOST's accessible name; a status label announces its own text.
 *   3. VISUALLY DISTINCT FROM INTERACTIVE COMPONENTS. Every color binding is a surface role
 *      (`color.foreground.*`, or its inverse twin), a text role (`color.text.*`, or its inverse twin) or,
 *      for the subtle status label's edge, a semantic border role (`color.border.<tone>`) — never
 *      `color.interactive.*`. `test.ts` holds this by name against a literal family list. `notes.contested`
 *      names what Tag must differ on.
 *   4. NO TOUCH TARGET. Not interactive, so `lint-hit-target.ts` lists it in `EXCLUDED` with that reason;
 *      a count on an icon button relies on the icon button's target.
 *
 * ── THE TYPE AXIS (owner-approved follow-up, 2026-09-27; renamed from `genre` 2026-09-28) ─────────────
 *
 * `type` is the axis name Badge shares with Tag (its case is argued in `VARIANT_AXES`). Badge carried it as
 * `genre` for a day; the owner renamed it to `type` on 2026-09-28 so the two components use one name for
 * "which kind of this component". The values are unchanged. A type changes the content
 * model, the placement and the accessibility contract together, which none of `appearance`, `style` or
 * `shape` expresses. It is the FIRST axis and `status` its first value, so Figma's default member is the
 * code default. It is an AUTHORING axis — a designer or author picks the type, and it never changes while
 * the page is open — so the box may differ across types; `tone` stays runtime, and the box holds still
 * along it.
 *
 * ONE ANATOMY, THREE SHAPES, by presence gates rather than three trees. The `surface` paints the fill in
 * every type, and its padding and its CORNER are keyed on the type (`size.{size}.{type}.pad-x`, `size.{size}.{type}.pad-y`,
 * `{type}.radius`). The status label's corner is `radius.sm` (owner decision, 2026-09-28: a smaller radius
 * that scales per brand, so a status label never reads as Tag's pill); the count and dot keep `radius.round`:
 *   · status — the `label` part, the status label, at `space.150` × `space.100`, as before.
 *   · count  — the `count` part, a number, at `space.075` × `space.025`. A single digit reads as a circle
 *     and more digits grow it into a pill, because the surface hugs its text under `radius.round`. Figma
 *     has no width-equals-height floor, so one digit is a near-circle whose exact width depends on the
 *     brand's digit advance; code sets `min-inline-size` equal to the block size (`codeOnly`).
 *   · dot    — the `dot` part, a fixed square with no paint of its own, bound to `space.100`: 8px, the inline
 *     dot's size, density-free (#3226, Q3226.1 A). The surface pads it by `space.0`, hugs it, and paints the
 *     round fill over it.
 * Two text parts rather than one, for the reason text-field has two (#1567): a bound TEXT node shows its
 * set's ONE default, so one node cannot read "Status" on some members and "3" on others.
 *
 * ── THE EMPHASIS AXIS (owner decisions, 2026-09-28) ───────────────────────────────────────────────────
 *
 * `emphasis` (`subtle | bold | surface`, default `subtle`; `surface` added on #2983) REUSES the `VARIANT_AXES`
 * name `field-label` already carries (`primary | secondary`): both answer "how prominent does this read", and
 * `lint-axis-values.ts` records the two value sets as `canonical` and `disjoint`. Only the STATUS label has every
 * emphasis. The count and dot are bold-only: `figmaProperties.excludeCoordinates` removes them at
 * `emphasis=subtle|surface` (the schema's sparse-grid field, whose first user this is).
 * It is a RUNTIME axis in `axisKinds`, the strict default, so the footprint cohort holds a subtle status
 * label and its bold twin to one box — which the inside stroke below makes true.
 *
 * ── THE SIZE AXIS AND THE SURFACE EMPHASIS (owner direction on #2983, 2026-10-24; Q2983.4–6 A) ──
 *
 * `size` (`small | medium`) gives the status label a compact size, the one commerce cards put on a product photo
 * and the one the owner expects to be used most. `medium` is today's label and the FIRST value, so Figma's default
 * member is unchanged and every existing member takes `size=medium` in place. It is AUTHORING: the two sizes
 * differ in box. Small (owner decision Q2983.5 A, 2026-10-24) is `type.caption.md.strong`, the corpus's only 11px rung, at
 * `space.025` × `space.100`, about 19px tall. The count and dot stay one size, `medium`, so
 * `excludeCoordinates` drops them at `small`. The padding and the text are keyed `size.{size}.{type}.pad-*`
 * and `size.{size}.type`, the `size.*` key family `lint-rung-names` reads.
 *
 * `emphasis` gains a third value, `surface` (owner decision Q660 A / Q2983.4 A, 2026-10-24): the page surface `background.primary`, no
 * edge, the tone's text role. It is the style for a label on any busy or mixed ground (a photo, a gradient, a
 * patterned band), because the label brings its own solid ground and its contrast never depends on what is
 * under it. It is a level of emphasis, not a tone and not a separate axis (owner direction). It shares the
 * subtle and bold box at each size (no edge, and the subtle edge is inside), so `emphasis` stays runtime.
 * Status only: the count and dot stay bold-only.
 *
 * ── THE STYLE AXIS: AN INLINE STATUS (owner decisions on #3199, 2026-10-31; Q-ST1 A, Q1–Q8 A) ─────────────
 *
 * `style` (`contained | inline`) is how a status label is drawn. `contained` is every member above: a filled label
 * with padding. `inline` is a status dot and plain text on a text line, with no fill, padding, radius or edge, as tall
 * as the line itself (24px at medium, 21px at small). Status stays ONE decision, Badge (Q-ST1 A): someone showing a
 * status reaches for Badge and only picks how it looks, rather than choosing between two components that do one job.
 * The value is `inline`, not `dot` (Q1 A), so the panel keeps one "dot", the aria-hidden `type=dot`, and "a status
 * dot" cannot resolve to the hidden type.
 *
 * It is a new AUTHORING axis, not a fourth emphasis or type (Q2 A): the inline box is a different size, so as an
 * emphasis it would cost the footprint check between a subtle label and its bold twin, and as a type it would blur
 * the axis that decides announced versus hidden. `contained` LEADS, so the code default is Figma's default member,
 * and the 40 members built before it gain `style=contained` in place: an update adds a new axis to every existing
 * member at the plan's first value, renaming each member and keeping its id (`update-plan.ts`, the coordinate
 * canonicalization). Nothing leaves the projection, so `COMPONENT_RENAMES` has no entry to carry.
 * `excludeCoordinates` keeps `inline` off the count and dot and off bold and surface, so the inline members are
 * 5 tones × 2 sizes at `type=status, emphasis=subtle`, and the set is 50.
 *
 * THE GEOMETRY (Q4 A, Q6 A). The root is a top-aligned row with no padding (`space.0`), no corner (`radius.none`)
 * and no paint, so its height is the label's line box. The label takes the body roles at the default weight,
 * `type.body.md.default` and `type.body.sm.default`, so it matches the copy around it. The dot leads, in `dotCell`:
 * a box one line box tall (`type.body.{rung}.line-box`, fixed) that centers the 8px `statusDot` (`space.100`, 8px
 * in every example brand). So a wrapping label keeps the dot on its first line, the construction the checkbox
 * row's `controlCell` uses (#1201). The gap is `space.100` at medium and `space.075` at small.
 *
 * THE PAINT (Q3 A, Q5 A, Q7 A). The label is `text.primary` in every tone: it is part of the sentence, and the dot
 * carries the tone. The dot is `icon.<tone>` (neutral `icon.secondary`), the graphic role for a graphic, never a
 * text role (#1471). The label carries the meaning, so WCAG 1.4.11 does not require 3:1 for the dot; it holds 3:1
 * against `background.primary`, `background.secondary`, `foreground.primary` and `foreground.raised` in every mode
 * anyway, as gated design intent (`test.ts`, lowest 3.16:1). The label holds 4.5:1 against the same four (14.05:1).
 *
 * ── THE PAINT ─────────────────────────────────────────────────────────────────────────────────────────
 *
 * ONE GRAMMAR, `{tone}.{type}.{style}.{emphasis}.{slot}`, with no fallback template: every member names its own
 * fill, label and edge, so a missing key is a hole `lint-paint` reports rather than a coordinate that
 * silently paints another member's colors. `{style}` joined the grammar with the inline style (#3199): an inline
 * member sits at `emphasis=subtle`, so without it the inline root would resolve the subtle label's fill and edge.
 * The inline dot paints through the `indicator` slot, the radio dot's, so it never shares the root's `fill`.
 *
 * SURFACE (status only, #2983): the page surface `background.primary` under `text.<tone>` (neutral: `text.primary`),
 * no edge. Those are the page's text inks, so each pair is the one `modes.ts` contracts for body text on the
 * page; the lowest across the corpus is 4.94:1. On a card the fill barely separates (at most 1.22:1 against
 * `foreground.primary`), so there the label reads as tone-colored text, which is intended.
 *
 * SUBTLE (status only): the tone's subtle tint `foreground.<tone>-subtle` under `text.<tone>` — the pair
 * `modes.ts` contracts at 4.5:1 in every mode — with a 1px edge in the tone's border role `border.<tone>`.
 * Neutral is `foreground.secondary` under `text.primary`, edged in `border.tertiary`. The tints measure
 * 1.06–1.40:1 against `background.primary` (the neutral 1.00:1 in both high-contrast modes), so the tint
 * alone gives the pill no shape; the edge does: `border.<tone>` measures at least 3.75:1 against the page
 * and `border.tertiary` at least 3:1 against every page and surface tier, contracted in every mode (#1735; the
 * neutral edge moved off `border.secondary` when that rung became decorative, #2569). The edge is `border-width.hairline`
 * on the surface's own stroke, and both executors draw a stroke INSIDE the node's bounds, so a subtle member
 * is exactly the size of its bold twin.
 *
 * BOLD (status, count and dot): the solid tone fill `foreground.<tone>` under `text.on-<tone>` — the pair
 * the engine contracts for a bold fill — and no edge. Bold neutral is the inverse surface
 * `inverse.foreground.tertiary` under `inverse.text.primary`: no neutral page surface separates from the page
 * in the high-contrast modes, so a visible bold neutral needs an inverse ink. Every bold fill clears 3:1
 * against the page in every example brand and mode (lowest 3.46:1, `foreground.danger`).
 *
 * `test.ts` gates all of it with literals: text on its fill at 4.5:1 for every emphasis × tone × text-bearing
 * type, the subtle edge against the page at 3:1, and every bold fill against the page at 3:1, in 20 brand ×
 * mode cells each.
 */
import { ComponentDef } from '../component-schema';

export const badge: ComponentDef = {
  id: 'badge',
  name: 'Badge',
  aliases: ['status-badge', 'counter-badge', 'notification-badge', 'notification-dot', 'presence-badge', 'label', 'counter', 'state-label'],
  category: 'foundations',
  status: 'draft',
  summary: 'A static status label, count or dot. Nothing to click, and color is never the only signal.',
  description:
    'A small, static marker of one of three types. A status label is short text in the flow of content, such as a lifecycle state, a keyword or a file size, and it announces its own text. A count is a number over a host, such as unread messages on an icon button, capped at a maximum. A dot is a contentless mark over a host for presence or unread state. A count or dot is hidden from assistive technology, and its meaning goes in the host\'s accessible name. A badge has no hover, focus or pressed state. Anything a user can click, toggle or remove is a tag.',

  props: [
    { name: 'type', type: "enum: 'status' | 'count' | 'dot'", values: ['status', 'count', 'dot'], default: 'status', required: false, description: 'Which kind of badge. status = a short label in flow that announces its own text. count = a number over a host, hidden from assistive technology. dot = a contentless mark over a host, also hidden. For a count or dot, the host carries the meaning in its accessible name.' },
    { name: 'style', type: "enum: 'contained' | 'inline'", values: ['contained', 'inline'], default: 'contained', required: false, description: 'How a status label is drawn. contained = a filled label with padding, in the chosen emphasis. inline = a dot and plain text on the text line, as tall as the line, for running text, list rows and cards. A count and a dot are always contained.' },
    { name: 'size', type: "enum: 'small' | 'medium'", values: ['small', 'medium'], default: 'medium', required: false, description: 'The status label\'s size. medium = 12px text, about 30px tall, when contained; 16px text on a 24px line when inline. small = 11px text, about 19px tall, when contained; 14px text on a 21px line when inline, for dense layouts such as a label on a product card. A count and a dot come in medium only.' },
    { name: 'emphasis', type: "enum: 'subtle' | 'bold' | 'surface'", values: ['subtle', 'bold', 'surface'], default: 'subtle', required: false, description: 'How a status label reads. subtle = the tone\'s tint with a 1px edge in the tone\'s border color, for a state that sits beside other content. bold = the solid tone fill, for a state that needs to stand out. surface = the page color with the tone\'s text and no edge, for a label on a photo or any busy ground, where it brings its own background. A count and a dot are always bold.' },
    { name: 'tone', type: "enum: 'neutral' | 'info' | 'success' | 'warning' | 'danger'", values: ['neutral', 'info', 'success', 'warning', 'danger'], default: 'neutral', required: false, description: 'Which semantic role the badge paints from. The text carries the meaning, so a tone never stands in for it.' },
    { name: 'label', type: 'string', required: false, description: 'The status text, for type status. One or two words when contained; inline, it can name the whole state. Consistent casing across the product.' },
    { name: 'value', type: 'number', required: false, description: 'The count, for type count. Above max it shows as max followed by a plus sign, formatted for the locale.' },
    { name: 'max', type: 'number', default: 99, required: false, description: 'The largest count shown in full, for type count. A larger value shows as "99+".' },
    { name: 'showZero', type: 'boolean', default: false, required: false, description: 'Whether a count of zero still shows, for type count. Hidden by default, since zero is usually nothing to act on.' },
    { name: 'overlap', type: "enum: 'rectangular' | 'circular'", values: ['rectangular', 'circular'], default: 'rectangular', required: false, description: 'The host shape a count or dot sits over. circular pulls the badge in toward the curve so it stays on the host\'s edge, such as an avatar.' },
  ],

  states: [],
  // `type` first, `status` first within it: Figma's default member is the set's first child, so the
  // Figma default is the code default (#1699). `emphasis` keeps `subtle` first and `tone` keeps `neutral`
  // first for the same reason.
  variants: {
    type: ['status', 'count', 'dot'],
    // `contained` first (#3199): the code default and every member built before it, so each keeps its place.
    style: ['contained', 'inline'],
    // `medium` first: it is the code default and today's label, so every existing member keeps its place (#2983).
    size: ['medium', 'small'],
    emphasis: ['subtle', 'bold', 'surface'],
    tone: ['neutral', 'info', 'success', 'warning', 'danger'],
  },
  // WHEN each axis changes (#1611): a status label's tone moves live (a build going from running to
  // failed), so `tone` is runtime, and the box must not move when it does — the text and padding are
  // the same in every tone. `type` is chosen when the badge is placed and never changes on screen, so it
  // is authoring, and the three types may differ in size. `emphasis` is RUNTIME, the strict default: a
  // subtle status label and its bold twin share one footprint cohort, so the build reports any difference
  // in box size between them. The inside stroke keeps them equal.
  // `size` is authoring for the same reason as `type`: it is picked when the badge is placed, and the two sizes
  // differ in box. `surface` joins `emphasis` without changing its kind: it has no edge, and the subtle edge is
  // inside, so all three emphases share one box at each size (#2983).
  // `style` is authoring (#3199, Q2 A): it is picked when the label is placed and never flips on screen, and the inline
  // box differs from the contained one, so it takes its own footprint cohort and the subtle/bold check stays whole.
  axisKinds: { type: 'authoring', style: 'authoring', size: 'authoring', emphasis: 'runtime', tone: 'runtime' },

  paintKeys: ['{tone}.{type}.{style}.{emphasis}.{slot}'],
  // The small label's caption rung names its weight by INTENT (#2983): `strong` is the default brand's bold caption,
  // and a brand that ships its bold caption under another role (`emphasis`) is repointed before projection.
  typeWeight: { group: 'caption', intent: 'bold' },

  tokens: {
    // The label type, per size (#2983). Medium is the status label's original rung. Small is the corpus's only
    // 11px rung (owner decision Q2983.5 A, 2026-10-24); it is a caption rung, and a label rung at 11px would be a new token name.
    'size.medium.contained.type': 'type.label.sm.emphasis',
    'size.small.contained.type': 'type.caption.md.strong',
    // The inline label (#3199, Q4 A): the body roles at the default weight, so it reads as part of the sentence it sits in.
    'size.medium.inline.type': 'type.body.md.default',
    'size.small.inline.type': 'type.body.sm.default',
    // ── GEOMETRY, per type. The CORNER is per type (owner decision, 2026-09-28): the status label takes the
    // tier's small radius, `radius.sm` (2px in nb and prism3, 4px in aurora — it scales per brand), so a status
    // label reads as a label and never as Tag's pill; the count and the dot stay fully round, `radius.round`,
    // because a one-digit count is a circle that grows into a pill and the dot IS a circle.
    'contained.status.radius': 'radius.sm',
    'contained.count.radius': 'radius.round',
    'contained.dot.radius': 'radius.round',
    // The inline style has no corner (#3199): it has no ground to round. The count and dot have no inline member, but
    // the template is checked over the full grid.
    'inline.status.radius': 'radius.none',
    'inline.count.radius': 'radius.none',
    'inline.dot.radius': 'radius.none',
    // The surface hugs its content, so the padding pair is the rest of the shape: a small-radius label around
    // the status text, a near-circle around one digit that grows into a pill, and nothing around the dot's
    // fixed square.
    // Keyed on the size too (#2983). The count and dot exist at medium only.
    'size.medium.contained.status.pad-x': 'space.150',
    'size.medium.contained.status.pad-y': 'space.100',
    'size.small.contained.status.pad-x': 'space.100',
    'size.small.contained.status.pad-y': 'space.025',
    'size.medium.contained.count.pad-x': 'space.075',
    'size.medium.contained.count.pad-y': 'space.025',
    'size.medium.contained.dot.pad-x': 'space.0',
    'size.medium.contained.dot.pad-y': 'space.0',
    // The count and dot have no small member (`excludeCoordinates`), but the padding template is checked over the
    // full grid, so their small keys repeat the medium rungs.
    'size.small.contained.count.pad-x': 'space.075',
    'size.small.contained.count.pad-y': 'space.025',
    'size.small.contained.dot.pad-x': 'space.0',
    'size.small.contained.dot.pad-y': 'space.0',
    // The inline style has no padding (#3199): its height is the label's line box, so it sits in a body line without
    // moving it. Only the status has inline members; the count and dot keys fill the grid.
    'size.medium.inline.status.pad-x': 'space.0',
    'size.medium.inline.status.pad-y': 'space.0',
    'size.small.inline.status.pad-x': 'space.0',
    'size.small.inline.status.pad-y': 'space.0',
    'size.medium.inline.count.pad-x': 'space.0',
    'size.medium.inline.count.pad-y': 'space.0',
    'size.small.inline.count.pad-x': 'space.0',
    'size.small.inline.count.pad-y': 'space.0',
    'size.medium.inline.dot.pad-x': 'space.0',
    'size.medium.inline.dot.pad-y': 'space.0',
    'size.small.inline.dot.pad-x': 'space.0',
    'size.small.inline.dot.pad-y': 'space.0',
    // The gap between the inline dot and its label (#3199): `space.100` at medium, `space.075` at small. A contained
    // badge holds one child, so its gap is `space.0` and never shows.
    'size.medium.contained.gap': 'space.0',
    'size.small.contained.gap': 'space.0',
    'size.medium.inline.gap': 'space.100',
    'size.small.inline.gap': 'space.075',
    // The inline dot's cell, one line box of the label tall (#3199), so the dot centers on the first line.
    'size.medium.dot-cell': 'type.body.md.line-box',
    'size.small.dot-cell': 'type.body.sm.line-box',
    // The inline dot (#3199, Q6 A): 8px at both sizes, `space.100` (8px in every example brand), and round.
    'status-dot-size': 'space.100',
    'status-dot.radius': 'radius.round',
    // The dot's diameter (#3226, Q3226.1 A): 8px, `space.100`, the inline dot's size, density-free.
    'dot-size': 'space.100',

    // The subtle status label's edge: the tier's 1px border width, drawn inside the pill.
    'border-width': 'border-width.hairline',

    // ── STATUS, SUBTLE: the tone's tint, the tone's text ink, and a 1px edge in the tone's border role.
    'neutral.status.contained.subtle.fill': 'color.foreground.secondary',
    'neutral.status.contained.subtle.label': 'color.text.primary',
    // `border.tertiary`, the first neutral edge contracted at the non-text bar on every ground (#2569). It is the
    // pill's only boundary, so it needs 3:1; `border.secondary` is decorative (~2:1) and must not carry it.
    'neutral.status.contained.subtle.border': 'color.border.tertiary',
    'info.status.contained.subtle.fill': 'color.foreground.info-subtle',
    'info.status.contained.subtle.label': 'color.text.info',
    'info.status.contained.subtle.border': 'color.border.info',
    'success.status.contained.subtle.fill': 'color.foreground.success-subtle',
    'success.status.contained.subtle.label': 'color.text.success',
    'success.status.contained.subtle.border': 'color.border.success',
    'warning.status.contained.subtle.fill': 'color.foreground.warning-subtle',
    'warning.status.contained.subtle.label': 'color.text.warning',
    'warning.status.contained.subtle.border': 'color.border.warning',
    'danger.status.contained.subtle.fill': 'color.foreground.danger-subtle',
    'danger.status.contained.subtle.label': 'color.text.danger',
    'danger.status.contained.subtle.border': 'color.border.danger',

    // ── STATUS, BOLD: the solid tone fill and the ink the engine contracts on it; neutral is the inverse
    // surface and its ink. No edge.
    'neutral.status.contained.bold.fill': 'color.inverse.foreground.tertiary',
    'neutral.status.contained.bold.label': 'color.inverse.text.primary',
    'info.status.contained.bold.fill': 'color.foreground.info',
    'info.status.contained.bold.label': 'color.text.on-info',
    'success.status.contained.bold.fill': 'color.foreground.success',
    'success.status.contained.bold.label': 'color.text.on-success',
    'warning.status.contained.bold.fill': 'color.foreground.warning',
    'warning.status.contained.bold.label': 'color.text.on-warning',
    'danger.status.contained.bold.fill': 'color.foreground.danger',
    'danger.status.contained.bold.label': 'color.text.on-danger',

    // ── STATUS, SURFACE (#2983): the page surface under the tone's text role, no edge. Neutral inks with the
    // primary text. Each pair is page text on the page.
    'neutral.status.contained.surface.fill': 'color.background.primary',
    'neutral.status.contained.surface.label': 'color.text.primary',
    'info.status.contained.surface.fill': 'color.background.primary',
    'info.status.contained.surface.label': 'color.text.info',
    'success.status.contained.surface.fill': 'color.background.primary',
    'success.status.contained.surface.label': 'color.text.success',
    'warning.status.contained.surface.fill': 'color.background.primary',
    'warning.status.contained.surface.label': 'color.text.warning',
    'danger.status.contained.surface.fill': 'color.background.primary',
    'danger.status.contained.surface.label': 'color.text.danger',

    // ── COUNT, BOLD ONLY: the status label's bold pair.
    'neutral.count.contained.bold.fill': 'color.inverse.foreground.tertiary',
    'neutral.count.contained.bold.label': 'color.inverse.text.primary',
    'info.count.contained.bold.fill': 'color.foreground.info',
    'info.count.contained.bold.label': 'color.text.on-info',
    'success.count.contained.bold.fill': 'color.foreground.success',
    'success.count.contained.bold.label': 'color.text.on-success',
    'warning.count.contained.bold.fill': 'color.foreground.warning',
    'warning.count.contained.bold.label': 'color.text.on-warning',
    'danger.count.contained.bold.fill': 'color.foreground.danger',
    'danger.count.contained.bold.label': 'color.text.on-danger',

    // ── DOT, BOLD ONLY: the count's fill, and no text.
    'neutral.dot.contained.bold.fill': 'color.inverse.foreground.tertiary',
    'info.dot.contained.bold.fill': 'color.foreground.info',
    'success.dot.contained.bold.fill': 'color.foreground.success',
    'warning.dot.contained.bold.fill': 'color.foreground.warning',
    'danger.dot.contained.bold.fill': 'color.foreground.danger',

    // ── STATUS, INLINE (#3199): no fill and no edge. The label is `text.primary` in every tone (Q3 A); the dot is the
    // tone's icon role, neutral `icon.secondary` (Q5 A), painted through the `indicator` slot.
    'neutral.status.inline.subtle.label': 'color.text.primary',
    'neutral.status.inline.subtle.indicator': 'color.icon.secondary',
    'info.status.inline.subtle.label': 'color.text.primary',
    'info.status.inline.subtle.indicator': 'color.icon.info',
    'success.status.inline.subtle.label': 'color.text.primary',
    'success.status.inline.subtle.indicator': 'color.icon.success',
    'warning.status.inline.subtle.label': 'color.text.primary',
    'warning.status.inline.subtle.indicator': 'color.icon.warning',
    'danger.status.inline.subtle.label': 'color.text.primary',
    'danger.status.inline.subtle.indicator': 'color.icon.danger',
  },

  anatomy: {
    root: 'surface',
    parts: {
      surface: {
        kind: 'box',
        role: 'target',
        paintSlots: ['fill', 'border'],
        // TOP-aligned on the cross axis (#3199): an inline label that wraps keeps its dot on the first line. A contained
        // badge holds one child in a box that hugs it, so the alignment does not move it.
        layout: { direction: 'row', align: 'start', justify: 'center', sizing: { x: 'hug', y: 'hug' } },
        gap: 'size.{size}.{style}.gap',
        padding: { block: 'size.{size}.{style}.{type}.pad-y', inlineLabel: 'size.{size}.{style}.{type}.pad-x' },
        radius: '{style}.{type}.radius',
        strokeWidth: 'border-width',
        children: ['dotCell', 'label', 'count', 'dot'],
        note: 'The badge body, sized by what it holds: a small-radius label around a status text, a circle around one digit that grows into a pill, or the round dot itself. A subtle status label is the tone\'s tint with a 1px edge in the tone\'s border color, drawn inside the edge so it adds no size. A bold badge is the solid tone fill with no edge. Neither paints an interactive color. In the inline style it paints nothing and has no padding: a dot and the label on one text line, as tall as the line.',
      },
      // THE INLINE DOT'S CELL (#3199): one line box of the label tall, fixed, centering the dot. The root is top-aligned,
      // so a wrapping label holds the dot on its first line (the checkbox row's `controlCell`, #1201). Draws nothing.
      dotCell: {
        kind: 'box',
        role: 'presentation',
        height: 'size.{size}.dot-cell',
        layout: { direction: 'row', align: 'center', justify: 'center', sizing: { x: 'hug', y: 'fixed' } },
        presentWhen: { style: ['inline'] },
        children: ['statusDot'],
        note: 'A cell one line of the label tall, at the start of an inline status. It centers the dot on the first line, so the dot stays there when the label wraps.',
      },
      // THE INLINE DOT (#3199): 8px, round, in the tone's icon role. Decorative: aria-hidden in code, with no role or name.
      statusDot: {
        kind: 'box',
        role: 'presentation',
        size: 'status-dot-size',
        radius: 'status-dot.radius',
        paintSlots: ['indicator'],
        layout: { direction: 'row', align: 'center', justify: 'center', sizing: { x: 'fixed', y: 'fixed' } },
        presentWhen: { style: ['inline'] },
        note: 'The 8px status dot, in the tone\'s icon color. It repeats what the label says and is hidden from assistive technology.',
      },
      label: {
        kind: 'text',
        type: 'size.{size}.{style}.type',
        presentWhen: { type: ['status'] },
        note: 'The status text in the tone\'s text role. It carries the meaning, so the tone is never the only signal. In the inline style it is body text in the primary text color, and the dot carries the tone.',
      },
      count: {
        kind: 'text',
        // Medium and contained only: the count has no small or inline member (#2983, #3199), so its type is not keyed on either.
        type: 'size.medium.contained.type',
        presentWhen: { type: ['count'] },
        note: 'The number, in the ink paired with the bold tone fill. Capped as the maximum followed by a plus sign, as in "99+".',
      },
      dot: {
        kind: 'box',
        role: 'presentation',
        size: 'dot-size',
        layout: { direction: 'row', align: 'center', justify: 'center', sizing: { x: 'fixed', y: 'fixed' } },
        presentWhen: { type: ['dot'] },
        note: 'The dot\'s fixed square, about 8px. It paints nothing itself: the badge around it has no padding for this type, so the pill\'s round fill is the dot.',
      },
    },
    codeOnly: [
      'the overlay rules for a count or dot — a count hides at zero unless showZero, caps as max followed by a plus sign, and sets min-inline-size equal to its block size so one digit is an exact circle (Figma has no width-equals-height floor, so the member approximates it with padding). Over a host, both carry a stroke in the canvas color that separates them from the host; the Figma count and dot members carry no stroke, since that one exists only against a host.',
      'the overlay placement — a count or dot is positioned against its host from a wrapper that owns the stacking context, so a host with overflow hidden does not clip it. Inset uses inset-inline-end so it mirrors in right-to-left layouts. circular overlap pulls the badge in by about 14.6% of the host size, onto the curve.',
      'the accessible-name wiring — for a count or dot the badge is aria-hidden and the host composes the meaning into its own name ("Inbox, 3 unread messages"). A count that changes after render is announced through one shared polite live region, debounced, never one region per badge. None of this has a Figma expression.',
      'number formatting — the count and its cap render through Intl.NumberFormat, so a locale with different digits or grouping reads correctly.',
      'the inline style in code — the root is display: inline-flex with align-items: flex-start, so it sits in a text line and a wrapping label keeps the dot on its first line; the dot cell is one line box tall and centers the dot. The dot is aria-hidden="true" with no role and no accessible name, and the label is not hidden and takes no role="status". The dot carries a transparent 1px inset outline, so it draws as a circle in the system color in forced-colors mode. emphasis is ignored when style is inline. The row mirrors in right-to-left layouts, the dot leading.',
      'The edge sits inside the box — subtle and bold badges are one size. In Figma it is an inside stroke; in code an inset outline (outline: 1px solid; outline-offset: -1px), never a border, which would make a subtle badge 2px larger than its bold twin. An outline also survives forced-colors mode, where the browser removes background fills, so a subtle status label keeps its shape there in the system border color. A bold badge (status, count or dot) carries the same inset outline in transparent: invisible everywhere else, and drawn in the system color in forced-colors mode, so every badge keeps its shape there.',
    ],
  },

  figmaProperties: {
    variantAxes: ['type', 'style', 'size', 'emphasis', 'tone'],
    // The count and dot are bold-only (owner decision, 2026-09-28) and medium-only (#2983), and the inline style is the
    // status label's alone, at subtle, its one remaining emphasis coordinate (#3199, Q2 A): 3 × 2 × 2 × 3 × 5 = 180
    // coordinates. The contained status label keeps 30, the count and dot 5 each (contained, medium, bold), and the
    // inline status label 10 (5 tones × 2 sizes), so 50.
    excludeCoordinates: [
      { type: ['count', 'dot'], emphasis: ['subtle', 'surface'] },
      { type: ['count', 'dot'], size: ['small'] },
      { type: ['count', 'dot'], style: ['inline'] },
      { style: ['inline'], emphasis: ['bold', 'surface'] },
    ],
    texts: {
      label: {
        part: 'label',
        default: 'Status',
      },
      value: {
        part: 'count',
        default: '3',
      },
    },
    swaps: {},
    booleans: {},
  },

  accessibility: {
    role: 'none. A status label is plain text and announces itself; a count or dot is aria-hidden and its meaning is in the host\'s accessible name.',
    wcag: [
      '1.4.1 Use of Color (the text carries the meaning; a tone, or a dot, is never the only signal)',
      '1.4.3 Contrast (the label ink clears 4.5:1 on its own fill, measured in every mode of the example brands; an inline label clears 4.5:1 against the page and card surfaces)',
      '1.4.11 Non-text Contrast (applies to the dot, which has no text, so the colored circle is the information: its bold fill clears 3:1 against the page, measured in every mode of the example brands. For a status label or count the text carries the meaning, and the separation from the page is design intent rather than a 1.4.11 requirement: the subtle label\'s 1px edge and every bold fill clear 3:1 against the page in the same measurement. The same holds for the inline style\'s dot: its label says the same thing, so 1.4.11 does not require 3:1, and the dot clears 3:1 against the page and card surfaces as design intent)',
      '4.1.2 Name, Role, Value (a count or dot joins its host\'s accessible name, so the host says what it means)',
      '4.1.3 Status Messages (a count that changes after render reaches assistive technology through a polite live region)',
    ],
    keyboard: 'None. A badge takes no focus and has no action. A count on an icon button is reached through the button.',
    focus: 'Never focusable, and no focus ring. The host carries focus.',
    aria: 'Status label: not aria-hidden, and no role of its own. It reads as text in place, so it must not be given role="status". Inline style: the dot is aria-hidden="true", with no role and no accessible name, and the label reads as plain text in place, with no role="status". Count and dot: aria-hidden="true", and the host composes the meaning into its accessible name, as in "Inbox, 3 unread messages" or "Maya, online". A dot needs that text in the host name. Never describe it by color, as in "red dot". A count that changes while the page is open is announced through one shared polite live region.',
  },

  content: {
    labelPattern: 'Status label: one or two words when contained, the whole state when inline, in the same casing everywhere ("In review", "Failed", "PDF 262 KB"; inline, "Out of stock at this location"). Count: a number, capped ("99+"). Dot: no text on screen. The host names what it means ("3 unread messages", "Online").',
  },

  docs: {
    usage: 'Use a status label to show a state or attribute next to what it describes, such as a lifecycle state beside a title or a keyword on a card. Use a count over a host for an accumulation the user can act on, such as unread messages. Use a dot when the exact number is unknown or does not matter, such as presence on an avatar. A status label is subtle by default; use bold when the state has to stand out from the content around it, such as a failure in a list of passing builds. Use surface for a label on a photo or any busy ground, such as "Selling fast" on a product image. Use small where space is tight, such as on a product card. Keep it static. If it needs to be clicked, toggled or removed, it is a tag. Use the inline style when the status sits in running text, a list or table row, or the details of a store or product card, where a container would break up the line. It is as tall as the text beside it (24px at medium, 21px at small), so the row keeps its height. Use a contained style when the label has to read as an object of its own: on a card header, a media tile or beside a page title. On a photo or busy ground use the contained surface emphasis, since the inline style has no ground of its own.',
    do: [
      'Put the meaning of a count or dot in the host\'s accessible name',
      'Cap a count, as in "99+", and hide it at zero unless zero matters',
      'Keep a contained label to one or two words, and use the same casing everywhere',
      'Pair every tone with text that says the same thing',
      'Use the inline style for status in a sentence, a list row, a table cell or a store card',
      'Write the whole state in the label ("Out of stock at this location"). It wraps, and the dot stays on the first line',
      'Keep one style per list, so rows scan as a column',
    ],
    dont: [
      'Make a badge clickable, selectable or removable. That is a tag.',
      'Use a badge for feedback about an action. That is a toast or a banner.',
      'Rely on the tone or a dot alone to carry meaning',
      'Put more than one count or dot on one host',
      'Put an inline status on a photo or a busy ground. Use the surface emphasis there',
      'Use an inline status without a label. A dot on its own over a host is the dot type, and its meaning goes in the host\'s name',
      'Mix inline and contained styles for the same state in one view',
    ],
    contentGuidelines: 'Name the state, not the color: "Failed", not "Red". Use the same word for the same state everywhere, and keep it short enough to read at a glance. For a count, show the number up to the cap and the cap followed by a plus sign above it ("99+"). For a count or dot, write the host\'s accessible name so it says what the badge shows ("Notifications, 5 new"), since the badge itself is not read. Name the state in the words a reader would use: "In stock", "Low stock", "Out of stock at this location". The label carries the meaning and the dot repeats it, so the label can run longer than a contained label\'s one or two words.',
  },

  ai: {
    primaryPurpose: 'Mark a status, count or presence with a small static badge that nobody clicks.',
    whenToUse: 'A short state or attribute shown next to what it describes (status), an actionable number over an icon button or tab (count), or presence or unread state over an avatar or nav item (dot). Inline style: a status inside running text, a list or table row, or a card\'s details, where a filled label would break up the line.',
    avoidWhen: 'The user can click, toggle or remove it (use a tag), the message is feedback about an action (use a toast or banner), or the color would be the only signal.',
    // `tab` moved here from `planned` when it was built (#2416): a tab nests a count badge.
    commonPartners: ['icon-button', 'button', 'tab-item'],
    triggerKeywords: ['badge', 'status badge', 'status label', 'counter badge', 'count badge', 'notification badge', 'notification dot', 'unread count', 'presence dot', 'label', 'pill label'],
    generationPriority: 3,
  },

  composition: {
    composesWith: [],
    // `tag` moved here from `planned` when it was built (2026-09-27): the interactive alternative.
    alternativeTo: ['tag', 'banner'],
    planned: ['avatar'],
    replacesPatterns: ['a hand-drawn colored pill', 'a red circle with a number drawn over an icon'],
  },

  motion: {
    enter: 'A count or dot scales in from zero, from the corner it is anchored to. When a count changes, only the number animates, not the pill. A status label appears with no motion. A dot pulses only for a critical alert.',
    exit: 'A count or dot scales out to its anchor corner.',
    reduceMotion: 'Under prefers-reduced-motion every change is instant: no scale, no pulse.',
  },

  notes: {
    contested: [
      'One component or three. The brief\'s practice default is three siblings (count badge, dot, status label: Fluent, Primer); the owner chose one component switched by `type` (2026-09-27, the axis first named `genre`), which is the brief\'s contested alternative (MUI, Ant). The cost the brief names is real: the accessibility contract differs by type (hidden overlay vs announced label), so `accessibility.aria` states both, and a consumer must pick the type deliberately rather than inherit a default. `type` defaults to `status` because that is the only type that needs no host.',
      'THE HOOK FOR THE TAG LANE: what Tag must differ on, so the two never read alike at rest. (1) Tag binds the `color.interactive.*` family; Badge never does, and `test.ts` holds that. (2) Tag has states (hover, pressed, focus-visible, disabled, and selected where it toggles); Badge has none. (3) Tag carries a 44px touch target; Badge is excluded from `lint-hit-target.ts`. (4) Tag shows an affordance at rest — a boundary stroke, a remove control, or both — where Badge is always FILLED: a tone tint with a 1px edge in the tone\'s border color (subtle), or a solid tone fill (bold), and never an interactive color. Which at-rest cue Tag uses is the Tag lane\'s design call, and the one thing it may not do is look like this badge. Since 2026-09-28 the shapes differ too: the status label takes the small radius (`radius.sm`) and Tag keeps the pill (`radius.round`). (5) Tag\'s remove control is its own × glyph in a square slot; Badge nests nothing.',
      'Whether the status label belongs here or in Tag. The brief records the field split: MUI, Ant and Carbon fold the status label into Chip or Tag; Fluent, Primer and Polaris ship it as its own badge or label. The owner put it here (static means Badge), and the Badge-or-Tag test is interactivity: if it has an action, a remove control or a selected state, it is a Tag.',
      'Hide at zero by default (`showZero: false`), per the brief; some systems show "0" for a count the user has just cleared. Kept as the brief states it.',
    ],
    unverified: [
      'The circular-overlap inset of about 14.6%, from the brief, derived from a circle\'s geometry (1 − 1/√2, halved). Not measured against any shipping system here.',
      'The count member\'s circle at one digit is an approximation: `space.075` inline padding around one digit against `space.025` block padding around the label line. It is about 1px off square in the example brands\' fonts by arithmetic, and has not been measured on a live Figma host.',
    ],
    evolution: [
      'The `genre` variant axis (owner-approved, 2026-09-27): the count and dot project to Figma beside the status label, fifteen members at the time. Before it, the count and dot existed in code only.',
      'The axis is renamed `genre` → `type` (owner, 2026-09-28), so Badge and Tag use one name for which kind of the component a member is. The values (`status | count | dot`) are unchanged; the prop, the paint keys, the padding and corner keys and the Figma variant property move with it.',
      'Bold tone fills for the count and dot (owner-approved with the genre axis): `foreground.<tone>` under `text.on-<tone>`, with the bold neutral on the inverse surface `inverse.foreground.tertiary` under `inverse.text.primary`.',
      'The `emphasis` axis (owner decisions, 2026-09-28): the status label comes in `subtle` and `bold`, and the count and dot stay bold-only, so the Figma set is twenty members through `figmaProperties.excludeCoordinates`. This replaces the first fix for the invisible neutral, which painted every neutral status label with the bold inverse fill and made it the loudest status label on the page.',
      'The subtle tints separate by their edge (#1735, owner decision 2026-09-28). The tone tints measure 1.06–1.40:1 against the page and the neutral tint 1.00:1 in both high-contrast modes, so the tint alone gave the pill no shape. The subtle status label now carries a 1px edge in the tone\'s border role, at least 3.75:1 against the page (`border.tertiary` for neutral, at least 3:1 on every page and surface tier since #2569, when `border.secondary` became a decorative rung), and the tint is no longer held to 3:1.',
      'The status label\'s corner is the small radius, `radius.sm` (owner decision, 2026-09-28): 2px in nb and prism3, 4px in aurora, so it scales per brand. The count and the dot stay `radius.round`. Before it every type was a pill, and a subtle status label with its 1px edge read close to Tag\'s outlined pill.',
      'A leading icon on the status label, as the brief allows, painted from the tone\'s icon role.',
      'A `size` axis, `small | medium`, for the status label (owner direction on #2983, 2026-10-24): small is 11px text at 2px × 8px padding, about 19px tall. The count and dot stay medium. A large size, or a small count, once a host needs one.',
      'A third emphasis, `surface` (owner decision on #2983, 2026-10-24): the page surface with the tone\'s text and no edge, for a label on a photo or any busy ground. It replaces a separate `surface: default | media` axis drafted first, which the owner turned down: the style is an emphasis level, and its name must not say "media".',
      'An inline style, `style: contained | inline` (owner decisions on #3199, 2026-10-31, Q-ST1 A and Q1–Q8 A): a status dot and plain body text on a text line, with no fill, padding, radius or edge, as tall as the line. The label is `text.primary`; the dot is `icon.<tone>` (neutral `icon.secondary`) at `space.100`, centered in a cell one line box tall. Spectrum ships the same look as a separate Status light; Carbon treats it as a status-indicator pattern apart from Tag; Polaris, GOV.UK and Atlassian have no inline form. The owner kept it inside Badge so a status choice is never a fork between two components. The 40 contained members gained `style=contained` in place.',
    ],
  },
};
