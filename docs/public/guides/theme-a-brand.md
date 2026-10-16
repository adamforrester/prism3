# Theme a brand

<!-- DRAFT for owner review (#2637, lane 4). -->

The studio is the same app on the web and inside the Figma plugin: the plugin's panel loads the web studio whole and adds its Figma controls. <!-- src: apps/plugin/src/ui/entry.ts:10-36 --> <!-- src: apps/plugin/build.mjs:229 -->
Everything in this guide works in both places. Writing to a Figma file is covered in [Apply a theme to a Figma file](apply-a-theme.md).

## Start a brand

The first time the studio opens, a start window offers three ways in. <!-- src: apps/studio/src/shell/start.ts:155 --> <!-- src: apps/studio/src/shell/start.ts:190 --> <!-- src: apps/studio/src/shell/start.ts:206 -->

| Card | What it does |
|---|---|
| **Start from your color** | Takes your primary brand color and fills every other setting with a default you can change. **Start blank** begins from a neutral gray instead. <!-- src: apps/studio/src/shell/start.ts:155 --> <!-- src: apps/studio/src/shell/start.ts:169 --> |
| **Explore an example** | Opens one of the example brands, fully built. <!-- src: apps/studio/src/shell/start.ts:190 --> <!-- src: apps/studio/src/state/store.ts:33 --> |
| **Import a design.md** | Loads a whole brand from a `design.md` brief. Paste it into the box and choose **Import**, or choose **↑ Upload…** to pick a file. <!-- src: apps/studio/src/shell/start.ts:206-219 --> |

To come back to these later, open the brand menu in the top bar and choose **+ New brand**. The same menu lists the examples and has **↑ Import design.md…**. <!-- src: apps/studio/src/shell/bar.ts:285-292 -->

*[Screenshot placeholder: the start window with its three cards.]*

## Set the levers

A lever is one brand setting, such as the primary color, the type scale or the corner radius. The studio groups them into tabs. <!-- src: apps/studio/src/shell/pages.ts:123-341 -->

| Tab | What it holds |
|---|---|
| **Brand** | The brand's name and namespace (**Identity**), **Personality** and **Modes**. <!-- src: apps/studio/src/shell/pages.ts:126-132 --> |
| **Color › Palettes** | **Primary**, **Brand colors**, **Neutrals** and **Status colors**: the ramps every color role draws from. <!-- src: apps/studio/src/shell/pages.ts:137-147 --> |
| **Color › Surfaces & fills** | Background and foreground fills, text, borders, icons, fields and gradients. <!-- src: apps/studio/src/shell/pages.ts:163-188 --> |
| **Color › Interactive** | How actions, links and disabled states draw from the palettes. <!-- src: apps/studio/src/shell/pages.ts:191-226 --> |
| **Type** | A typeface library, a font family for each text type, and the scale. <!-- src: apps/studio/src/shell/pages.ts:236-272 --> |
| **Shape** | **Density**, **Radius** and the base radius. <!-- src: apps/studio/src/shell/pages.ts:284-288 --> |
| **Depth & motion** | **Elevation**, **Motion** and the shadow tint. <!-- src: apps/studio/src/shell/pages.ts:299-303 --> |
| **Layout** | **Breakpoints**, **Grid** and **Containers**. <!-- src: apps/studio/src/shell/pages.ts:311-316 --> |
| **Components** | **Button** options and the **Component sets** list. <!-- src: apps/studio/src/shell/pages.ts:327-339 --> |

Some sections start folded. Choose **Show *N* advanced** to open them. <!-- src: apps/studio/src/domains/color-palettes.ts:299 -->

**Personality** words fill the settings you have not set yet. Settings you set win. <!-- src: apps/studio/src/shell/pages.ts:130 -->
On **Palettes**, your colors are pinned as anchors on their ramps and never shifted. <!-- src: apps/studio/src/shell/pages.ts:139 -->

## Read the preview

Each tab shows its levers on one side and a preview on the other. <!-- src: apps/studio/src/shell/frame.ts:16-19 -->

- **Preview mode** switches the preview between the brand's modes. <!-- src: apps/studio/src/shell/preview.ts:77 --> <!-- src: apps/studio/src/shell/preview.ts:104 -->
- The **Palettes** tab always shows Light, and the mode control is off while it is open. <!-- src: apps/studio/src/shell/frame.ts:97-102 -->
- A derived mode, such as a high-contrast one, is shown but not edited. The studio says "*Mode* is auto-derived and can't be edited here. Switch the preview to Light or Dark to edit." <!-- src: apps/studio/src/shell/frame.ts:114 -->
- **Inspect** opens three views over any tab: **Contrast** (each pair against its floor), **Tokens**, and the **Decisions log**, which lists what the engine decided for this brand and why. <!-- src: apps/studio/src/shell/pages.ts:99 --> <!-- src: apps/studio/src/shell/preview.ts:227 --> <!-- src: apps/studio/src/shell/preview.ts:294-298 -->

A contrast miss is reported, never blocked. On **Foreground fills**, for example, a pick below its floor is marked, not refused. <!-- src: apps/studio/src/shell/pages.ts:174 -->

## Where your work is kept

- **On the web**, the studio keeps your working brand in this browser and reopens it next time. <!-- src: apps/studio/src/persist-local.ts:40-79 --> <!-- src: apps/studio/src/entry.ts:61 --> <!-- src: apps/studio/src/entry.ts:82 -->
- **In the Figma plugin**, the brand is kept in the Figma file each time Apply Theme writes it, and the plugin restores it when the file opens again. <!-- src: apps/plugin/src/apply-theme.ts:114-116 --> <!-- src: apps/plugin/src/main.ts:1149-1157 -->

If a stored brand can't be opened, the web studio offers it as a `design.md` download instead of discarding it. <!-- src: apps/studio/src/entry.ts:137-166 -->

## Import and export a design.md brief

A `design.md` is a brand written as a short document: settings at the top, prose below. <!-- src: packages/engine/mcp.ts:323 -->
The studio reads both the Prism3 form and the standard design.md form, which lists colors as a flat `colors:` map. <!-- src: apps/studio/src/state/start-input.ts:162-184 -->

- **Import:** **↑ Import design.md…** in the brand menu, or the **Import a design.md** card. <!-- src: apps/studio/src/shell/bar.ts:288 --> <!-- src: apps/studio/src/shell/start.ts:206 -->
- **Export:** open **Export**, choose **Brand brief**, then **↓ Download brief**. The file is named `<brand>.design.md`. The brief has no settings: "Nothing to set — the brief is written one way." <!-- src: apps/studio/src/export-settings.ts:111-115 --> <!-- src: apps/studio/src/main.ts:1445 --> <!-- src: apps/studio/src/main.ts:1447 -->

A brief is the way to hand a brand to someone else, or to an agent: importing it rebuilds the same brand. For token files, see [Export tokens](export-tokens.md).
