## (2026-11-18) — The component-defs export is published as component contracts (#1325, Q-CC1 A)

PR 2 of #1325, after the versioning PR. Owner decision Q-CC1 A item 2: the published export gets a contract name and the
old `component-defs.json` stays for one release, so the contributor and the proof of concept keep reading it.

### What landed

- `component-defs-export.ts` holds the name in one constant, `COMPONENT_CONTRACTS_STEM = 'component-contracts'`, beside
  `COMPONENT_DEFS_COMPAT_STEM`. `componentDefsFileNames` returns `{ contracts, defs, specs }`, so every writer asks one
  function: regen's uncommitted exports, `cli.ts --component-specs`, MCP `export_theme`, and the plugin's Export. Each
  writes the export ONCE as text and puts the same bytes under both names.
- `UNCOMMITTED_OUT` gains `components/component-contracts.json`, appended last because `renderUncommitted`'s readers take
  files by position (`test.ts` reads `[0]` and `[2]`).
- `lint-component-docs` arm G holds the twin to the compatibility copy byte for byte (`DEFS TWIN`). Every other arm-G
  check reads the old name, so byte equality is what carries them to the new one. `payload-manifest.json` classifies
  the new file as payload.
- Wording, all DRAFT for the owner: the Studio's Export artifact describes itself as "Every component's contract", its
  button says "Download component contracts", and its three off-state lines say "component contracts" where they said
  "specs". The TAB keeps "Component specs": the chrome suite caught "Component contracts" running 2px past the column at
  the plugin's 380 (`#3553 M8 … every artifact tab lies inside its column`), where the three tabs are held to fit. The build-component skill
  says what a component contract and the component schema are, and that "contract" is always qualified. The MCP tool
  description, the CLI usage, the engine and Studio READMEs, and docs/19 §10.1 name the new file.

### Mutations (each after a `wip:` commit)

| mutation | result |
|---|---|
| write the twin with one extra byte | `DEFS TWIN: component-contracts.json and its compatibility copy component-defs.json differ`, exit 1 |
| stop writing the twin | `lint-component-docs CANNOT RUN — … wrote no components/component-contracts.json`, exit 1 |

### After review (CHANGES at `cb657fe0`)

- The CLI arm in `test.ts` now finds `<id>.component-contracts.json` beside `<id>.component-defs.json` and holds the two
  byte-identical. Before, `cli.ts` could stop writing the new file and `test.ts` stayed green (the review's M1).
- A new plugin suite, `apps/plugin/test-component-specs-export.ts` (floor 6), calls the exporter the iframe entry
  provides: the listed names are the three files, typed by hand, the files written are those names, and the contracts
  file and its compatibility copy carry the same bytes. Before, nothing read that exporter (the review's M2).

| mutation | result |
|---|---|
| `cli.ts` stops writing `names.contracts` | `❌ #1325 cli.ts --component-specs: … got no harbor.component-contracts.json`, exit 1 |
| the plugin's `files` drops the contracts entry | `✗ #1325 files/match the listed names`, `✗ #1325 files/same bytes`, exit 1 |
| the plugin's contracts entry gets other bytes | `✗ #1325 files/same bytes: … 2677219 vs 2677218 bytes`, exit 1 |
| the plugin's `fileNames` drops the contracts name | `✗ #1325 names/listed`, exit 1 |

### Owner decisions held

- OWNER DECISION: the file name. Options: `component-contracts.json` (built, recommended: plural like the file it
  replaces, Curtis's term, qualified); `component-contract.json` (singular, and it collides with the versioning PR's
  baseline `schema/component-contract.json`); `contracts.json` (refused: an unqualified "contract"); a
  `prism3-`-prefixed name (redundant inside the package). A rename is the one constant.
- OWNER DECISION: whether the Specs projection (`component-defs.specs.json`) and the export's `format` string
  (`prism3-component-defs/1.4`) take the contract name too. Both kept: the `format` is the component schema's `$id`,
  and renaming it is a schema MAJOR.
- OWNER DECISION: the Export tab label. Options: keep "Component specs" (built: fits, the description and button carry the
  term); "Component contracts" with the tab row allowed to wrap at 380 (a layout change, so a design call); a shorter
  qualified label. An unqualified "Contracts" is ruled out by Q-CC1 A item 1.
- OWNER DECISION: the rest of the Studio wording (description, button, the three off-state lines) is DRAFT.
- The compatibility copy goes after one release: a follow-up removes it and the `DEFS TWIN` arm with it.
