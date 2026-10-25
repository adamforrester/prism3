# Prism3 guides for designers

<!-- DRAFT for owner review (#2637, lane 4). Every factual claim cites its source in an HTML comment of the form `src: path:line`, so a later gate can check it. Line numbers were read at the commit this draft was written on. -->

Prism3 generates a brand's design tokens from a small set of choices: a primary color, a neutral, type, shape, motion and a few more. <!-- src: packages/engine/levers.ts:219-227 -->
You make those choices in the Prism3 studio, either on the web or inside the Figma plugin, and the preview updates as you go. <!-- src: apps/plugin/src/ui/entry.ts:10-36 -->
The engine checks every text and fill pairing it generates against a contrast floor, such as 4.5:1 for body text, in every mode the brand ships. <!-- src: packages/engine/mcp.ts:474-477 --> <!-- src: packages/engine/mcp.ts:301 -->
Secondary text, status text and link colors are checked on the contrast floor surface, which is `background.secondary` unless the brand moves it, and on every surface nearer the page. Deeper surfaces, such as `background.tertiary`, carry no text promise; a brand that needs text there moves the floor, and each of those colors is picked again to clear it. <!-- src: packages/engine/modes.ts:390 --> <!-- src: packages/engine/test.ts:759-780 -->
In Figma, the plugin writes the result as variables, modes and styles, then builds component sets and style-guide tables that use them. <!-- src: apps/plugin/src/apply-theme.ts:85-108 --> <!-- src: apps/plugin/src/main.ts:568-606 --> <!-- src: apps/plugin/src/main.ts:1041-1101 -->
The same brand exports as DTCG token files or as a `design.md` brief, so developers and agents read the same values you set. <!-- src: apps/studio/src/export-settings.ts:104 --> <!-- src: apps/studio/src/export-settings.ts:113 -->

## Guides

Each guide covers one task. The list runs from starting a brand to exporting its tokens, then the agent link.

1. [Theme a brand](theme-a-brand.md): start a brand, set its levers, import or export a `design.md` brief.
2. [Apply a theme to a Figma file](apply-a-theme.md): what Apply Theme writes, and what makes it refuse.
3. [Set up a file](file-setup.md): the pages and helper components Set up file adds.
4. [Build components](build-components.md): build a component set from the Components tab.
5. [Update a real file safely](update-a-file-safely.md): dry runs, confirming, what refuses, and pruning with a preview.
6. [Build style guides](style-guides.md): draw token tables from the file's own variables and styles.
7. [Export tokens](export-tokens.md): from the studio, from the plugin, and from any Figma file with TokenPress.
8. [Use the agent link](agent-link.md): let an AI agent drive the open plugin, and how it stays off by default.

For a side-by-side list of what each surface can do, see the [feature reference](features.md).
