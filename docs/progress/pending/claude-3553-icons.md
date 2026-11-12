## (2026-11-11) — The chrome's actions draw its vendored icons, not text glyphs (#3553 Q-UI8)

The UI polish review (#3553) found actions that drew text characters for icons: "+ New brand", "↑ Import design.md…",
"↑ Upload…", "↓ Download tokens" and "↑ Brand brief…". Meanwhile "Add brand color" and "Add font family" draw the
vendored Tabler plus.

**The owner's Q-UI8 A: the vendored icons throughout.** Each of these actions now draws the Tabler icon before words that
carry no glyph: New brand (`plus`), Import design.md… and the import box's Upload .md (`upload`), Export's Download tokens,
Download brief and Download component specs (`download`), Export's Brand brief… import (`upload`), and the start window's
Upload… (`upload`). The rail's Export tile already draws `upload`.

**One icon vendored.** Tabler's `download` was not in the set. It was added the documented way: `npm pack
@tabler/icons@3.49.0` in a scratch directory, then `chrome/vendor-icons.mjs` with the existing 28 names plus `download`. The
other 28 icons' path data is byte-identical, and `tabler-digest.json` gained the one digest.

**On the primary button.** Export's Download is a primary (inverse) button, and `.p3-btn .p3-ico`'s secondary icon gray read
dim on it. An icon on a primary button now takes the button's ink (`inv-text`), as its words do. A disabled button's
icon still takes the disabled icon ink. The chrome's CSS refuses raw color values, `currentColor` included.

**Verified.** New test:chrome section `3553-icons`, in shard 3, on both hosts at 1280, both themes. Each of the six
actions draws its named icon first, its words carry no "+", "↑" or "↓", and on the primary button the icon's ink is the
button's. The vendored-set digest arm (`tabler digest: all 29 vendored icons match`) holds the new icon to the package.
The plugin's `test-start-screen.mjs` reads "New brand" with its plus icon. Mutation, after a `wip:` commit: New brand back
to the text "+ New brand" fails `#3553 Q-UI8 … brand-menu-new draws the plus icon first`.
