## (2026-11-17) — Component prose marks its code in backticks, so the usage panels draw it as code (#3552 Q-UG2b A)

**What.** Q-UG2 A (#3629) drew backtick spans in the panels in `code/inline/default`, but the def prose marked almost
none of its code. This copy pass adds backticks, and nothing else, to 127 prose strings in 33 def files: HTML
elements, attributes with values, ARIA attributes, selectors, focus pseudo-classes, the props N5 named (`htmlFor`,
`onChange`, `readOnly`, `maxRows`, `autoComplete`, `brandName`, `renderInput`, `onChangeEnd`, `isInactive`) and a few
more (`forwardRef`, `submitOnEnter`, `showStateLabel`), and literal values (`true`/`false`/`mixed`, `cc-exp`). A
check that strips every backtick from the old and new lines finds them identical.

**Scope: the fields a panel draws, and not all of them.** Overview's `ai.*` fields, `docs.usage`, the drawn Do and
Don't items, Accessibility's keyboard, focus and screen-reader rows, the content patterns and `replacesPatterns`. Three
fields are left alone on purpose:
- `summary` is the Figma component description, where backticks render literally (`lint-figma-descriptions` BACKTICK).
- An anatomy note with a code span is held back from its caption (`MAINTAINER_REGISTER`), so marking one would turn a
  caption into a gap.
- Prop descriptions are not drawn in the panel.

N5's `iconPosition` is not def prose: it is the Anatomy specimen's generated caption ("Shown on the default member: …"),
so it stays plain here.

**Consumers.** The panel strips the backticks and draws the spans as code. The Markdown pages now print code spans
where they printed `\<button>`. `components.ai.json` carries the spans, as it already did for Button's `buttonIcons`.
No Figma emission moved. One item stays plain because of the page: Button's `input[type=button|submit]`. `mdEscape`
escapes a `|` inside a code span (for table cells), and in a list item that prints a backslash.

**Borderline calls left plain** (English words that are also code): role names leading a Screen readers row
(`button`, `textbox`, `listitem`), `required`, `checked`, `name`, `disabled`, `brand`, bare "autocomplete",
`forced-colors`, `email`/`url`/`tel`, `polite`, `spinbutton`, and the `view`/`form` behavior values.

**The register rule this reverses.** `test.ts`'s `#2714 component register` refused every code span in a consumer
field, and the build-component skill said to write a prop, a value or an attribute as plain text. Q-UG2b A asks for the
opposite in the panel's fields, so the arm now reads: in `accessibility`, `content`, `docs` and `ai`'s three fields, a
span must hold code, by shapes typed in the arm (an element, an attribute or prop with its value, a selector, a
pseudo-class, a camelCase prop, a token path, a call, a hyphenated name, a number, and `href`, `alt`, `tabindex`,
`autocomplete`, `true`, `false`, `mixed`). A span holding an English word is still a hit. In `summary`, `description`
and prop descriptions, any span is still a hit. Button's Q362 hold keeps its exemption for the items that still hit
(a span holding `attached`, `smaller`, `default`). Items 5, 8 and 12 hold only code now, so they left the list, as the
arm's liveness check requires. The skill's "What ships" list says the same. Three `test.ts` arms that pin role text
(#2428 Code input, #2455 Divider, #2877 Dialog) now pin it with its backticks.

**Measured.** Two arms in `apps/plugin/test-doc-panel.ts`. `code/marked <def>` holds 16 hand-typed (lead, code) pairs
in a code span on every planned line that names them. `code/unmarked` finds no typed code shape outside a span on any
lead's planned lines. On main's defs, 15 of the 16 `code/marked` arms fail (Button's `buttonIcons` was already
marked), and `code/unmarked` finds 160 lines. Mutation: Field label's backticks removed → `code/marked field-label` and
`code/unmarked` fail by name. `family/do` compared the planned Do items with backticks stripped: it predates Q-UG2,
when the plan dropped them, and only passed because no Checkbox item had any. It now compares them as planned.
The register arm's mutations: a span holding the word `button` in Icon button's role, and a span holding `<a href>` in
Link's summary. Each fails `#2714 component register` by name ("holding "button", which is not code"; "link summary: a
code span").
