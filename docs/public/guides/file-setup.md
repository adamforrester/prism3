# Set up a file

<!-- DRAFT for owner review (#2637, lane 4). -->

**Set up file** gives a Figma file the page structure Prism3 builds into, plus a few helper components the other tools draw with. <!-- src: apps/plugin/src/main.ts:992-1030 -->
It is in the plugin's **Figma** menu, and on the Build style guides page when that page needs it. <!-- src: apps/studio/src/main.ts:1778-1786 --> <!-- src: apps/studio/src/shell/style-guides.ts:59-60 -->

Run it once on a new file, before building components or style guides. Running it again is safe: it adds only what is missing, matched by name. <!-- src: apps/plugin/src/main.ts:997-1017 --> <!-- src: apps/plugin/src/file-setup.ts:88-95 -->

## The pages it creates

The file's page list ends up in this order: <!-- src: apps/plugin/src/file-taxonomy.ts:1-17 --> <!-- src: apps/plugin/src/file-taxonomy.ts:68-133 -->

- **Cover**
- A divider, then **Foundations**, with `↳ Primitive tokens`, `↳ Semantic tokens` and `↳ Grids & layouts`
- A divider, then **Components**
- A divider, then **Subcomponents**
- A divider, then **Sandbox**, with `↳ File Components`

The dividers are Figma's own `---` divider pages. The section pages (Foundations, Components, Subcomponents, Sandbox) are empty headers in the page list. <!-- src: apps/plugin/src/file-taxonomy.ts:4-5 -->

Component pages are not created here. Each `↳` component page, such as `↳ Buttons` or `↳ Checkbox`, appears the first time you build that component, so a file never holds empty component pages. <!-- src: apps/plugin/src/file-taxonomy.ts:14-17 --> Pages under Components and Subcomponents sit in alphabetical order. <!-- src: apps/plugin/src/file-taxonomy.ts:81-83 --> <!-- src: apps/plugin/src/file-taxonomy.ts:127-130 -->

*[Screenshot placeholder: the Figma page list after Set up file.]*

## The helper components

On `↳ File Components`, Set up file builds the components the plugin draws page furniture and style guides with: <!-- src: apps/plugin/src/file-components.ts:34-35 --> <!-- src: apps/plugin/src/furniture-templates.ts:44-45 --> <!-- src: apps/plugin/src/style-guide-cells.ts:26-28 -->

| Component | What it is for |
|---|---|
| `_Section-header`, `_Headings` | The header at the top of each component page. |
| `_Label`, `_inverse-backdrop`, `_scrim-backdrop` | The labels and backdrops placed beside a component set on the canvas. The scrim is the modal backdrop drawn behind the centered and bottom-sheet Dialog examples. <!-- src: apps/plugin/src/furniture-templates.ts:61-69 --> |
| `_style-guide-swatches`, `_style-guide-text-cells`, `_style-guide-spacing-cells` | The cells [Build style guides](style-guides.md) draws its tables from. |

The names start with `_` because Figma treats such components as private and doesn't publish them to the library. If the file already holds these sets, Set up file uses them rather than building new ones. <!-- src: apps/plugin/src/main.ts:1013-1017 --> <!-- src: apps/plugin/src/main.ts:1032-1035 -->

## The result

The **Activity** drawer reports `✓ file set up` and lists the pages it created, or "(all present)" when there was nothing to add. <!-- src: apps/plugin/src/main.ts:1038-1040 -->

| Result | Meaning |
|---|---|
| `✓ file set up`, with "⚠ no File Components page — assets not built" in the detail | The pages were set up, but the helper components were not. <!-- src: apps/plugin/src/main.ts:1036-1037 --> |
| `✗ setup failed` | Figma refused a write. The detail starts "file setup failed:" and gives Figma's message. <!-- src: apps/plugin/src/main.ts:1041-1042 --> |

While Set up file runs, a second run is refused: "Set up file is already running. Try again when it finishes." <!-- src: apps/plugin/src/run-guard.ts:21-23 --> <!-- src: apps/plugin/src/run-guard.ts:39 -->
