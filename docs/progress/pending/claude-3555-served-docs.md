## (2026-11-11) — Served docs: llms.txt and the agent-link commands are complete, the catalog has a path (#3555 G9–G11, S3)

Part of #3555 (the 2026-11-11 metadata audit), batch MB9's remaining items.

- **G9, `llms.txt`.** The entry point now lists the component catalog (`components.ai.json`, with its `<id>.md` pages)
  and `ecosystem.json`, beside the release notes and reports #3604 added. It also folds in #2697: `commands.json` gives
  each entry's source file and the symbol to search for, not "source file and line", since #2644.
- **G11, the agent-link guide.** "What an agent can do" listed 17 of the 18 agent-link commands; `panels-clean`, the
  confirm-to-delete clean-up for usage panels, had no row. It has one now. A new `lint-guide-claims` arm, COMMANDS, reads
  `AGENT_COMMANDS` from the protocol source and fails for each command with no row. CITE could not see this, because it
  checks the rows a guide has, not the ones it lacks. Mutation: with the row deleted, the arm fails by name ("has no row
  for `panels-clean`, which AGENT_COMMANDS lists").
- **G10, the component catalog's path.** `prism3-build-ui` makes `components.ai.json` the authority for whether a
  component exists but gave no path. It now names `packages/engine/out/components/components.ai.json`, which
  `lint-skills` checks resolves.
- **S3, closed gaps cited as open.** The skill cited #2430, #2613, #2431, #2432 and #2433 as open native gaps. All five
  were closed on 2026-11-07 as documented consumer gaps, with the remaining options on #2426. The per-item numbers are
  gone, and the lead-in names the gaps as documented consumer gaps tracked on #2426.

No engine output moves. `llms.txt` content is still ungated past these lines, as the audit records.
