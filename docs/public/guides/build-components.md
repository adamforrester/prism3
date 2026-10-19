# Build components

<!-- DRAFT for owner review (#2637, lane 4). -->

Prism3 defines its components once, and the plugin builds each one as a Figma component set bound to the brand's variables. <!-- src: packages/engine/components/index.ts:87-197 --> <!-- src: apps/plugin/src/main.ts:568-606 -->
The engine currently defines 41 component sets, from Button and Checkbox to Tabs, Accordion and List. <!-- src: packages/engine/components/index.ts:91-213 --> <!-- src: apps/plugin/src/file-taxonomy.ts:85-143 -->

Building needs the Figma plugin. On the web, the Components tab lists the same sets and says "Building sets needs the Figma plugin." <!-- src: apps/studio/src/preview/sections/component-sets.ts:34 -->

## Before you build

1. [Apply the theme](apply-a-theme.md) first, so the set can use your variables. The Components tab reminds you: "Apply Theme first, so the set can use your variables." <!-- src: apps/studio/src/preview/sections/component-sets.ts:38 -->
2. [Set up the file](file-setup.md), so the component pages get their headers and canvas labels. <!-- src: apps/plugin/src/file-components.ts:34-35 --> <!-- src: apps/plugin/src/canvas-furniture.ts:43-64 -->

## Build a set

1. Open the **Components** tab, or choose **Build sets…** in the **Figma** menu, which opens it. <!-- src: apps/studio/src/main.ts:1782-1783 -->
2. Under **Component sets**, pick the set to build. Each entry shows what it contains and how many parts it has. <!-- src: apps/studio/src/shell/pages.ts:339 --> <!-- src: apps/studio/src/preview/sections/component-sets.ts:29-30 --> <!-- src: apps/studio/src/preview/sections/component-sets.ts:44 -->
3. Choose **Build *Name***, for example **Build Button**. It reads **Building…** while it runs. <!-- src: apps/studio/src/preview/sections/component-sets.ts:35-36 -->

The plugin then: <!-- src: apps/studio/src/preview/sections/component-sets.ts:37 --> <!-- src: apps/plugin/src/main.ts:568-860 -->

- builds any set the chosen one contains first, such as the icon and focus ring inside a button;
- creates the set's `↳` page if the file does not have it, and switches Figma to that page;
- builds the set, its properties and its prototype interactions;
- adds the page header and the labels beside the set.

A new set's description in Figma is its one-line summary from the engine. A description you wrote on an existing set is kept. <!-- src: apps/plugin/src/write-components.ts:147-148 -->

*[Screenshot placeholder: the Components tab with a set picked and the Build button.]*

## Read the result

The set's entry and the **Activity** drawer show the result. <!-- src: apps/studio/src/preview/sections/component-sets.ts:39-42 --> <!-- src: apps/plugin/src/apply-summary.ts:82-92 -->

| Result | Meaning |
|---|---|
| `✓ built N variants` | N variants were added. |
| `✓ already built` | Every variant was already in the file, and none was out of date. |
| `✓ N links repaired` | Nothing new was built, but property links on existing variants were fixed. |
| `⚠ N stale` | N variants in the file are out of date with the current brand. Build left them as they were. To bring them up to date, see [Update a real file safely](update-a-file-safely.md). |
| `⚠ N misses` | Something did not resolve or bind, such as a variable the file is missing. |
| `✗ nothing built` | Nothing was in the file and nothing could be built. |

A set that can't be built for this brand is listed with the reason: "Can't be built yet: …". <!-- src: apps/studio/src/preview/sections/component-sets.ts:31-33 -->

## Building again

Building the same set again is safe. The plugin finds the set by name and adds only what is missing; it does not replace a variant that is already there. <!-- src: apps/plugin/src/apply-summary.ts:54-58 -->
That is why a changed brand can leave variants stale: Build adds, it does not rewrite.

Only one build runs at a time, from the panel or an agent: "Build set is already running. Try again when it finishes." <!-- src: apps/plugin/src/run-guard.ts:21-23 --> <!-- src: apps/plugin/src/run-guard.ts:39 -->

## Where each set goes

Sets build onto pages under **Components** (such as `↳ Buttons`, `↳ Checkbox`, `↳ Tabs`) and **Subcomponents** (such as `↳ Focus Ring`, `↳ Field Label`, `↳ Spinner`). Icons build onto `↳ Icons & assets` under Foundations. <!-- src: apps/plugin/src/file-taxonomy.ts:68-127 -->
