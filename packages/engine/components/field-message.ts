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
    { name: 'icon', type: 'slot', required: false, description: 'Overrides the leading status glyph, aria-hidden (the text carries the meaning). Rarely needed: each validation tone already picks its own mark — an exclamation in a triangle for error, in a circle for warning, a circled check for success — so this is for a host with a domain-specific status mark, not for supplying the one the tone implies. On the default tone there is no glyph unless one is supplied here, which is what makes it the only tone where this prop adds a node rather than replacing one.' },
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
    // THE GLYPH ARTBOARD, and the rung is chosen rather than defaulted (#1010). `icon.size.xs` is the
    // only rung that is 16px, and it is 16 in EVERY brand — it aliases `dimension.16` on the fixed grid,
    // not a density-scaled step — so a caption-sized status glyph does not move with brand density the
    // way a control does. That is the right behavior here and the opposite of `checkbox`'s square, which
    // deliberately reads `control.size.*` so it DOES move: a status glyph sits beside `type.caption.md`,
    // one fixed scale, so a ladder it could ride does not exist. The next rung up, `icon.size.sm`, is 20.
    // Worth knowing what 16 is relative to: `type.caption.md` is 11px in every brand (all four resolve the
    // same `font.size.11` primitive), so the ARTBOARD is larger than the caption's own type size. That is
    // expected rather than wrong — an icon artboard is ink plus its surrounding air, and the set's ink
    // fills roughly 58-71% of it (measured in `checkbox`'s mark note) — but it does mean the glyph should
    // be checked optically beside the caption, which `notes.unverified` now records.
    'glyph-size': 'icon.size.xs',
    'default.label': 'color.text.secondary',
    // KEPT, AND UNREACHABLE IN FIGMA BY DESIGN (#1010). The default tone projects no glyph — see the
    // anatomy — so no node of this def ever asks for this ink, and `lint-paint.ts` arm 3 would report it
    // as bound-and-painting-nothing. It is named in that gate's `UNREACHED_EXPLAINED` register rather
    // than deleted, because the CODE side still needs it: `props.icon` may supply a domain-specific
    // status mark on the default tone, and that glyph's ink is this key. Deleting it would leave the one
    // reachable code path with no token to paint with.
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
        // NO `paintSlots`, deliberately (#933), for `field-label`'s reason: the tone lives in the
        // caption's ink and the glyph's, both of which are children. This box paints nothing.
        role: 'target',
        // START, not baseline, and this differs from `field-label` deliberately: the glyph beside a
        // possibly-wrapping caption should align to the caption's FIRST line, which `start` gives and
        // `baseline` would too — but `baseline` on a wrapped text node is the last line's in some
        // engines. `start` is the reading that survives wrapping.
        layout: { direction: 'row', align: 'start', justify: 'start', sizing: { x: 'fill', y: 'hug' } },
        gap: 'gap',
        children: ['iconError', 'iconWarning', 'iconSuccess', 'text'],
      },
      // ── THE STATUS GLYPH: THREE VECTOR PARTS, ONE PER VALIDATION TONE (#1010) ─────────────────────
      //
      // This was ONE `kind: 'slot'` part with `nesting: { kind: 'swap' }` and no glyph, so the projection
      // built a placeholder frame — whatever FPO component the file supplies — in the tone's ink. It
      // resolved, it painted, and every gate was green over it, because a placeholder is a structurally
      // valid child. That is deliberate scaffolding that outlived its reason: the glyph set did not exist
      // when this def was authored, #920 landed 39 glyphs that draw correctly, and NOTHING connected the
      // two. The old `codeOnly` entry stating the def "cannot bind WHICH glyph each tone shows" was true
      // when written and false by the time it was read.
      //
      // WHY THREE PARTS AND NOT ONE TEMPLATED `glyph: '{tone}'`. `PartDef.glyph` IS templatable on a
      // variant axis, and that was the first thing tried — but `resolveGlyph` substitutes the axis VALUE
      // verbatim, so `{tone}` asks the vocabulary for glyphs named `default`/`error`/`warning`/`success`
      // and throws (correctly) with a nearest-name list. There is no value→glyph MAP in the grammar, and
      // adding one is engine surface a def should not author unilaterally. `presentWhen`-gated vector
      // parts is `checkbox`'s own shape — its `mark` and `dash` are two parts for exactly this reason,
      // differing only in glyph and in the axis value that admits them — so this follows an established
      // pattern rather than inventing a second one. Filed as a note, not a workaround: `notes.contested`
      // carries what a map would buy and what it would cost.
      //
      // WHY THREE AND NOT FOUR — the `default` tone projects NO GLYPH, which is a value decision read off
      // the Prism2 reference rather than an omission. That reference has five rows for this def's four
      // tones, and the row our `default` matches is `standard` (no icon, gray text), not `info` (a circled
      // information mark, blue): this tone paints `text.secondary` / `icon.secondary`, so it is gray, and
      // matching it to `info` would be matching by position in a list rather than by what it paints. It
      // also agrees with the def's own prose, which predates #1010 — `props.icon` was already documented
      // "optional on the default tone", and a Figma member that always shipped a glyph contradicted it.
      // The consequence for `default.icon` is recorded at that token and in `lint-paint.ts`.
      //
      // WHY THESE GLYPHS, AND WHY THE NAMES READ TRANSPOSED. The reference puts the exclamation-in-a-
      // TRIANGLE on `error` and the exclamation-in-a-CIRCLE on `warning`; the glyph names are the other
      // way round, because a name in `icon-glyphs.ts` describes the DRAWING and not the tone that uses it.
      // Confirmed by measuring the artwork rather than by reading the names, which is the whole trap here:
      //
      //     warning-triangle   triangle outline + bar y9-14  + dot y16-18   exclamation, in a triangle
      //     error-circle       ring 2-22/4-20  + bar y7-13   + dot y15-17   exclamation, in a circle
      //     info-circle        ring 2-22/4-20  + dot y7-9    + bar y11-17   the same ring, bar and dot
      //                                                                     SWAPPED — an information mark
      //     close              one subpath, 5.6-18.4 square                 the circled X is not this set
      //
      // So `error-circle` is not a circled X and `warning-triangle` is not a second warning mark: they are
      // one exclamation in two enclosures, and the enclosure is what the reference assigns per tone. Do not
      // "fix" this mapping to agree with the names.
      //
      // OUTLINE, NOT FILLED, on all three — the reference says "a stroked outline glyph at the same optical
      // weight as the text". Every glyph in the set is a filled PATH (`fill="currentColor"`); outline here
      // is the drawing, achieved by a ring with a hole rather than by a stroke, which is why `check-circle`
      // and `check-circle-filled` are two entries. The three tones still differ in SHAPE — triangle,
      // circled exclamation, circled check — so the SC 1.4.1 contract this def exists for holds on a
      // non-color channel, where before all three members drew one identical placeholder.
      iconError: {
        kind: 'vector',
        glyph: 'warning-triangle',
        size: 'glyph-size',
        presentWhen: { tone: ['error'] },
        note: 'The error glyph, aria-hidden — the caption carries the meaning. An exclamation in a TRIANGLE, per the Prism2 reference, and the only tone whose enclosure is not a circle: shape is the channel that survives when the ink cannot be told from `warning`\'s. Its ink is `error.icon`, applied as `descendantFills` (never a fill on the artboard — #864), so the icon+text pairing that satisfies SC 1.4.1 is one token decision rather than two.',
      },
      iconWarning: {
        kind: 'vector',
        glyph: 'error-circle',
        size: 'glyph-size',
        presentWhen: { tone: ['warning'] },
        note: 'The warning glyph, aria-hidden. An exclamation in a CIRCLE — the same mark as `error`\'s in a different enclosure, which is what the reference asks for. Its ink is `warning.icon`.',
      },
      iconSuccess: {
        kind: 'vector',
        glyph: 'check-circle',
        size: 'glyph-size',
        presentWhen: { tone: ['success'] },
        note: 'The success glyph, aria-hidden — a circled check. Its ink is `success.icon`.',
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
      'the icon SLOT in code, where Figma now has none — the one asymmetry #1010 introduced, recorded because it is a real difference and not an oversight. The three validation members each carry a FIXED glyph chosen by tone, so there is no INSTANCE_SWAP property on the Figma side at all: an error member cannot be made to show a check mark, which is the reachable-wrong-state the old entry here worried about. `props.icon` survives as a code-side override for a host with a domain-specific status glyph, and nothing in Figma corresponds to it. The previous entry claimed this def "cannot bind WHICH glyph each tone shows" because "`PartKind` has no vector kind" — true when written, falsified by #920 (39 glyphs) and #864 (`kind: \'vector\'` + `glyph`), and it is retired rather than edited because its premise, not its wording, was the thing that expired.',
      'the default tone\'s OPTIONAL icon, which is now the only half of this that Figma cannot express. Since #1010 the two sides agree on the common case — no glyph on the default tone, three fixed glyphs on the validation tones — so what is left is narrower than the entry it replaces: in code a host MAY pass `props.icon` on the default tone and get a glyph painted `default.icon`, and there is no Figma member for that. A member either has the node or does not, so "optional in the same sense the prop is" has no projection, and adding a boolean property for it would offer a designer a toggle whose ON state has no glyph to show. **The reason the previous entry gave had expired and the entry had not**, which is why this one is worth reading carefully: it said the part is always-present because `present()` builds no optional part outside the two slot names it hardcodes — accurate for a `kind: \'slot\'` part, and false the moment these became `presentWhen`-gated `vector` parts, since `presentWhen` IS a mechanism for variant-scoped absence (#910). The gating is what let the default tone lose its glyph at all.',
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
    // THE BOX MOVES ON `tone`, AND THAT IS INTENDED (#1010). Three tones carry a 16px glyph in the row's
    // flow and the default carries none, so the members measure 102 and 126 wide — the footprint cohort
    // compares members within one `size`/slot coordinate and reported that as three misses on a build that
    // is right. This def is the first to need the exemption: `checkbox` and `radio` gate a mark inside a
    // size-bound control, so their box holds still and the comparison is one they should keep. What the
    // exemption costs is stated rather than assumed — `tone` is this def's ONLY axis, so exempting it
    // leaves each member in its own cohort and the footprint rule checks nothing here at all. The box is
    // covered instead by the two arms that measure it directly: the glyph's artboard is bound to
    // `icon.size.xs` on both axes (`apps/plugin/test-write-components.ts`) and that ref resolves to 16px in
    // all five corpus brands (`test.ts`). See `FigmaProperties.footprintVaries`.
    footprintVaries: ['tone'],
    texts: { children: { part: 'text', default: 'Use 8+ characters' } },
    // NO `swaps`, as of #1010, and the absence is the fix rather than a gap. This read
    // `swaps: { icon: 'icon' }` against a slot part with no glyph, which is what made the projection
    // build a placeholder frame. The glyph is now chosen by `tone` in the anatomy, so there is no slot
    // for an INSTANCE_SWAP property to point at — and a designer cannot put a check mark on the error
    // member. `props.icon` keeps its code-side meaning; see `anatomy.codeOnly`.
    swaps: {},
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
      'THREE PARTS WHERE ONE TEMPLATE WOULD DO, and whether the grammar should gain a value→glyph map (#1010). `PartDef.glyph` is templatable on a variant axis today, but `resolveGlyph` substitutes the axis VALUE verbatim — so `glyph: \'{tone}\'` asks for glyphs literally named `error` / `warning` / `success` and throws. A map (`glyphByValue: { tone: { error: \'warning-triangle\', … } }`) would collapse these three near-identical parts to one and would generalize: any def whose axis selects a glyph hits this, and `checkbox`\'s `mark`/`dash` pair is the same shape from before the glyph set existed. What it would COST is the reason it is contested rather than proposed: the map is a second place a glyph name can be written, so `lint-glyph-geometry.ts` (which ranges over parts) and the nearest-name error (which fires at resolve time) would both need to learn it, and a def could then name a glyph for an axis value that no longer exists with nothing failing. Three explicit parts are verbose and each one is independently checkable by the gates that already exist. Revisit when a THIRD def needs it — two is not yet a pattern.',
    ],
    unverified: [
      'The 16px glyph beside an 11px caption, optically. `icon.size.xs` is the only 16px rung and is 16 in every brand (it aliases `dimension.16` on the fixed grid), while `type.caption.md` resolves `font.size.11` — so the ARTBOARD is 45% larger than the caption\'s type size. That is expected rather than wrong (an icon artboard is ink plus its surrounding air, and this set\'s ink fills roughly 58-71% of it), and the reference asks for a glyph "at the same optical weight as the text", which is a judgement no gate here makes. Check it in Figma against a real caption before treating the size as settled.',
      'The WRAPPING case, which is where this def meets #1009 and is deliberately not fixed here. The row is `align: \'start\'`, so the glyph aligns to the top of the caption box; #1009\'s reference for the sibling control shows the mark aligning to the FIRST LINE of a wrapping label, which is neither top nor block-centre and is not the same rule as `start` once the caption\'s line-height exceeds the glyph. A single-line message cannot tell the two apart, and every member this def projects is single-line. Measure a two-line message before assuming `start` is the rule #1009 lands on.',
    ],
  },
};
