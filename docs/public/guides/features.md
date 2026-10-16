# Feature reference

<!-- DRAFT for owner review (#2637, lane 4). Kept in step with the ecosystem diagram's "Compare interfaces" view (#2643); where the two disagree, the code each row cites decides. -->

What each Prism3 surface can do. The ecosystem diagram (`docs/public/ecosystem/`, #2643) shows how the surfaces connect; this page lists what you can do in each.

- **Web studio**: the studio in a browser. <!-- src: apps/studio/build-site.mjs:1-8 -->
- **Figma plugin**: the same studio inside Figma, plus the actions that write to the file. <!-- src: apps/plugin/src/ui/entry.ts:10-36 -->
- **Agent, through the agent link**: an AI agent driving the open plugin. See [Use the agent link](agent-link.md). <!-- src: apps/plugin/src/main.ts:1211-1221 -->
- **Agent, through the Prism3 MCP server**: an AI agent using the engine directly, with no Figma file. <!-- src: packages/engine/mcp.ts:236-372 -->

✓ means the surface can do it. – means it can't.

## Brand

| Feature | Web studio | Figma plugin | Agent link | MCP server |
|---|---|---|---|---|
| Start from a color, an example or a `design.md` | ✓ | ✓ | – | ✓ from a `design.md` (`theme_from_brief`) |
| Set levers with a live preview | ✓ | ✓ | – | ✓ list the levers (`list_levers`), no preview |
| Check contrast in every mode | ✓ Inspect › Contrast | ✓ Inspect › Contrast | – | ✓ `theme_brand`, `theme_from_brief` |
| Read the engine's decisions for a brand | ✓ Inspect › Decisions log | ✓ Inspect › Decisions log | – | ✓ `theme_brand` |
| Keep the working brand | ✓ in this browser | ✓ in the Figma file | – | – |
| Import a `design.md` brief | ✓ | ✓ | – | ✓ `theme_from_brief` |
| Export a `design.md` brief | ✓ | ✓ | – | – |

<!-- src: apps/studio/src/shell/start.ts:155-206 --> <!-- src: apps/studio/src/shell/pages.ts:99 --> <!-- src: apps/studio/src/persist-local.ts:40-79 --> <!-- src: apps/plugin/src/persist-figma.ts:30-35 --> <!-- src: apps/studio/src/export-settings.ts:111-115 --> <!-- src: packages/engine/mcp.ts:236-382 -->

## Figma file

| Feature | Web studio | Figma plugin | Agent link | MCP server |
|---|---|---|---|---|
| [Apply Theme](apply-a-theme.md): variables, modes and styles | – | ✓ | ✓ `apply-theme` | – |
| [Set up file](file-setup.md): pages and helper components | – | ✓ | ✓ `file-setup` | – |
| [Build a component set](build-components.md) | – (lists the sets) | ✓ | ✓ `build-components` | – |
| [Update built components in place](update-a-file-safely.md#component-changes-check-read-then-confirm) | – | result shown only | ✓ `update-components` | – |
| [Build style guides](style-guides.md) | – | ✓ | ✓ `style-guide` | – |
| [Prune stale](update-a-file-safely.md#remove-what-the-brand-no-longer-uses), with a preview | – | ✓ | ✓ `prune` | – |
| Read the file back | – | ✓ when the plugin opens | ✓ `readback`, `status` | – |

<!-- src: apps/plugin/src/main.ts:1211-1221 --> <!-- src: apps/plugin/src/messages.ts:33-119 --> <!-- src: apps/plugin/src/agent-protocol.ts:41-45 --> <!-- src: apps/studio/src/preview/sections/component-sets.ts:34 --> <!-- src: apps/plugin/src/main.ts:1106-1168 -->

## Tokens

| Feature | Web studio | Figma plugin | Agent link | MCP server |
|---|---|---|---|---|
| [Download DTCG token files](export-tokens.md): a base file and one overlay per mode | ✓ | ✓ | – | – |
| Write the Figma variable files to a folder | – | – | – | ✓ `export_theme` |
| Score how generated UI used the tokens | – | – | – | ✓ `score_consumption` |

<!-- src: apps/studio/src/export-settings.ts:101-110 --> <!-- src: packages/engine/mcp.ts:336-370 --> <!-- src: packages/engine/mcp.ts:284-319 -->

TokenPress, a separate Figma plugin, exports any Figma file's variables and styles as DTCG token files. See [Export tokens](export-tokens.md#export-any-figma-file-with-tokenpress). <!-- src: apps/tokenpress/README.md:3 -->

## Limits worth knowing

- Writing to Figma needs the plugin open. The MCP server does not touch Figma files. <!-- src: packages/engine/README.md:113 -->
- The agent link is off at every launch, and only the panel can turn it on. <!-- src: apps/plugin/src/agent-link.ts:5-8 -->
- Exports start from the brand you set, not from the file's variables. To export what a file holds, use TokenPress. <!-- src: apps/studio/src/export-settings.ts:63-70 --> <!-- src: apps/studio/src/export-settings.ts:81 -->
