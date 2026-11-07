# Export tokens

<!-- DRAFT for owner review (#2637, lane 4; corrected to the Export area for #3264). -->

There are two ways to get token files out, and they start from different places:

- Export, an area of the Prism3 studio on the web and in the plugin, writes the brand you set in the studio. <!-- src: apps/studio/src/shell/pages.ts:517#a3230059 --> <!-- src: apps/studio/src/export-settings.ts:63-70#9d917e16 -->
- TokenPress, a separate Figma plugin, writes what a Figma file holds: its variables, text styles and effect styles, whoever made them. <!-- src: apps/tokenpress/README.md:3#68cda092 --> <!-- src: apps/tokenpress/README.md:107-115#f1f2ff21 -->

## Export from the studio

1. Open **Export** in the rail. <!-- src: apps/studio/src/shell/pages.ts:517 -->
2. Choose **Design tokens**: "The token set in the W3C design-token format, aliases intact: a base file and one overlay per mode. These are the files a build reads." <!-- src: apps/studio/src/export-settings.ts:105-110 -->
3. Set the options. The file list and a preview beside them update as you change them. <!-- src: apps/studio/src/main.ts:1466-1470#ce59ed88 -->
4. Choose **↓ Download tokens**. <!-- src: apps/studio/src/main.ts:1508 -->

*[Screenshot placeholder: the Export area with Design tokens selected and the file list.]*

| Option | Choices |
|---|---|
| **Token names** | `color.on-fill` or `color.on_fill` <!-- src: apps/studio/src/export-settings.ts:183-189 --> |
| **Grouping** | **Nested groups** or **One flat level** <!-- src: apps/studio/src/export-settings.ts:196-201 --> |
| **Files** | **One per mode** or **One per group** <!-- src: apps/studio/src/export-settings.ts:209-216 --> |
| **Formatting** | **Indented** or **Compact** <!-- src: apps/studio/src/export-settings.ts:224-229 --> |
| **Include build metadata** | **Off** by default. "For internal use. Adds how each token was built, and what built the file. A consumer's build never reads it, so the handoff leaves it out." <!-- src: apps/studio/src/export-settings.ts:644-652 --> |

### What you get

With **One per mode** <!-- src: apps/studio/src/export-settings.ts:214 -->, the download is a base file plus one overlay file per extra mode: <!-- src: packages/engine/emit-dtcg-overlay.ts:10-13#cb75b242 -->

- `<brand>.base.tokens.json` holds every token at its default-mode value.
- `<brand>.<mode>.overlay.tokens.json`, for example `<brand>.dark.overlay.tokens.json`, holds only the tokens whose value changes in that mode.

A build reads the base and then the overlay for the mode it wants. Style Dictionary does this with its stock setup, and CI checks that it still does. <!-- src: packages/engine/emit-dtcg-overlay.ts:22-25#827e558d --> <!-- src: packages/tokens/check-consumability.mjs:265-274#306a7f75 -->
The modes here are the appearance modes (such as dark and the high-contrast pair). Breakpoint values travel inside the layout tokens themselves; the per-breakpoint detail the engine keeps for its own use is left out of these files. <!-- src: packages/engine/emit-dtcg-overlay.ts:37-41#daf3ffcf -->

Several files arrive as several downloads, not as one ZIP. <!-- src: apps/studio/src/main.ts:1331-1338#12963735 -->

The same brand exports the same files from the web studio and from the plugin; CI compares the two byte for byte. <!-- src: apps/studio/test-export-parity.mjs:1-3#2bb0d110 --> <!-- src: apps/studio/test-export-parity.mjs:256#21ecd0a3 -->

To hand over the brand itself rather than its tokens, choose **Brand brief** instead; see [Theme a brand](theme-a-brand.md#import-and-export-a-designmd-brief). <!-- src: apps/studio/src/export-settings.ts:112-116 -->

## Export any Figma file with TokenPress

TokenPress is listed in Figma as "Token Press - DTCG Exporter". <!-- src: apps/tokenpress/manifest.json:2 --> It exports a file's variables, text styles and effect styles as DTCG JSON in one ZIP. It works on any file, not only one Prism3 wrote, and it makes no network requests. <!-- src: apps/tokenpress/README.md:3#68cda092 --> <!-- src: apps/tokenpress/manifest.json:12#8e160138 -->

1. Run TokenPress in the file.
2. Choose **Scan & Validate**. It lists the variables and styles and flags anything that would not export cleanly. <!-- src: apps/tokenpress/src/ui.html:1191 --> <!-- src: apps/tokenpress/README.md:86 -->
3. Set the options, such as units (px or rem), token name case, color space and a namespace prefix, and choose which collections to include. <!-- src: apps/tokenpress/README.md:89-105#c46ac19b -->
4. Choose **Export Tokens** to download the ZIP. <!-- src: apps/tokenpress/src/ui.html:1422-1426 -->

The ZIP holds one file per collection and mode, plus `typography.json` for text styles and `shadows.json` for effect styles. <!-- src: apps/tokenpress/README.md:107-115 -->

When TokenPress exports a file Prism3 themed, CI checks that it writes the same token paths, with the same types, as the engine's own token files for that brand. Values are compared in a report, not checked, because the two write colors in different forms that are both valid DTCG. <!-- src: apps/plugin/test-readback-parity.ts:1-22#750fb90a --> <!-- src: tools/exporter-comparison/gate.ts:1-15#851c165f --> <!-- src: tools/exporter-comparison/gate.ts:69-78#5a5c2342 -->

## Which one to use

| You want | Use |
|---|---|
| The tokens for the brand you set in Prism3 | **Export**, in the studio's rail |
| The tokens a Figma file holds now, including hand changes or non-Prism3 collections | TokenPress |
| The brand settings, to rebuild or share the brand | **Export** › **Brand brief** |
