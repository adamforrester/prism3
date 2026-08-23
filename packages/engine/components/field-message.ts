/**
 * FieldMessage — the small icon + caption that sits BELOW a field and carries helper
 * guidance or a validation result (KB text-field brief §2 "Helper / description text" +
 * "Error / validation message", §6, §7). This is the Prism3 successor to Prism2's reused
 * "Helper message" sub-component: one part, a `tone` axis, shared across the whole form
 * family (TextField now; Select / Checkbox-group / NumberField later) rather than
 * re-declared per host.
 *
 * Why it's its own ComponentDef (not a slot): unlike an Icon, it BINDS tokens of its own
 * and its meaning changes with state — each tone re-points text + icon at a semantic role
 * (`text.<role>` / `icon.<role>`), and the pairing is exactly what §7's "say what is wrong
 * AND how to fix it, with an icon, never color-only" requires. It is the reusable, gated
 * unit that satisfies that contract once for every field.
 *
 * The a11y division of labor: the MESSAGE renders icon + caption (icon aria-hidden, text
 * carries the meaning — never color-only). The HOST (TextField) owns the wiring — it puts
 * this node's id into the field's `aria-describedby` chain and sets `aria-invalid` on error
 * (§6). So the part is presentational; the host stitches it in.
 *
 * IT PROJECTS AS OF #795 — four members, one per tone, all eight color bindings resolved. Until #795 it
 * had an anatomy block and no Figma projection, recorded here with `figmaProperties` ABSENT, on docs/38
 * §2's phrasing: **an `anatomy` block is necessary and not sufficient.** The block below is the
 * sufficiency arriving, and the reasoning that kept it absent is worth keeping because the DECISION it
 * argued for is the one #795 implemented.
 *
 * WHY IT WAS NEVER `codeOnly`: that list means *some anatomy provably will not survive the Figma leg* —
 * its examples are things Figma has no equivalent for (a touch target larger than the frame, an
 * accessibility tree). This ceiling was not one of those. `figmaAnatomyPlan` required a declared `size`
 * axis and `planComponentName` always wrote a `size=` coordinate, so a def with ONE type scale was
 * unprojectable **by our own construction** — code we wrote and have now removed. Filing it as a Figma
 * ceiling would have made `codeOnly` mean two different things, and the day someone read that list to
 * answer *"what can Figma not do?"* they would have got a wrong answer.
 *
 * AND NOT A FABRICATED `size` AXIS. A caption has one scale (`type.caption.md`), so `size: ['md','lg']`
 * would have emitted Figma members corresponding to nothing in the design — two byte-identical variants
 * per tone, projected only to satisfy a coordinate. The def stayed honest and stayed unprojected, and
 * #795 made the honest shape the projectable one: `variantAxes` is exhaustive, so NOT listing `size` is
 * how a def says it has none.
 *
 * ONE CLAIM IN THIS HEADER WAS FALSE (#825), and it is the reason #795's write-up is a docs/32 entry
 * rather than a line in a changelog. It said: *"this def projects with no further work on it the day the
 * size requirement is relaxed"*, offered as verified. Measured on the branch that relaxed it: with `tone`
 * intact and only the size wall down, this def projected **1 plan and 0 paint variables**.
 *
 * The claim's own EVIDENCE was sound and its scope was not. Hand `figmaAnatomyPlan` a `tone` coordinate
 * and all eight bindings resolve, exactly as claimed — that is the function the author probed by hand.
 * But nothing HANDS it one: `tone` was not in `PROJECTABLE_VARIANT_AXES`, so `figmaAnatomySet` — the
 * function every executor calls — refused to declare the axis and enumerated a single plan carrying
 * `coord={}`. A probe of the plan path cannot answer a question about the set path. So what actually
 * unblocked this def was the SECOND wall, whatever the size requirement said, and with both down it
 * projects 4 plans and 8 paint variables. A comment claiming a def would project under condition X is a
 * testable claim; nothing tested it, and the half that was convenient to probe is not the half that
 * bound.
 */
