## (2026-10-20) — Counter: one tab stop, the spinbutton pattern (#2693, owner decision Q425 A)

**Status:** the Counter's accessibility fields now say what Q425 A decided, and a test holds it. ENGINE minor (change note): the shipped prose moves two committed artifacts and the projected component surface. No token and no layout change.

**What Q425 A says.** The Counter is one tab stop. Focus lands on the value (`role="spinbutton"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-valuetext` when formatted). Up and Down Arrow step by one, Page Up and Page Down by a larger step, Home and End go to min and max. The minus and plus buttons are for pointer and touch, outside the Tab order (`tabindex="-1"`), and are not `aria-hidden`, so pointer and touch users of assistive technology can still find them by name (the ARIA Authoring Practices spin button example). The one focus ring around the whole control stays as built in Figma.

**What changed.** Most of this was already in the def from Q283.8 A. This adds the missing pieces to `accessibility.keyboard`, `focus`, `aria`, the stepper-button `codeOnly` entry and `docs.dont`: the single tab stop stated plainly, `aria-valuetext`, the not-`aria-hidden` rule with its APG reason, and the one-ring note. They feed `out/components/counter.md` and `components.ai.json`.

**Test.** `test.ts` gains `counter/keyboard-map` (every key named in the shipped keyboard text and in `codeOnly`), `counter/one-tab-stop` (the value is the only Tab stop, the buttons are `tabindex="-1"`) and `counter/buttons-not-hidden` (`aria-valuetext` named, the buttons not `aria-hidden`). Each was mutated and fails by name: buttons at `tabindex="0"`, End dropped from the keyboard text, the buttons marked `aria-hidden`.
