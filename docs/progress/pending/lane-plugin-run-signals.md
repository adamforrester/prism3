## (2026-11-18) — Plugin: an agent's write is announced on the bar and the canvas, and a dimension title that repeats a color title names its collection (#2368, #2729)

### #2729: a dimension title that repeats a color title

Owner decision A on #2729: when a phase-2 table (dimension, font variable) would carry the same title as a color table on the same page, it takes its collection in parentheses, the form two phase-2 tables that share a title already took ("Font size (core)"). A semantic dimension collection named `border` now draws "Border (border)" beside the border colors' "Border".

### The change

`planStyleGuide`'s title pass already made phase-2 titles unique among themselves. It now also treats a phase-2 title as shared when a color table on the same page has it. Color titles are untouched: phase 1 keeps its family names. The match is per page, so a primitive dimension table on Primitive tokens is not renamed for a semantic color family on Semantic tokens.

### What it does not touch

The engine's own emission has no such case (#2728 titled the icon sizes "Icon size"), so no prism3 file's titles move. A file drawn before keeps its frame: the table's key is unchanged, so a rerun retitles it in place, as #2728's rerun does.

### Verification

`test-style-guide.ts` §35e gains two `#2729` arms over the prism3 color collections plus phase 2's file with `space` renamed `border`: the dimension table is "Border (border)" and every Semantic tokens title is unique, and a tables filter for "Border" draws the colors alone. Both fail on main (the table is "Border"; the filter draws both) and pass on the branch. Mutation: dropping the color-title test from the shared condition fails both arms by name.

A third arm, `#2729 per page`, holds the per-page claim (review of #4063): a primitive dimension table titled "Border" on Primitive tokens keeps its title beside the border colors on Semantic tokens. Mutation: keying the color titles by title alone (dropping the page) fails it by name.

### #2368: an agent's run, seen from the canvas and the bar

Owner decision A on #2368: a busy state on the bar, `figma.notify` at start and finish, and a warning on close mid-run. New pure module `apps/plugin/src/agent-run-notice.ts`; `main.ts` owns the notices, `agent-link-ui.ts` the busy mark.

- **"Done" is the result written, not the handler's return.** The issue's technical note asks for busy "until its result is written". `agent-finished` fires in the dispatcher's `finally`, before the mailbox stores the result. The agent link publishes the command as `lastCommand` only after `storeResult` (mailbox) or `noteCommand` (bridge), so both the busy mark and the finish notice end on that publish, matched by command id. A different command's result does not end it.
- **The warning cannot be a confirm.** Figma's close button ends the plugin; `figma.on('close')` cannot cancel it. So the warning is said before anyone closes: in the start notice, which stays up (`timeout: Infinity`) until the finish notice replaces it, and in the busy mark's tooltip and the switch's description.
- **Which commands:** those the run guard holds the file for (`guardFor`), less the previews that write nothing (prune, panels-clean, set-override and update-components without `confirm`). An agent may poll `status` every few seconds, so reads stay quiet. The dispatcher's `onStart` now passes `confirm` so the main thread can tell a preview from its write.
- The busy mark is the chrome's spinner (with its anti-flash wait) and "Running" in `text-2`, beside the switch; at the narrow tier the word drops with the switch's own.

Owner decision (2026-11-18): approved as built, all items: the wording; the start notice staying up until the run's result is written rather than 6 s; announcing writes only; per-command notices when an agent sends many commands back to back; the busy mark's look.

Verification: `test-agent-link.ts` `agent-run` drives the real `main.ts` in the file shim (`#2368` arms: busy on agent-started, the start notice and busy while the handler runs, still busy at agent-finished and idle at the link state that publishes the result, the finish notice shown only once the result is in the mailbox, reads and a prune preview quiet, the words equal to the panel's). `test-start-screen.mjs` drives the built `dist/ui.html` (`#2368 busy/*`). Both fail on main by name. Mutation: ending busy at `agent-finished` fails `#2368 busy/until-result` in both suites. The `#2368 quiet/reads` arm sends its prune preview as `{ input, confirm: false }` (review of #4063): sent without `confirm`, the dispatcher refused it as bad-args before `onStart`, so the preview exclusion was never reached. Mutation: dropping `prune` from the previews fails `#2368 quiet/reads` by name; before the fix it left the suite green.
