## (2026-11-13) — prism3-rebind: in a file that holds Prism3 locally, never import its published twin (#3768)

A hand-built overview page in the master file carried 33 remote Prism3 instances and 211 remote bindings. The
plugin can't produce them (it never imports by key, and every lookup it draws from is local; the cause analysis is
on #3768). `prism3-rebind` could: section 8 taught importing Prism3 by key, and the stalled-import trap row taught
reusing mains and variables from instances already in the file. Neither said what to do in a file that holds Prism3
locally and also has its own published library enabled, where both paths hand back the library's remote twin.

### What the skill now says

- **Section 8 opens with the local check.** If `getLocalVariableCollectionsAsync()` holds Prism3's collections,
  use sections 1 to 7 and never import by key: local always wins.
- **A new trap row** for the instance path: before reusing a main or a variable reached through an instance, read
  its `remote`, and reject it when a local twin of the same name exists. The stalled-import row and section 2's
  "keys without the library file" step now say they apply only to a file that consumes Prism3 as a library.
- **A rogue-binding audit line:** a remote Prism3 key in a file that holds Prism3 locally is a finding, swapped to
  the local twin, never detached.

### The gate

`lint-skills.ts` check 8 (owner rules) holds three new rules, one per placement, so dropping any one fails by its
own id. They have no emitted role, so `roles` and `resolve` are empty and only the skill text is held. The
trap-row rule is a single pattern anchored to one table row, because a whole table is one block and separate
patterns could otherwise match across rows. Mutated: removing "local always wins" or the local-collections call
from section 8, the reject from the trap row, and the audit line each fail `lint-skills` by the rule's id.

### Trap for whoever re-verifies

- **The gate checks the rule is stated, not that it is followed.** An agent run is the only test of the advice
  itself.
