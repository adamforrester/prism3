## (2026-11-03) — Components: a box per set in families with two or more roots (#3306)

**Status:** plugin UI (`apps/studio/src/state/component-groups.ts`, `domains/components.ts`, `state/update-file.ts`,
`shell/update-file.ts`), shared by both hosts but drawn only in the plugin. ENGINE patch (change note): no committed
artifact, emission or component surface moves. The executor, `build-deps.ts` and the plugin's `main.ts` are untouched,
so `EXECUTOR_REVISION` does not move.

### What the owner decided

The proposal on #3306 (2026-11-02), answered on 2026-11-03 with Q3306.1–6 all A. It narrows #3129's R5, which had one
box per family and none on a part.

- **.1 Which families split.** A family gets a box per set when it has two or more ROOTS, its public sets that no other
  set in the family nests (`rootsOf`, `splitsOf`). On `main` that is Buttons, Icon button, Flush icon button and Icons &
  assets. A family with one root keeps one box, because ticking the root already builds the rest. The rule reads the
  catalog's `nests` and lists no family by hand. A private `_` part never gets a box.
- **.2 A needed set** is one a chosen set nests, transitively, that the file lacks, is buildable, and was not chosen
  itself. Its box is ticked and held (`aria-disabled`, the chrome's existing held style), and it counts toward its
  family's and its section's mixed state. A tick on it writes nothing.
- **.3 Needed sets are derived on read** (`neededOf`) from the queue and the catalog, never written to the queue.
  Unticking the set that needs one drops it, with nothing left behind. The walk matches `build-deps.ts`'
  `missingDependencies`: a set the file holds is not descended into.
- **.4 The tag reads "Needed".** The needing set goes in the box's name and title ("Button, needed by Button.Group", or
  "…, needed by 2 sets"), so the tag stays short at 380.
- **.5 The badge counts chosen sets only,** matching To add's rows. Under the rows, one line names the needed sets, inside
  the family and outside it: "Also added, because the sets above nest them: Button, Spinner." This fixes P3 of the
  proposal: a nested set used to be built without notice until the run's summary.
- **.6 A family box that is on takes out only the sets chosen in that family.** A set that a chosen set elsewhere needs
  stays held.

Every box is three-state again: R5's two-state row box is retired by .2. Strings are DRAFT.

### Where a flat section's box goes

Buttons is a section with settings, so its sets are rows at the section's edge (Q8 A). Each set's box takes the fold
cell there, under the section's box, which stands for the family. Link is a section of one set with no family, so its
section box is the row's (R5), and that is the box that shows held when Banner is queued.

### Tests

- `test-component-groups.ts` §2b, one assertion per rule, each against a literal fixture typed from the proposal (the
  split families and their roots; the sample file's needed map; badge 3 and the Also line). Every rule has a mutation that
  fails by name, nine in all. The mutation that **stores the needed sets in the queue** (`toggleSets` writing
  `neededOf` along with the chosen set) fails `Q3306.3 A: a tick writes the chosen set alone …`. It also fails four older
  call-8 checks, because a family tick would then write sets outside the family.
- `test:chrome` §3129: R5's two-state check is replaced by a three-state check. New arms cover the set boxes in the split
  families, the held box (its state, name, title and Needed tag), a held tick that posts nothing, Buttons with only
  Button.Group chosen (a box per set at the section's edge, Button held, the badge counting 1 chosen set plus 2 due), and
  To add's Also line. Mutations fail by name: set boxes off in a family row; set boxes off in a flat section; held marking
  dropped; Also line not drawn.
- **One mutation stayed green, on purpose.** With the held box's click guard removed, the model still writes nothing for
  a held set (`toggleSets` holds it, by name, in `test-component-groups.ts`). The render can't see the guard on its own,
  so the arm's header says so instead of claiming it.

### Knock-on

- `apps/plugin/test-update-owner-run.ts` (#3308) replays the owner's ticks to build their exact nine-set queue. It ticked
  Checkbox row and Icon after the sets that nest them, and under Q3306.2 A those boxes are held and the ticks write
  nothing. The replay now ticks the two nested sets first, which reaches the same nine sets. The queue under test is
  unchanged.
- `docs/public/guides/*`: the Components guide quotes the new intro and lists Needed among a set's states. The other
  guides' line pointers into the four edited files are remapped by the diff's own line map, and `lint-guide-claims` holds
  every quote. `ecosystem.json`'s add-queue line names the set boxes and the held needed sets.
