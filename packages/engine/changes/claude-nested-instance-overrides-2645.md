---
engine: minor
---
Per-instance overrides on a nested instance (#2645): a `nest` or `absolute` part that is `nest-fixed` or
`nest-exposed` may declare `overrides`, a text value by a key of the nested def's `figmaProperties.texts` and an
icon glyph by a key of its `figmaProperties.swaps`. The projection resolves each to the Figma property name the
nested set declares, and each glyph to the icon set's component, and refuses a key the nested def does not declare
or a glyph the icon set does not draw. Plans carry them as `nestOverrides`. Both executors write them with
`setProperties` on the nested instance once it exists (on Update, on the instance kept in place, unless a designer
changed it by hand) and read each one back, through one shared writer; swap targets are pre-built as dependencies.
The component read-back checks them off the instance's own `componentProperties`. List's items 2 to 8 now read
"2." to "8." in Figma instead of "1.". EXECUTOR_REVISION 26:
a file built earlier reads its List members "to update", and Update writes the overrides in place.