import { ComponentDef } from '../component-schema';

export const fieldMessage: ComponentDef = {
  id: 'field-message',
  name: 'FieldMessage',
  aliases: ['helper-text', 'help-text', 'field-error', 'validation-message', 'caption'],
  category: 'form',
  status: 'draft',
  description:
    'The small icon + caption below a form field. In its default tone it is persistent helper guidance (the format shown BEFORE failure); its error / warning / success tones carry a validation result. A shared field part — the same component under every field control, not re-authored per host. Icon + text together, never color alone.',

  props: [
    { name: 'tone', type: "enum: 'default' | 'error' | 'warning' | 'success'", values: ['default', 'error', 'warning', 'success'], default: 'default', required: false, description: 'default = helper guidance (neutral); error / warning / success = a validation result. The tone re-points both the caption ink and the icon at the matching semantic role.' },
    { name: 'children', type: 'string | node', required: true, description: 'The message text. For error tone, say what is wrong AND how to fix it (SC 3.3.3) — "Enter a valid email, e.g. name@example.com", not "Invalid input".' },
    { name: 'icon', type: 'slot', required: false, description: 'The leading status glyph, aria-hidden (the text carries the meaning). Present by default on validation tones; optional on the default tone.' },
    { name: 'id', type: 'string', required: false, description: 'Set by the host so it can reference this node from the field\'s aria-describedby chain. Auto-generated with useId when composed inside TextField.' },
  ],

  // Presentational: no interaction states. `tone` is the only axis, and it is what drives
  // the token re-pointing below — the state-as-variant that a helper/validation caption has.
  states: [],
  variants: {
    tone: ['default', 'error', 'warning', 'success'],
  },

  // Tone → (caption ink, status icon). default is a muted neutral; each validation tone lands
  // on its semantic role. text.<role> clears the 4.5:1 body floor and icon.<role> its non-text
  // floor by construction (the engine gates them per mode), so a re-based role (roleColors) or a
  // new brand re-derives the whole set without a manual pass. The caption is caption-scale type.

  // THE PAINT GRAMMAR (#758) — axis VALUE first, slot second, which is the opposite order to `icon`'s
  // over an axis of the same name. Both ship, both are right for their component, and neither can be
  // rekeyed to the other's shape without a lie: `icon`'s tone values are content roles (nine of them,
  // defaulting to `inherit`), these four are validation states. That collision is the reason the field
  // is a template list and not `paintAxes: ['tone']`.
  //
  // THE SLOT VOCABULARY (#784). `{slot}` is filled with the name the PROJECTOR asks — `label` for a text
  // node, `icon` for a glyph — so these were spelled `{tone}.text` until #784 and four of eight color
  // bindings resolved at no coordinate at all: every tone painted its glyph and left its caption unpainted.
  //
  // #758's comment here claimed *"the reachability check in `paintKeyErrors` catches exactly that."*
  // IT DID NOT, and that claim is the reason #784 exists. Mutation-tested: removing all four `.icon`
  // bindings, leaving only the stranded `.text` ones, produced NO error — the check tested template
  // SHAPE (`^[^.]+\.[^.]+$`, which `default.text` matches perfectly) and never asked whether the value
  // filling `{slot}` was a slot the projector asks for. An expectee authored rather than read.
  paintKeys: ['{tone}.{slot}'],

  tokens: {
    'type': 'type.caption.md.default',
    'gap': 'space.075',
    'default.label': 'color.text.secondary',
    'default.icon': 'color.icon.secondary',
    'error.label': 'color.text.danger',
    'error.icon': 'color.icon.danger',
    'warning.label': 'color.text.warning',
    'warning.icon': 'color.icon.warning',
    'success.label': 'color.text.success',
    'success.icon': 'color.icon.success',
  },

  // A GLYPH AND A CAPTION IN A ROW. The structure is small and the two things it fixes are not: the
  // icon comes FIRST (the status is read before the sentence), and the caption is `fill` on the main
  // axis so a long message wraps within the field's width instead of widening its parent.
  anatomy: {
    root: 'message',
    parts: {
      message: {
        kind: 'box',
        // `target` in the schema's sense — this def's paint and geometry owner — not the interaction
        // sense, on `icon`'s terms. A message takes no focus; the FIELD it describes does, and this
        // node's relationship to that field is a DOM one (see codeOnly).
        role: 'target',
        // START, not baseline, and this differs from `field-label` deliberately: the glyph beside a
        // possibly-wrapping caption should align to the caption's FIRST line, which `start` gives and
        // `baseline` would too — but `baseline` on a wrapped text node is the last line's in some
        // engines. `start` is the reading that survives wrapping.
        layout: { direction: 'row', align: 'start', justify: 'start', sizing: { x: 'fill', y: 'hug' } },
        gap: 'gap',
        children: ['icon', 'text'],
      },
      icon: {
        kind: 'slot',
        // NOT `optional: true`, for the projector reason recorded on `field-label`'s indicator:
        // `present()` returns `!p.optional` for every part but the two slot names it hardcodes, so an
        // optional part named `icon` would be built at no coordinate. The prop is optional on the
        // default tone (see `props.icon`) and required in practice on the validation tones, which is
        // where §7's never-color-only contract lives — so always-present is also the safer default of
        // the two: a message that ships its glyph is never the color-only failure.
        nesting: { kind: 'swap' },
        note: 'The leading status glyph, aria-hidden — the caption carries the meaning. Its ink is the tone\'s `icon` role, so the pairing icon+text that satisfies SC 1.4.1 is one token decision rather than two.',
      },
      text: {
        kind: 'text',
        // The caption scale, and NOT `{size}`-templated — this def has one scale, which is the whole
        // reason it cannot project (see the header). A `{size}` placeholder here would need a size axis
        // to expand over and `anatomyErrors` rejects that combination outright.
        type: 'type',
        note: 'The message itself. `paintSlot` is absent because the default `label` is right: this is the only text node, and its ink is the tone\'s text role.',
      },
    },
    codeOnly: [
      'aria-describedby wiring — the message\'s entire relationship to its field is a DOM one the HOST owns (§6): the field references this node\'s id in its describedby chain and sets aria-invalid on error. Figma has no accessibility tree and no node-to-node reference, so the projection is a glyph and a caption that sit below a field and are associated with it by proximity alone. This is the same ceiling `field-label`\'s htmlFor hits, and it is the reason both defs are presentational in Figma and load-bearing in code.',
      'the live region — a message that appears or changes after render must be announced without stealing focus, which the host does by wrapping it in a polite live region. That is a runtime announcement behavior with no visual expression at all: the Figma member for `tone=error` looks identical whether the message was there on load or arrived on blur, and the difference is the whole of whether a screen-reader user learns about it.',
      'tone-to-icon pairing — the def binds the icon\'s INK per tone and cannot bind WHICH glyph each tone shows (an exclamation for error, a check for success). `PartKind` has no vector kind by `icon`\'s own reasoning — glyph geometry is the set\'s content, not a declared part — so the projection carries one placeholder glyph in the tone\'s color, and a designer swaps it. A Figma member showing a check mark in danger ink is reachable and would read as a component defect rather than an unswapped placeholder.',
      'the default tone\'s optional icon — `props.icon` is optional on the default tone and expected on the validation tones, and the anatomy declares the part always-present because `present()` builds no optional part outside the two slot names it hardcodes. So the helper-guidance case renders with a glyph in Figma where the code projection may omit it. Recorded rather than modelled: the alternative (an optional part) projects at NO coordinate, which is worse than a member a designer deletes a node from.',
    ],
  },

  // IT PROJECTS AS OF #795, over `tone` and no size axis at all.
  //
  // `variantAxes: ['tone']` is now the whole declaration, and both halves of it are load-bearing. `tone`
  // is listed because this def's four tones ARE its Figma grid; `size` is not listed because a caption
  // has ONE scale (`type.caption.md`), and since #795 an unlisted `size` means `planComponentName` writes
  // no `size=` segment rather than the projector demanding one. That is what the absence used to be
  // recording — see the header for why it was filed rather than worked around with a fabricated axis.
  //
  // No `gridAxis`: one varying axis has nothing to choose, and the fallback (highest-cardinality varying
  // axis) reaches `tone` anyway. Stating that here rather than declaring it is the honest version — a
  // `gridAxis: 'tone'` would read as a decision where there is only one option.
  // The property KEYS are PROP names, not Figma-facing labels — `figmaPropertyErrors` checks each against
  // `props`, so `Message`/`Icon` (the first thing I wrote) are two errors, not two nicer names. `children`
  // and `icon` are the props these properties drive, on Button's and `field-label`'s terms.
  //
  // The TEXT default is `content.labelPattern`'s own example rather than a fresh string: that field says
  // the default tone carries the format up front, and a placeholder demonstrating the rule is worth more
  // than one describing the slot. An empty default is what #510 shipped and what the schema now rejects.
  figmaProperties: {
    variantAxes: ['tone'],
    texts: { children: { part: 'text', default: 'Use 8+ characters' } },
    swaps: { icon: 'icon' },
    booleans: {},
  },

  accessibility: {
    role: 'none (rendered text; the host associates it via aria-describedby)',
    wcag: [
      '1.4.1 Use of Color (tone is carried by icon + text, never color alone)',
      '3.3.1 Error Identification / 3.3.3 Error Suggestion (the error tone names the problem and the fix — wired by the host)',
      '1.4.3 Contrast (caption ink clears 4.5:1; the engine gates text.<role> per mode)',
    ],
    aria: 'The status icon is aria-hidden — the caption text carries the meaning. The message does NOT self-announce; the host field references its id in aria-describedby (and sets aria-invalid on error). If the message appears/changes dynamically, the host wraps it in a polite live region so it is announced without stealing focus.',
  },

  content: {
    errorPattern: 'Say what is wrong AND how to fix it (SC 3.3.3): "Enter a valid email address, e.g. name@example.com" — specific, human, not "Invalid input", not blaming the user.',
    labelPattern: 'Default tone carries the format up front ("Use 8+ characters") so the guidance is seen before failure, not only in the error.',
  },

  docs: {
    usage: 'Place directly below a field to carry persistent helper guidance (default tone) or a validation result (error / warning / success). Reuse the same component under every field control so the icon-plus-text, gated-contrast contract holds everywhere. The field wires it into aria-describedby.',
    do: [
      'Show the format/constraint in the default tone BEFORE the user can fail',
      'Pair the tone with an icon so it is never color-only',
      'Let the host own aria-describedby + aria-invalid; keep this node presentational',
    ],
    dont: [
      'Signal error with color alone (fails SC 1.4.1)',
      'Duplicate the error into a self-announcing live region here AND on the host — the host owns announcement',
      'Use warning as a hard blocker — it is a soft, non-blocking caution (many systems fold it into helper/error)',
    ],
  },

  ai: {
    primaryPurpose: 'Carry helper guidance or a validation result below a form field, as icon + caption.',
    whenToUse: 'Under any field control that needs persistent guidance or an error/warning/success message.',
    avoidWhen: 'As a standalone alert or toast (use an alert/banner) — this is field-scoped and associated to one control. Never as the sole color-coded error signal without text.',
    commonPartners: ['text-field', 'number-field', 'select', 'checkbox', 'field-label', 'icon'],
    triggerKeywords: ['helper text', 'help text', 'error message', 'validation message', 'field error', 'caption', 'hint'],
    generationPriority: 3,
  },

  composition: {
    composesWith: ['text-field', 'field-label', 'icon'],
    alternativeTo: ['tooltip', 'inline-alert'],
  },

  notes: {
    contested: [
      'Whether warning is a distinct tone — many systems fold it into helper/error; kept here as an optional soft caution (brief §4).',
    ],
  },
};
