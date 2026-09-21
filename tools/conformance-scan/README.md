# conformance-scan — does the Figma file match what the engine says should be there?

A measurement harness (#1553 P1). **Read-only, report-only, dependency-free, `tsx`-runnable.** It writes
nothing to Figma and nothing to the repo, and it is deliberately **not** wired into `ci.yml`: per
`tools/CLAUDE.md`, a tool answers a question and exits 0, a gate asserts an answer and fails. This one
exits 0 *carrying findings*, because "the designer moved a value in the file" is a fact about a Figma
document, not a defect in this repo, and a gate that failed on it would fail for reasons no commit here
can fix.

Two halves and a shared shape:

| File | What it is |
|---|---|
| `state.ts` | The normalized `State` and the **one** set of key builders both sides use. |
| `expected.ts` | `expected(brand) -> State`, read out of the engine's already-emitted artifacts. |
| `diff.ts` | `diff(expected, actual) -> Report`, in eight categories. Also carries `--selftest`. |
| `fixtures/` | A faithful `actual` (the baseline) and a dirty one with exactly one injected defect per category. |
| `mutations.sh` | The harness's own by-name proof — breaks each arm in turn and asserts the named failure. |

## Why a shared `state.ts` and not two independent readers

Because that is the defect this harness was built after. `tools/binding-audit/reconcile.ts` compares an
`AnatomyPlan`'s binding names against a live file's variable names — but `out/figma/` carries
**materialized** names (`ads/color/text/primary`) and a plan carries **pre-materialization** ones
(`color/text/primary`), so it reports 5,433 of 5,433 *correct* bindings as WRONG-TOKEN (#1511). A join key
computed two ways is not a noisier diff, it is a useless one.

So: one `bindKey`, one `canonValue`, one `rootOf`, and the plan's root-less names are resolved to
materialized ones by **lookup** (`materializeName`) rather than by `${root}/` concatenation. A lookup miss
becomes a stated finding; a concatenation would silently invent a name that matches nothing.

## The run loop

```bash
# 1. The expectation, out of the engine's emitted artifacts. Notes go to stderr, so stdout is pure JSON.
npx tsx tools/conformance-scan/expected.ts aurora > /tmp/expected.json

# 2. Read the live file (below), assemble to /tmp/actual.json

# 3. Diff
npx tsx tools/conformance-scan/diff.ts /tmp/expected.json /tmp/actual.json
```

`expected.ts --brands` lists what it can build. `diff.ts <expected> <actual>` refuses a transposed pair:
both sides are the same shape on purpose, so a swapped argument pair would otherwise diff cleanly in the
mirror direction and read as a pass. `State.side` is the only thing that can catch that, which is why it
is on the wire.

## Step 2 — reading the live file

Via `figma-console-mcp`'s `figma_execute`, which evaluates in the plugin sandbox of the open file. All
three reads below are pure reads: no `set`, no `create`, no `remove`.

**Two things about size, both learned the hard way on a 22-component file.** A full read is ~44k
node-properties and does not come back in one call, so a real run is chunked by component; and an
oversized `figma_execute` result is persisted to a file on disk rather than returned inline, so a script
can stitch the chunks together without any of it passing through an agent's context. That is what makes
reading a whole library affordable.

### Read A — variables and collections (one call, whole file)

```js
const ch = n => Math.round(Math.max(0, Math.min(1, n)) * 255);
const canonColor = c => `rgba(${ch(c.r)},${ch(c.g)},${ch(c.b)},${Number((c.a ?? 1).toFixed(4))})`;
const canonFloat = n => String(Number(n.toFixed(4)));
const canonValue = (t, raw) => {
  if (t === 'COLOR') return (raw && typeof raw === 'object' && 'r' in raw) ? canonColor(raw) : `NON-COLOR(${JSON.stringify(raw)})`;
  if (t === 'FLOAT') return typeof raw === 'number' ? canonFloat(raw) : `NON-FLOAT(${JSON.stringify(raw)})`;
  if (t === 'STRING') return typeof raw === 'string' ? raw : `NON-STRING(${JSON.stringify(raw)})`;
  if (t === 'BOOLEAN') return typeof raw === 'boolean' ? String(raw) : `NON-BOOLEAN(${JSON.stringify(raw)})`;
  return JSON.stringify(raw);
};
const cols = await figma.variables.getLocalVariableCollectionsAsync();
const vars = await figma.variables.getLocalVariablesAsync();
const byId = new Map(vars.map(v => [v.id, v]));
const colById = new Map(cols.map(c => [c.id, c]));
const collections = {};
for (const c of cols) collections[c.name] = { modes: c.modes.map(m => m.name).sort() };
const variables = {};
for (const v of vars) {
  const col = colById.get(v.variableCollectionId);
  const modes = {};
  for (const m of col.modes) {
    const raw = v.valuesByMode[m.modeId];
    if (raw === undefined) continue;
    if (raw && typeof raw === 'object' && raw.type === 'VARIABLE_ALIAS') {
      const t = byId.get(raw.id);
      modes[m.name] = { kind: 'alias', target: t ? t.name : `UNRESOLVED(${raw.id})` };
    } else modes[m.name] = { kind: 'value', value: canonValue(v.resolvedType, raw) };
  }
  variables[v.name] = { collection: col.name, resolvedType: v.resolvedType, scopes: [...v.scopes].sort(), modes };
}
return { file: figma.root.name, collections, variables };
```

`canonValue` here is a hand-copy of `state.ts`'s, and that is a real (small) duplication with a reason: the
snippet runs in Figma's sandbox and cannot import from this repo. It is copied rather than approximated
because both sides must canonicalize **identically** — Figma hands back `0.9137254953384399` for a channel
the emitter wrote from the integer 233, so a naive float `===` is a coin flip. If you change `canonValue`
in `state.ts`, change it here.

### Read B — bindings, structure, stamps (repeat, chunked by component)

Set `TARGETS` to a few component ids per call; ~2,000 members per call is comfortable, 22 components is
not.

```js
const TARGETS = ['focus-ring'];   // ← one chunk
const ch = n => Math.round(Math.max(0, Math.min(1, n)) * 255);
const canonColor = c => `rgba(${ch(c.r)},${ch(c.g)},${ch(c.b)},${Number((c.a ?? 1).toFixed(4))})`;
const styleName = new Map();
for (const s of [...await figma.getLocalTextStylesAsync(), ...await figma.getLocalEffectStylesAsync()]) styleName.set(s.id, s.name);
const varName = new Map((await figma.variables.getLocalVariablesAsync()).map(v => [v.id, v.name]));
const nameOf = id => varName.get(id) ?? `UNRESOLVED(${id})`;
const bindings = {};
const instanceNodes = [];
const put = (c, m, n, p, s) => { bindings[[c, m, n, p].join('|')] = s; };
const walk = (n, comp, member, path) => {
  const here = path === '' ? '/' : path;
  if (n.type === 'INSTANCE') instanceNodes.push([comp, member, here].join('|'));
  const bv = n.boundVariables || {};
  for (const [field, val] of Object.entries(bv)) {
    if (Array.isArray(val)) { if (val[0]?.id) put(comp, member, here, field, { boundVariable: nameOf(val[0].id) }); }
    else if (val?.id) put(comp, member, here, field, { boundVariable: nameOf(val.id) });
  }
  if (!bv.fills && Array.isArray(n.fills) && n.fills[0]?.type === 'SOLID')
    put(comp, member, here, 'fills', { rawLiteral: canonColor({ ...n.fills[0].color, a: n.fills[0].opacity }) });
  if (!bv.strokes && Array.isArray(n.strokes) && n.strokes[0]?.type === 'SOLID')
    put(comp, member, here, 'strokes', { rawLiteral: canonColor({ ...n.strokes[0].color, a: n.strokes[0].opacity }) });
  if (n.type === 'TEXT' && typeof n.textStyleId === 'string' && n.textStyleId)
    put(comp, member, here, 'textStyle', { boundStyle: styleName.get(n.textStyleId) ?? `UNRESOLVED(${n.textStyleId})` });
  if (typeof n.effectStyleId === 'string' && n.effectStyleId)
    put(comp, member, here, 'effectStyle', { boundStyle: styleName.get(n.effectStyleId) ?? `UNRESOLVED(${n.effectStyleId})` });
  for (const c of n.children ?? []) walk(c, comp, member, `${here === '/' ? '' : here}/${c.name}`);
};
await figma.loadAllPagesAsync();
const allTop = figma.root.findAllWithCriteria({ types: ['COMPONENT'] }).filter(c => c.parent?.type !== 'COMPONENT_SET');
const structure = {}; const stamps = {};
for (const id of TARGETS) {
  const set = figma.root.findOne(n => n.type === 'COMPONENT_SET' && n.name === id);
  const members = set ? set.children : allTop.filter(c => c.name.split('/')[0] === id);
  structure[id] = { members: members.map(m => m.name).sort(), axes: set ? Object.keys(set.variantGroupProperties || {}).sort() : [], emitAs: set ? 'set' : 'components' };
  if (members[0]) stamps[id] = members[0].getSharedPluginData('prism3', 'memberStamp') || null;
  for (const m of members) walk(m, id, m.name, '');
}
// The page-level census, so the structure arm can see components the engine does NOT plan. Include it in
// ONE chunk only.
const allSets = figma.root.findAllWithCriteria({ types: ['COMPONENT_SET'] }).map(s => s.name);
const allStandalone = [...new Set(allTop.map(c => c.name.split('/')[0]))];
return { file: figma.root.name, stamps, structure, bindingCount: Object.keys(bindings).length,
         onPage: { sets: allSets, standaloneGroups: allStandalone }, instanceNodes, bindings };
```

Three details in that walk carry their weight:

- **`members[0]` is a set's first child, not the set.** `memberStamp` is shared plugin data on each
  *member*, so reading it off the `COMPONENT_SET` returns an empty string and the staleness arm reports
  `null` on a perfectly stamped file.
- **An unbound `fills` becomes a `rawLiteral`, not an absence.** That is the whole of category (a)'s most
  actionable finding (#1387): "there is a hex here where a variable belongs" is different from "there is
  nothing here", and only the first tells you a human typed a color.
- **`instanceNodes` is collected in the same walk as the bindings**, so its scope is exactly the scope of
  the bindings it qualifies. Collecting it in a separate whole-file pass also works, but then the two can
  disagree about what was read, and the diff cannot tell a missing instance record from a node that is not
  an instance.

### Assembling

Merge the chunks into one `State`: `variables`/`collections` from read A, and `Object.assign` the
`bindings`, `structure`, `stamps` and `instanceNodes` from every read-B chunk. Then:

- `side: 'actual'`, `format: 'prism3-conformance'`, `version: 1`, `contrast: []` (a Figma file does not
  carry a contract; the diff re-measures the engine's against the file's colors).
- `root`: derive it from the variable names. Do not hardcode it — the brand root is itself a lever
  (`ads` / `nbds` / `wds`) and `rootOf` throws rather than picking if the file disagrees with itself.
- `engineVersion`: off the stamps, and **assert they all agree**. A file half-built by two engine versions
  is a real thing (a re-run that failed part way), and picking one silently reports it as clean.
- Anything in `onPage` that no chunk targeted should still land in `structure` with empty `members` — arm
  (f) is the only thing that can call it orphaned, and a component dropped at assembly time is a
  component nothing reports.
- **If you read fewer than all components, set `scope: { components: [...] }`.** Without it a 2-component
  read diffs as 20 missing components and ~30k missing bindings, and the real findings are lost in the
  phantoms. It narrows what is *checked*, never what is *reported*: the report states the scope in its
  headline, because clean over 2 of 22 components is not a clean file.

## The eight categories

| | Category | What it catches |
|---|---|---|
| a | `binding-presence` | A raw literal, or nothing at all, where the engine binds. Also the **detached text style**. |
| b | `binding-target` | Bound, but to the wrong thing — the icon role where the text role belongs. |
| c | `value-match` | The variable exists and its per-mode value has drifted from what the engine emits. |
| d | `mode-coverage` | A mode the engine emits a value for, with no value in the file. |
| e | `scope-type` | Wrong `resolvedType`, or scopes that offer the variable where it should not appear. |
| f | `structure` | Missing/extra variables, orphaned collections, missing components, member and axis drift. |
| g | `contrast` | The engine's contract re-measured **against the file's own colors** — real AA failures. |
| h | `staleness` | The stamped generator version against `ENGINE_VERSION`. |

Category (g) recomputes with `packages/engine/color.ts`'s own `contrast` and `composite`, on the raw
un-rounded ratio, with `EPS = 0.02`. Using a different contrast implementation here would measure
something else and disagree with the engine for reasons that are not about the file.

## Three places a difference is a spelling and not a defect

The diff holds all three, and it holds them rather than the reader doing so, because **only the diff knows
what was planned** at a coordinate. (`tools/binding-audit/` put its one lenience in the reader; its README
records the two weaknesses that followed, and 82 bindings it could no longer evaluate.)

1. **`strokeWeight`.** The engine binds one uniform weight; Figma stores four per-side fields and
   `boundVariables` never contains `strokeWeight` at all. So the diff collapses the four — **but only when
   all four agree**, and reports the disagreement as a target finding when they do not. Without the
   collapse, every uniform-weight claim in the file reads as unbound: 2,096 of them in aurora, none real,
   which is #1511's failure mode in a different property.
2. **`descendantFills`.** The engine plans ink on a container; a reader finds it on the vector one level
   down. Searched for, not assumed.
3. **Bindings inherited through an INSTANCE.** An instance surfaces its main component's bindings as its
   own, so a read of aurora finds 2,705 bindings the engine plans nowhere — every one inherited from a
   component this scan already covers on its own terms. Reported, they are 2,705 `low` findings that bury
   the 1,428 real ones; dropped silently, they are exactly what `docs/34-gate-independence.md` warns
   about. So they are **suppressed and counted**, and the count is printed as a note.

That last mechanism is why the report has both `unevaluated` and `notes`, and the distinction is the
point: `unevaluated` is a blind spot (this could not be checked), `notes` is a judgement *with its number*
(this was checked and deliberately not reported). A suppression with no number attached to it is
indistinguishable from a broken arm.

## The harness's own proof

```bash
npx tsx tools/conformance-scan/diff.ts --selftest   # baseline clean + one injected defect per category
bash tools/conformance-scan/mutations.sh            # break each arm; assert the named failure
```

`--selftest` runs four steps: the faithful fixture must diff **empty**; the dirty one must report
**exactly** the manifest's findings, asserted as set equality both ways (so a defect that stops being
reported fails by name, *and* a finding the diff invents fails too); every category must have at least one
injected defect proving it; and a transposed pair must be refused.

`mutations.sh` is what makes `--selftest`'s claim falsifiable — 22 mutations, each asserting the exact
line the run must print. **Commit before running it:** every revert is `git checkout -- <file>`, which
reaches back to `HEAD`.

Two boundaries worth knowing, both written up at length in that script's header. `--selftest` proves a
defect is reported under the right *category and subject*; it does not proof-read the *summary*, so the
mutations that only degrade a diagnosis assert against the rendered report instead. And a mutation must
suppress the `findings.push`, never the guard above it — muting `if (!got) { push; continue; }` drops the
`continue` too, and the diff then crashes rather than going quiet, which is a red run that proves nothing.

## What this does not check

Stated rather than stubbed, because a half-modelled surface in the join key makes the arms report on
something they cannot see.

- **Style definitions.** A node's *binding* to a text or effect style is checked (it is the second-largest
  binding namespace). The style's **contents** — a text style's size, weight and line height; a shadow's
  offset and blur — are not. They are none of the eight categories, and `out/figma/<brand>/*-styles.json`
  is where they would come from.
- **Anything non-local.** Both reads use `getLocal*Async`; a variable or style consumed from a published
  library is not in the file's local set and reads as absent.
- **Geometry and layout the engine does not bind.** Only bound properties and the four plan namespaces
  travel; a node nudged 3px with no variable involved is invisible here.
- **Order.** Scopes and modes are sorted on both sides. Figma's order is not the emitter's, and an order
  difference is not a defect.
