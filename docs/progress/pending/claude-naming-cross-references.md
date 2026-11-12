## (2026-11-11) — Cross-references by PascalCase name, and one id for the number field (#3555 Q-MD7 a, c)

**STATUS: built, owner decision 2026-11-11 (Q-MD7 A).** Engine `minor`, ENGINE_VERSION {{ENGINE_VERSION}}.

- **(a) One planned id.** Counter and FlushIconButton planned `number-input`; TextField and FieldLabel
  planned `number-field`. Both now read `number-field`.
- **(c) PascalCase cross-references.** Where shipped prose points at a built component as the
  alternative, it uses the display name: `Tabs`, `SegmentedControl`, `Radio.Group`, `Switch.Row`,
  `Select`, `TextField`, `PageNav`, `Badge`, `Tag`, `Button`, `Spinner`, `Toast`, `Banner`. That covers
  Badge, Button, Button.Group, Counter, FieldMessage, Pagination, Progress, SegmentedControl, Slider,
  Tabs and Tag. "A switch" reads `Switch.Row`, the whole labeled option, as Button's line already did.
  FieldMessage's "(use an alert/banner)" now names Banner or Toast, both built.
  Review of #3652 found seven more, now converted: Tag's avoidWhen (`Checkbox.Group` or `Radio.Group`),
  Slider's description and usage (`TextField`), Accordion's dont (`Tabs`), Link's usage (`Button`),
  Toast's usage (`Banner`) and Button's `summary` (`Link`). The summary also ships in the plugin bundle
  and the Studio catalog, so the plugin's page-header literal and the generated catalog move with it.
- **Left as words:** components not built (a number input, a combobox, a toggle button, a heading) and
  ordinary nouns that are not pointers ("a link inside a sentence").

### (b) is held

The dotted child names (`Breadcrumb.Item`) are asked on #3554 beside Q-CC16: the two answers spell the
parent differently, and one spelling also renames the set ids.
