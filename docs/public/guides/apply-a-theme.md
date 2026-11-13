# Write the theme to a Figma file

<!-- DRAFT for owner review (#2637, lane 4; retitled and rewritten around Update file for #3264). -->

To write the brand you set in the studio into the open Figma file, choose **Update file** in the plugin's top bar, make sure **Theme** is ticked, and choose **Update file** in the dialog. <!-- src: apps/studio/src/state/update-file.ts:308-322 -->
The item reads "The brand's variables and styles. Layers bound to them restyle at once." <!-- src: apps/studio/src/state/update-file.ts:321-322 -->
It is ticked when the dialog opens only if the file's variables differ from the brand. <!-- src: apps/studio/src/state/update-file.ts:174-181#dcd3d3c6 -->
When they already match, it is unticked and reads "Up to date"; tick it to write the brand again. <!-- src: apps/studio/src/state/update-file.ts:324 -->
It is in the Figma plugin only: the web studio has no file to write to. <!-- src: apps/studio/src/shell/bar.ts:108#1bd757c2 -->

Each run checks the file first and writes only once nothing conflicts, or once you have chosen what happens to each conflict. It never deletes anything. <!-- src: apps/plugin/src/apply-theme.ts:80-121#6a30db6f --> <!-- src: apps/plugin/src/preflight.ts:157-216#328537d5 -->
The rest of the checklist, and how a run works, is in [Update a Figma file](update-a-file-safely.md).

## What gets written

| In Figma | What Prism3 writes |
|---|---|
| Variable collections | `core`, holding the palette ramps, base dimensions and fonts; `color`, holding every color role; `layout`; `type-sets`; and one collection each for space, size, radius, border width, focus, opacity, motion, icon and control sizes. <!-- src: packages/engine/emit-figma.ts:173-258 --> |
| Modes | On `color`, one mode per appearance mode the brand ships, such as light, dark and the high-contrast pair. On `layout`, one mode per breakpoint. On `type-sets`, a desktop and a mobile mode. <!-- src: packages/engine/emit-figma.ts:173-258 --> |
| Text styles | One per text role, bound to the font variables, so changing a variable restyles the text. <!-- src: apps/plugin/src/apply-theme.ts:171-174#1bee3622 --> |
| Effect styles | The shadow ramp. <!-- src: apps/plugin/src/apply-theme.ts:118-185#b170bd97 --> |
| Paint styles | Gradients, when the brand turns them on. <!-- src: apps/plugin/src/apply-theme.ts:118-185#b170bd97 --> |
| Grid styles | One per breakpoint, from the same layout values as the `layout` collection. A grid style can't switch modes, so each breakpoint gets its own. <!-- src: packages/engine/emit-figma-styles.ts:289-302 --> |
| The brand itself | The settings you applied, saved in the file, so the plugin reopens on this brand next time. <!-- src: apps/plugin/src/apply-theme.ts:178-180#ede61fb0 --> <!-- src: apps/plugin/src/persist-figma.ts:30-35#ba150bb3 --> |

Every collection and style Prism3 creates carries a small mark that says Prism3 made it. That mark is how later runs tell Prism3's content from yours. <!-- src: apps/plugin/src/provenance.ts:1-57#dce1a9a1 -->

The variables the plugin writes match the ones the engine emits for the same brand. CI checks this: it exports the plugin's written file and compares it, token by token, with the engine's own output. <!-- src: apps/plugin/test-readback-parity.ts:1-22#750fb90a -->

## Run it

1. Set the brand in the studio. See [Theme a brand](theme-a-brand.md).
2. Choose **Update file** in the top bar. The dialog opens with **Theme** ticked, since the file doesn't hold that brand yet. <!-- src: apps/studio/src/state/update-file.ts:308-321 -->
3. Untick anything else that should wait, then choose **Update file**. The top bar's button reads **Updating** while it runs. <!-- src: apps/studio/src/state/update-file.ts:309 -->
4. When the theme is written, the status strip says "Theme applied". The full result is in the Activity drawer. <!-- src: apps/studio/src/state/status-strip.ts:143 -->

| Result | Meaning |
|---|---|
| `✓ applied` | Everything was written. <!-- src: apps/plugin/src/apply-summary.ts:37 --> |
| `✓ applied, N skipped` | The variables were written, but N text styles were not, because Figma could not load their font. The detail names them. <!-- src: apps/plugin/src/apply-summary.ts:36 --> |
| `⚠ N misses` | The theme named a variable this file does not have, so something did not bind. <!-- src: apps/plugin/src/apply-summary.ts:30 --> |
| `✗ N conflicts` | Nothing was written. See below. <!-- src: apps/plugin/src/apply-summary.ts:63-64 --> |
| `✗ write failed` | Figma refused a write partway through. The detail holds Figma's message. <!-- src: apps/plugin/src/apply-summary.ts:42 --> |

*[Screenshot placeholder: the Activity drawer after a clean theme write.]*

## What makes it refuse

Before the first write, the plugin reads everything it is about to touch. If the file already holds something with the same name that Prism3 did not create, it writes nothing and lists each conflict: <!-- src: apps/plugin/src/preflight.ts:157-216#328537d5 -->

> Nothing was written. 2 conflicts with existing content: …

Each conflict says why: <!-- src: apps/plugin/src/preflight.ts:183#bdc1c449 --> <!-- src: apps/plugin/src/preflight.ts:191#a4c4f21e --> <!-- src: apps/plugin/src/preflight.ts:212#52946846 --> <!-- src: apps/plugin/src/preflight.ts:237#e2d4345c -->

- `already in this file, not created by Prism3`: a collection or style with that name exists and carries no Prism3 mark.
- `Prism3 writes`: a variable with that name exists with a different type. The conflict names both types and the collection.

The plugin then lists the conflicts and asks what to do with each: **Skip** leaves the item as it is and writes the rest, and **Rename** writes Prism3's own beside it under a new name. One choice can cover them all. Until each conflict has a choice, nothing is written, and Cancel leaves the file as it is. The choice holds for that run only. <!-- src: apps/studio/src/state/collisions.ts:48 -->

Or rename or remove the named items yourself, then run Update file again. A file with its own library collections can take Prism3's alongside them as long as no names collide. <!-- src: apps/plugin/src/preflight.ts:157-216#328537d5 -->

One exception: a grid style whose name is taken is skipped for that breakpoint, and the rest of the theme is written. <!-- src: apps/plugin/src/write-grid-styles.ts:37-42#3eb25501 -->

Two more cases stop the theme before it starts:

- Another write is running, from an agent: "is already running. Try again when it finishes." <!-- src: apps/plugin/src/run-guard.ts:49-52 -->
- The file's saved brand didn't open. Update file's write stays off, with the reason: "Off until a brand loads. This file's saved brand didn't open, and writing now would put the demo brand over it." <!-- src: apps/studio/src/main.ts:1835 -->

## Writing it again

Run Update file with **Theme** ticked after any change. <!-- src: apps/studio/src/state/update-file.ts:321 -->
Content Prism3 wrote is updated in place, and a renamed token moves to its new name rather than being written twice. <!-- src: apps/plugin/src/apply-theme.ts:104-113#7e0aa344 -->

A token the brand no longer produces is reported, not deleted. To remove those, use the **Clean up** tab: see [Update a Figma file](update-a-file-safely.md#remove-what-the-brand-no-longer-uses). <!-- src: apps/studio/src/state/update-file.ts:312 -->
