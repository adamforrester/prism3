## (2026-11-19) — Token CSS follows the OS into dark when no theme is set (#4140)

**What.** Owner decision A on #4140: the shipped CSS carries a `@media (prefers-color-scheme: dark)` block, and the
README documents `color-scheme`. The block is the dark values again, nested by stock `css/variables` (an array
`selector`, Style Dictionary 5.5) on `:root:not([data-theme])`. A page that sets no `data-theme` follows the OS with
no script and no flash. A page or subtree that sets one keeps it. hc-dark and hc-light stay opt-in by attribute.

**Where it ships.** In `dark.css`, as a second rule, and so in the joined `prism3.css`. The second stock run writes
to a temp folder outside `dist/` and is appended, the same plumbing as the join. Its banner is turned off with
`showFileHeader: false`, a stock `css/variables` option, added to `rule-no-custom-code.mjs`'s `ALLOWED_KEYS`. That adds
no new file to the package: a separate `prism3/system.css` was the other option, and it would have been a new artifact name.

**`color-scheme`.** A real CSS property, not a custom property, so stock `css/variables` can't write it. The README
gives the three-line consumer rule.

**Test.** `check:package` promises the selector `@media (prefers-color-scheme: dark) :root:not([data-theme])` with the
engine's dark value for every guaranteed name, in `prism3.css` and in `dark.css` (now two rules). `readBlocks` reads a
nested `@media` block as its own rule. Against main's `sd.ship.mjs` three arms fail by name: the rule count, `[BLOCK]`
for the media selector, and `[OWN FILE]` for `dark.css`.

**Not built here.** #4146 (reduced motion) and #4152 (mobile type) need the engine to emit a non-theme overlay, and
`*.overlay.tokens.json` is read as a theme mode by `sd.ship.mjs`'s discovery and by several engine gates and tools (`lint-overlay-completeness`, `lint-overlay-provenance`, `lint-figma-descriptions`, the MCP writer), so their file
name is an owner decision, posted on each issue.
