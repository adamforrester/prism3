# Feature reference

<!-- DRAFT for owner review (#2637, lane 4; corrected to Update file for #3264). Kept in step with the ecosystem diagram's "Compare interfaces" view (#2643); where the two disagree, the code each row cites decides. -->

What each Prism3 surface can do. The ecosystem diagram (`docs/public/ecosystem/`, #2643) shows how the surfaces connect; this page lists what you can do in each.

- Web studio: the studio in a browser. <!-- src: apps/studio/build-site.mjs:1-8#7ef7bf24 -->
- Figma plugin: the same studio inside Figma <!-- src: apps/plugin/src/ui/entry.ts:10-38#6258203d -->, plus **Update file**, which writes to the file. <!-- src: apps/studio/src/state/update-file.ts:308 -->
- Agent, through the agent link: an AI agent driving the open plugin. See [Use the agent link](agent-link.md). <!-- src: apps/plugin/src/agent-protocol.ts:41#2ca0eeca -->
- Agent, through the Prism3 MCP server: an AI agent using the engine directly, with no Figma file. <!-- src: packages/engine/mcp.ts:239-375#915cdea4 -->

✓ means the surface can do it. – means it can't.

## Brand

| Feature | Web studio | Figma plugin | Agent link | MCP server |
|---|---|---|---|---|
| Start from a color, an example or a `design.md` | ✓ | ✓ | – | ✓ from a `design.md` (`theme_from_brief`) |
| Set levers with a live preview | ✓ | ✓ | – | ✓ list the levers (`list_levers`), no preview |
| Check contrast in every mode | ✓ Inspect › Contrast <!-- src: apps/studio/src/shell/pages.ts:118-120#9232e735 --> | ✓ Inspect › Contrast | – | ✓ `theme_brand`, `theme_from_brief` |
| Keep the working brand | ✓ in this browser <!-- src: apps/studio/src/persist-local.ts:40-79#7bd91f4c --> | ✓ in the Figma file, when Update file writes the theme <!-- src: apps/plugin/src/persist-figma.ts:30-35#ba150bb3 --> | – | – |
| Import a `design.md` brief | ✓ | ✓ | – | ✓ `theme_from_brief` |
| Export a `design.md` brief | ✓ <!-- src: apps/studio/src/main.ts:1332 --> | ✓ | – | – |

<!-- src: apps/studio/src/shell/start.ts:168-219#f0d574f0 --> <!-- src: packages/engine/mcp.ts:245-391#d810bcff -->

## Figma file

| Feature | Web studio | Figma plugin | Agent link | MCP server |
|---|---|---|---|---|
| [Write the theme](apply-a-theme.md): variables, modes and styles | – | ✓ Update file › Theme | ✓ `apply-theme` | – |
| [Set up file](file-setup.md): pages and helper components | – | ✓ Update file › Set up file | ✓ `file-setup` | – |
| [Add component sets](build-components.md) | – (lists the sets) <!-- src: apps/studio/src/preview/sections/component-sets.ts:29#37b05aef --> | ✓ Components, then Update file › To add | ✓ `build-components` | – |
| [Update sets in place](update-a-file-safely.md#update-sets-in-place) | – | ✓ Update file › Due | ✓ `update-components` | – |
| [Draw style guides](style-guides.md) | – | ✓ Documentation, then Update file › Style guides <!-- src: apps/studio/src/shell/pages.ts:532-537#aed5e5ff --> | ✓ `style-guide` | – |
| [Remove what the brand no longer uses](update-a-file-safely.md#remove-what-the-brand-no-longer-uses), with a preview | – | ✓ Update file › Clean up | ✓ `prune` | – |
| Draw spec panels | – | ✓ Documentation › Specs <!-- src: apps/studio/src/shell/pages.ts:532-537#aed5e5ff --> | ✓ `draw-specs` | – |
| Read the file back | – | ✓ when the plugin opens | ✓ `readback`, `status` | – |

<!-- src: apps/studio/src/state/update-file.ts:311-338#9e9d6173 --> <!-- src: apps/plugin/src/agent-protocol.ts:41#2ca0eeca -->

## Tokens

| Feature | Web studio | Figma plugin | Agent link | MCP server |
|---|---|---|---|---|
| [Download DTCG token files](export-tokens.md): a base file and one overlay per mode | ✓ <!-- src: apps/studio/src/export-settings.ts:102-111#531be286 --> | ✓ | – | – |
| Write the Figma variable files to a folder | – | – | – | ✓ `export_theme` |
| Score how generated UI used the tokens | – | – | – | ✓ `score_consumption` |

<!-- src: packages/engine/mcp.ts:345-379#c8235700 --> <!-- src: packages/engine/mcp.ts:293-328#a6aa6b2c -->

TokenPress, a separate Figma plugin, exports any Figma file's variables and styles as DTCG token files. See [Export tokens](export-tokens.md#export-any-figma-file-with-tokenpress). <!-- src: apps/tokenpress/README.md:3#68cda092 -->

## Limits worth knowing

- Writing to Figma needs the plugin open. The MCP server does not touch Figma files. <!-- src: packages/engine/README.md:114#782d7cd2 -->
- The agent link is off at every launch, and only the panel can turn it on. <!-- src: apps/plugin/src/agent-link.ts:5-8#e3a1fc8c -->
- Exports start from the brand you set, not from the file's variables. To export what a file holds, use TokenPress. <!-- src: apps/studio/src/export-settings.ts:63-70#9d917e16 --> <!-- src: apps/studio/src/export-settings.ts:81#30e8b1e2 -->
