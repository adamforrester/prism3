# Prism3 guides for designers

<!-- DRAFT for owner review (#2637, lane 4; rewritten around Update file for #3264). Every factual claim cites its source in an HTML comment of the form `src: path:line`, and `lint-guide-claims.ts` checks that each still resolves and still holds what the claim quotes. -->

Prism3 generates a brand's design tokens from a small set of choices: a primary color, a neutral, type, shape, motion and a few more. <!-- src: packages/engine/levers.ts:290-298 -->
You make those choices in the Prism3 studio, either on the web or inside the Figma plugin, and the preview updates as you go. <!-- src: apps/plugin/src/ui/entry.ts:10-36 -->
The engine checks every text and fill pairing it generates against a contrast floor, such as 4.5:1 for body text, in every mode the brand ships. <!-- src: packages/engine/mcp.ts:302-307 -->
Secondary text, status text and link colors are checked on the contrast floor surface, which is `background.secondary` unless the brand moves it, and on every surface nearer the page. Deeper surfaces, such as `background.tertiary`, carry no text promise; a brand that needs text there moves the floor, and each of those colors is picked again to clear it. <!-- src: packages/engine/modes.ts:390-438 --> <!-- src: packages/engine/test.ts:692-716 -->
In Figma, **Update file** writes the result as variables, modes and styles, then builds component sets and style-guide tables that use them. <!-- src: apps/studio/src/state/update-file.ts:185-230 -->
The same brand exports as DTCG token files or as a brand brief, so developers and agents read the same values you set. <!-- src: apps/studio/src/export-settings.ts:104-113 -->

## Guides

Each guide covers one task. The list runs from starting a brand, through writing it to a Figma file, to exporting its tokens, then the agent link. Every write to a file goes through Update file, so its guide comes first.

1. [Theme a brand](theme-a-brand.md): start a brand, set its levers, import or export a `design.md` brief.
2. [Update a Figma file](update-a-file-safely.md): what Update file writes, the update in place, Clean up, and what refuses.
3. [Write the theme to a Figma file](apply-a-theme.md): what the theme writes, and what makes it refuse.
4. [Set up a file](file-setup.md): the pages and helper components setup adds.
5. [Build components](build-components.md): choose sets in the Components area, and add them with Update file.
6. [Build style guides](style-guides.md): set them up in Documentation, and draw them with Update file.
7. [Export tokens](export-tokens.md): from the studio, from the plugin, and from any Figma file with TokenPress.
8. [Use the agent link](agent-link.md): let an AI agent drive the open plugin, and how it stays off by default.

For a side-by-side list of what each surface can do, see the [feature reference](features.md).
