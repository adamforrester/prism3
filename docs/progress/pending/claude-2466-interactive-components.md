## (2026-10-12) — Interactive components: built sets carry Rest → Hover → Pressed reactions, recorded and kept current by the Update (#2466, owner decision Q238 A)

**STATUS: branch `claude/2466-interactive-components`.** Plugin only, so no engine change note. `EXECUTOR_REVISION` 14 → 15: #2548 took 14 on main.

**What it does.** Every set whose `state` axis holds `rest`, `hover` and `pressed` gets prototype reactions on its members. That's 11 defs, derived from the member names and never listed: the three buttons, the three icon buttons, tag, tab, and the checkbox, radio and switch controls.
- Rest → Hover on `ON_HOVER`.
- Rest and Hover → Pressed on `ON_PRESS`.
- Each is `CHANGE_TO` the sibling matched on every other axis.
- Every other state has none. That includes the ones Q238 named (Disabled, Pending, Read only, Focus visible) and Pressed and Error, because only Rest and Hover are sources.

Button: 192 members, 288 reactions, the probe's own count.

**The diagnosis that shaped it (docs/18 §3).** A reaction names its destination by node id. A member the Update re-adds comes back under a new id, and its siblings' reactions dangle at an orphan that still resolves (`parent: null`). So nothing is kept from the file:
- The executor writes every built or in-place member's reactions from the plan, after every other write and before the record, resolved by name to the siblings as they stand.
- The dry run reads a destination that is no sibling, and no node with a parent, as dangling. Like a drawn fault, that makes the member "to update", never a hand edit.

**The record.** Reactions sit in the as-built record as one hash beside the node hashes (`Baseline.reactions`), not inside the root's. That was deliberate:
- A record written before this hashes every node as before.
- It makes no claim about reactions, so the owner's next Update reads no false hand edits and needs no `BASELINE_V` raise. Raising it would have turned every record into "no record".
- Each destination is named by the axes it differs on (`state=hover`), never by id or full name. So a repaired reaction reads back exactly as recorded, and renaming an unrelated axis isn't an edit.
- A change is a hand edit at `(prototype reactions)`, with the usual keep/overwrite/accept choice.

**Approach discarded.** Folding reactions into the root node's hash. It would have changed every existing record's root hash, and a dangling destination would have read as the designer editing the member.

**Traps for whoever re-verifies this:**
- An existence check alone reads the orphan as fine. `orphan/dangling` pins the parent check.
- On a recorded, unedited member, a dangle and a plain difference both read "to update", so `orphan/dangling` alone can't see the dangle override in the state. `orphan/no record` and `orphan/hand-renamed` pin it where no record or an edit elsewhere would otherwise decide.
- Reactions are read only on the member itself, never on its descendants.
- A set built before this, re-checked, reads every Rest and Hover member "to update", with a named line per family. That's on top of the revision bump.

**A shim gap this exposed:** `component-shim.ts`'s combine set a member's parent to its set only where it had none. A member built onto a `file-shim.ts` page arrived with the page as its parent, kept it, and every reaction in that set read as dangling (`test-canvas-furniture.ts` caught it: 192 "to update"). The host's combine always reparents, so the shim now does too.

**Found and filed, not fixed (one concern per PR):**
- #2563 (pre-existing, reproduced on clean `main`): a member an update adds is appended, never combined, so a translucent overlay wash stays at 100%, and verify doesn't check added members. The apply reports success, and the next dry run reads it "to update". The test's replace case uses a family with no wash for that reason.
- #2564: the `use_figma` paste path writes no reactions.

**Gates.** `test-reactions.ts`, 41 assertions, run in the plugin's `test`. Each of these mutations fails by name:
- the excluded-state filter dropped;
- one fewer axis matched;
- the executor skipping in-place members on apply;
- reactions dropped from the record;
- existence checked instead of parent;
- the dangle dropped from the state's first test.
- the reactions dropped from a set's fingerprint, the set's move dropped from `previewHashOf`, or the page list dropped from it (`all three/hash, …`).

**After #2548, #2575 and #2534 merged.** The merge conflicted only on imports. The set moves (#2542) and the page order (#2568) fit around the reactions unchanged. A set's hash already carries its reactions (its fingerprint), and `previewHashOf` carries each set's hash, its move and the page list. `all three/…` runs all three kinds of work at once: reactions to repair (missing on one set, dangling on another), sets to move, and a page to reorder. It saves one named version and does all of it. A reaction, set or page changed after the check refuses the confirm. The reaction change is a transition, which is in a reaction's key but not its words, so only the hash can catch it. Accordion (#2534) has `rest` and `focus-visible` only, so the scope rule leaves it out. It's still 11 defs, and `map/scope` already checks every def, Accordion included.

**Trap: the shim gives every set the id `SET:1`.** The apply's identity check finds a set by id, so on a page of several sets it re-reads the first one. The update then reads "component IDs changed" for a set it updated correctly. A real host gives each set its own id, so `all three/…` assigns distinct ids itself. Any future multi-set apply test needs the same (#2593).
