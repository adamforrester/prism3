## (2026-11-17) — Update file reads a set under its earlier id as in the file and due (#3770)

The template file still listed Wallet button, Sign-in button and Card number field under "Can't update yet": "needs
Provider logo, which this file doesn't have", after #3772. That fix covered one way to those rows: a theme-blocked provider.
This is the other one: the file's marks predate #3148 (2026-10-30), so they are named `brand-mark/<kind>/<name>`.

### Diagnosis

The update can handle that file. `readSingleView` finds the marks under `brand-mark` (`formerDefIds`) and renames them in
place. `renamedInto` and `providedNames` then credit the new names to the sets that nest them. But that only happens when
provider-logo is in the run, and Update file checks only the sets the plugin's read calls due. Two places in that read
ignored def renames:
- `readPresent` (`main.ts`) matched the current id only. No component is named `provider-logo/…`, so Provider logo read as
  absent, and Components offered to add a second copy.
- The as-built ledger held the entry under `brand-mark`, and `dueOf` reads only `ledger[id]`.

So Provider logo was never in the check. Nothing in the run added the names the three sets nest or swap to, and all three
blocked. Provider logo was not checked, so it did not appear in the blocked list either: exactly the owner's three rows.

### Fix

- `readPresent` counts a def as present when the file holds it under a former id.
- `dueOf` reads a set as due (`engine`, nothing named, so the row reads "Engine update: its drawing changed") when its only
  entry is under a former id. That set was never updated after the rename, because an update records the current id.
- The at-open ledger read (`ledgerDue`) lists such a set too (`formerEntry`).

The same holds for `tab` → `tab-item` (#2759), the ledger's only other def rename.

### Hypotheses tested

Each was built as a shim fixture through the real `main.ts`:
- **Brand-mark-era marks: reproduces all three rows exactly.** On main, `test-update-renamed-main.ts` prints the owner's
  rows word for word.
- **Value-renamed marks under the current id** (`provider-logo/card/generic`): this cannot occur, because the value
  renames (#2343 PR 3, 10-27) predate the def rename. Where the set is in the run, `readSingleView` admits the old values.
- **Marks on a page the read skips:** ruled out in #3772's investigation.
- **A provider blocked by something other than Theme:** it would be listed under Can't update yet too, which the owner
  did not see.
- **Set name vs component name:** consistent. `providedNames` and the nests agree on all 86 names.

Not excluded by code alone:
- marks that are remote library components with no local main;
- a provider-logo the ledger reads current, kept or unrecorded while it lacks marks.

Either would give the same three rows only if the file also lacks `provider/facebook-blue` and `payment/generic`, so the
mark set would have to predate 10-29. That points to the brand-mark era again. JOB 78's dump of the file's names and
`remote` flags settles it.

### Found on the way

Through the real `main.ts`, the shim's per-page search hands a live component out without `createInstance`. As a result,
a set that swaps to a component added earlier in the same run stopped at `swapComponent` in the fixture. Figma's
components always carry `createInstance`, so this is a harness artifact. The new test runs the shim's root search first,
which installs it.
