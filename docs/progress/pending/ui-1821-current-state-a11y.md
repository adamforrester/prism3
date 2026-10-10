## (2026-10-09) — Studio: the current page, Color page and previewed mode, read from the accessibility tree on both hosts (#1821)

#1821 was filed during the redesign's F1 slice, against the legacy workspace: its rail marked the current page with
`.active` and its mode strip marked the selected mode with `.on`, so neither reached assistive technology. The rail and
the mode strip are both gone (H12, #2289). This entry applies the issue's intent to the shell that replaced them.

### The audit: nothing to fix

Every page and mode control in the redesigned shell already exposes its state through ARIA, and `chrome.css` styles each
state from that ARIA attribute, not from a class (`shell/dom.ts`'s rule). Each one checked:

- **The tab row** (`frame.ts`): `role=tablist`, each domain a `role=tab` button with `aria-selected` and a roving
  `tabindex`. ArrowLeft and ArrowRight, Home and End move along the row and select as they go, which is the tab pattern's
  automatic activation. At the narrow tier the row becomes a native select whose value is the current domain.
- **Color's sub-row** (Palettes, Surfaces & fills, Interactive): the same tablist, keyboard and `aria-selected`.
- **The preview header's mode control** (`preview.ts`): `role=radiogroup`, each mode a `role=radio` button with
  `aria-checked` and a roving `tabindex`. The four arrow keys, Home and End move and check. Where the radios give way, a
  native select carries the mode as its value. On Palettes the control is held, and it still reports Light checked
  (#2321).
- **Also looked at, and not page navigation:** the narrow Settings / Preview toggle (`aria-pressed`), Inspect's tablist,
  the brand menu's current example (`aria-current="true"`), and the jump links on Surfaces & fills and Interactive (no
  current state, drawn or exposed).

The redesign closed the gap the issue describes, so the code needs no change. What was missing was a test: nothing
read the current page or the previewed mode from the accessibility tree.

### The test

`test:chrome` section 40 checks both hosts, at 1280 and 380 on every place, and on the plugin's Build style guides page. It
reads each control's node from CDP `Accessibility.getPartialAXTree`: a tab's `selected`, a radio's `checked`, a select's
value. The tab row must report the place's domain and nothing else, Color's sub-row the place's Color page and nothing
else, and the mode control the mode the test chose: Dark, or Light on Palettes. Page names, domain names and the mode
are literals in the test. At 640 the four radios give way to the select, so 640 runs on three places, and each host must
read the select at least once.

**A trap, found by mutation (a).** Chrome reports a focused `role=tab` that has no `aria-selected` as selected. The first
draft read each place right after the click that reached it. With the tab row's state removed, it still passed on every
domain without sub-pages, because the clicked tab held focus. Each place is now read with nothing focused. Section 40's
ArrowRight checks keep their focus on purpose, so they don't catch (a). They do catch (c).

**Skipped at 640:** the other six places. On Color at that width, the sub-row runs under the preview, and Interactive's
sub-tab can't be clicked. That defect is #1975's, already filed.
