## (2026-10-21) — Search field, with its own style lever (#2888, Q514)

**What landed.** `search-field` (SearchField), the shared field factory's third output, built on the owner's answers to
the wireframe (Q514: Q?1–Q?8 all A). 84 members (size × status × the seven field states, Q?6 A); a leading `search`
glyph shown by default (Prism 2's `leadingIcon: true`, `reference/Prism2/component-specs/search-field.json`); the clear
button as TextField's trailing glyph, starting at `close-filled` and built hidden (Q?3 A); a Figma-only `label` switch
that stands for the code prop `hideLabel` (Q?4 A, a visually hidden label kept in the accessibility tree); no submit
button (Q?5 A); the site header as a usage example in `docs.usage` (Q?8 A). Phase 2, suggestions on the generic combobox, is #2899 (Q?7 A). Its own page under Components. The code
contract ("Clear search", focus back to the input, "Search cleared" once, the browser's cancel glyph hidden, the search
landmark, `enterkeyhint="search"`) is in `codeOnly` and `accessibility`.

**The lever resolves, it does not redraw.** `searchFieldStyle` ("Search field style": Follow field style / Outline /
Underline, default Follow, the owner's copy verbatim) sits in Form right after Field style. `fieldStyleFor(defId,
input)` in `anatomy-figma.ts` picks the style a def is drawn in (the search field's own unless Follow, every other def
Field style) and `applyFieldStyle` draws it unchanged. The defaults live in that one function, so the plugin's
`materializeForBrand` and `lint-lever-sweep`'s restated composition both call it instead of each holding `?? 'outline'`.

**Follow is byte-identical, proved three ways.** `regen.ts` moved no token or Figma emission file, only the component
docs and reports a new def adds; the surface, paint-census and axes baselines moved by additions only; and the plugin's
`#2888 Follow keeps search identical to fieldStyle` builds the search field unset, set to Follow, and set explicitly to
the brand's own Field style, and compares the plans byte for byte under both Field styles. `#1812` also runs the
manifest default against the unset brand for every lever.

**The factory's three Search switches** (`leading`, `trailing`, `labelSwitch`) each spread nothing when absent; TextField
and Password field were serialized before and after and differ only by `composition` (search-field leaving `planned`
for `alternativeTo`, which the component-refs gate requires).

**Traps for whoever re-verifies.** Control shape's Boxed and Hairline corners reach fields through `FIELD_CORNER_REFS`,
keyed by def id; the search field is added there. Password field is not in that map, so it keeps `radius.sm` under
Boxed and Hairline while Text field squares; that is pre-existing and already filed as #2718, not fixed here. The Apply notice
for a search style change ("Search field style is now …") fires only when the lever moved AND the drawn edge changed; a
search field that follows a changed Field style is said once, by the field style notice.

**Review fix, and the message default.** The independent review found the clear button's target unstated: its glyph is
20px and it sits inside the input's own target, so WCAG 2.5.8's spacing exception cannot apply, and a host sizing the
button to the glyph would fail. `codeOnly`, the `trailingIcon` description and the 2.5.8 line now state a hit area of at
least 24×24 CSS px around the glyph, adding no height to the field (review Q1 A); `#2912 search-field clear button` holds
it. The field's message is off by default (owner decision on #2926, item 1). #2929 moves the factory for every field;
until it lands, `search-field.ts` sets its own boolean and note, which turns into a no-op once #2929 is on main.
