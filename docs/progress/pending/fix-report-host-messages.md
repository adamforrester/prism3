## (2026-11-19) — Report a problem cuts every host message the plugin's Activity lines carry, and a register classifies the rest (#4253)

#4205 fixed Update file's own failure lines. About 80 other places in `apps/plugin/src` still put a thrown error's message into a string raw. A host message can name a layer or a page from the client's file, and Report a problem cuts one only when it follows a head the report knows, in `failureDetail` form (`<Class>: <message>`).

### The trace

Each site was traced to `reportLend`, which reads only Activity's verdicts and lines. 42 sites reach a line the report reads:
- 27 are the component build's misses (`write-components.ts`), which reach the report through the build's `⚠ N misses (…)` line and Update file's "parts not written" and "fields still differ" lines;
- the rest are `reactions.ts`, the slot migrations, the slot carry, the style guide's failed table, the contrast note, the restore error, and Override's thrown write.

36 sites reach only agent data, `causes`, `sink.data`, or a panel field the report doesn't read. 3 were already cut.

### The fix

Every reported site now posts `failureDetail(err)`, after a fixed word the report knows. Fourteen words joined `DETAIL_HEADS` (`REFUSED (`, `NOT RECORDED (`, `NOT MADE (` and the others). Eight miss lines that had a variable right before the parenthesis gained a "REFUSED" (`<layer>.font -> Inter Bold REFUSED (Error: …)`, `ref … -> <prop> REFUSED (…)`) so they have a head. The restore error posts `failureDetail` for a host throw and keeps the engine's sentence for `UnrecognizedPersistedInputError`.

`errorClass` and `failureDetail` moved to `host-detail.ts`, which `apply-summary.ts` re-exports. The executor imports them from there, so `apply-summary.ts` does not join the executor's files. The executor's code moved (strings only), so `EXECUTOR_REVISION` is 66, and its reach entry is empty: no set draws differently.

The report cuts from the head to the end of the line, so on a misses line the report now keeps the misses before the first host message, and that message's class.

### The register

`test-report-redaction.ts` section 12 lists every raw read left in the plugin's source, by file and a text on its line, as `data`, `engine` or `helper`, with the reason. It reads every file in the folder, so a new raw read, or a fixed site put back, fails as UNCLASSIFIED by file and line; an entry whose line is gone fails as STALE. 12b runs each new head's line through `buildReport` with a `TypeError`, a `DOMException` and a `Refusal`. `Refusal` is a class the report's generic rule does not know, so only the head cuts it, and dropping a head fails that line by name. One limit is stated in the test: the style guide's `<title>: <reason>` has no fixed head, so it relies on the class rule (a class named …Error or …Exception, as Figma's are).

Separately filed: the slot migrations' lines name the client's placed instance and page, which is not a host message (#4351).
