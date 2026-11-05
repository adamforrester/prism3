## (2026-11-05) — `codeOnly` as data: a class register and a four-way disposition (#3441)

Owner decision #3437 Q1 A. Each def's `anatomy.codeOnly` entry was one line of prose, so nothing could count or diff what the design file leaves to code. Each entry is now `{ class, disposition, description }`:
- `class` is an id from `CODE_ONLY_CLASSES` in `packages/engine/code-only-register.ts`, a declared list of 21 classes, each with its meaning;
- `disposition` is one of four keys, `carried`, `lowered`, `refused` or `unsupported`, whose printed names (CARRIED / LOWERED / REFUSED / UNSUPPORTED, the outside reference's) sit in one constant, `DISPOSITION_NAMES`. The names are the owner's question, Q3441.1; a rename edits that constant and no def;
- `description` is the prose, kept whole. It still leads with the name an admission needs.

### What moved
- `component-schema.ts`: `codeOnly: CodeOnlyEntry[]`; validation requires each entry's description; `admits()` reads the description.
- All 482 source entries (530 across the 60 registered defs, templates counted per def) were migrated by a one-off AST script that wrapped each literal in place. The classification was mechanical from each entry's leading term, with a short list of hand overrides, then reviewed class by class. By class: semantics 74, not-projected 48, runtime-behavior 51, right-to-left 47, responsive-layout 36, and 16 more classes. By disposition: CARRIED 2, LOWERED 114, REFUSED 242, UNSUPPORTED 172. Whether each class fits its prose is a reading call for review.
- `components.ai.json` adds `syncBoundary` per component (class and disposition name, never the prose), format `prism3-component-docs/1.1`. The maintainer record carries all three fields.
- The plugin's maintainer-prose strip cuts `description` to its subject and keeps the class and disposition.
- Plans keep `codeOnly` as the prose list (`codeOnlyText`), so no plan digest, executor input or Figma emission moved, and `EXECUTOR_REVISION` stays.
- Docs: `docs/28` §4 (the sync boundary as data) and the build-component skill.

### The gate
`lint-code-only-classes.ts`: UNREGISTERED CLASS, NO DISPOSITION, NO DESCRIPTION, DEAD CLASS (a register id no entry uses), ADMISSION CLASS (an entry leading with an unprojected axis or state, by a restated `admits()`, must be `not-projected`), PAYLOAD (syncBoundary against the defs), REGISTER, and floors of 50 defs and 450 entries. Mutations, each committed first and restored with `git show HEAD:<path>`:
- `forced-colors` → `forced-colours` on a divider entry → `UNREGISTERED CLASS: divider.anatomy.codeOnly[4]`;
- a divider entry's disposition deleted → `NO DISPOSITION: divider.anatomy.codeOnly[4]`;
- a `print-styles` class added to the register → `DEAD CLASS: 'print-styles'`;
- Button's `width` admission reclassed `responsive-layout` → `ADMISSION CLASS: button.anatomy.codeOnly[5] admits 'width'`.

### Traps
- An entry the schema reads as an admission must be an axis or state the def declares and does not project. Divider's `decorative` is a prop, so reclassing it does not fire ADMISSION CLASS. The mutation that proves that arm is Button's `width`.
- `lint-icon-count` walks every shipped string for the icon defs; `syncBoundary[].class` and `.disposition` are ids, listed in its `NOT_PROSE`.
- #3433's defs export composes `projectDef`, so it will carry `syncBoundary` once both land. Its schema (`component-defs.schema.json`) will need the field.

`CONTRACT_VERSION` is unchanged: no token name moves. Engine: minor (`changes/claude-3441-codeonly-data.md`).
