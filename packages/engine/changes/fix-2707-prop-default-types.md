---
engine: minor
---
Component props (#2707): a boolean or number prop's default is now written as a boolean or a number, never a string. Thirteen
defaults move in `components.ai.json` and the component comparison report: Tag `selected`, `showCheck`, `disabled` and `readOnly`;
Tab `selected` and `disabled`; Segmented control option `selected` and `disabled`; Segmented control `disabled`; Link
`isExternal` and `asChild`; Badge `showZero` (`false`) and `max` (`99`). Before this, an agent reading the JSON got the truthy
string `"false"` on these props and a real `false` on every other component. `validateComponentDef` now refuses a `boolean` or
`number` prop whose default has another type, so the class cannot return unnoticed.
