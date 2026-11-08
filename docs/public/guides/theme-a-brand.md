# Theme a brand

<!-- DRAFT for owner review (#2637, lane 4; corrected to the rail's areas and Update file for #3264). -->

The studio is the same app on the web and inside the Figma plugin: the plugin's panel loads the web studio whole and adds its Figma controls. <!-- src: apps/plugin/src/ui/entry.ts:10-38#6258203d --> <!-- src: apps/plugin/build.mjs:256#184e229f -->
Everything in this guide works in both places. Writing the brand to a Figma file is covered in [Write the theme to a Figma file](apply-a-theme.md).

## Start a brand

The first time the studio opens, a start window offers three ways in. <!-- src: apps/studio/src/shell/start.ts:168-219#f0d574f0 -->

| Card | What it does |
|---|---|
| **Start from your color** | Takes your primary brand color and fills every other setting with a default you can change. **Start blank** begins from a neutral gray instead. <!-- src: apps/studio/src/shell/start.ts:168-182 --> |
| **Explore an example** | Opens one of the example brands, fully built. <!-- src: apps/studio/src/shell/start.ts:203 --> |
| **Import a design.md** | Loads a whole brand from a `design.md` brief. Paste it into the box and choose **Import**, or choose **↑ Upload…** to pick a file. <!-- src: apps/studio/src/shell/start.ts:219-231 --> |

To come back to these later, open the brand menu at the left of the top bar and choose **+ New brand**. The same menu lists the examples and has **↑ Import design.md…**. <!-- src: apps/studio/src/shell/bar.ts:231-234 -->

*[Screenshot placeholder: the start window with its three cards.]*

## Set the levers

A lever is one brand setting, such as the primary color, the type scale or the corner radius. The **Theme** area of the rail groups them into tabs. <!-- src: apps/studio/src/shell/pages.ts:513 -->

| Tab | What it holds |
|---|---|
| **Brand** | The brand's name and namespace (**Identity**), **Personality** and **Modes**. <!-- src: apps/studio/src/shell/pages.ts:156-160 --> |
| **Color** › **Palettes** | **Primary**, **Brand colors**, **Neutrals** and **Status colors**: the ramps every color role draws from. <!-- src: apps/studio/src/shell/pages.ts:168-175 --> |
| **Color** › **Surfaces & fills** | Background and foreground fills, scrim, glass, text, borders, icons, fields and gradients. <!-- src: apps/studio/src/shell/pages.ts:192 --> |
| **Color** › **Interactive** | How actions, links and disabled states draw from the palettes. <!-- src: apps/studio/src/shell/pages.ts:225 --> |
| **Type** | A typeface library, a font family for each text type, and the scale. <!-- src: apps/studio/src/shell/pages.ts:281-290 --> |
| **Shape** | **Density**, **Radius** and the base radius. <!-- src: apps/studio/src/shell/pages.ts:336-342 --> |
| **Depth & motion** | **Elevation**, **Motion** and the shadow tint. <!-- src: apps/studio/src/shell/pages.ts:353-357 --> |
| **Layout** | **Grid**, **Breakpoints** and **Containers**. <!-- src: apps/studio/src/shell/pages.ts:365-370 --> |

Component settings, such as how buttons place their icons, are in the **Components** area, beside the list of component sets. See [Build components](build-components.md). <!-- src: apps/studio/src/shell/pages.ts:383-422 -->

Some sections start folded. Open them with the "Show N advanced" button under the section list. <!-- src: apps/studio/src/domains/color-palettes.ts:319 -->

**Personality** words fill the settings you have not set yet. Settings you set win. <!-- src: apps/studio/src/shell/pages.ts:159 -->
On **Palettes**, your colors are pinned as anchors on their ramps and never shifted. <!-- src: apps/studio/src/shell/pages.ts:168 -->

## Read the preview

Each tab shows its levers on one side and a preview on the other. <!-- src: apps/studio/src/shell/frame.ts:16-19#7ed29f7d -->

- **Preview mode** switches the preview between the brand's modes. <!-- src: apps/studio/src/shell/preview.ts:78 -->
- The **Palettes** tab always shows Light, and the mode control is off while it is open: "Palettes always show Light. Ramps are the same in every mode." <!-- src: apps/studio/src/preview/palettes.ts:32 -->
- A derived mode, such as a high-contrast one, is shown but not edited. The studio says "is auto-derived and can't be edited here. Switch the preview to Light or Dark to edit." <!-- src: apps/studio/src/shell/frame.ts:124 -->
- **Inspect** opens two views over any tab: **Contrast**, each pair against its floor, and **Tokens**. <!-- src: apps/studio/src/shell/pages.ts:120 --> <!-- src: apps/studio/src/shell/preview.ts:245 -->

A contrast miss is reported, never blocked. On **Foreground fills**, for example, a pick below its floor is marked, not refused. <!-- src: apps/studio/src/shell/pages.ts:206 -->

## Where your work is kept

- On the web, the studio keeps your working brand in this browser and reopens it next time. <!-- src: apps/studio/src/persist-local.ts:40-79#7bd91f4c -->
- In the Figma plugin, the brand is kept in the Figma file each time Update file writes the theme, and the plugin restores it when the file opens again. <!-- src: apps/plugin/src/apply-theme.ts:168-170#ede61fb0 --> <!-- src: apps/plugin/src/main.ts:2141-2148#e56247fc -->

If a stored brand can't be opened, the web studio offers it as a `design.md` download instead of discarding it. <!-- src: apps/studio/src/entry.ts:132-161 -->

## Import and export a design.md brief

A `design.md` is a brand written as a short document: settings at the top, prose below. <!-- src: packages/engine/mcp.ts:332 -->
The studio reads both the Prism3 form and the standard design.md form, <!-- src: apps/studio/src/state/start-input.ts:162-184#345a4c9d --> which lists colors as a flat `colors:` map. <!-- src: packages/engine/standard-design-md.ts:109-110 -->

- Import: **↑ Import design.md…** in the brand menu, then paste the brief and choose **Load**, or choose **↑ Upload .md**. The **Import a design.md** card in the start window works the same way. <!-- src: apps/studio/src/shell/bar.ts:234-290 -->
- Export: open **Export** in the rail, choose **Brand brief**, then **↓ Download brief**. The file is named `<brand>.design.md`. The brief has no settings: "Nothing to set — the brief is written one way." <!-- src: apps/studio/src/export-settings.ts:114 --> <!-- src: apps/studio/src/main.ts:1484-1509 -->

A brief is the way to hand a brand to someone else, or to an agent: importing it rebuilds the same brand. For token files, see [Export tokens](export-tokens.md).
