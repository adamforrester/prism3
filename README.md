# #2406 / #2188 canvas furniture: plan renders (not for merge)

Plan renders of the three pilot pages, from `claude/2406-canvas-furniture`. Each def is built by the real executor
into the plugin's component shim, and its labels and backdrop are drawn by the real `drawFurniture`, against stand-in
templates measured like the owner's `_Label` (Inter Medium 12 at about 7px a character, 8 gap, 14 bracket).
Member boxes are the shim's measured boxes drawn as plain outlines (the shim cannot render a button); inverse members
are drawn dark. The dark band is the `_inverse-backdrop` instance.

- `2406-button.png`: 576 members, inverse rows grouped into one block (rows 48 to 95), 6 column labels, 35 row labels, 1 backdrop. Scaled to 60%.
- `2406-tag.png`: 45 members, 5 column labels, 13 row labels, no backdrop.
- `2406-text-field.png`: 84 members, 7 column labels, 16 row labels, no backdrop.

`render-furniture.ts` produced the SVGs (run from `apps/plugin/` on the feature branch, in a `.render-tmp/` folder).
