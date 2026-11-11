## (2026-11-11) — Agent reference, schema and skill false claims (#3555 R1–R4)

Part of #3555 (the 2026-11-11 metadata audit), its false claims in what an agent reads outside the token files.

- **R1, an unexpanded template literal in `commands.json`.** The run-code refusal read "milliseconds from 1 to
  ${MAX_TIMEOUT_MS}": `runCodeRefusals()` copied a backtick literal verbatim, and `--check` compares the generator with
  its own output, so it passed by construction. Each `${NAME}` now resolves to the literal of the top-level `const NAME`
  in the same source file (600000 here), and the emitter refuses any reference whose serialized text still holds a `${`,
  in both write and `--check` (`templateHits`). Mutation: resolution disabled fails `emit-agent-reference --check` by
  name ("would ship an unevaluated template literal … ${MAX_TIMEOUT_MS}").
- **R2, `llms.txt`.** `emit-analysis-reports.ts` says the reports index is linked from `llms.txt`, and `index.html`
  links the reports and release notes, but `llms.txt` had neither. It now has a "Releases and reports" section, worded
  as `index.html` words them.
- **R3, `theme-schema.json`.** `root` said color primitives sit at `<root>.palette`; they sit at `<root>.core.palette`.
- **R4, `prism3-motion`.** The skill said tempo "scales the whole duration ramp", while its own table says the two loop
  periods (`spin`, `sweep`) are not tempo-scaled. It now says tempo scales all but the two loop periods.

### Not changed: R5

The audit read `prism3-rebind`'s "30-second default" as true only for `run-code`. It is about `run-code`: the sentence
tells the agent to pass a longer `timeoutMs` in the command's args, and `run-code` applies its own 30-second default
(`DEFAULT_TIMEOUT_MS`, `apps/plugin/src/dev-commands.ts`) whatever `figma_run` waits for the result. So it is left as is,
and the reason is on #3555.

### Gaps

- No gate for R2–R4: `llms.txt` content, schema prose paths and skill prose against the skill's own table are unchecked,
  as the audit records (the `llms.txt` completeness hole is its own item).
