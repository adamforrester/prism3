## (2026-11-11) — Component prose false claims (#3555 C1, C3–C6, C8, C9)

Part of #3555 (the 2026-11-11 metadata audit), its false claims in component defs. Each fix makes the shipped sentence
match the def or the platform; no API, variant, visual or token changed.

- **C1, Toast's 2.5.8 line** said the close button is "a 36px box". It nests the small flush icon button, a 20px glyph.
  It now uses Banner's wording: it passes by spacing and targets 44×44px through a code-side hit area.
- **C3, "not built yet" for built components.** PasswordField sent a code in boxes to "a code input, not built yet"
  (CodeInput ships), CardNumberField sent wallets to "a wallet button, not built yet" (WalletButton ships), CodeInput sent a
  quantity to "a number input, not built yet" (Counter is the stepper), and ImagePlaceholder called a legibility scrim
  unbuilt (that is Veil). Each names the component; the play overlay stays "not built yet", because it is. PasswordField
  also lists `code-input` in its `alternativeTo` (#3555 MB4).
- **C4, FocusRing** said it is nested by every focusable component and listed text-field, textarea and select as
  partners. Fields draw their own 2px focus edge and nest no ring, so the description says so and the three are out of
  `commonPartners`. The `avoidWhen` sentence is Q-MD6 and is left alone.
- **C5, Radio** said native radios give the whole keyboard model, Home/End included, for free. Native radios give the
  single tab stop and the arrow keys; Home/End is added in script.
- **C6, Pagination and SegmentedControl** said medium "is 44px on comfortable and spacious density"; at spacious it is
  56px. Both now say it "clears 44px", Tab.Item's form.
- **C8 and C9, Button.** The 4.1.2 line put `aria-pressed` on every button; it is for a toggle button only, as the
  def's own screen-reader text says. The error line named an "inline-message", which does not exist; it names
  FieldMessage or Banner.

### A new arm: "not built yet" names nothing built

`lint-component-docs.ts` arm H reads every string in the committed `components.ai.json`, takes the one to three words
before ", not built yet" or " (not built yet", splits them at capitals and lowercases them (the registry side's
transform, so "CodeInput" reads `code input`), drops leading articles, and fails when what remains is a registered
def's id, name or alias. The registry is the oracle, so a component that ships later turns each stale claim about it into
a named failure. Mutation: PasswordField's and CardNumberField's old phrases restored in the committed JSON fail three
times by name (`NOT BUILT YET, BUT BUILT: password-field description calls "a code input" …`). A second mutation,
PasswordField's description written "(CodeInput, not built yet)" in the def and regenerated, fails `NOT BUILT YET, BUT
BUILT: password-field description calls "CodeInput" not built yet, and code-input is a registered component`.

### Skipped, and why

- **C2** (the siblings' shared `whenToUse`) needs a usage line per sibling, which is new copy: left for the owner.
- **C7** (Pagination.Item's summary) is the owner question Q-CC18 in #3554.
- **C10** (Tag `minWidth` rounding) is in `component-specs.ts`, batch MB7.
