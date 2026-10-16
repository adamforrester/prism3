# Apply a theme to a Figma file

<!-- DRAFT for owner review (#2637, lane 4). -->

**Apply Theme** writes the brand you set in the studio into the open Figma file. It is the filled button in the plugin's top bar. <!-- src: apps/studio/src/shell/bar.ts:147-154 --> <!-- src: apps/studio/src/main.ts:1769-1770 -->
It is in the Figma plugin only: the web studio has no file to write to. <!-- src: apps/studio/src/write-adapter.ts:75-148 -->

Each run checks the file first and writes only if nothing conflicts. It never deletes anything. <!-- src: apps/plugin/src/apply-theme.ts:67-74 --> <!-- src: apps/plugin/src/preflight.ts:144-224 -->

## What gets written

| In Figma | What Prism3 writes |
|---|---|
| **Variable collections** | `core`, holding the palette ramps, base dimensions and fonts; `color`, holding every color role; `layout`; `type-sets`; and one collection each for space, size, radius, border width, focus, opacity, motion, icon and control sizes. <!-- src: packages/engine/emit-figma.ts:173-258 --> <!-- src: apps/plugin/src/apply-theme.ts:85-104 --> |
| **Modes** | On `color`, one mode per appearance mode the brand ships, such as light, dark and the high-contrast pair. On `layout`, one mode per breakpoint. On `type-sets`, a desktop and a mobile mode. <!-- src: packages/engine/emit-figma.ts:173-258 --> <!-- src: packages/engine/schema/theme-schema.json:22 --> |
| **Text styles** | One per text role, bound to the font variables, so changing a variable restyles the text. <!-- src: apps/plugin/src/apply-theme.ts:106-110 --> |
| **Effect styles** | The shadow ramp. <!-- src: apps/plugin/src/apply-theme.ts:97-99 --> |
| **Paint styles** | Gradients, when the brand turns them on. <!-- src: apps/plugin/src/apply-theme.ts:97-99 --> <!-- src: apps/studio/src/shell/pages.ts:187 --> |
| **Grid styles** | One per breakpoint, from the same layout values as the `layout` collection. A grid style can't switch modes, so each breakpoint gets its own. <!-- src: apps/plugin/src/apply-theme.ts:100-105 --> |
| **The brand itself** | The settings you applied, saved in the file, so the plugin reopens on this brand next time. <!-- src: apps/plugin/src/apply-theme.ts:114-116 --> <!-- src: apps/plugin/src/persist-figma.ts:30-35 --> |

Every collection and style Prism3 creates carries a small mark that says Prism3 made it. That mark is how later runs tell Prism3's content from yours. <!-- src: apps/plugin/src/provenance.ts:1-58 -->

The variables the plugin writes match the ones the engine emits for the same brand. CI checks this: it exports the plugin's written file and compares it, token by token, with the engine's own output. <!-- src: apps/plugin/test-readback-parity.ts:1-22 -->

## Run it

1. Set the brand in the studio. See [Theme a brand](theme-a-brand.md).
2. Choose **Apply Theme**. The button reads **Applying…** while it runs. <!-- src: apps/studio/src/shell/bar.ts:154 -->
3. Read the result in the **Activity** drawer. <!-- src: apps/studio/src/shell/activity.ts:5-9 --> <!-- src: apps/studio/src/shell/activity.ts:76 -->

| Result | Meaning |
|---|---|
| `✓ applied` | Everything was written. <!-- src: apps/plugin/src/apply-summary.ts:37 --> |
| `✓ applied, N skipped` | The variables were written, but N text styles were not, because Figma could not load their font. The detail names them. <!-- src: apps/plugin/src/apply-summary.ts:22-24 --> <!-- src: apps/plugin/src/apply-summary.ts:36 --> |
| `⚠ N misses` | The theme named a variable this file does not have, so something did not bind. <!-- src: apps/plugin/src/apply-summary.ts:20-21 --> <!-- src: apps/plugin/src/apply-summary.ts:30--> |
| `✗ N conflicts` | Nothing was written. See below. <!-- src: apps/plugin/src/apply-summary.ts:47-48 --> |
| `✗ write failed` | Figma refused a write partway through. The detail holds Figma's message. <!-- src: apps/plugin/src/apply-summary.ts:42 --> |

*[Screenshot placeholder: the Activity drawer after a clean apply.]*

## What makes it refuse

Before the first write, the plugin reads everything it is about to touch. If the file already holds something with the same name that Prism3 did not create, it writes nothing and lists each conflict: <!-- src: apps/plugin/src/preflight.ts:144-224 -->

> Nothing was written. 2 conflicts with existing content: …

Each conflict says why: <!-- src: apps/plugin/src/preflight.ts:174 --> <!-- src: apps/plugin/src/preflight.ts:182 --> <!-- src: apps/plugin/src/preflight.ts:203 --> <!-- src: apps/plugin/src/preflight.ts:228 -->

- `already in this file, not created by Prism3`: a collection or style with that name exists and carries no Prism3 mark.
- `is <TYPE> in "<collection>"; Prism3 writes <TYPE>`: a variable with that name exists with a different type.

Rename or remove the named items, then apply again. A file with its own library collections can take Prism3's alongside them as long as no names collide. <!-- src: apps/plugin/src/preflight.ts:144-216 -->

One exception: a grid style whose name is taken is skipped for that breakpoint, and the rest of the apply goes ahead. <!-- src: apps/plugin/src/write-grid-styles.ts:37-42 -->

Two more cases stop Apply Theme before it starts:

- **Another apply is running**, from the panel or from an agent: "Apply Theme is already running. Try again when it finishes." <!-- src: apps/plugin/src/run-guard.ts:21-23 --> <!-- src: apps/plugin/src/run-guard.ts:39 -->
- **The file's saved brand didn't open.** Apply Theme stays off, with the reason: "Off until a brand loads. This file's saved brand didn't open, and writing now would put the demo brand over it." <!-- src: apps/studio/src/main.ts:1698 --> <!-- src: apps/studio/src/main.ts:1769-1770 -->

## Applying again

Apply again after any change. Content Prism3 wrote is updated in place, and a renamed token moves to its new name rather than being written twice. <!-- src: apps/plugin/src/apply-theme.ts:75-84 --> <!-- src: apps/plugin/src/main.ts:197-347 -->

A token the brand no longer produces is reported, not deleted. To remove those, use **Prune stale**: see [Update a real file safely](update-a-file-safely.md#remove-what-the-brand-no-longer-uses). <!-- src: apps/plugin/src/main.ts:370-495 -->
