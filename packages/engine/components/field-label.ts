/**
 * FieldLabel — the accessible name above a field, with a required/optional indicator and a
 * size to pair with the field it sits over (KB text-field brief §2 "Label", §6, §7). The
 * second shared field part: like FieldMessage, it is authored once and reused under every
 * form control (TextField now; Select / Checkbox-group / NumberField later), so "the label is
 * always present, always associated" holds family-wide rather than per host.
 *
 * Why its own ComponentDef (not a slot): it binds its own type + color and has an axis
 * (size) plus a disabled dim — a small stateful part, not an inert glyph. It is the DOM-present
 * accessible name (§6: a visually-hidden label is the only "label-less" case, and even then it
 * exists) — the single most load-bearing a11y node in the field, so it earns a definition.
 *
 * The practice default is the STATIC top-aligned label (brief §2, §13) — floating labels are
 * out of favor for a11y and i18n. This part models that default; a floating treatment would be
 * a motion concern on the host, not a different label component.
 */
import { ComponentDef } from '../component-schema';

export const fieldLabel: ComponentDef = {
  id: 'field-label',
  name: 'FieldLabel',
  aliases: ['label', 'form-label'],
  category: 'form',
  status: 'draft',
  description:
    'The visible, persistent label above a form field — the field\'s accessible name — with an optional required/optional indicator and a size that pairs with the control. A shared field part: the same component above every field control. Static top-aligned by default (the practice default; floating labels are out of favor).',

  props: [
    { name: 'children', type: 'string | node', required: true, description: 'The label text — a noun phrase, sentence case, ≤3 words, no trailing colon ("Email address", not "Enter your email address here").' },
    { name: 'htmlFor', type: 'string', required: true, description: 'The id of the field it names — a native <label for>. Set by the host when composed inside TextField (useId).' },
    { name: 'indicator', type: "enum: 'none' | 'required' | 'optional'", values: ['none', 'required', 'optional'], default: 'none', required: false, description: 'The required/optional marker. Mark the MINORITY consistently within a form (§7): "(optional)" when most are required, a required marker when most are optional. Never the sole signal — the field also carries required/aria-required.' },
    { name: 'size', type: "enum: 'small' | 'medium'", values: ['small', 'medium'], default: 'medium', required: false, description: 'Pairs with the field size. Two steps, matching the type system\'s label scale.' },
    { name: 'isDisabled', type: 'boolean', default: false, required: false, description: 'Dims the label when its field is disabled (a visual echo — the field\'s native disabled is the source of truth).' },
  ],

  // `isDisabled` is the one runtime shift (a dim); `size` and `indicator` are author axes.
  states: ['rest', 'disabled'],
  variants: {
    size: ['small', 'medium'],
    indicator: ['none', 'required', 'optional'],
  },

  // Label ink is the strong primary content role; the indicator is muted (secondary) so the
  // "(optional)" suffix reads as de-emphasized; disabled dims to the shared disabled ink.
  // Two sizes bind the type system's two label steps (type.label.{sm,md}.emphasis).

  // THE PAINT GRAMMAR (#758): a bare slot, because this def's ink does not vary by any of its axes.
  // `size` changes the type step and `indicator` changes which text is present — neither changes a
  // color. So the grammar is one template with no axis placeholder at all, which is a shape the
  // hardcoded `{intent}.{appearance}.{slot}` could not express and the reason this def was one of the
  // five that projected unpainted.
  //
  // THE KEYS ARE SPELLED IN THE PROJECTOR'S SLOT VOCABULARY (#784), and this def is why that rule
  // exists. Until #784 these were `text` and `indicator` — a grammar that passed every check #758
  // shipped while painting NOTHING, because `paintOf` is asked for `label` on a text node and never for
  // a slot named `text`. Measured before the rename: 0 of 3 color bindings reachable at any coordinate.
  //
  // THE SECOND TEXT PART'S INK IS ITS OWN SLOT (#796), and this is a CORRECTED decision rather than a
  // new one — the comment that stood here was wrong, and wrong in the exact way #784 was about.
  //
  // It read: *"`indicator.label` is the SECOND text part's ink, keyed under the part rather than as a
  // slot of its own … resolves through the same `{slot}` template once the anatomy block names that
  // part."* The reasoning was that the template list disambiguates the two text nodes positionally.
  // MEASURED, and it does not: `paintOf` takes a SLOT and never sees which part asked, so the
  // `kind === 'text'` branch called `paintOf('label')` for every text node. Both parts came back
  // `color/text/primary`, and `indicator.label` → `color.text.secondary` was authored, resolvable and
  // reached at NO coordinate — the de-emphasized "(optional)" suffix would have shipped in
  // full-strength primary ink. A rename that produced a dead key, inside #784's own fix.
  //
  // So the indicator part declares `paintSlot: 'indicator'` and the key is `indicator`, a slot the
  // projector dispatches. Not folded into `label` (Figma renders two text nodes in two colors
  // trivially, so a shared ink would be a real design loss recorded as a tooling ceiling), and not
  // deferred (the cost is visible in the library designers actually use).
  //
  // `disabled.label` needs no new mechanism — it resolves via the cross-cutting `disabled.*` branch,
  // same as Button's, and the branch builds `disabled.<slot>` from the slot it was ASKED for, so the
  // indicator's disabled ink is `disabled.indicator`. Bound below for that reason: without it a
  // disabled label dims and its indicator does not.
  paintKeys: ['{slot}'],

  tokens: {
    'gap': 'space.050',
    'label': 'color.text.primary',
    'indicator': 'color.text.secondary',
    'disabled.label': 'color.disabled.text',
    'disabled.indicator': 'color.disabled.text',
    // NOT renamed: these bind TYPE, not color, and are resolved by `anatomy`'s `type` field through
    // `varOf` rather than by any paint template. #784 is a paint rule and this is not paint.
    'size.small.text': 'type.label.sm.emphasis',
    'size.medium.text': 'type.label.md.emphasis',
  },

  // TWO TEXT NODES IN A ROW, and the def's whole structure is that plus the gap between them. The
  // label names the field; the indicator is the required/optional marker beside it, in its own ink.
  anatomy: {
    root: 'label',
    parts: {
      label: {
        kind: 'box',
        // `target` in the schema's sense — the node that owns this component's paint and geometry — and
        // NOT the interaction sense, on `icon`'s terms: a label takes no focus. What it DOES own that a
        // glyph does not is a real a11y relationship, the native `<label for>`, and that is a DOM fact
        // with no Figma expression (see codeOnly).
        role: 'target',
        // BASELINE, not center, and this is the one alignment choice here that is a design decision
        // rather than a default: the marker sits beside running text at a different type step in the
        // `optional` case, so centering would float "(optional)" off the label's baseline. Figma's
        // auto-layout carries baseline alignment natively, so this projects.
        layout: { direction: 'row', align: 'baseline', justify: 'start', sizing: { x: 'hug', y: 'hug' } },
        gap: 'gap',
        children: ['text', 'indicator'],
      },
      text: {
        kind: 'text',
        type: 'size.{size}.text',
        // No `paintSlot` — the default IS `label`, and stating it would invite the reading that the
        // field is required on every text part.
        note: 'The accessible name. A native <label for> in the code projection; a plain text node in Figma, where the association cannot exist.',
      },
      indicator: {
        kind: 'text',
        type: 'size.{size}.text',
        // THE FIELD THIS PR ADDS (#796). Without it this part takes `paintOf('label')` like every other
        // text node and renders in `color.text.primary` — the de-emphasis silently lost. Measured before
        // the field existed: both text parts came back `color/text/primary`.
        paintSlot: 'indicator',
        // NOT `optional: true`, and this is a projector constraint rather than a design claim. `present()`
        // returns `!p.optional` for every part except the two it name-checks (`leadingVisual` /
        // `trailingVisual`), so an optional part named anything else is built at NO coordinate — it would
        // validate clean, read as a considered absence, and never appear. The `indicator` axis is what
        // expresses absence, and it is unprojectable for its own reason (see codeOnly), so in Figma the
        // marker is always present and a designer deletes it for the `none` case. Stated because the
        // tempting shape — `optional: true` plus a Figma BOOLEAN — is unbuildable in BOTH directions:
        // `figmaProperties.booleans` requires `optional: true`, and `present()` then drops the node the
        // boolean would toggle. No def in the corpus uses `booleans` (both declare it stated-empty),
        // which is why that contradiction has never surfaced.
        note: 'The required/optional marker — "*" or "(optional)", in the muted indicator ink so it reads as de-emphasized beside the name. Never the sole signal: the field carries required / aria-required.',
      },
    },
    codeOnly: [
      // MUST LEAD with `indicator` — `figmaPropertyErrors` requires an unprojected variant axis to be
      // admitted by an entry that STARTS with the axis name (the #563 finding: a passing mention inside
      // an entry about something else is a gate satisfied by unrelated prose).
      'indicator — the required/optional axis, declared in `variants` and deliberately NOT projected, and as of #795 that is a DEF DECISION rather than a projector refusal. Until #795 this entry said the projector refuses any axis outside intent/appearance/size (`PROJECTABLE_VARIANT_AXES`); that list is gone, `figmaAnatomySet` now enumerates whatever `variantAxes` declares, so the axis COULD be carried and is not. The reason it is not is the one that was always underneath the refusal: absence is the axis\'s most important value and nothing here can express it. The marker is `optional: true` in no useful sense — `present()` never builds an optional part outside the two slot names it hardcodes — so `indicator=none` would project a member with the marker still drawn, i.e. a coordinate that lies. Projecting only `required` and `optional` ships a set whose two members differ by one placeholder word while the real three-way choice is invisible. PAINT is not the obstacle and never was: the marker\'s ink resolves at every coordinate as of #796, via `paintSlot: \'indicator\'`. So the Figma projection carries ONE indicator treatment per size with placeholder text, and the three-way choice lives in the code projection. Reopening this needs a way to declare a part\'s absence as a coordinate, not a wider axis list.',
      'htmlFor / label association — the entire reason this component exists (§6) and it has no Figma expression at all. A native `<label for=id>` is what makes the name programmatic; Figma has no accessibility tree and no node-to-node reference a materializer could write, so the projection is two text nodes that LOOK like a label and carry none of the relationship. A designer reviewing the Figma member cannot see whether the field is actually named, which is the one property this def is for.',
      'the visually-hidden case — §6\'s only label-less shape is a label that exists in the DOM and is clipped from view (a search field). That is a CSS technique with two hard requirements Figma cannot hold: the node must stay in the accessibility tree, so `display: none` and `visibility: hidden` are both wrong, and it must still be present. A Figma variant with the text node deleted expresses the opposite of what the technique does — an absent label rather than a hidden-but-announced one — so it is deliberately not projected as a coordinate.',
      'sentence-case and ≤3-word content rules — `content.labelPattern` states them and no projection enforces them. Figma carries a placeholder string, and a placeholder is a suggestion: a designer typing "Please enter your email address here:" produces a member that is structurally perfect and violates three of the four rules at once. The enforcement surface is review and lint in the code tier, which is worth admitting rather than implying the def governs copy.',
    ],
  },

  // `size` alone, and since #795 that is an EXHAUSTIVE statement rather than a filtered one. This
  // comment used to read "the projectable axis list is intent/appearance/size, and `size` is the only
  // one of this def's two axes on it" — there is no such list any more, so listing `size` is now this
  // def saying its Figma grid IS the size steps, and `indicator` is admitted in codeOnly above on its
  // own merits (see that entry: absence is the value nothing can project). Two members, one per size.
  //
  // `stateAxis` is DECLARED here where `icon` has none, because this def has states (`rest`, `disabled`)
  // and both project: the disabled treatment is a paint change on nodes that already exist, which is
  // exactly what a variant coordinate carries. `booleans` is stated-empty rather than omitted — the
  // established way this schema says "considered, and none survive" — and the indicator's note records
  // why the one candidate is unbuildable.
  // TWO TEXT PROPERTIES, ONE PER TEXT PART, and the second one is a defect fix (#798) for a blank node
  // that #796 above shipped — found by projecting the def and reading the node tree, not by reading the
  // def. `characters` lands on a text node ONLY where a TEXT property names that part
  // (`anatomy-figma.ts:650`), so with `children` alone the `indicator` projected as a TEXT node with
  // correct ink, correct type style and **no content at all** — an empty, zero-width node in Figma. The
  // whole point of `paintSlot: 'indicator'` is that the marker reads as de-emphasized beside the name, and
  // an invisible node reads as nothing: #796's paint fix was true and pointless at the same time.
  //
  // This is #510's defect at one-node scale, and that precedent is why it is worth a comment rather than
  // a quiet line: #510 pasted 21 buttons that were all BLANK, every binding resolved and every check
  // green, because *"nothing wrote `characters` and nothing declared a TEXT property"*
  // (`anatomy-figma.ts`'s `pasteComponentSet` header). The gate that existed could not see this case — it
  // asserts a declared property's default is non-empty, and the failure here is a text part with **no**
  // property, which nothing asked about. #798 adds the complementary rule, so the next def to grow a
  // second text part fails validation instead of projecting a blank node.
  //
  // The default is `(optional)` rather than `*` because it is the marker this def's own prop docs
  // recommend (mark the MINORITY, and "(optional)" is the shape that carries meaning without a legend),
  // and because a one-glyph placeholder in a de-emphasized ink is exactly the projection a designer
  // mistakes for an empty node — the thing this fix is for.
  figmaProperties: {
    variantAxes: ['size'],
    stateAxis: { name: 'state', values: ['rest', 'disabled'] },
    texts: {
      children: { part: 'text', default: 'Email address' },
      indicator: { part: 'indicator', default: '(optional)' },
    },
    booleans: {},
  },

  accessibility: {
    role: 'none (native <label> element)',
    wcag: [
      '1.3.1 Info and Relationships (native <label for> ties the name to the control)',
      '3.3.2 Labels or Instructions (every field has a visible, programmatic label)',
      '1.4.3 Contrast (label ink is text.primary — clears the text floor)',
    ],
    aria: 'Prefer a native <label for=id>; use aria-label / aria-labelledby only when a visible label genuinely cannot be shown (a search field with a hidden label — and it still exists in the DOM). The required/optional marker is visual; the field carries required / aria-required so the state is not asterisk-only.',
  },

  content: {
    labelPattern: 'Noun or noun phrase, sentence case, concise, ≤3 words, no trailing colon. Not an instruction — that belongs in helper text.',
  },

  docs: {
    usage: 'Place above every field as its accessible name. Wire htmlFor to the field id. Mark the minority (required vs optional) consistently across a form. Reuse the same component above every field control so the label-is-always-present contract holds family-wide.',
    do: [
      'Always render a label, even for search (visually-hidden, still in the DOM)',
      'Keep it a short noun phrase in sentence case, no trailing colon',
      'Mark the minority (required or optional) consistently, and back it with aria-required — never the asterisk alone',
    ],
    dont: [
      'Use the placeholder as the label (it vanishes on input — fails SC 3.3.2)',
      'Write an instruction as the label ("Enter your email here") — that is helper text',
      'Rely on a red asterisk as the only required signal',
    ],
  },

  ai: {
    primaryPurpose: 'Name a form field visibly and programmatically.',
    whenToUse: 'Above every field control — the accessible name for the input.',
    avoidWhen: 'As a section heading or standalone text (use a heading) — this is bound to one control via htmlFor. Never omit it in favor of a placeholder.',
    commonPartners: ['text-field', 'number-field', 'select', 'checkbox', 'field-message'],
    triggerKeywords: ['label', 'field label', 'form label', 'required indicator', 'optional field'],
    generationPriority: 3,
  },

  composition: {
    composesWith: ['text-field', 'field-message'],
    alternativeTo: ['aria-label'],
  },

  notes: {
    contested: [
      'Which to mark — required vs optional; the practice marks the minority consistently (brief §7).',
      'Floating vs static label; static top-aligned is the default here (brief §2, §13).',
    ],
  },
};
