# Update a Figma file

<!-- DRAFT for owner review (#2637, lane 4; rewritten around Update file for #3264). Every factual claim cites its source in an HTML comment of the form `src: path:line`, and a claim that quotes nothing carries the cited block's fingerprint (`src: path:line#1a2b3c4d`, #3417), and `lint-guide-claims.ts` checks each one still holds what the claim quotes. -->

Every write Prism3 makes to a Figma file goes through **Update file**. <!-- src: apps/studio/src/state/update-file.ts:323 -->
It is the filled button at the right of the plugin's top bar, and it opens a checklist: you tick what to write, and the plugin writes it in one run. <!-- src: apps/studio/src/shell/bar.ts:175#4ada98f7 --> <!-- src: apps/studio/src/shell/update-file.ts:1-10#84faa64c -->
It is in the Figma plugin only: the web studio has no file to write to. <!-- src: apps/studio/src/shell/bar.ts:108#1bd757c2 -->

A file that people already work in holds things Prism3 did not make: your own variables and styles, hand edits on components, instances placed across other files. This guide covers what each part of Update file writes, how it treats that work, and how to check a change before it happens.

The plugin writes to whichever file it is open in. Try a change on a duplicate of the file first when you can, and if a change goes wrong, restore an earlier version from the file's version history in Figma.

## What Update file holds

The button shows a count beside its label: everything a run would change right now. Its name spells the count out, such as "Update file, 7 to add, 3 due", with ", theme" added when the brand you hold differs from the file's. <!-- src: apps/studio/src/state/update-file.ts:394 -->

Choose **Update file** to open the dialog. It has two tabs, **Update** and **Clean up**, and opens on **Update**. While it reads the file, it says "Checking the file…". <!-- src: apps/studio/src/state/update-file.ts:326-328 -->

The **Update** tab lists these items, in this order:

| Item | What it writes | Ticked when the dialog opens |
|---|---|---|
| **Set up file** | The pages, the templates and the style-guide cells, and the cover while Docs has it on. Listed for a file that isn't set up yet, and for a set-up file that lacks something setup builds, such as a deleted template. See [Set up a file](file-setup.md). <!-- src: apps/studio/src/state/update-file.ts:332-333 --> | On a file that isn't set up yet. On a set-up file, it starts unticked and names what is missing. <!-- src: apps/studio/src/state/update-file.ts:178-185#8d8cd69f --> |
| **Theme** | The brand's variables and styles. Layers bound to them restyle at once. See [Write the theme to a Figma file](apply-a-theme.md). <!-- src: apps/studio/src/state/update-file.ts:336-337 --> | When the file's variables differ from the brand, or the file isn't set up yet. Otherwise it reads "Up to date". <!-- src: apps/studio/src/state/update-file.ts:339 --> |
| **Components** › **To add** | The sets chosen in the Components area, and each family's usage panel, beside its lead, while Docs has panels on. See [Build components](build-components.md). <!-- src: apps/studio/src/state/update-file.ts:342-344 --> | Every set listed runs |
| **Components** › **Due** | The sets in the file that are out of date, updated in place. See [Update sets in place](#update-sets-in-place). <!-- src: apps/studio/src/state/update-file.ts:351-355 --> | Yes |
| **Style guides** | The token tables, drawn with the settings in Docs. See [Build style guides](style-guides.md). <!-- src: apps/studio/src/state/update-file.ts:404-407 --> | Only on a file not set up yet |

<!-- src: apps/studio/src/state/update-file.ts:174-181#dcd3d3c6 -->

A file that isn't set up opens with "This file isn't set up for Prism3 yet. This first update sets it up." Otherwise the dialog opens with "Tick what to write. Untick what should wait." <!-- src: apps/studio/src/state/update-file.ts:330-331 -->

## Run it

1. Choose **Update file** in the top bar.
2. Tick what to write and untick what should wait. To leave a set out of **To add**, choose its remove button (×), or **Remove all**. <!-- src: apps/studio/src/state/update-file.ts:345-348 -->
3. Choose **Update file**. On a file that isn't set up yet, the button reads **Set up and update**. <!-- src: apps/studio/src/state/update-file.ts:408-411 -->

The dialog closes and the run starts. The steps run one at a time: Set up file, Theme, the update in place, To add, then Style guides. The update in place runs before To add, though To add is listed first. <!-- src: apps/studio/src/state/update-file.ts:47#d0a2a83c --> On a file's first run, with Theme ticked, the run then ends by drawing the cover and About this library. <!-- src: apps/studio/src/state/update-file.ts:190-192#754d28f9 -->

While it runs, the button reads **Updating**. The status strip at the foot of the panel says which step and set it is on. When the run ends, it shows a line such as "Theme applied" or "File updated", followed by "Details in Activity." <!-- src: apps/studio/src/state/update-file.ts:324 --> <!-- src: apps/studio/src/state/status-strip.ts:143-150 -->
Each step's full result goes to its row in the Activity drawer.

Choose **Update file** again during a run to follow it: "Step 2 of 4 · Theme", each set being updated, and a button to stop, such as "Stop after Button". The set being written finishes, and the rest are left as they were. <!-- src: apps/studio/src/state/update-file.ts:417 --> <!-- src: apps/studio/src/state/status-strip.ts:140-141 -->

If a step fails, the dialog opens next time with "The last update stopped at" and the step and its reason. <!-- src: apps/studio/src/state/update-file.ts:418 -->

If the update writes every set and some still differ from the plan, the run goes on to its next step and ends as a warning: it counts the sets written and those still "to check". Activity names what differs in each set to check. A set that stopped or was not updated still ends the run. <!-- src: apps/plugin/src/update-apply.ts:1242 -->

## The rules every write follows

- **Check first, write second.** The theme step reads everything it will touch before its first write, and writes nothing if anything conflicts, unless you choose Skip or Rename for each conflict. <!-- src: apps/plugin/src/apply-theme.ts:80-121#6a30db6f --> <!-- src: apps/plugin/src/preflight.ts:157-216#328537d5 -->
- **Prism3 changes only what Prism3 made.** Each collection, style and component Prism3 creates carries a mark saying so, and later runs read that mark before changing anything. <!-- src: apps/plugin/src/provenance.ts:1-57#dce1a9a1 --> <!-- src: apps/plugin/src/preflight.ts:21#f83b8069 -->
- **Nothing is deleted unless you ask.** The **Update** tab never deletes. Removing what the brand no longer uses is the **Clean up** tab, and it shows what it will delete before it deletes. <!-- src: apps/studio/src/state/update-file.ts:326-327 -->
- **One write at a time.** While any write runs, every other write is refused, whether the panel or an agent asked. <!-- src: apps/plugin/src/run-guard.ts:1-20#802b70d3 -->

## Update sets in place

When the brand changes after a set is built, or a newer Prism3 draws a set differently, the set is due. **Due** lists each one, ticked, with the reason, such as "Due · its settings changed" or "Engine update: Prism3 draws components differently". <!-- src: apps/studio/src/state/update-file.ts:357-358 -->

As the dialog opens, the plugin checks each due set and writes nothing. While it reads the file, the dialog's foot says "Reading this file…". Then the foot counts the sets as they're checked, for example "Checked 7 of 20 sets". <!-- src: apps/studio/src/state/update-file.ts:365-366 --> The set being checked reads "Checking…". <!-- src: apps/studio/src/state/update-file.ts:367 --> Each checked set says what would change, such as "4 of 12 members change · 1 kept and marked deprecated · 2 edited by hand", or "No member changes". <!-- src: apps/studio/src/state/update-file.ts:369-372 -->
A set built before Prism3 kept a record of what it drew is "not checked yet". Choose **Check *N* sets** to check them; any that would change join **Due**. <!-- src: apps/studio/src/state/update-file.ts:388-389 -->

When a ticked set carries hand edits, a **Hand edits** choice appears beside the buttons: <!-- src: apps/studio/src/state/update-file.ts:373-387 -->

- **Keep**, the default: the update leaves each edited part as you made it, and reports it again next time.
- **Overwrite**: the update writes Prism3's values over your edits.
- **Accept as baseline**: your edits become the values later updates compare against.

Before its first write, the update saves a named version in the file's version history: "Saves a version first. If Figma refuses the save, nothing is written." <!-- src: apps/studio/src/state/update-file.ts:390 -->

The update writes exactly what the check read. If the file changed in between, it writes nothing and says so in Activity, under `✗ update refused`: "Nothing was updated: the file changed since the check." <!-- src: apps/plugin/src/update-apply.ts:1132-1134 -->
Open **Update file** again to check afresh. <!-- src: apps/studio/src/state/update-file.ts:323 -->

### What an update keeps

| In the file | What the update does |
|---|---|
| The set and each variant | Kept, with the same ids, so every instance of it, in this file or one that uses it as a library, still points at it. <!-- src: apps/plugin/src/update-apply.ts:8-12#cb1e78db --> |
| A hand edit on a variant | Kept by default, and reported again on the next check. <!-- src: apps/plugin/src/update-apply.ts:18-19#2863d9bd --> The **Overwrite** choice writes over it instead. <!-- src: apps/studio/src/state/update-file.ts:387 --> |
| A variant the brand dropped | Kept in the set and marked deprecated, with its name recorded. Never deleted. <!-- src: apps/plugin/src/update-apply.ts:20-21#bc79ac24 --> |
| A variant Prism3 did not build | Skipped. <!-- src: apps/plugin/src/update-apply.ts:23#833d0bf0 --> |
| A variant whose layer structure was edited | Skipped whole, because its parts can no longer be matched one by one. <!-- src: apps/plugin/src/update-apply.ts:26#488f7db7 --> |
| A set that would collapse when an option is removed | Refused, because those variants could not stay in the set, and deleting them is never the default. <!-- src: apps/plugin/src/update-apply.ts:26-27#db53431a --> |

One undo reverts the whole update. If a run stops partway, the finished sets are current and the rest are still due; running Update file again finishes them. <!-- src: apps/plugin/src/update-apply.ts:36-40#04be1a16 -->

To bring variants Prism3 did not build under its updates, an agent can claim them once with `adopt-members`, through the [agent link](agent-link.md). That command writes plugin data only, no design changes, and the panel has no control for it. <!-- src: apps/plugin/src/agent-protocol.ts:42 -->

## Remove what the brand no longer uses

When a brand drops a mode, a ramp step or a text style, the old one stays in the file until you remove it. The **Clean up** tab does that, and it always shows you what it found first: "Things Prism3 wrote earlier and no longer writes. Nothing here rides Update file." <!-- src: apps/studio/src/state/update-file.ts:419 -->

1. Choose **Update file**, then the **Clean up** tab. It checks the file as it opens and reads "Checking for stale items…". Nothing is deleted yet. <!-- src: apps/studio/src/state/update-file.ts:420 -->
2. The tab states what it found, including the modes by name. When there is nothing, it says "Nothing stale in this file." <!-- src: apps/studio/src/state/update-file.ts:421 -->
3. Choose **Delete *N* items** to delete them, or **Close** to stop. <!-- src: apps/studio/src/shell/update-file.ts:591-595 -->

*[Screenshot placeholder: the Clean up tab with its summary and Delete button.]*

What Clean up can delete: <!-- src: apps/plugin/src/prune-figma.ts:18-32#6e2fac9a -->

- Variables in a Prism3 collection that the current brand no longer emits, and only ones named under the brand's namespace. A variable you added yourself under another name stays.
- Collections that no part of the brand writes any more, when every variable in them is under the brand's namespace. An empty collection, or one holding your own variables, stays.
- Modes the brand no longer ships.
- Text, effect, paint and grid styles the brand no longer emits, when they sit in a style group the brand still uses. A style in a group of your own stays.
- Canvas labels beside a component set that is no longer in the file.

The delete works out the list again from a fresh read of the file before it deletes anything. <!-- src: apps/plugin/src/main.ts:583-584#88108fd2 -->

After a style-guide run that found tables Prism3 no longer draws, **Clean up** lists them too: "2 style-guide tables the generator no longer draws." Choose **Remove *N* tables** to delete them. <!-- src: apps/studio/src/state/update-file.ts:422-423 -->

### When a mode is renamed

Prism3 never renames a mode in a file, and that includes a custom mode renamed in **Custom mode name**. <!-- src: apps/studio/src/domains/brand.ts:208 -->
The renamed mode arrives as a new mode beside the old one. The old mode keeps the values it last had, and frames set to it still show them. <!-- src: apps/plugin/src/write-figma.ts:371-386#ffc2b3a2 -->
Removing a mode removes its values from every variable in the collection, so move the frames first: <!-- src: apps/plugin/src/prune-figma.ts:45-53#979f9c19 -->

1. Choose **Update file**, with **Theme** ticked, and run it. The file gets the new mode.
2. Select each frame set to the old mode. In Figma's right sidebar, change the frame's mode for that collection to the new mode.
3. Choose **Update file**, then the **Clean up** tab. It lists the old mode by name. Choose **Delete *N* items**.

## What refuses, and why

| You see | Why | What to do |
|---|---|---|
| `✗ N conflicts`, "Nothing was written." | The file holds a same-named collection or style that Prism3 did not create, or a variable of another type. <!-- src: apps/plugin/src/preflight.ts:237 --> | Rename or remove the named items, then run Update file again. |
| "is already running. Try again when it finishes." | Another write is already running, from the panel or an agent. <!-- src: apps/plugin/src/run-guard.ts:49-52 --> | Wait for it to finish. |
| "Off until a brand loads. This file's saved brand didn't open, and writing now would put the demo brand over it." | The brand saved in this file didn't open. The dialog's **Update file** button, Clean up's delete and every other write stay off. <!-- src: apps/studio/src/main.ts:1895 --> | Load the brand again, for example from its `design.md`. |
| `✗ update refused`, "the file changed since the check" | Something in the file moved between the check and the update. <!-- src: apps/plugin/src/update-apply.ts:898 --> | Open Update file again and read the new check. |
| "the named version could not be saved" | Figma refused to save the safety version, so the update wrote nothing. <!-- src: apps/plugin/src/update-apply.ts:974 --> | Try again. Nothing in the file changed. |
| `nothing built — set '…' on this page varies by different axes and was left as it is` | A set with that name already exists on the page, built with different options. <!-- src: apps/plugin/src/main.ts:1039 --> | Rename or move the existing set. |
