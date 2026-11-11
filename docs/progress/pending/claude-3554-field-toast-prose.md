## (2026-11-11) — Field prose: CodeInput as TextField's alternative, CardNumberField's target size, SearchField's no-op override (#3554 M-A)

Part of #3554 (the 2026-11-11 component consistency audit), batch M-A. Items 1 and 2's phrase landed in #3601.

- **TextField's `alternativeTo`** now lists `code-input`, which already lists TextField. PasswordField already listed it.
- **SearchField's override was a no-op.** It restated the message note and `showMessage: false` "until #2929 lands";
  the factory has shipped both since. The def is now the factory's result. The projection is byte-identical, which
  `lint-component-surface` confirms (SearchField's digest does not move).
- **CardNumberField's 2.5.8 line.** Every sibling field states its target size; it now does too, as TextField's line
  without the clear-button clause. A new `lint-component-docs.ts` arm, TARGET SIZE, holds every def whose anatomy nests
  `field-label` to a 2.5.8 line, matched anywhere in a WCAG line (Select joins it to its 4.1.2 line). Mutation: the new
  line removed fails by name (`card-number-field nests field-label, and its accessibility.wcag names no 2.5.8 …`).

### Item 4, Select's `style — not projected` line, lands with Q-CC3 A's build

The line was written and `test.ts`'s #2711 arm refused it: an admission "<name> — not projected" must name an axis or
state the def declares and leaves out of Figma, and Select declares no `style` axis. So the line is only true once Select
takes the axis. That is Q-CC3, which the owner decided A on 2026-11-11 (add the axis and its register entry). Item 4
lands with that build, in its own PR because a new Select axis changes a projected surface: the `style: [outline]` axis
on Select, its `lint-axis-values` register row and the line, and CodeInput.Cell likewise. The build is queued on #3554.
