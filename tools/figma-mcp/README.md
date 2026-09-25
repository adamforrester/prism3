# tools/figma-mcp — drive the Figma test loop through `use_figma`

A runbook for an agent. It applies a Prism3 theme, builds components, reads the file back and
reports — through the Figma MCP's `use_figma` tool, with the Prism3 plugin closed (#111, #1553).

**It runs only against a file the owner has designated as a scratch file.** Every script writes to
the file it runs in. If you have not been given a scratch file by name or URL, stop and ask for one.
Never run these scripts against any other file, including a file you created yourself.

## What it is

Every script is plain JavaScript for one `use_figma` call (top-level `await` and `return`, at most
45,000 characters against the tool's 50,000 limit). Each one carries its slice of the plan as data and
a bundle of the **plugin's own executors** — `write-figma.ts`, `write-styles.ts`,
`write-grid-styles.ts`, `write-text-styles.ts`, `preflight.ts`, `preload-fonts.ts`, `persist-figma.ts` —
so the paste path and the plugin path are the same code. `apps/plugin/test-mcp-paste.ts` runs both
against one file model and checks that they leave the same file; it runs in the plugin's `test` gate.

| File | What it does |
|---|---|
| `plan.ts` | Writes the numbered scripts and `manifest.json` for one brand. |
| `report.ts` | Reads the saved results and prints one pass/fail summary. |
| `apps/plugin/mcp-paste.ts` | The generator both CLIs call (slicing, bundling, the plan comparison). |
| `apps/plugin/src/mcp-steps.ts` | The runtime inside each script. |

## 1. Generate

```bash
npx tsx tools/figma-mcp/plan.ts --brand aurora --apply --build all --cleanup --out /tmp/p3-run
```

- `--brand` takes a `.design.md` path (either dialect) or an example id: `aurora`, `harbor`,
  `nb-redesign`, `wendys`.
- `--apply` writes the theme scripts: pre-flight, writes, read-back.
- `--build all` (or `--build button,text-field`) writes the component scripts in dependency order —
  a def's nested and swapped-to defs come first — then one read-back per component page.
- `--cleanup` also writes the wipe scripts into `<out>/cleanup/`.

The output is `001-….js`, `002-….js`, … and `manifest.json`. Each manifest entry has `order`,
`file`, `phase`, `label`, `purpose`, `expect` (what a clean result looks like) and `chars`.

## 2. Run

Load the `figma-use` skill before the first call, as the Figma MCP requires. Then, for each script
in `manifest.json` order:

1. Read the file and pass its whole content as the `use_figma` code, unchanged.
2. Save the returned value, unedited, as `<out>/results/NNN.json` (NNN = the script's `order`).
3. Check `ok`. Continue only on `ok: true`.

Rules:

- **One script per call, in order, never two at once.** Later scripts depend on earlier ones — the
  color alias scripts bind to variables the create scripts wrote.
- **Pre-flight first, all of it.** The first scripts are read-only pre-flight checks. If any of them
  returns `ok: false`, stop: write nothing, and report its `conflicts` — a same-named collection or
  style Prism3 did not create, or a variable of another type.
- **Stop on a failed write.** A result with `threw`, `misses`, or `refused` is `ok: false`. Report it
  and stop. Every script is safe to re-run once the cause is fixed: writes are find-or-create by name,
  component members already in the file are skipped.
- **Do not edit a script.** A change to one slice is invisible to the read-back and the report.
- **Do not add page loops.** Each component script switches to its own page once. Pages are the unit
  of a call.
- **Return values are the only channel.** The scripts log nothing; everything is in what they return.

The expected result for a clean run: every theme step `ok: true` with `misses: []`, every component
step `ok: true`, and the read-backs returning data for the report.

## 3. Report

```bash
npx tsx tools/figma-mcp/report.ts --manifest /tmp/p3-run/manifest.json --results /tmp/p3-run/results
```

The summary starts with `VERDICT: PASS` or `VERDICT: FAIL`, then three lists:

- **FAIL** — pre-flight conflicts; a step that threw, missed or had a write refused; a read-back that
  disagrees with the plan (missing variable, wrong type, scope, value or alias, missing mode or style,
  a text style not bound to its variable); a component step with misses; a set whose variant count
  differs from the plan.
- **WARN** — orphaned variables and stranded collections (reported, never deleted, as in the plugin),
  text styles skipped for a missing font, renames refused.
- **INFO** — counts, which shared-plugin-data mode the host used, and which page-loading path each
  component took.

Report back to the owner: the verdict, every FAIL line as printed, the WARN lines, and the INFO line
about shared plugin data. Add `--json` for machine-readable output.

## 4. Wipe the scratch file between runs

Run the scripts in `<out>/cleanup/` in order, one per call, the same way. They remove **only** what
Prism3's provenance identifies, and return what they kept and why:

- a variable collection only if it carries Prism3's mode-ownership stamp (#1581) **and** every variable
  in it sits under this brand's root;
- a style only if its name is in this brand's plan **and** its description is the engine's own;
- the persisted brand input on the file;
- on each component page, the sets and components this manifest names; then the page itself, only if
  that left it empty.

Section-header pages and dividers stay, and so does anything unstamped or hand-described. This is the
conservative reading — the owner's decision on a wider wipe is open (see the PR).

## Shared plugin data, and the ledger fallback

The theme writes two records as shared plugin data: the mode-ownership stamp on each collection (read
by the pre-flight to tell Prism3's collections from a designer's) and the persisted brand on the file.
The Figma MCP's guidance lists `setPluginData` as unsupported and says nothing about
`setSharedPluginData`, so every script probes it and reports the answer in `shared`:

- `{ mode: 'live' }` — the records are in the file, exactly as the plugin writes them.
- `{ mode: 'ledger', reason }` — the host refused them. The scripts keep going and return the records
  they would have written in `ledger`. Run `report.ts … --ledger-out <out>/ledger.json`, and pass
  `--ledger <out>/ledger.json` to the next `plan.ts` run **for the same file**. Without it, the next
  run's pre-flight reads the first run's collections as someone else's and refuses.

A ledger is keyed by collection id and is valid only for the file it came from.

## What it does not do

- It does not audit per-node component bindings. For that, run `tools/conformance-scan/` against the
  same file after this loop.
- It does not check rendering. The read-back compares names, types, values, aliases, scopes, modes and
  style descriptions and bindings against the plan; how a component looks is for a screenshot.
- It does not rebuild a component that is already in the file — the same stale-set rule the plugin
  follows, since a rebuild would orphan placed instances.
- It has not yet run against a live `use_figma` host. The parity proof is offline, against the plugin's
  in-memory host model; two behaviors are handled both ways and reported, not assumed — shared plugin
  data (live or ledger) and `figma.loadAllPagesAsync` (native, or each page loaded with
  `page.loadAsync()`).
