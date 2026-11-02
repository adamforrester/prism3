# Update a Figma file

<!-- DRAFT for owner review (#2637, lane 4; rewritten around Update file for #3264). Every factual claim cites its source in an HTML comment of the form `src: path:line`, and `lint-guide-claims.ts` checks each one still holds what the claim quotes. -->

Every write Prism3 makes to a Figma file goes through **Update file**. <!-- src: apps/studio/src/state/update-file.ts:185 -->
It is the filled button at the right of the plugin's top bar, and it opens a checklist: you tick what to write, and the plugin writes it in one run. <!-- src: apps/studio/src/shell/bar.ts:175 --> <!-- src: apps/studio/src/shell/update-file.ts:1-10 -->
It is in the Figma plugin only: the web studio has no file to write to. <!-- src: apps/studio/src/shell/bar.ts:108 -->

A file that people already work in holds things Prism3 did not make: your own variables and styles, hand edits on components, instances placed across other files. This guide covers what each part of Update file writes, how it treats that work, and how to check a change before it happens.

The plugin writes to whichever file it is open in. Try a change on a duplicate of the file first when you can, and if a change goes wrong, restore an earlier version from the file's version history in Figma.

## What Update file holds

The button shows a count beside its label: everything a run would change right now. Its name spells the count out, such as "Update file, 7 to add, 3 due", with ", theme" added when the brand you hold differs from the file's. <!-- src: apps/studio/src/state/update-file.ts:228 -->

Choose **Update file** to open the dialog. It has two tabs, **Update** and **Clean up**, and opens on **Update**. While it reads the file, it says "Checking the file…". <!-- src: apps/studio/src/state/update-file.ts:188-190 -->

The **Update** tab lists these items, in this order:

| Item | What it writes | Ticked when the dialog opens |
|---|---|---|
| **Set up file** | The pages, the templates and the style-guide cells, and the cover while Documentation has it on. Listed only for a file that isn't set up yet. See [Set up a file](file-setup.md). <!-- src: apps/studio/src/state/update-file.ts:194-195 --> | Yes |
| **Theme** | The brand's variables and styles. Layers bound to them restyle at once. See [Write the theme to a Figma file](apply-a-theme.md). <!-- src: apps/studio/src/state/update-file.ts:196-197 --> | Yes |
| **Components** › **To add** | The sets chosen in the Components area, each with its usage panel while Documentation has panels on. See [Build components](build-components.md). <!-- src: apps/studio/src/state/update-file.ts:200-202 --> | Every set listed runs |
| **Components** › **Due** | The sets in the file that are out of date, updated in place. See [Update sets in place](#update-sets-in-place). <!-- src: apps/studio/src/state/update-file.ts:207-209 --> | Yes |
| **Style guides** | The token tables, drawn with the settings in Documentation. See [Build style guides](style-guides.md). <!-- src: apps/studio/src/state/update-file.ts:229-230 --> | Only on a file not set up yet |

<!-- src: apps/studio/src/state/update-file.ts:97-103 -->

A file that isn't set up opens with "This file isn't set up for Prism3 yet. This first update sets it up." Otherwise the dialog opens with "Tick what to write. Untick what should wait." <!-- src: apps/studio/src/state/update-file.ts:192-193 -->

## Run it

1. Choose **Update file** in the top bar.
2. Tick what to write and untick what should wait. To leave a set out of **To add**, choose its remove button (×), or **Remove all**. <!-- src: apps/studio/src/state/update-file.ts:203-204 -->
3. Choose **Update file**. On a file that isn't set up yet, the button reads **Set up and update**. <!-- src: apps/studio/src/state/update-file.ts:231-232 -->

The dialog closes and the run starts. The steps run one at a time: Set up file, Theme, the update in place, To add, then Style guides. The update in place runs before To add, though To add is listed first. <!-- src: apps/studio/src/state/update-file.ts:35 -->

While it runs, the button reads **Updating…**. The status strip at the foot of the panel says which step and set it is on. When the run ends, it shows a line such as "Theme applied" or "File updated", followed by "Details in Activity." <!-- src: apps/studio/src/state/update-file.ts:186 --> <!-- src: apps/studio/src/state/status-strip.ts:141-148 -->
Each step's full result goes to its row in the Activity drawer.

Choose **Update file** again during a run to follow it: "Step 2 of 4 · Theme", each set being updated, and a button to stop, such as "Stop after Button". The set being written finishes, and the rest are left as they were. <!-- src: apps/studio/src/state/update-file.ts:238 --> <!-- src: apps/studio/src/state/status-strip.ts:138-139 -->

If a step fails, the dialog opens next time with "The last update stopped at" and the step and its reason. <!-- src: apps/studio/src/state/update-file.ts:239 -->

## The rules every write follows

- **Check first, write second.** The theme step reads everything it will touch before its first write, and writes nothing if anything conflicts. <!-- src: apps/plugin/src/apply-theme.ts:67-74 --> <!-- src: apps/plugin/src/preflight.ts:144-224 -->
- **Prism3 changes only what Prism3 made.** Each collection, style and component Prism3 creates carries a mark saying so, and later runs read that mark before changing anything. <!-- src: apps/plugin/src/provenance.ts:1-58 --> <!-- src: apps/plugin/src/preflight.ts:21 -->
- **Nothing is deleted unless you ask.** The **Update** tab never deletes. Removing what the brand no longer uses is the **Clean up** tab, and it shows what it will delete before it deletes. <!-- src: apps/studio/src/state/update-file.ts:188-189 -->
- **One write at a time.** While a write runs, a second request for the same write is refused, whether the panel or an agent asked. <!-- src: apps/plugin/src/run-guard.ts:1-14 -->

## Update sets in place

When the brand changes after a set is built, or a newer Prism3 draws a set differently, the set is due. **Due** lists each one, ticked, with the reason, such as "Due · its settings changed" or "Engine update: Prism3 draws components differently". <!-- src: apps/studio/src/state/update-file.ts:211-212 -->

As the dialog opens, the plugin checks each due set and writes nothing. While it checks, each set reads "Checking what changes…". Then each set says what would change, such as "4 of 12 members change · 1 kept and marked deprecated · 2 edited by hand", or "No member changes". <!-- src: apps/studio/src/state/update-file.ts:216-219 -->
A set built before Prism3 kept a record of what it drew is "not checked yet". Choose **Check *N* sets** to check them; any that would change join **Due**. <!-- src: apps/studio/src/state/update-file.ts:223-224 -->

When a ticked set carries hand edits, a **Hand edits** choice appears beside the buttons: <!-- src: apps/studio/src/state/update-file.ts:220-222 -->

- **Keep**, the default: the update leaves each edited part as you made it, and reports it again next time.
- **Overwrite**: the update writes Prism3's values over your edits.
- **Accept as baseline**: your edits become the values later updates compare against.

Before its first write, the update saves a named version in the file's version history: "Saves a version first. If Figma refuses the save, nothing is written." <!-- src: apps/studio/src/state/update-file.ts:225 -->

The update writes exactly what the check read. If the file changed in between, it writes nothing and says so in Activity, under `✗ update refused`: "Nothing was updated: the file changed since the check." <!-- src: apps/plugin/src/update-apply.ts:998-1000 -->
Open **Update file** again to check afresh. <!-- src: apps/studio/src/state/update-file.ts:185 -->

### What an update keeps

| In the file | What the update does |
|---|---|
| The set and each variant | Kept, with the same ids, so every instance of it, in this file or one that uses it as a library, still points at it. <!-- src: apps/plugin/src/update-apply.ts:8-12 --> |
| A hand edit on a variant | Kept by default, and reported again on the next check. <!-- src: apps/plugin/src/update-apply.ts:18-19 --> The **Overwrite** choice writes over it instead. <!-- src: apps/studio/src/state/update-file.ts:222 --> |
| A variant the brand dropped | Kept in the set and marked deprecated, with its name recorded. Never deleted. <!-- src: apps/plugin/src/update-apply.ts:20-21 --> |
| A variant Prism3 did not build | Skipped. <!-- src: apps/plugin/src/update-apply.ts:23 --> |
| A variant whose layer structure was edited | Skipped whole, because its parts can no longer be matched one by one. <!-- src: apps/plugin/src/update-apply.ts:26 --> |
| A set that would collapse when an option is removed | Refused, because those variants could not stay in the set, and deleting them is never the default. <!-- src: apps/plugin/src/update-apply.ts:26-27 --> |

One undo reverts the whole update. If a run stops partway, the finished sets are current and the rest are still due; running Update file again finishes them. <!-- src: apps/plugin/src/update-apply.ts:36-40 -->

To bring variants Prism3 did not build under its updates, an agent can claim them once with `adopt-members`, through the [agent link](agent-link.md). That command writes plugin data only, no design changes, and the panel has no control for it. <!-- src: apps/plugin/src/agent-protocol.ts:41 -->

## Remove what the brand no longer uses

When a brand drops a mode, a ramp step or a text style, the old one stays in the file until you remove it. The **Clean up** tab does that, and it always shows you what it found first: "Things Prism3 wrote earlier and no longer writes. Nothing here rides Update file." <!-- src: apps/studio/src/state/update-file.ts:240 -->

1. Choose **Update file**, then the **Clean up** tab. It checks the file as it opens and reads "Checking for stale items…". Nothing is deleted yet. <!-- src: apps/studio/src/state/update-file.ts:241 -->
2. The tab states what it found, including the modes by name. When there is nothing, it says "Nothing stale in this file." <!-- src: apps/studio/src/state/update-file.ts:242 -->
3. Choose **Delete *N* items** to delete them, or **Close** to stop. <!-- src: apps/studio/src/shell/update-file.ts:401-405 -->

*[Screenshot placeholder: the Clean up tab with its summary and Delete button.]*

What Clean up can delete: <!-- src: apps/plugin/src/prune-figma.ts:18-32 -->

- Variables in a Prism3 collection that the current brand no longer emits, and only ones named under the brand's namespace. A variable you added yourself under another name stays.
- Collections that no part of the brand writes any more, when every variable in them is under the brand's namespace. An empty collection, or one holding your own variables, stays.
- Modes the brand no longer ships.
- Text, effect, paint and grid styles the brand no longer emits, when they sit in a style group the brand still uses. A style in a group of your own stays.
- Canvas labels beside a component set that is no longer in the file.

The delete works out the list again from a fresh read of the file before it deletes anything. <!-- src: apps/plugin/src/main.ts:494-495 -->

After a style-guide run that found tables Prism3 no longer draws, **Clean up** lists them too: "2 style-guide tables the generator no longer draws." Choose **Remove *N* tables** to delete them. <!-- src: apps/studio/src/state/update-file.ts:243-244 -->

## What refuses, and why

| You see | Why | What to do |
|---|---|---|
| `✗ N conflicts`, "Nothing was written." | The file holds a same-named collection or style that Prism3 did not create, or a variable of another type. <!-- src: apps/plugin/src/preflight.ts:228 --> | Rename or remove the named items, then run Update file again. |
| "is already running. Try again when it finishes." | The same write is already running, from the panel or an agent. <!-- src: apps/plugin/src/run-guard.ts:38-42 --> | Wait for it to finish. |
| "Off until a brand loads. This file's saved brand didn't open, and writing now would put the demo brand over it." | The brand saved in this file didn't open. The dialog's **Update file** button, Clean up's delete and every other write stay off. <!-- src: apps/studio/src/main.ts:1756 --> | Load the brand again, for example from its `design.md`. |
| `✗ update refused`, "the file changed since the check" | Something in the file moved between the check and the update. <!-- src: apps/plugin/src/update-apply.ts:796 --> | Open Update file again and read the new check. |
| "the named version could not be saved" | Figma refused to save the safety version, so the update wrote nothing. <!-- src: apps/plugin/src/update-apply.ts:871 --> | Try again. Nothing in the file changed. |
| `nothing built — set '…' on this page varies by different axes and was left as it is` | A set with that name already exists on the page, built with different options. <!-- src: apps/plugin/src/main.ts:902 --> | Rename or move the existing set. |
