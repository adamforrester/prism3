# Set up a file

<!-- DRAFT for owner review (#2637, lane 4; corrected to the Update file checklist for #3264). -->

Setting up a file gives it the page structure Prism3 builds into, plus the helper components the other steps draw with. <!-- src: apps/plugin/src/main.ts:1600-1670 -->
It is the first item of the **Update file** checklist, **Set up file**, listed while the file isn't set up yet: "The pages, the templates and the style-guide cells. The cover too, while Documentation has it on." <!-- src: apps/studio/src/state/update-file.ts:194-195 -->

## Set up a new file

1. Choose **Update file** in the plugin's top bar. On a file that isn't set up, the dialog says "This file isn't set up for Prism3 yet. This first update sets it up." <!-- src: apps/studio/src/state/update-file.ts:192 -->
2. Leave **Set up file** ticked. <!-- src: apps/studio/src/state/update-file.ts:194 --> The theme and the style guides are ticked too, so one run sets up the file, writes the theme and draws the token tables. <!-- src: apps/studio/src/state/update-file.ts:97-103 -->
3. Choose **Set up and update**. <!-- src: apps/studio/src/state/update-file.ts:232 -->

Once the file is set up, the checklist no longer lists the setup item. <!-- src: apps/studio/src/shell/update-file.ts:220 -->
Setting up again is safe: it adds only what is missing, matched by name. <!-- src: apps/plugin/src/file-setup.ts:88-95 --> If a setup failed, the Activity drawer offers **Set up again**. <!-- src: apps/studio/src/shell/activity.ts:207 -->

## The pages it creates

The file's page list ends up in this order: <!-- src: apps/plugin/src/file-taxonomy.ts:1-17 --> <!-- src: apps/plugin/src/file-taxonomy.ts:77-196 -->

- `Cover`
- A divider, then `Foundations`, with `↳ Primitive tokens`, `↳ Semantic tokens` and `↳ Grids & layouts`
- A divider, then `Components`
- A divider, then `Subcomponents`
- A divider, then `Sandbox`, with `↳ File Components`

The dividers are Figma's own `---` divider pages. <!-- src: apps/plugin/test-update-apply.ts:447-448 --> The section pages (Foundations, Components, Subcomponents, Sandbox) are empty headers in the page list. <!-- src: apps/plugin/src/file-taxonomy.ts:4-5 -->

Component pages are not created here. Each component page, such as `↳ Buttons` or `↳ Checkbox`, appears the first time a set for it is added, so a file never holds empty component pages. <!-- src: apps/plugin/src/file-taxonomy.ts:99-105 --> `↳ Icons & assets`, under Foundations, appears the same way. <!-- src: apps/plugin/src/file-taxonomy.ts:87 --> Pages under Components and Subcomponents sit in alphabetical order. <!-- src: apps/plugin/src/file-taxonomy.ts:94 --> <!-- src: apps/plugin/src/file-taxonomy.ts:178 -->

When the cover is on in Documentation, setup also draws the library cover on the `Cover` page, with the brand's name and the Prism3 version. <!-- src: apps/studio/src/shell/documentation.ts:49-51 -->
A file with no brand yet gets its cover once the theme is written. <!-- src: apps/plugin/src/cover-frame.ts:553 -->

*[Screenshot placeholder: the Figma page list after setup.]*

## The helper components

On `↳ File Components`, setup builds the components the plugin draws page furniture, usage panels and style guides with: <!-- src: apps/plugin/src/file-taxonomy.ts:196 -->

| Component | What it is for |
|---|---|
| `_Section-header`, `_Headings` | The header at the top of each component page. <!-- src: apps/plugin/src/file-components.ts:34-35 --> |
| `_Label`, `_inverse-backdrop`, `_scrim-backdrop` | The labels and backdrops placed beside a component set on the canvas. The scrim is the modal backdrop drawn behind the centered and bottom-sheet Dialog examples. <!-- src: apps/plugin/src/furniture-templates.ts:44-69 --> |
| `_Doc-block` | The blocks a usage panel is drawn from. <!-- src: apps/plugin/src/doc-block.ts:42 --> |
| `_style-guide-swatches`, `_style-guide-text-cells`, `_style-guide-spacing-cells` | The cells [Build style guides](style-guides.md) draws its tables from. <!-- src: apps/plugin/src/style-guide-cells.ts:26-28 --> |

The names start with an underscore because Figma treats such components as private and doesn't publish them to the library. If the file already holds these sets, setup uses them rather than building new ones. <!-- src: apps/plugin/src/main.ts:1623-1652 -->

## The result

The Activity drawer reports `✓ file set up` and lists the pages it created, or `(all present)` when there was nothing to add. <!-- src: apps/plugin/src/main.ts:1664-1666 -->

| Result | Meaning |
|---|---|
| `✓ file set up`, with `⚠ no File Components page — assets not built` in the detail | The pages were set up, but the helper components were not. <!-- src: apps/plugin/src/main.ts:1653 --> |
| `✗ setup failed` | Figma refused a write. The detail starts `file setup failed:` and gives Figma's message. <!-- src: apps/plugin/src/main.ts:1668 --> |

While setup runs, a second request for it is refused: "is already running. Try again when it finishes." <!-- src: apps/plugin/src/run-guard.ts:38-42 -->
