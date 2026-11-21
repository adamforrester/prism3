---
engine: minor
---
New brand input `interactiveGround: floor | page` (#3339): the darkest ground the brand's controls may sit on. `floor` (default) keeps every interactive contrast check on the contrast floor, as before. `page` measures the interactive fills, disabled text and icon, field borders, the destructive outline and the field status borders on `background.primary` (the inverse band's on `inverse.background.primary`) in light and dark, so they run as light as the page allows; high contrast keeps the floor. Each moved role names the ground it was measured on. No token name changes, and no shipped brand sets it, so no emitted value moves. The setting's name, values and Studio copy are a draft for the owner.
