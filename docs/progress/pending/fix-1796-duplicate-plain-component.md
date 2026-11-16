## (2026-11-16) — Two plain components under a nest or swap target's name are reported, not picked (#1796)

**What.** Both component executors resolved a `nestTarget` (on the plain-component-first path) and a `swapTarget`
through `compByName`, a map keyed by name, so with two plain COMPONENTs under the nominated name the build used
whichever the search returned last and reported success. Now the targets read a lookup that answers only for a name ONE
component holds: the plugin's `oneComp` (a count beside `compByName`), the paste payload's `one` (a map whose value is 0
for a name held twice). Two of a name is the AMBIGUOUS row of the shared `nestMissAdvice` / `swapMissAdvice`, one
sentence (`AMBIGUOUS_COMPONENT`): the nest builds nothing, the swap node is the placeholder frame, the swap property is
not created. Two plain components are not passed over for a set of the same name either. This is #1781's set policy one
level down. The policy is pending the owner (refuse; the alternatives were warn-and-pick or pick-first), built as
recommended.

**Bytes, measured.** The payload's copy ships in every chunk's shell, and #1798 holds the indivisible unit to 90% of the
42,000 B budget (37,800 B). Main's worst unit (provider-logo) was 37,560 B. A first cut, with two named sentences and a
count map, came to 38,247 B and also pushed icon-button from 17 to 18 chunks. The cut that ships has one target-free
sentence baked once (the miss prefix already names the target, as the nest path's COMPONENT_SET row relies on) and one
map, at 37,774 B: 26 B of headroom where there were 240. The next change that grows the shell will meet that gate.

**Scope.** Two more `compByName` readers have the same last-wins shape and are left as they are: the nest-override swap
values (`applyNestOverrides`' `idOf`) and the icon re-run's existing-member lookup (`emitAsComponents`). Filed
as #3828.

**Measured.** `test-write-components.ts` `#1796 …` and `test.ts` `#1796 paste path …`: on main, 3 rings nested and 18
icons swapped from a duplicated name with no miss (6 checks fail by name); with the fix, none, and the miss named. Mutations
by name: the plugin's `oneComp` back to `compByName.get` with `twice` off → the three plugin arms; the payload's map back
to last-wins → the three paste arms. `EXECUTOR_REVISION` 60 → 61, the reach entry empty and measured (0 sets redrawn).
