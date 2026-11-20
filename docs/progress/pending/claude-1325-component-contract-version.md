## (2026-11-18) — The component contract and the component schema get their own versions (#1325, Q-CC1 A)

The owner decided #1325 on 2026-11-18 (Q-CC1 A): adopt "component contract" and "component schema" in Nathan Curtis's
sense, and build #1326 decision 3's mechanism now. This is the mechanism. The wording and the contract-named published
file landed first, as #3992.

### What landed

- `version.ts` gains `COMPONENT_CONTRACT_VERSION` (2.0.0) and `COMPONENT_SCHEMA_VERSION` (1.5.0), apart from the token
  `CONTRACT_VERSION`. The first baseline was cut at 1.0.0 and 1.4.0, the shape the export then declared. Moves on `main`
  landed before this did, and the gate classified them on each refresh: `tag-group` and `dialog`'s
  `hideTitle` prop (#4057) were added (contract 1.1.0), `popover` was added (#4252, contract 1.2.0),
  `dialog`'s `size` variant axis was removed (#4091, #3392 A; contract 2.0.0, the first MAJOR),
  and #4074's `prism3-component-defs/1.5` added the button's `borderWeight` setting (schema 1.5.0). So the schema number still equals the export's `format`, and a consumer reading it sees no move.
- `component-contract.ts` builds both surfaces live and gates them against `schema/component-contract.json`, which only
  `--accept` writes, after each bump. Both modes compare the numbers as `token-contract.ts` does (#1768): behind, or
  ahead with nothing to record, fails. It also holds the schema version's MAJOR.MINOR, the schema's `$id` and
  `COMPONENT_DEFS_FORMAT` together.
- Wired into `verify.ts`, `ci.yml`, CONTRIBUTING §3, the PR template and CLAUDE.md (`lint-doc-gates` clean). The new
  baseline is named by hand in `lint-us-english.ts` and `lint-voice.ts`, the rule for anything kept out of regen.
- `docs/30` has the policy and both bump-class tables. `lint-skills.ts` drops its `NOT_DECLARED` admission, and
  `prism3-build-component` §8 now says what to run.

### The decisions worth knowing

- **The contract surface is read from the defs, the schema shape from the authored JSON schema.** The shape is a sorted
  list of facts (types, consts, enum and required members, property names, refs, bounds), with prose left out, so a
  removed fact is MAJOR and added facts only are MINOR. A component-schema.ts change that reaches the export already
  fails `lint-component-docs` until the JSON schema moves, and the JSON schema moving is what this gate classifies.
- **An enum prop's type is recorded as `enum`.** The defs write it as prose (`enum: 'small' | 'medium'`), which restates
  the values: recorded verbatim, adding a value retyped the prop and read MAJOR. The first run caught that.
- **A moved default is PATCH**, matching docs/30's release-notes table ("the name holds, the value under it moves").
- **Every def is recorded, draft included.** Every def is draft today, so "the contract starts at stable" would gate
  nothing; status is recorded instead, and a status move back to draft is MAJOR.

### Mutations (each committed first, then restored)

| mutation | result |
|---|---|
| delete `switch-control`'s `showStateLabel` prop | `MAJOR switch-control: prop showStateLabel removed`, exit 1 |
| `disabled` default `false` → `true` | `PATCH switch-control: prop disabled default false → true`, exit 1 |
| `validation` value `error` → `invalid` | `MAJOR … prop validation value "error" removed`, exit 1 |
| variant `selection` value `on` → `checked` | `MAJOR … variant selection value "on" removed`, exit 1 |
| drop `note` from the schema's `required` | `MAJOR schema fact removed: # required∋note`, exit 1 |
| add an optional schema field | `MINOR schema fact added: …`, exit 1 |
| reword a schema description | unchanged, exit 0 |
| `--accept` with no bump, then at a MINOR, over the prop removal | refused both times, naming the change |
| constant behind / ahead of the baseline; schema version off its `$id` | each fails by name |

### Limits and follow-ups

- Both sides of the number comparison are in the tree, so an old number written back into `version.ts` and the
  baseline passes. `lint-contract-version.ts` closes this for the token contract from the merge base; the component
  twin is filed as a follow-up.
- Owner decision Q-CV2 (2026-11-18), confirmed as built: projected Figma property and layer names stay outside the
  component contract for now, and are detected under `ENGINE_VERSION`, not classified. Drafts are in the guarantee,
  with status recorded, and the contract started at 1.0.0. A moved default is PATCH.
- Open owner decision on the PR: ship the component contract at 2.0.0, as the gate classified it (recommended), or
  cut the first baseline again at 1.0.0 on today's defs.
