# tools/figma-canary — one read-only check in real Figma before the owner rebuilds

#3209 passed every gate and broke every Update in real Figma within minutes. The tests run against a shim host
that is more permissive than Figma's sandbox. This canary closes that gap. Before the owner is told "ready to
rebuild", the always-on Mac builds that exact `main` commit and runs read-only commands through the agent link on a
scratch file. The orchestrator then judges the raw results itself.

It's a tool, not a gate (`tools/CLAUDE.md`). A live Figma host isn't in CI, so nothing here is in `ci.yml`. The
owner decided it on #3215 (2026-11-01): the check runs only when it's needed, not after every merge.

| File | What it does |
|---|---|
| `needs-check.ts` | Given two commits, says whether the path rule calls for a check, and why. |
| `judge.ts` | Given the envelopes and the expected commit, prints a PASS/FAIL table, then `safe to rebuild from <commit>` or `held: <reason>`. `--commands` prints the commands the Mac sends. |
| `selftest.ts` | The judge over recorded envelopes (including #3209's error, which must be judged FAIL by name), and the path rule over literal paths. |

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

> **Canary for `<sha>`.** Read-only. Return the raw envelopes and nothing else. Don't judge them.
>
> 1. **Build that exact commit, in the canary checkout.** Use the checkout kept for the canary alone, never the
>    owner's tree or your everyday checkout. If it doesn't exist yet, clone the repo to its own folder once, and use
>    only that folder from then on.
>    ```bash
>    git fetch origin main && git checkout --detach <sha>
>    git status --porcelain                     # must print nothing; stop and report if it does
>    npm ci && npm run -w @prism3/plugin build  # never `npm install`
>    ```
>    Record the build line's stamp. It ends in the commit, for example `… tree-xxxxxxxx <first 8 of sha>`.
> 2. **Open that build in the scratch file.** In Figma desktop, open `Prism3 canary (scratch)` and nothing else
>    from this job. Run the development plugin imported from **this checkout's** `apps/plugin/manifest.json` (import
>    it once). Switch **Agent link** on. On the first run, report whether you could switch it on without a person
>    (Q-C2 A).
> 3. **Connect.** Run the bridge server from the same checkout (`npx tsx tools/figma-bridge/server.ts`, registered as
>    the MCP server). Pairing happens once per machine and survives rebuilds. `figma_status` must say
>    `connected: true`.
> 4. **Run the read-only commands, in order**, with `figma_run`, each with its `args` from
>    `npx tsx tools/figma-canary/judge.ts --commands`:
>    1. `status`. **If `result.data.status.file.name` isn't exactly `Prism3 canary (scratch)`, stop here** and return
>       only this envelope. The link acts on whichever file its plugin is open in.
>    2. `readback`
>    3. `update-components { confirm: false }`: a dry run across every set. Never send `confirm: true`.
>    4. `prune { input: <house brand>, confirm: false }`: the Apply Theme plan read. Never send `confirm: true`.
>    5. `run-code` with the descriptor read below. It's recorded, not judged.
> 5. **Return** one JSON array of every envelope, verbatim and in order, plus the commit you built and the stamp you
>    recorded. Don't summarize the envelopes, and don't say PASS or FAIL.

The descriptor read (step 4.5) measures what the shim models in `apps/plugin/host-descriptors.json` (added by #3295). It runs only in
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

Save the Mac's array as a file, then run:

```bash
npx tsx tools/figma-canary/judge.ts envelopes.json --expect <sha> --file-name 'Prism3 canary (scratch)'
```

| Outcome | What it means |
|---|---|
| `safe to rebuild from <sha>` | Tell the owner "checked, safe to rebuild", naming the commit. |
| `held: <reason>` | Tell the owner "held", quoting the reason, and file the failure as a bug. |

It holds when:
- a command is missing or came back twice;
- a command carries a host `error`, isn't `ok`, or has no single verdict;
- any verdict, refusal, blocker or log line carries an exception's text;
- the build stamp's commit isn't the expected one (or is `-dirty`, `git-unavailable` or absent);
- the build doesn't answer a command;
- the open file isn't the scratch file;
- a command wrote: the update came back as an apply, or the prune as applied.

A held run tells the owner nothing is safe yet. A stale build or the wrong file is held too, never passed.

`npx tsx tools/figma-canary/selftest.ts` checks the judge and the path rule. Run it after changing either. The
fixtures are envelopes written by hand in the plugin's result shape. `fixtures/3209.json` carries #3209's real-host
error verbatim. When the first live run comes back, add its envelopes beside them.

**Proof the canary sees #3209 (still to do, on the first live run):** run it against the commit before #3214's fix,
`754d6944`. It must hold on `update-components`, quoting the invariant. Two catches: that commit predates the build
stamp's commit field (#3253), so `status` holds too; and it predates bridge pairing (#3204). So run that one over the
file mailbox, or with the bridge server from the same commit.
