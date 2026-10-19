## (2026-10-16) — Naming sweep PR 3: Tab is renamed Tab item, in place by Update (#2759, owner decisions Q353, Q365, Q394)

**What moved.** `tab` is `tab-item`, with the display name `Tab.Item` (Q365 2). Tabs nests and offers the new id in its `items` slot. Q353 had named it `_tab-item`, and Q355 had prefixed `list-item` and `segmented-control-segment` too. Q394 A (2026-10-17, #2783) then decided that a slot's preferred item is not "used only inside its parent": Figma leaves a `_` set out of a published library, so a file using the library could not insert it into the slot (#2831). So nothing here takes the prefix: `list-item` and `segmented-control-segment` keep their ids, and only the tab's rename is left. `_accordion-indicator` keeps its prefix; it is not a slot item.

**File and export names are unchanged** (`tab.ts` exports `tab`). Renaming the exports would have touched hundreds of test lines for no reader-visible change.

**The mechanism.** `COMPONENT_RENAMES` gains a `def` kind (`{ def: <old id>, kind: 'def', to: <new id> }`), with `currentDefId` and `formerDefIds` (both follow chains, and the first refuses a cycle). Update's `locateSets` finds a set by the current id. When there is none, it tries each earlier id the ledger renames into it, nearest first. The dry run marks a set found that way with `setRename`, which counts as a change, and its line ends "Renamed from <old id>." (draft wording, an owner item). The apply renames the set node first thing in `applySet`, so the set and every member keep their ids and every placed instance keeps pointing at them. A set this update renames counts as present for `fileBlockers`, so a Tabs updated in the same run as its Tab item is not refused for lacking `tab-item`. Nested sets are still updated first.

**The lint checks this rename.** The merge base's baseline holds `tab`, so `unaccounted` compares it against `tab-item` under the `def` entry. Without the entry, arm B fails naming the def. The id-keyed lists in other gates moved with the id: `lint-absolute-inset`, `lint-axis-values`, `lint-paint`, `lint-paint-placement`, `lint-rung-names`, `lint-standalone-floor`, `anatomy-figma`'s projected list, the plugin's `file-taxonomy`, and the studio catalog and used-by index (regenerated). `lint-naming`'s `SLOT_ITEMS` and the skill's §6 name `tab-item`.

**Proof through the shim** (`test-update-apply.ts`, "def rename"). A Tab item set is built by the real executor from plans naming it `tab`. With no ledger entry, the dry run cannot find it: the update would build a second set. With the shipped ledger:
- The dry run reads it under `tab`, marks it for renaming, and adds or drops nothing.
- After the apply, there is one set, named `tab-item`.
- The set and every member keep their keys and ids.
- A second dry run finds the set under the new id and reads every member current.

**Not checked here, said so.** The shim's instance records its main component by name at creation and does not follow a rename, so "a placed instance still points at its main" is argued from the ids being kept (Figma resolves an instance's main by id), not observed.
