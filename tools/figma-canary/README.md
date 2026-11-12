# tools/figma-canary — one read-only check in real Figma before the owner rebuilds

#3209 passed every gate and broke every Update in real Figma within minutes. The tests run against a shim host
that is more permissive than Figma's sandbox. This canary closes that gap. Before the owner is told "ready to
rebuild", the always-on Mac runs read-only commands through the agent link on a scratch file, on **the owner's normal
plugin build**, after checking that build's stamp names that exact `main` commit. The owner switches **Agent link** on
for the run. The orchestrator then judges the raw results itself.

It's a tool, not a gate (`tools/CLAUDE.md`). A live Figma host isn't in CI, so nothing here is in `ci.yml`. The
owner decided it on #3215 (2026-11-01, Q-C2 revisited 2026-11-03, Q20 A 2026-11-03): the check runs only when it's
needed, not after every merge; the owner switches the link on for each run; and it runs on the owner's own build, not
a separate checkout, because Figma desktop allows only one imported Prism3 plugin at a time. Reads only, no automatic
trigger.

| File | What it does |
|---|---|
| `needs-check.ts` | Given two commits, says whether the path rule calls for a check, and why. |
| `job.ts` | The Mac's half. `prepare <sha>` records the commit asked for and prints the steps (it builds nothing); `check` is the stamp check on the first `status`; `collect` gathers the saved responses into one run file, keyed by command. |
| `judge.ts` | Given the run file and the expected commit, prints a PASS/FAIL table, then `checked, safe to rebuild from <commit>` or `held: <reason>`. `--commands` prints the commands the Mac sends. |
| `selftest.ts` | The judge over a good run and one bad run per check (including #3209's error, which must be held by name), the job's pure parts, and the path rule over literal paths. |

## When to run it

The owner's rule, verbatim (#3215, 2026-11-01):

> Before telling the owner "ready to rebuild", the orchestrator checks the changes since the last checked build. It runs the check only if they touch any of:
> - the plugin's Figma-side code: write, update and read paths, the component executor, Update and Apply, the agent link, and the main thread's startup;
> - a raised `EXECUTOR_REVISION`;
> - a Figma API the plugin hasn't called before;
> - `build.mjs` or the manifests.
>
> It skips panel-only styling, copy, docs, tests and token-value-only engine changes.

```bash
npx tsx tools/figma-canary/needs-check.ts <last-checked-commit> <candidate-commit>
```

It prints `check needed:` with a reason per file, or `no check needed`. The rule is the literal `SKIP` and `CHECK`
lists in the file. A file on neither list needs a check, so engine code that isn't token values needs one. "The last
checked build" is the newest commit the judge said `safe to rebuild from`. The orchestrator keeps that commit in its
own notes.

If no check is needed, the owner can be told to rebuild from the candidate. If one is, run the job below and judge
it first.

## The scratch file (the owner, once)

1. In **your own drafts**, outside every client team and project, create a Figma design file named exactly
   `Prism3 canary (scratch)`. Enable no team library in it, and never paste anything into it from another file.
2. Open it in Figma desktop. Run a development build of the Prism3 plugin from current `main`, and switch **Agent link** on.
3. Seed it through the plugin, through the agent link or by hand:
   1. `file-setup`;
   2. `apply-theme` with the house brand: the `input` that `npx tsx tools/figma-canary/judge.ts --commands` prints for `prune`
      (`packages/engine/examples/prism3.design.md`). Never a client brand.
   3. `build-components` for these 5 sets, one per update-path branch:
      - `button`: a plain set;
      - `checkbox-group`: a nested composite;
      - `icon`: read as single components;
      - `link`: the set #3209 was reproduced on;
      - `tabs`: a family lead with a usage panel.
4. Give the orchestrator and the Mac the file's key **privately** (the Mac keeps it in its local job config). It's
   never written in this repo.

After seeding, the canary only reads. Sets that drift to Due as `main` moves don't fail a dry run. A reseed is a
separate job, run only when the orchestrator asks for one.

## The Mac job

Post it to the Mac's queue as `JOB <id>: canary <full commit sha>`, using the usual protocol (CLAIMED, then RESULT).

> **Canary for `<sha>`.** Read-only. Return the run file and nothing else. Don't judge it.
>
> 1. **Prepare the run folder.** Run this from your everyday checkout. It builds nothing and checks nothing out: the run
>    uses the owner's normal plugin build (Q20 A).
>    ```bash
>    npx tsx tools/figma-canary/job.ts prepare <full sha> --run-dir <run folder> --file-key <scratch file key>
>    ```
>    It writes `request.json` (the commit asked for) and `commands.json` into the run folder, then prints the steps below
>    with their paths. `--file-key` comes from your job config. It's used for the one printed link and written nowhere,
>    because this repo is public.
> 2. **Open the scratch file.** In Figma desktop, open `Prism3 canary (scratch)` and nothing else from this job.
> 3. **Ask the owner to run their Prism3 plugin in it and switch Agent link on** (#3215 Q-C2 C, 2026-11-03). Your
>    session can't do it: the link is off on every open, and only the panel's switch turns it on.
> 4. **Connect.** Use the bridge server you normally use (`tools/figma-bridge/server.ts`, registered as the MCP server).
>    Pairing happens once per machine and survives rebuilds. `figma_status` must say `connected: true`.
> 5. **Run the read-only commands, in order**, with `figma_run`, each with its `args` from `commands.json`. Save each
>    response verbatim, as `figma_run` returned it, to `<key>.json` in the run folder:
>    1. `status` → `status.json`. Then run **the stamp check**:
>       `npx tsx tools/figma-canary/job.ts check --run-dir <run folder>`. It reads the build stamp the plugin reports
>       and the open file's name. **If it says `stop`, send nothing else:** pass its request on to the owner (rebuild the
>       plugin from `<sha>`, or open the scratch file), then collect and return. It goes on only when the stamp names
>       exactly the commit asked for, from a clean tree, and the open file is the scratch file. The link acts on
>       whichever file its plugin is open in.
>    2. `readback` → `readback.json`
>    3. `update-components { confirm: false }` → `update-components.json`: a dry run across every set. Never send
>       `confirm: true`.
>    4. `prune { input: <house brand>, confirm: false }` → `prune.json`: the Apply Theme plan read. Never send
>       `confirm: true`.
>    5. `set-override { changes: [<one no-op change>], confirm: false }` → `set-override.json`: the color override
>       preview (#3394), light's primary border set to the step the house brand resolves it to. Never send
>       `confirm: true`.
>    6. `run-code` with the descriptor read below → `run-code.json`. It's recorded, not judged.
>    7. `status` again → `status-after.json`. The bridge serves whichever plugin holds it (#3297), so the run is
>       bracketed: both ends must name the scratch file and the same build.
> 6. **Collect and return.** `npx tsx tools/figma-canary/job.ts collect --run-dir <run folder>` writes `run.json`:
>    `{ format, commit, responses }`, with `responses` keyed by command. Return that file verbatim.
>    Don't summarize the responses, and don't say PASS or FAIL.

The descriptor read (step 5.6) measures what the shim models in `apps/plugin/host-descriptors.json` (added by #3295). It runs only in
a development build:

```js
const d = (o, k) => { if (!o) return null; let p = o, x; while (p && !(x = Object.getOwnPropertyDescriptor(p, k))) p = Object.getPrototypeOf(p);
  return x ? { own: p === o, writable: x.writable ?? null, configurable: x.configurable, kind: 'value' in x ? 'value' : 'accessor' } : null; };
const page = figma.root.children[0];
await page.loadAsync();
const node = page.findOne((n) => n.type === 'COMPONENT_SET' || n.type === 'COMPONENT');
return {
  figma: { getLocalTextStylesAsync: d(figma, 'getLocalTextStylesAsync'), loadFontAsync: d(figma, 'loadFontAsync') },
  root: { findAllWithCriteria: d(figma.root, 'findAllWithCriteria') },
  page: { findAllWithCriteria: d(page, 'findAllWithCriteria'), findOne: d(page, 'findOne') },
  node: node && { findAll: d(node, 'findAll'), getSharedPluginData: d(node, 'getSharedPluginData'), type: node.type },
};
```

## Judging (the orchestrator)

Save the Mac's `run.json`, then run:

```bash
npx tsx tools/figma-canary/judge.ts run.json --expect <sha>
```

`--file-name` defaults to `Prism3 canary (scratch)`.

| Outcome | What it means |
|---|---|
| `checked, safe to rebuild from <sha>` | Tell the owner "checked, safe to rebuild", naming the commit. |
| `held: <reason>` | Tell the owner "held", quoting the reason, and file the failure as a bug. |

It holds when:
- the run file's commit (what the job was asked to check) isn't the expected one;
- a response is missing, is filed under the wrong command, or is under a key the canary doesn't send;
- a response doesn't parse as a result envelope. The shape is written into `judge.ts` as literals, never read from
  the plugin's `agent-protocol.ts`, so a build that changed the protocol is held, not believed (`docs/34`);
- a command carries a host `error`, isn't `ok`, or has no single verdict;
- any verdict, refusal, blocker or log line carries an exception's text;
- the build stamp either `status` reports isn't the expected commit, exactly (or is `-dirty`, `git-unavailable` or
  absent). The job builds nothing, so this is the judge's own check that what ran is what was asked for;
- the build doesn't answer a command;
- either `status` names a file other than the scratch file, or the build changed between them;
- a command wrote: the update came back as an apply, or the prune as applied.

A held run tells the owner nothing is safe yet. A stale build or the wrong file is held too, never passed.

`npx tsx tools/figma-canary/selftest.ts` checks the judge, the job's stamp check and collect, and the path rule. Run it after changing
any of them. The fixtures are run files written by hand in the plugin's result shape: `pass.json` is a good run, and
there's one bad run per check (`bad-commit`, `bad-error`, `bad-file`, `bad-shape`), each held by name.
`fixtures/3209.json` carries #3209's real-host error verbatim. When the first live run comes back, add it beside them.

**Proof the canary sees #3209 (still to do, on the first live run):** run it against the commit before #3214's fix,
`754d6944`. It must hold on `update-components`, quoting the invariant. Two catches: that commit predates the build
stamp's commit field (#3253), so `status` holds too; and it predates bridge pairing (#3204). So run that one over the
file mailbox, or with the bridge server from the same commit. It also needs the owner's build to be that commit, so
it's the owner's call when to rebuild for it. `job.ts` didn't exist at that commit either, so run it from a current
checkout.
