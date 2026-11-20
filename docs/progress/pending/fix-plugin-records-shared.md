## (2026-11-19) — The online and offline plugin builds read one doc-settings record and one file id (#4154, part)

Prism3 ships two plugins with different ids, "Prism3 Studio" and "Prism3 Studio Offline", and Figma keeps `setPluginData` per plugin id. Every file-level record that used private plugin data was invisible to the other build, so a file worked on with both drifted with no error: the doc settings read as defaults, and the strip's file id was made twice.

### What changed

`apps/plugin/src/file-record.ts` is the one place a record is read and written. A write goes to shared plugin data under `prism3`, the namespace the ownership marks, brand input and member baselines already use. A read takes the shared value and falls back to the private key, so a file saved before this keeps its record for the build that wrote it. The other build can't read that private copy (Figma doesn't allow it); the first write from either build moves the record to shared data. The doc settings (`doc-settings.ts`) and the strip's file id (`main.ts`) go through it.

### What is left, and why

The issue names two more records. Both are in files open PRs are rewriting, so each moves in a follow-up PR once those land:
- the as-built record (`as-built-ledger.ts`): #4267 rewrites every plugin-data call there to split the record past Figma's cap;
- the style-guide marks (`style-guide.ts`, 96 calls, and `style-guide-cells.ts`): `test-style-guide.ts`, whose shim models those marks, is open in #4269 and #4317.

`test-file-records.ts` keeps a register of every file in `apps/plugin/src` that still reads or writes private plugin data, each with its reason. A new private read or write fails by file name, and a listed file with no calls left fails too, so the register shrinks as the follow-ups land.

### The test's oracle

It models Figma's documented storage by hand: one shared map per file, and one private map per plugin id. It doesn't use `file-shim.ts`, whose root models shared data only, and it doesn't use the subject. Mutations, each failing by name: `writeRecord` writing private only → the cross-build arms; no private fallback in `readRecord` → `#4154: a file saved before keeps its doc settings`; `figma.root.getPluginData(FILE_ID_KEY)` back in `main.ts` → the register arm names `main.ts`.

After review: the suite's last line is `✅ ALL PASS — N assertions executed`, the form `run-suites.ts` reads, so `plugin-test` holds it to its floor (7). With the old `file records: N passed` line the runner failed it as a suite defect. A seventh arm pins the namespace: `RECORD_NS` set to anything but `prism3` → `#4154: the record is kept in shared data under the prism3 namespace`.
