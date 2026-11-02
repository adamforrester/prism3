# Build components

<!-- DRAFT for owner review (#2637, lane 4; corrected to the Components area and Update file for #3264). -->

Prism3 defines its components once, and the plugin builds each one as a Figma component set bound to the brand's variables. <!-- src: packages/engine/components/index.ts:107-274 -->
The engine currently defines 60 component sets, from Button and Checkbox to Tabs, Accordion and List. <!-- src: packages/engine/components/index.ts:107-274 -->

You choose sets in the **Components** area of the rail, and **Update file** builds them. <!-- src: apps/studio/src/state/update-file.ts:185 -->
Building needs the Figma plugin. On the web, the Components area lists the same sets and says "Building sets needs the Figma plugin." <!-- src: apps/studio/src/preview/sections/component-sets.ts:29 -->

## Choose the sets to add

1. Open **Components** in the rail. The list reads "Tick a family to add its sets to this file; Update file adds them." <!-- src: apps/studio/src/state/component-groups.ts:120 -->
2. Tick each family or set you want. A tier's caption has **Select all**, or **Deselect all** once anything in it is ticked. <!-- src: apps/studio/src/state/component-groups.ts:122-123 -->
3. Choose **Update file** in the top bar. The ticked sets are listed under **Components** › **To add**. <!-- src: apps/studio/src/state/update-file.ts:200-201 -->
4. Choose **Update file** in the dialog to build them. <!-- src: apps/studio/src/state/update-file.ts:231 -->

Each set in the list carries its state in this file: **To add**, **Not in file**, **Due**, **Hand-edited**, **Not checked yet** or **Up to date**. <!-- src: apps/studio/src/state/update-file.ts:226 -->

The sets you tick are kept in the file, not in the panel, so a teammate who opens Update file sees the same list. A set leaves the list once it is built whole; one that fails or is stopped stays on it. <!-- src: apps/plugin/src/add-queue.ts:1-11 -->

Keep **Theme** ticked in the same run: the theme is written before any set, so the new sets can use your variables. <!-- src: apps/studio/src/state/update-file.ts:196 --> The run order is fixed. <!-- src: apps/studio/src/state/update-file.ts:35 -->
On a file that isn't set up yet, the same run sets it up first. See [Set up a file](file-setup.md).

## What a build does

For each set, the plugin: <!-- src: apps/plugin/src/main.ts:781-871 -->

- builds any set the chosen one contains first, such as the icon and focus ring inside a button;
- creates the set's page if the file does not have it, and switches Figma to that page;
- builds the set, its properties and its prototype interactions;
- adds the page header and the labels beside the set;
- draws its usage panel beside it, while Documentation has usage panels on. <!-- src: apps/plugin/src/main.ts:851-852 -->

A new set's description in Figma is its one-line summary from the engine. A description you wrote on an existing set is kept. <!-- src: apps/plugin/src/write-components.ts:147-148 -->

*[Screenshot placeholder: the Components area with a family ticked, and Update file's To add list.]*

## Read the result

The status strip says how the run went, such as "Sets added" or "File updated". <!-- src: apps/studio/src/state/status-strip.ts:141-143 --> Each set's result is in the Activity drawer: <!-- src: apps/plugin/src/apply-summary.ts:82-92 -->

| Result | Meaning |
|---|---|
| `✓ built N variants` | N variants were added. |
| `✓ already built` | Every variant was already in the file, and none was out of date. |
| `✓ N links repaired` | Nothing new was built, but property links on existing variants were fixed. |
| `⚠ N stale` | N variants in the file are out of date with the current brand. Adding left them as they were; Update file lists the set under **Due**. See [Update sets in place](update-a-file-safely.md#update-sets-in-place). |
| `⚠ N misses` | Something did not resolve or bind, such as a variable the file is missing. |
| `✗ nothing built` | Nothing was in the file and nothing could be built. |

A run of several sets is summed up in one line, such as "Built 3 sets" or "Built 2 of 3 sets". <!-- src: apps/studio/src/state/build-queue.ts:65-70 -->

A set that can't be built for this brand is listed with the reason: "Can't be built yet: …". <!-- src: apps/studio/src/preview/sections/component-sets.ts:26 -->

## Adding and updating

Adding a set never replaces one the file already holds. The plugin finds the set by name and adds only what is missing. <!-- src: apps/plugin/src/apply-summary.ts:54-58 -->
A set already in the file is brought up to date in place instead, under **Due**, with your hand edits kept unless you choose otherwise. See [Update sets in place](update-a-file-safely.md#update-sets-in-place). <!-- src: apps/studio/src/state/update-file.ts:207 -->

Only one build runs at a time, from the panel or an agent: a second request reads "is already running. Try again when it finishes." <!-- src: apps/plugin/src/run-guard.ts:38-42 -->

## Where each set goes

Sets build onto pages under Components (such as `↳ Buttons`, `↳ Checkbox`, `↳ Tabs`) and Subcomponents (such as `↳ Focus Ring`, `↳ Field Label`, `↳ Spinner`). <!-- src: apps/plugin/src/file-taxonomy.ts:92-190 -->
Icons and provider logos build onto `↳ Icons & assets` under Foundations. <!-- src: apps/plugin/src/file-taxonomy.ts:87 -->
