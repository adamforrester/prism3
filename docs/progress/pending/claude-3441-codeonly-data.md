## (2026-11-05) — `codeOnly` as data: a class register and a four-way disposition (#3441)

Owner decision #3437 Q1 A. Each def's `anatomy.codeOnly` entry was one line of prose, so nothing could count or diff what the design file leaves to code. Each entry is now `{ class, disposition, description }`:
- `class` is an id from `CODE_ONLY_CLASSES` in `packages/engine/code-only-register.ts`, a declared list of 21 classes, each with its meaning;
- `disposition` is one of four keys, `carried`, `lowered`, `refused` or `unsupported`, whose printed names (CARRIED / LOWERED / REFUSED / UNSUPPORTED, the outside reference's) sit in one constant, `DISPOSITION_NAMES`. The owner kept these names (Q3441.1 A); a later rename edits that constant and no def;
- `description` is the prose, kept whole. It still leads with the name an admission needs.

### What moved
- `component-schema.ts`: `codeOnly: CodeOnlyEntry[]`; validation requires each entry's description; `admits()` reads the description.
- All 482 source entries (530 across the 60 registered defs, templates counted per def) were migrated by a one-off AST script that wrapped each literal in place. The classification was mechanical from each entry's leading term, with a short list of hand overrides, then reviewed class by class. By class: semantics 74, not-projected 48, runtime-behavior 51, right-to-left 47, responsive-layout 36, and 16 more classes. By disposition: CARRIED 2, LOWERED 114, REFUSED 242, UNSUPPORTED 172. Whether each class fits its prose is a reading call for review.
- `components.ai.json` adds `syncBoundary` per component (class and disposition name, never the prose); its format moves `prism3-component-docs/1.0` → `1.1` (a field added: minor). The maintainer record carries all three fields.
- The component-defs export (#3433) carries the same `syncBoundary` on every def: the field sits in `project-def.ts`, which both payloads compose. `schema/component-defs.schema.json` gains it, and the format moves `prism3-component-defs/1.1` → `1.2` (a field added: minor) in the schema's `$id`, its `const`, `COMPONENT_DEFS_FORMAT` and `test.ts`. Page navigation (#3380) had already moved it `1.0` → `1.1` for `currentIndicator`.
- The plugin's maintainer-prose strip cuts `description` to its subject and keeps the class and disposition.
- Plans keep `codeOnly` as the prose list (`codeOnlyText`), so no plan digest, executor input or Figma emission moved, and `EXECUTOR_REVISION` stays.
- Docs: `docs/28` §4 (the sync boundary as data) and the build-component skill.

### The gate
`lint-code-only-classes.ts`: UNREGISTERED CLASS, NO DISPOSITION, NO DESCRIPTION, DEAD CLASS (a register id no entry uses), ADMISSION CLASS (an entry leading with an unprojected axis or state, by a restated `admits()`, must be `not-projected`), PAYLOAD (syncBoundary against the defs), REGISTER, and floors of 50 defs and 450 entries. Mutations, each committed first and restored with `git show HEAD:<path>`:
- `forced-colors` → `forced-colours` on a divider entry → `UNREGISTERED CLASS: divider.anatomy.codeOnly[4]`;
- a divider entry's disposition deleted → `NO DISPOSITION: divider.anatomy.codeOnly[4]`;
- a `print-styles` class added to the register → `DEAD CLASS: 'print-styles'`;
- Button's `width` admission reclassed `responsive-layout` → `ADMISSION CLASS: button.anatomy.codeOnly[5] admits 'width'`.

### Merging page navigation (#3380)
- PageNav's 10 and PageNav.Item's 7 `codeOnly` entries arrived as strings and are converted. No register class was added: each entry follows the class and disposition its nearest precedent already uses (Tabs and Tab for the semantics, keyboard, overflow and RTL entries; Link for the underline; the brand-setting and item-count entries LOWERED, as everywhere else).
- Link's `semantics` / REFUSED current-page entry takes #3380's longer sentence: the bar's width is the brand's Current page indicator.
- Both PRs moved `prism3-component-defs` `1.0` → `1.1` by the identical edit, which git merges silently and no gate notices; this PR raises it to `1.2` by hand.

### Traps
- Two PRs that each raise a payload format by the same identical edit merge clean: the second lander must raise it again by hand.
- An entry the schema reads as an admission must be an axis or state the def declares and does not project. Divider's `decorative` is a prop, so reclassing it does not fire ADMISSION CLASS. The mutation that proves that arm is Button's `width`.
- `lint-icon-count` walks every shipped string for the icon defs; `syncBoundary[].class` and `.disposition` are ids, listed in its `NOT_PROSE`.
- Merging #3433 conflicts in `emit-component-docs.ts` and `lint-component-docs.ts`: keep both import sides, and take main's `export { projectDef };`. `syncBoundary` belongs in `project-def.ts`; taking main's side as written drops it, and `lint-code-only-classes` then fails `PAYLOAD` on every def.

`CONTRACT_VERSION` is unchanged: no token name moves. Version classes: engine minor (`changes/claude-3441-codeonly-data.md`); both payload formats minor (component-docs 1.0 → 1.1, component-defs 1.1 → 1.2); `EXECUTOR_REVISION` unchanged.
