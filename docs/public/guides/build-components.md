# Build components

<!-- DRAFT for owner review (#2637, lane 4; corrected to the Components area and Update file for #3264). -->

Prism3 defines its components once, and the plugin builds each one as a Figma component set bound to the brand's variables. <!-- src: packages/engine/components/index.ts:113-290#3c5bbce7 -->
The engine currently defines 65 component sets, from Button and Checkbox to Tabs, Accordion and List. <!-- src: packages/engine/components/index.ts:113-290#3c5bbce7 -->

You choose sets in the **Components** area of the rail, and **Update file** builds them. <!-- src: apps/studio/src/state/update-file.ts:330 -->
Building needs the Figma plugin. On the web, the Components area lists the same sets and says "Building sets needs the Figma plugin." <!-- src: apps/studio/src/preview/sections/component-sets.ts:29 -->

## Choose the sets to add

1. Open **Components** in the rail. The list reads "Tick a set or a family to add it to this file; sets it needs come with it. Update file adds them." <!-- src: apps/studio/src/state/component-groups.ts:138 -->
2. Tick each family or set you want. A tier's caption has **Select all**, or **Deselect all** once anything in it is ticked. <!-- src: apps/studio/src/state/component-groups.ts:141-142 -->
3. Choose **Update file** in the top bar. The ticked sets are listed under **Components** › **To add**. <!-- src: apps/studio/src/state/update-file.ts:349-350 -->
4. Choose **Update file** in the dialog to build them. <!-- src: apps/studio/src/state/update-file.ts:426 -->

Each set in the list carries its state in this file: **To add**, **Needed**, **Not in file**, **Due**, **Kept edits**, **Updates off**, **Hand-edited**, **Not checked yet** or **Up to date**. <!-- src: apps/studio/src/state/update-file.ts:409 -->
A set already in the file has a checked box you can't change, and **In file** comes first among its states. A family partly in the file can still be ticked, to add the sets it lacks. <!-- src: apps/studio/src/state/component-groups.ts:150 -->

The sets you tick are kept in the file, not in the panel, so a teammate who opens Update file sees the same list. A set leaves the list once it is built whole; one that fails or is stopped stays on it. <!-- src: apps/plugin/src/add-queue.ts:1-11#32cbe7e4 -->

Keep **Theme** ticked in the same run: the theme is written before any set, so the new sets can use your variables. <!-- src: apps/studio/src/state/update-file.ts:343 --> The run order is fixed. <!-- src: apps/studio/src/state/update-file.ts:47#d0a2a83c -->
On a file that isn't set up yet, the same run sets it up first. See [Set up a file](file-setup.md).

## What a build does

For each set, the plugin: <!-- src: apps/plugin/src/main.ts:918-1041#34f3a25b -->

- builds any set the chosen one contains first, such as the icon and focus ring inside a button;
- creates the set's page if the file does not have it, and switches Figma to that page;
- builds the set, its properties and its prototype interactions;
- adds the page header and the labels beside the set;
- draws the family's usage panel beside its lead, while Docs has usage panels on. <!-- src: apps/plugin/src/main.ts:1006-1007#03cbfa05 --> A family has one panel, beside its lead set: the Buttons page has one, beside Button, and the other sets on the page have none of their own. An icon, the spinner and a provider logo are single components, with no set and no panel. <!-- src: apps/plugin/src/doc-panel.ts:225-226#b6f87a5f -->

A new set's description in Figma is its one-line summary from the engine. A description you wrote on an existing set is kept. <!-- src: apps/plugin/src/write-components.ts:149-150#7bb3ec74 -->

*[Screenshot placeholder: the Components area with a family ticked, and Update file's To add list.]*

## Read the result

The status strip says how the run went, such as "Sets added" or "File updated". <!-- src: apps/studio/src/state/status-strip.ts:143-145 --> Each set's result is in the Activity drawer: <!-- src: apps/plugin/src/apply-summary.ts:85-95#5f523e92 -->

| Result | Meaning |
|---|---|
| `✓ built N variants` | N variants were added. |
| `✓ already built` | Every variant was already in the file, and none was out of date. |
| `✓ N links repaired` | Nothing new was built, but property links on existing variants were fixed. |
| `⚠ N stale` | N variants in the file are out of date with the current brand. Adding left them as they were; Update file lists the set under **Due**. See [Update sets in place](update-a-file-safely.md#update-sets-in-place). |
| `⚠ N misses` | Something did not resolve or bind, such as a variable the file is missing. |
| `✗ nothing built` | Nothing was in the file and nothing could be built. |

A run of several sets is summed up in one line, such as "Built 3 sets" or "Built 2 of 3 sets". <!-- src: apps/studio/src/state/build-queue.ts:126-131 -->

A set that can't be built for this brand is listed with the reason: "Can't be built yet: …". <!-- src: apps/studio/src/preview/sections/component-sets.ts:26 -->

## Adding and updating

Adding a set never replaces one the file already holds. The plugin finds the set by name and adds only what is missing. <!-- src: apps/plugin/src/apply-summary.ts:57-61#68cb2d2d -->
A set already in the file is brought up to date in place instead, under **Due**, with your hand edits kept unless you choose otherwise. See [Update sets in place](update-a-file-safely.md#update-sets-in-place). <!-- src: apps/studio/src/state/update-file.ts:358 -->

Only one write runs at a time, from the panel or an agent: a build asked for while another write runs reads "is already running. Try again when it finishes." <!-- src: apps/plugin/src/run-guard.ts:49-52 -->

## Where each set goes

Sets build onto pages under Components (such as `↳ Buttons`, `↳ Checkbox`, `↳ Tabs`) and Subcomponents (such as `↳ Focus Ring`, `↳ Field Label`, `↳ Spinner`). <!-- src: apps/plugin/src/file-taxonomy.ts:92-190 -->
Icons and provider logos build onto `↳ Icons & assets` under Foundations. <!-- src: apps/plugin/src/file-taxonomy.ts:87 -->

## Specs for your components

<!-- DRAFT copy for the owner (#2996, Q2996.1 hybrid A): the wording, where it sits and the file's path are the owner's to decide. -->

Use Spectacular for any component's spec. It reads a component set in your Figma file and writes its anatomy, props and styles.

Prism3's own components also come with a supplement, starting with Button. It adds what a Figma file can't hold: accessibility, the props and states that exist only in code, motion, right-to-left rules, and the CSS and DTCG name of each token the component uses. It uses the element and prop names Spectacular writes, so you can read the two side by side. Everything it adds sits under `com.prism3`. <!-- src: packages/engine/spec-supplement.ts:64 -->

For a component your team builds itself, Spectacular Pro adds token references to its spec. Prism3 has no supplement for those.
