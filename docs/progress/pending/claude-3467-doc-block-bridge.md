## (2026-11-07) — The agent's build makes `_Doc-block`, a missing one is a note, and Update file offers Set up file when setup's pieces are gone (#3467)

#3467's investigation traced why an agent's fresh file came out of `file-setup` → `apply-theme` → `build-components button` reading `ok:false`. The build was clean. The only problem was "No usage panels drawn: this file has no _Doc-block component". The owner answered Q1–Q7 A. Q6 and Q7 were docs, and shipped in their own PR. This entry covers Q1–Q5.

### What changed

- **Q1, the agent's build asks for `_Doc-block`.** The `build-components` route in `agent-dispatch.ts` passes `{ docBlock: true }`, the same ask Update file's sets step sends, to the same `ACTIONS.buildComponents`. With Documentation's usage panels on, the theme in the file and no `_Doc-block`, the agent's first build now builds Badge, Tag, List Item and Divider first, then `_Doc-block`, as the panel's first run does. A build from Studio's Components page still doesn't ask. Q1 is about the agent route only.
- **Q2, a missing `_Doc-block` is a note.**
  - `canvas-furniture.ts`: `templatesLine` and `withTemplateWarning` now cover only `_Label` and the two backdrops (`WARN_TEMPLATES`), which keep Q284.3 A's warning.
  - A missing `_Doc-block` gets its own line, `docBlockLine`. It goes in the summary, where an agent reads it, and in one run-level `note` cause (`docBlockNotes`, subject `null`). The verdict keeps its `ok` and `✓`.
  - Activity's problem list (#3309) no longer counts it.
  - This is the first writer that sends a `note`. Studio's queue run (`runCauses`, `build-queue.ts`) used to drop every cause of a clean set, which would have hidden it. It now keeps each subject's latest note.
- **Q3 + Q4, the "setup incomplete" read.**
  - `setup-incomplete.ts` lists what Set up file would build on the file now: the `↳ File Components` page, `_Section-header`/`_Headings`, `_Label`, both backdrops, the three style-guide cell sets, and `_Doc-block` once it can be built. Each is looked for where setup looks for it.
  - `fileSets` posts the list as `setupIncomplete` beside `setUp`. `isSetUp` is unchanged (P8).
  - Studio's Update file offers the Set up file step whenever the list isn't empty (`setupOfferedOf`). On a set-up file the step starts unticked, and its line names what is missing. The cover step stays a fresh file's.
- **Q5, the remedy names the real fix.** `docBlockParts` chooses the line from what the file holds (`docBlockFixOf` in `main.ts`):
  - no theme: "Apply the theme, then build again";
  - sets missing: "Build tag, list-item, then run Set up file and build again";
  - everything present: "Run Set up file, then build again". These are the old words, now true because Q3 makes the step reachable.
  
  **The wording is a DRAFT held for the owner's sign-off**, as is the Set up file line "Builds what this file lacks: …".

### Verification

Every behavior has an arm that fails by name under a mutation (16 run, each listed in the PR). The end-to-end arms are in `test-update-doc-block.ts`, against the real `main.ts` under the strict shim:

- `agent` drives the dispatcher's own `ROUTES['build-components']`;
- `#3467 note` and `#3467 label still warns` cover Q2;
- `setup incomplete/…` walks a fresh file, a set-up one, one with the four sets, one with deleted pieces, and a repaired one.

`test-update-owner-run.ts` changed meaning: the owner's nine-set run is now clean, with the note on the five sets that draw a panel. Its two old mutations, `stepDone` ignoring `warn` and `runVerdict`'s `⚠`, are held in `test-update-file.ts` and `test-component-groups.ts`, which its header now names.

### Traps

- **The usage-panel line is read before the settle probe.** `docBlockFixOf` reads the file after the build, and the build's verdict is posted inside `verdictBeforeSettle`'s synchronous callback, so the read is awaited just before it. It returns at once unless a set lacked `_Doc-block`. When one did, a document-wide set search runs before the probe starts.
- **Studio's chrome test reads the plugin's bundle.** A shell-only mutation must rebuild both `dist`s, or the `ui.html freshness` arm fails first and hides the arm you meant to test.
- **The `✗` lines go to stderr** in these suites. A mutation harness that reads only stdout reports every mutation as missed.

### Not done

- `tools/agent-adherence/selftest-figma.ts` still has fixtures where the missing `_Doc-block` made a run `ok:false`. They are recorded runs from before this change, scored by the adherence harness and not wired into CI, so they stay as they are.
