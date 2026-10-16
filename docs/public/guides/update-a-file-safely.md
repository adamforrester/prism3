# Update a real file safely

<!-- DRAFT for owner review (#2637, lane 4). -->

A file that people already work in holds things Prism3 did not make: your own variables and styles, hand edits on components, instances placed across other files. This guide covers how each Prism3 write treats them, and how to check a change before it happens.

The plugin writes to whichever file it is open in. Try a change on a duplicate of the file first when you can, and if a change goes wrong, restore an earlier version from the file's version history in Figma.

## The rules every write follows

- **Check first, write second.** Apply Theme reads everything it will touch before its first write, and writes nothing if anything conflicts. <!-- src: apps/plugin/src/apply-theme.ts:67-74 --> <!-- src: apps/plugin/src/preflight.ts:144-224 -->
- **Prism3 changes only what Prism3 made.** Each collection, style and component Prism3 creates carries a mark saying so, and later runs read that mark before changing anything. <!-- src: apps/plugin/src/provenance.ts:1-58 --> <!-- src: apps/plugin/src/preflight.ts:21 -->
- **Nothing is deleted unless you ask.** Apply Theme and Build never delete. Removing what the brand no longer uses is its own action, **Prune stale**, and it shows what it will delete before it deletes. <!-- src: apps/plugin/src/main.ts:197-347 --> <!-- src: apps/plugin/src/main.ts:370-495 -->
- **One write at a time.** While one write runs, the same write is refused, whether the panel or an agent asked: "*Name* is already running. Try again when it finishes." <!-- src: apps/plugin/src/run-guard.ts:21-23 --> <!-- src: apps/plugin/src/run-guard.ts:39 -->

## Theme changes

Apply Theme updates the variables and styles Prism3 wrote, in place, and moves a renamed token to its new name. <!-- src: apps/plugin/src/apply-theme.ts:75-84 -->
If the file holds a same-named collection or style that Prism3 did not create, or a variable of another type, the apply writes nothing and lists each conflict. See [What makes it refuse](apply-a-theme.md#what-makes-it-refuse). <!-- src: apps/plugin/src/preflight.ts:170-223 -->

## Component changes: check, read, then confirm

When the brand changes after a set is built, its variants go stale: **Build** reports `⚠ N stale` and leaves them as they are, because Build only adds. <!-- src: apps/plugin/src/apply-summary.ts:73-77 --> <!-- src: apps/plugin/src/apply-summary.ts:85 -->
Bringing stale variants up to date is a separate **update**, in two steps. Today it runs through the [agent link](agent-link.md) only; the panel shows its result in **Activity** but has no button for it yet. <!-- src: apps/plugin/src/messages.ts:265-272 --> <!-- src: apps/plugin/src/agent-protocol.ts:64-68 -->

### 1. Check (the dry run)

The check reads the file and reports what an update would do, set by set, and writes nothing. <!-- src: apps/plugin/src/main.ts:922-932 -->
It also returns a fingerprint of the file as it read it. The confirm in step 3 has to carry that fingerprint back. <!-- src: apps/plugin/src/main.ts:929-931 -->

### 2. Read the plan

The plan says, for each set: <!-- src: apps/plugin/src/update-apply.ts:1-31 -->

- which variants it updates in place;
- which variants carry hand edits, and that those edits are kept;
- which variants the brand no longer has, and that they are kept and marked deprecated, not deleted;
- which parts it has to replace, such as a renamed layer or a property whose type changed;
- anything it refuses, with the reason.

### 3. Confirm

The confirm applies exactly the plan you read, and only if the file has not changed since the check. Otherwise it stops: "Nothing was updated: the file changed since the check. Run the check again, then confirm the new one." <!-- src: apps/plugin/src/update-apply.ts:1-6 --> <!-- src: apps/plugin/src/update-apply.ts:498 --> <!-- src: apps/plugin/src/update-apply.ts:598-599 -->

Before its first write, the update saves a named version in the file's version history. If Figma won't save it, nothing is written. <!-- src: apps/plugin/src/update-apply.ts:532-539 -->

### What an update keeps

| In the file | What the update does |
|---|---|
| The set and each variant | Kept, with the same ids, so every instance of it, in this file or one that uses it as a library, still points at it. <!-- src: apps/plugin/src/update-apply.ts:8-12 --> |
| A hand edit on a variant | Kept, and reported again on the next check. <!-- src: apps/plugin/src/update-apply.ts:18-19 --> |
| A variant the brand dropped | Kept in the set and marked deprecated, with its name recorded. Never deleted. <!-- src: apps/plugin/src/update-apply.ts:20-21 --> |
| A variant Prism3 did not build | Skipped. <!-- src: apps/plugin/src/update-apply.ts:23 --> |
| A variant whose layer structure was edited | Skipped whole, because its parts can no longer be matched one by one. <!-- src: apps/plugin/src/update-apply.ts:26 --> |
| A set that would collapse when an option is removed | Refused, because those variants could not stay in the set, and deleting them is never the default. <!-- src: apps/plugin/src/update-apply.ts:26-27 --> |

One undo reverts the whole update. If a run stops partway, the finished variants are current and the rest are still stale; running the update again finishes it. <!-- src: apps/plugin/src/update-apply.ts:36-40 -->

To bring variants Prism3 did not build under its updates, an agent can claim them once with `adopt-members`. That command writes plugin data only, no design changes. <!-- src: apps/plugin/src/main.ts:961-976 --> <!-- src: apps/plugin/src/agent-protocol.ts:71-73 -->

## What refuses, and why

| You see | Why | What to do |
|---|---|---|
| `✗ N conflicts`, "Nothing was written." | The file holds a same-named collection or style that Prism3 did not create, or a variable of another type. <!-- src: apps/plugin/src/preflight.ts:170-223 --> | Rename or remove the named items, then apply again. |
| "*Name* is already running." | The same write is already running, from the panel or an agent. <!-- src: apps/plugin/src/run-guard.ts:39 --> | Wait for it to finish. |
| Apply Theme and Prune stale off: "Off until a brand loads." | The brand saved in this file didn't open, and writing now would put the demo brand over it. <!-- src: apps/studio/src/main.ts:1698 --> <!-- src: apps/studio/src/main.ts:1778-1780 --> | Load the brand again, for example from its `design.md`. |
| `✗ update refused`, "the file changed since the check" | Something in the file moved between the check and the confirm. <!-- src: apps/plugin/src/update-apply.ts:498 --> <!-- src: apps/plugin/src/update-apply.ts:600 --> | Run the check again and read the new plan. |
| "the named version could not be saved" | Figma refused to save the safety version, so the update wrote nothing. <!-- src: apps/plugin/src/update-apply.ts:539 --> | Try again. Nothing in the file changed. |
| `nothing built — set '…' on this page varies by different axes and was left as it is` | A set with that name already exists on the page, built with different options. <!-- src: apps/plugin/src/main.ts:759 --> | Rename or move the existing set. |

## Remove what the brand no longer uses

When a brand drops a mode, a ramp step or a text style, the old one stays in the file until you prune it. **Prune stale** removes it, and it always shows you the count first. <!-- src: apps/studio/src/main.ts:1706-1710 --> <!-- src: apps/studio/src/main.ts:1735 -->

1. In the **Figma** menu, choose **Prune stale**. It reads **Checking…** while it works out what would go. Nothing is deleted yet. <!-- src: apps/studio/src/main.ts:1778-1780 -->
2. The **Prune stale items** dialog states what it found, including the modes by name. <!-- src: apps/studio/src/shell/bar.ts:461-465 --> <!-- src: apps/studio/src/main.ts:1735 -->
3. Choose **Cancel** to stop, or **Delete N items** to delete them. It reads **Removing…** while it runs. <!-- src: apps/studio/src/shell/bar.ts:467-473 --> <!-- src: apps/studio/src/main.ts:1397 --> <!-- src: apps/studio/src/main.ts:1779 -->

*[Screenshot placeholder: the Prune stale items dialog with its summary and Delete button.]*

What Prune can delete: <!-- src: apps/plugin/src/prune-figma.ts:18-32 --> <!-- src: apps/plugin/src/main.ts:370-495 -->

- **Variables** in a Prism3 collection that the current brand no longer emits, and only ones named under the brand's namespace. A variable you added yourself under another name stays.
- **Collections** that no part of the brand writes any more, when every variable in them is under the brand's namespace. An empty collection, or one holding your own variables, stays.
- **Modes** the brand no longer ships.
- **Text, effect, paint and grid styles** the brand no longer emits, when they sit in a style group the brand still uses. A style in a group of your own stays.
- **Canvas labels** beside a component set that is no longer in the file.

**Delete N items** recomputes the list from a fresh read of the file before it deletes. <!-- src: apps/plugin/src/main.ts:430-490 -->
Prune stale is off while Apply Theme runs, since both work on the same variables. <!-- src: apps/studio/src/main.ts:1732-1734 -->
