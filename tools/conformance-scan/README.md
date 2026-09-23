# conformance-scan — does the Figma file match what the engine says should be there?

A measurement harness (#1553 P1, P2). **Dependency-free and `tsx`-runnable. Every file in it is a pure
function of its inputs: nothing here writes to Figma or to the repo** — the fix loop (P2) *emits a plan*
and the writes are the operator's, through one `figma_execute` call, dry run first. It is deliberately
**not** wired into `ci.yml`: per `tools/CLAUDE.md`, a tool answers a question and exits 0, a gate asserts
an answer and fails. This one exits 0 *carrying findings*, because "the designer moved a value in the
file" is a fact about a Figma document, not a defect in this repo, and a gate that failed on it would
fail for reasons no commit here can fix.

Four files and a shared shape:

| File | What it is |
|---|---|
| `state.ts` | The normalized `State` and the **one** set of key builders both sides use. |
| `expected.ts` | `expected(source) -> State`, projected from a **config**: a committed brand, or a design file you supply (`--design`). Carries its own `--selftest`. |
| `diff.ts` | `diff(expected, actual) -> Report`, in nine categories. Also carries `--selftest`. |
| `fix.ts` | `fix(report, expected, actual) -> FixPlan` — idempotent ops for the two **safe** categories, every other finding carried as an exclusion with a reason. Emits a plan, applies nothing. Also carries `--selftest`. |
| `fixtures/` | A faithful `actual` (the baseline), a dirty one with exactly one injected defect per category, the hand-written answer key for each self-check (`manifest.json`, `fix-manifest.json`), and the two `levers-*.design.md` configs `expected.ts --selftest` builds. |
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
# 1. The expectation, projected from a config. Notes go to stderr, so stdout is pure JSON.
npx tsx tools/conformance-scan/expected.ts aurora > /tmp/expected.json                 # committed config
npx tsx tools/conformance-scan/expected.ts --design /tmp/mine.design.md > /tmp/expected.json   # yours

# 2. Read the live file (below), assemble to /tmp/actual.json

# 3. Diff
npx tsx tools/conformance-scan/diff.ts /tmp/expected.json /tmp/actual.json

# 4. The fix plan — safe ops only, every other finding accounted for. Nothing is written.
npx tsx tools/conformance-scan/fix.ts /tmp/expected.json /tmp/actual.json            # read it
npx tsx tools/conformance-scan/fix.ts /tmp/expected.json /tmp/actual.json --json > /tmp/plan.json

# 5. Apply it (below: one figma_execute, DRY_RUN first), then RE-SCAN from step 2.
#    The re-scan is the only thing that says the fix landed.
```

`expected.ts --brands` lists what it can build. `diff.ts <expected> <actual>` refuses a transposed pair:
both sides are the same shape on purpose, so a swapped argument pair would otherwise diff cleanly in the
mirror direction and read as a pass. `State.side` is the only thing that can catch that, which is why it
is on the wire.

## The config is an input, not an assumption (#1569)

A brand's committed `design.md` is one config out of the whole lever space, and a theme applied from the
studio is usually not at it: an operator moves density, cuts the breakpoint set, changes the radius scale,
then applies. Every one of those levers changes what the engine emits, so an expectation built at the
committed default disagrees with the file everywhere a lever moved — and each disagreement is reported as
drift the designer must fix. Measured on the first real scan: **534 findings, 62 of them `high` outside
category (a); re-run against the config the file was actually emitted from, 1.** Nothing in the file
changed between those two numbers.

So `--design` takes the brief:

```bash
# In the studio: Export design.md (it writes the exact input Apply posts), then
npx tsx tools/conformance-scan/expected.ts --design ~/Downloads/mine.design.md > /tmp/expected.json
```

Engine-native or standard dialect, **detected** rather than declared — the same auto-detection `cli.ts`
does (#556), because an operator has no reason to know which dialect the export came out as. A
`BrandInput` `.json` works too: that is the shape Apply posts to the plugin, so a config captured from the
host needs no round trip through markdown. The brand id and root come from the supplied config, the same
way they come from a committed one.

**Where the expectation comes from, and why it has to come from there.** For a committed brand the
variable and style tiers are read off `packages/engine/out/figma/<brand>/`. A supplied config has no
committed bytes, so they come from `figmaArtifacts(theme)` — the function `regen` itself writes through.
That is the same emission reached two ways rather than a second derivation of it, and it is measured: for
aurora's own brief all 27 artifacts are byte-identical to the committed tree, for wendys all 26 are.
`expected.ts --selftest`'s second arm is that measurement, kept.

**The independence rule this obeys** (`docs/34-gate-independence.md`, shape 1): the config records what
the emitter was *told*, upstream of what it produced. A config *inferred* from the Figma file's own token
values would make the scan agree with the file by construction — it would report clean over the exact
drift it exists to find. So the config is supplied by the operator and never read back out of the
`actual.json` it will be compared against. A config the *plugin stamps into the file at Apply* stays
admissible under the same rule — it is a record of the input, written by the thing that received it, and
would remove the operator's bookkeeping. That is a separate emission decision, not built here.

**One thing a supplied config does not do: make the remaining findings go away.** In that first scan the
mode-shape findings did not collapse, they *changed sign* — the file's `layout` collection still carried
all six of its original modes (with one name duplicated) and all six breakpoint variables, so Apply had
renamed modes without removing the stale ones. Against the committed config those read as 11 `high`
"missing mode" findings, which were false; against the real config they read as 21 `low` "extra stale
mode" findings, which are true and are the file's. The config false positives are what `--design` removes.
What is left is the file.

## Step 2 — reading the live file

Via `figma-console-mcp`'s `figma_execute`, which evaluates in the plugin sandbox of the open file. Every
read below is a pure read: no `set`, no `create`, no `remove`.

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
const libraryCollections = await figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync()
  .then(cs => cs.map(c => c.name))
  .catch(() => null);   // no library access — a blind spot, and `null` says so; `[]` would claim there are none
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
return { file: figma.root.name, collections, variables, libraryCollections };
```

`canonValue` here is a hand-copy of `state.ts`'s, and that is a real (small) duplication with a reason: the
snippet runs in Figma's sandbox and cannot import from this repo. It is copied rather than approximated
because both sides must canonicalize **identically** — Figma hands back `0.9137254953384399` for a channel
the emitter wrote from the integer 233, so a naive float `===` is a coin flip. If you change `canonValue`
in `state.ts`, change it here.

`libraryCollections` is the first half of the library question, and it is asked *separately* because
`getLocalVariableCollectionsAsync` cannot answer it: a file that consumes the engine's published library has
none of its collections locally, and every one of them would otherwise read as absent. It goes into
`libraryConsumed.collections`, where arm (f) suppresses and counts it. The `.catch(() => null)` matters —
a file with no library access must produce a **blind spot**, not the claim that there are no libraries.

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
// An id the LOCAL table misses is deferred rather than written off: it is usually a library-consumed
// variable, and `walk` is synchronous so it cannot await the lookup. Resolved in one pass afterwards.
const pendingVars = new Set(); const pendingStyles = new Set();
const nameOf = id => { const n = varName.get(id); if (n) return n; pendingVars.add(id); return `PENDING(${id})`; };
const styleOf = id => { const n = styleName.get(id); if (n) return n; pendingStyles.add(id); return `PENDING(${id})`; };
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
    put(comp, member, here, 'textStyle', { boundStyle: styleOf(n.textStyleId) });
  if (typeof n.effectStyleId === 'string' && n.effectStyleId)
    put(comp, member, here, 'effectStyle', { boundStyle: styleOf(n.effectStyleId) });
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
// Resolve what the local tables could not. `getVariableByIdAsync` / `getStyleByIdAsync` reach IMPORTED and
// REMOTE records too, so a name comes back for anything this file legitimately consumes from a library —
// and `remote === true` is what says it is the library's to be right about rather than this file's.
const libraryVariables = []; const libraryStyles = [];
const resolved = new Map();
for (const id of pendingVars) {
  const v = await figma.variables.getVariableByIdAsync(id).catch(() => null);
  if (!v) continue;
  resolved.set(id, v.name);
  if (v.remote) libraryVariables.push(v.name);
}
for (const id of pendingStyles) {
  const s = await figma.getStyleByIdAsync(id).catch(() => null);
  if (!s) continue;
  resolved.set(id, s.name);
  if (s.remote) libraryStyles.push([s.type === 'TEXT' ? 'text' : s.type === 'EFFECT' ? 'effect' : s.type === 'GRID' ? 'grid' : 'paint', s.name].join('|'));
}
for (const b of Object.values(bindings)) {
  for (const field of ['boundVariable', 'boundStyle']) {
    const m = typeof b[field] === 'string' && b[field].match(/^PENDING\((.+)\)$/);
    if (m) b[field] = resolved.get(m[1]) ?? `UNRESOLVED(${m[1]})`;
  }
}
// The page-level census, so the structure arm can see components the engine does NOT plan. Include it in
// ONE chunk only.
const allSets = figma.root.findAllWithCriteria({ types: ['COMPONENT_SET'] }).map(s => s.name);
const allStandalone = [...new Set(allTop.map(c => c.name.split('/')[0]))];
return { file: figma.root.name, stamps, structure, bindingCount: Object.keys(bindings).length,
         onPage: { sets: allSets, standaloneGroups: allStandalone }, instanceNodes, bindings,
         libraryVariables, libraryStyles };
```

Four details in that walk carry their weight:

- **A name the local table misses is deferred, not written off.** `UNRESOLVED(VariableID:…)` at the point of
  the walk is what makes a library-consumed variable read as a *wrong target* on every node that binds it —
  arm (b) has no way to tell it from a real mis-bind. So the id is parked, resolved afterwards through
  `getVariableByIdAsync` (which reaches remote records), and only what genuinely resolves to nothing keeps
  the `UNRESOLVED` marker. `remote === true` is the second half of the library question; it feeds
  `libraryConsumed`.

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

### Read C — style definitions (one call, whole file)

The *interiors*, as against Read B's record of which node *binds* which style. Four APIs, one normalized
`StyleDef` shape, keyed exactly as `expected.ts` keys it — `styleKey(kind, name)`, and style names are
neither root-prefixed nor materialization-renamed, so the name in Figma is the name on disk.

```js
const ch = n => Math.round(Math.max(0, Math.min(1, n)) * 255);
const canonColor = c => `rgba(${ch(c.r)},${ch(c.g)},${ch(c.b)},${Number((c.a ?? 1).toFixed(4))})`;
const canonFloat = n => String(Number(n.toFixed(4)));
const canonUnitValue = u => u.unit === 'AUTO' ? 'AUTO'
  : u.unit === 'PERCENT' ? `${canonFloat(u.value)}%`
  : u.unit === 'PIXELS' ? `${canonFloat(u.value)}px` : `${canonFloat(u.value)}<${u.unit}>`;
const canonAny = raw => {
  if (typeof raw === 'number') return canonFloat(raw);
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'boolean') return String(raw);
  if (raw && typeof raw === 'object') {
    if ('r' in raw) return canonColor(raw);
    if ('unit' in raw) return canonUnitValue(raw);
  }
  return JSON.stringify(raw);
};
const varName = new Map((await figma.variables.getLocalVariablesAsync()).map(v => [v.id, v.name]));
const varProp = id => ({ kind: 'variable', name: varName.get(id) ?? `UNRESOLVED(${id})` });
const prop = (style, field, raw) => {
  const b = style.boundVariables?.[field];
  return b?.id ? varProp(b.id) : { kind: 'value', value: canonAny(raw) };
};
// One level of nesting only — `offset` → `offset.x`/`offset.y`, which is all an effect or a layout grid has.
// `boundVariables` is skipped because it is not a property, it is the ANSWER to one, handled above.
const flatten = (obj, prefix, into) => {
  for (const [k, v] of Object.entries(obj)) {
    if (k === 'boundVariables') continue;
    if (v && typeof v === 'object' && !Array.isArray(v) && !('r' in v) && !('unit' in v)) flatten(v, `${prefix}${k}.`, into);
    else into[`${prefix}${k}`] = { kind: 'value', value: canonAny(v) };
  }
};
const styles = {};
const add = (kind, s, props) => { styles[[kind, s.name].join('|')] = { kind, name: s.name, props }; };

for (const s of await figma.getLocalTextStylesAsync())
  add('text', s, {
    fontFamily: prop(s, 'fontFamily', s.fontName.family),
    fontStyle: prop(s, 'fontStyle', s.fontName.style),
    fontSize: prop(s, 'fontSize', s.fontSize),
    lineHeight: prop(s, 'lineHeight', s.lineHeight),
    letterSpacing: prop(s, 'letterSpacing', s.letterSpacing),
    textCase: prop(s, 'textCase', s.textCase),
    textDecoration: prop(s, 'textDecoration', s.textDecoration),
  });
for (const s of await figma.getLocalEffectStylesAsync()) {
  const p = { 'effects.length': { kind: 'value', value: String(s.effects.length) } };
  s.effects.forEach((e, i) => {
    flatten(e, `effects[${i}].`, p);
    if (e.boundVariables?.color?.id) p[`effects[${i}].color`] = varProp(e.boundVariables.color.id);
  });
  add('effect', s, p);
}
for (const s of await figma.getLocalGridStylesAsync()) {
  const p = { 'layoutGrids.length': { kind: 'value', value: String(s.layoutGrids.length) } };
  s.layoutGrids.forEach((g, i) => flatten(g, `layoutGrids[${i}].`, p));
  add('grid', s, p);
}
for (const s of await figma.getLocalPaintStylesAsync()) {
  const paint = s.paints[0];
  const p = { paintType: { kind: 'value', value: paint ? paint.type : 'NONE' } };
  const stops = paint && paint.gradientStops;
  if (stops) {
    p['stops.length'] = { kind: 'value', value: String(stops.length) };
    stops.forEach((st, i) => {
      p[`stops[${i}].position`] = { kind: 'value', value: canonFloat(st.position) };
      p[`stops[${i}].color`] = st.boundVariables?.color?.id ? varProp(st.boundVariables.color.id)
        : { kind: 'value', value: canonColor(st.color) };
    });
  }
  add('paint', s, p);
}
return { file: figma.root.name, styles };
```

`canonAny` and `canonUnitValue` are hand-copies of `state.ts`'s, for the same reason `canonValue` is, and
with the same obligation: change them in lockstep or the two sides stop agreeing about what a value *is*
before they ever get to whether it drifted. Four things about this read are deliberate:

- **No `fontWeight`.** Figma stores no such property on a `TextStyle` — it stores `fontName.style`, a NAME.
  The engine emits both, and the diff reconciles them; inventing a weight here would put a guess on the wire
  where a reconciliation belongs. See arm (i)'s reconciliations below.
- **A property is variable-or-value, never flattened to its resolved number.** `boundVariables` is consulted
  *first* for every text field and every gradient stop, because a literal `14` that happens to equal the
  token today is exactly the defect (#1387) — flatten it and the scan reports the file as correct.
- **`paint` is the kind, not `gradient`.** It is the API's name, and the same call returns a brand file's own
  solid paint styles. Filtering them out here would be a suppression with no count; passed through, they are
  styles the engine does not emit, and arm (i) reports that at `low` where it belongs.
- **Nothing is skipped when a style comes from a library.** This read is local by construction; the
  library-consumed styles come from Read B's `libraryStyles`, already keyed by `styleKey`.

### Assembling

Merge the chunks into one `State`: `variables`/`collections` from read A, `styles` from read C, and
`Object.assign` the `bindings`, `structure`, `stamps` and `instanceNodes` from every read-B chunk. Then:

- `libraryConsumed`: `{ collections: libraryCollections, variables: libraryVariables, styles: libraryStyles }`,
  unioned across the read-B chunks. **Omit a list you did not gather rather than sending `[]`** — the diff
  treats an empty list as "enumerated, and there are none" and reports everything the file consumes from a
  library as absent. It says so in a note when the field is missing entirely, which is the honest degradation.
- **Omit `styles` entirely if you skipped read C.** `{}` is the claim that the file has no styles at all, and
  arm (i) would then report every emitted style as missing. Absent, it reports itself blind and names the
  count it could not check.

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

## Steps 4 and 5 — the fix loop (#1553 P2)

`fix.ts` turns the report into a plan. It is pure: it emits JSON and applies nothing, so the only thing
that writes is the one `figma_execute` below, and you read the plan before running it.

**Two op shapes are safe, and the boundary is the design of the whole thing.**

| | Safe op | Why it is safe |
|---|---|---|
| (c) `value-match` | `set-var-value` — `setValueForMode(mode, <the engine's value>)` | The variable, the mode and every binding stay exactly as they are. One value moves, to an absolute target, so a second apply is a no-op. |
| (a) `binding-presence`, **raw-literal branch only** | `rebind` — `setBoundVariableForPaint` | A hex where the engine binds a variable (#1387) is the most actionable finding in the report — **and only when that variable is in the file.** Absent, there is nothing to bind to. |

Everything else is carried through as an `excluded` entry with a reason, and the plan prints it under the
ops. That is deliberate: **a fix plan that is a silent subset of the diff teaches its operator that the
plan is the remaining work**, which is the one belief that makes the unsafe categories dangerous. `ops +
excluded == findings` is asserted, so the plan is the whole diff sorted into what this loop will do and
what it will not touch — (f) structure (a rebuild, behind a `STALE` guard), (b) a role change (a design
decision), (d) mode add/remove (the reconciler's, #1570), (h) staleness (a rebuild), (g) contrast (a
consequence of a value, never its own op), (e) `resolvedType`/scopes (properties of the emission), (i) a
style's interior (the plugin's four style writers own it).

### The apply — one `figma_execute`, dry run first

```js
const DRY_RUN = true;                    // ← read the dry run before flipping this
const PLAN = /* paste `fix.ts --json` output here */;

if (PLAN.format !== 'prism3-conformance-fix') throw new Error('that is not a fix plan');
// The plan names the file it was built against. Applying one to the wrong open file is the accident this
// costs one line to make impossible.
if (PLAN.file !== figma.root.name) throw new Error(`plan built for "${PLAN.file}", this file is "${figma.root.name}"`);

const ch = n => Math.round(Math.max(0, Math.min(1, n)) * 255);
const canonColor = c => `rgba(${ch(c.r)},${ch(c.g)},${ch(c.b)},${Number((c.a ?? 1).toFixed(4))})`;
const canonOf = (t, raw) => raw && typeof raw === 'object'
  ? (raw.type === 'VARIABLE_ALIAS' ? `alias(${raw.id})` : canonColor(raw))
  : String(raw);

const vars = await figma.variables.getLocalVariablesAsync();
const varByName = new Map(vars.map(v => [v.name, v]));
const colById = new Map((await figma.variables.getLocalVariableCollectionsAsync()).map(c => [c.id, c]));
await figma.loadAllPagesAsync();
const allTop = figma.root.findAllWithCriteria({ types: ['COMPONENT'] }).filter(c => c.parent?.type !== 'COMPONENT_SET');
const memberOf = (comp, member) => {
  const set = figma.root.findOne(n => n.type === 'COMPONENT_SET' && n.name === comp);
  const members = set ? set.children : allTop.filter(c => c.name.split('/')[0] === comp);
  return members.find(m => m.name === member) ?? null;
};
// The same path convention `walk` writes in Read B: '/' is the member itself, '/label/icon' is a descendant.
const nodeAt = (root, path) => {
  let n = root;
  for (const seg of path.split('/').filter(Boolean)) {
    n = (n.children ?? []).find(c => c.name === seg);
    if (!n) return null;
  }
  return n;
};

const out = [];
const say = (state, op, detail) => out.push(`${state}  ${op.op}  ${op.subject}${detail ? `  — ${detail}` : ''}`);

for (const op of PLAN.ops) {
  if (op.op === 'set-var-value') {
    const v = varByName.get(op.variable);
    if (!v) { say('MISS', op, `no local variable named '${op.variable}'`); continue; }
    if (v.resolvedType !== op.resolvedType) { say('MISS', op, `the file's variable is ${v.resolvedType}, the plan says ${op.resolvedType}`); continue; }
    const col = colById.get(v.variableCollectionId);
    const mode = col?.modes.find(m => m.name === op.mode);
    if (!mode) { say('MISS', op, `collection '${col?.name}' has no mode named '${op.mode}'`); continue; }
    const already = canonOf(v.resolvedType, v.valuesByMode[mode.modeId]) === canonOf(op.resolvedType, op.value);
    if (already) { say('ALREADY', op, 'the file already carries this value'); continue; }
    if (DRY_RUN) { say('WOULD-SET', op, `${op.from} → ${op.to}`); continue; }
    v.setValueForMode(mode.modeId, op.value);
    say('SET', op, `${op.from} → ${op.to}`);
  } else if (op.op === 'rebind') {
    const v = varByName.get(op.variable);
    if (!v) { say('MISS', op, `no local variable named '${op.variable}' — the plan should have excluded this`); continue; }
    const member = memberOf(op.component, op.member);
    if (!member) { say('MISS', op, `no member '${op.member}' under '${op.component}'`); continue; }
    const node = nodeAt(member, op.node);
    if (!node) { say('MISS', op, `no node at '${op.node}'`); continue; }
    if (op.property !== 'fills' && op.property !== 'strokes') {
      // Read B only ever records a rawLiteral for a SOLID fill or stroke, so this is unreachable today. It
      // stays a MISS rather than a `setBoundVariable` guess: a property this loop has never seen is not one
      // to write blind.
      say('MISS', op, `'${op.property}' is not a paint property — this loop only rebinds fills and strokes`);
      continue;
    }
    const bound = node.boundVariables?.[op.property];
    if (Array.isArray(bound) ? bound[0]?.id === v.id : bound?.id === v.id) { say('ALREADY', op, 'already bound to this variable'); continue; }
    const paints = (node[op.property] ?? []).map(p => ({ ...p }));
    if (!paints[0] || paints[0].type !== 'SOLID') { say('MISS', op, `'${op.property}' is not a single SOLID paint`); continue; }
    if (DRY_RUN) { say('WOULD-REBIND', op, `${op.from} → ${op.variable}`); continue; }
    paints[0] = figma.variables.setBoundVariableForPaint(paints[0], 'color', v);
    node[op.property] = paints;
    say('REBOUND', op, `${op.from} → ${op.variable}`);
  } else say('MISS', op, `unknown op kind — this loop applies set-var-value and rebind, nothing else`);
}
return { dryRun: DRY_RUN, ops: PLAN.ops.length, excluded: PLAN.excluded.length, out };
```

Then **re-scan from step 2**. The re-scan is the only thing that says the fix landed: this snippet reports
what it *did*, which is a different claim. A second apply must come back all `ALREADY`, and a `fix.ts` run
over the re-scan must emit zero ops — both are what "idempotent" means here, and both are cheap to check.

Four things about the apply worth knowing before you flip `DRY_RUN`:

- **The dry run resolves everything and writes nothing.** Every `MISS` you see in it would have been a
  failed write: a variable, member, node or mode the plan named and the file does not have. A dry run with
  misses in it is a plan to re-derive from a fresh scan, not one to force.
- **`ALREADY` is the idempotence signal, and it is per-op.** It compares through the same `canonColor` both
  reads use, so "already right" means right at the resolution the scan can see (8-bit channels — lossless
  for every value the emitter produces, and the re-scan reads it back through the same function).
- **A rebind binds the paint's COLOR and touches nothing else about it.** A paint-level `opacity` a designer
  set stays, and the scan does not compare it (see *What this does not check*) — so a rebound fill can still
  render at 50%. That is a real gap, named here rather than papered over: the plan restores the *binding*
  the engine planned, not every property of the paint.
- **It overwrites a hand-typed value on purpose.** That is the whole point of category (a) — a hex where a
  variable belongs is a value that stopped tracking the token (#1387) — and it is why the `from` field is in
  the plan and printed in the dry run. If the hex was deliberate, the finding is a design conversation and
  not a fix; exclude it by fixing the *plan*, not by editing this snippet.

## The nine categories

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
| i | `style-definition` | The style's own **interior** — a text style's size or line height, a shadow's offset or blur, a gradient's stops. Plus a style missing or extra. |

(a) and (i) are the two halves of one question and neither implies the other: (a) says *this node points at
`body/md/default`*, (i) says *`body/md/default` is still the size the engine emitted*. A file can be perfect
at (a) and wrong everywhere it renders, and the letters are appended in that order rather than slotted next
to their neighbours because they are positional — inserting one silently re-letters the ones after it, and
"(g) contrast" would then mean two different things in two documents.

Category (g) recomputes with `packages/engine/color.ts`'s own `contrast` and `composite`, on the raw
un-rounded ratio, with `EPS = 0.02`. Using a different contrast implementation here would measure
something else and disagree with the engine for reasons that are not about the file.

## Where a difference is a spelling and not a defect

The diff holds every one of these, and it holds them rather than the reader doing so, because **only the diff
knows what was planned** at a coordinate. (`tools/binding-audit/` put its one lenience in the reader; its
README records the two weaknesses that followed, and 82 bindings it could no longer evaluate.)

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
4. **`fontWeight`.** Not a Figma property at all: a `TextStyle` carries `fontName.style`, a *name*. The
   engine emits both a bound `fontStyle` and an unbound `fontWeight` number, which agree by construction, so
   the diff checks the weight **through the name** — `'Semi Bold'`, `'SemiBold'` and `'semibold'` are one
   value, and a slant is not a weight (`'Bold Italic'` is 700). Compared directly instead, all 38 of aurora's
   text styles report a missing property. Where the font style is variable-**bound** the weight rides on that
   binding and is counted in a note rather than checked twice; where the name is one the table does not know,
   the field goes `unevaluated` — a guess from a substring would read `'Semibold Italic'` right and
   `'Extrablack'` wrong with no way to tell which happened.
5. **What the file consumes from a published library.** Both local reads are local by definition, so a
   variable, collection or style that lives in a library reads as *absent* and arm (f) calls it an emitted
   name the file does not have. It is neither a structure finding nor a value one — it is outside this file's
   authorship, and the library is the document to scan for it. **Suppressed and counted**, same as the
   instances, on all three of the surfaces it affects.

**And one unit difference that is NOT a spelling**, stated here because it looks exactly like one. A text
style's `lineHeight` is emitted as a PERCENT and a file may carry PIXELS. The two can be numerically equal —
`21px` *is* 150% of 14 — and the harness still reports it, because `lint-lineheight-bake.ts` (#1356) bakes the
percentage on purpose: the role is a unitless multiplier, `setBoundVariable('lineHeight', …)` is pixels-only
so a percentage cannot be variable-bound at all, and a pixel line height is that multiplier evaluated at ONE
font size and frozen — wrong at every other size in a fluid set. Normalizing the two together would need a
per-mode font size to convert through, and would erase the difference the bake exists to preserve. The
canonicalizer keeps the unit (`canonUnitValue`); the diff compares it and says which way it went.

The suppression mechanism is why the report has both `unevaluated` and `notes`, and the distinction is the
point: `unevaluated` is a blind spot (this could not be checked), `notes` is a judgement *with its number*
(this was checked and deliberately not reported). A suppression with no number attached to it is
indistinguishable from a broken arm.

## The harness's own proof

```bash
npx tsx tools/conformance-scan/diff.ts --selftest       # baseline clean + one injected defect per category
npx tsx tools/conformance-scan/expected.ts --selftest   # the supplied config reaches the projection
npx tsx tools/conformance-scan/fix.ts --selftest        # the plan is the safe ops and a complete accounting
bash tools/conformance-scan/mutations.sh                # break each arm; assert the named failure
```

`diff.ts --selftest` runs four steps: the faithful fixture must diff **empty**; the dirty one must report
**exactly** the manifest's findings, asserted as set equality both ways (so a defect that stops being
reported fails by name, *and* a finding the diff invents fails too); every category must have at least one
injected defect proving it; and a transposed pair must be refused.

`expected.ts --selftest` proves the other half — that the config is read rather than merely accepted —
in two arms, because either alone would pass for a broken wire. **Arm 1** builds one brand
(`fixtures/levers-*.design.md`, two files identical but for `density` and `layout.breakpoints`) at both
configs and requires the two expectations to disagree at *named* coordinates: the size a density lever
moves, the `layout` collection's mode set, and a rung each config emits and the other does not. **Arm 2**
builds each committed design-file brand both ways — through `--design` and through its emitted tree — and
requires every tier to match exactly, plus the file set in both directions. Arm 1 alone would pass for a
path that projects a config faithfully but differently from the emitter; arm 2 alone would pass for a path
that ignores the config entirely.

`fix.ts --selftest` is keyed to `fixtures/fix-manifest.json`, hand-written for the same reason
`manifest.json` is, and it asserts in both directions — but the two directions are not equally important
here. A **missing** op is an inconvenience: the plan gets smaller and the operator fixes by hand. An
**extra** op is a destructive tool, and it would be destructive silently, because the damage happens in
someone's Figma file minutes later and not in this repo. So the key pins the two ops by name *and* by the
value each writes, pins the seven categories that may never be addressed by an op, requires every category
to be either pinned or one of the two safe shapes (a tenth one is a compile error in `fix.ts` and a named
failure here), and checks the plan by applying it to the actual `State` in memory and re-diffing: the
addressed findings must clear, the excluded ones must stay, the collateral must be exactly the two contrast
consequences of the value fix, nothing new may appear, and a second plan over the re-scan must be empty.
That in-memory apply is a *model* of Figma and a narrow one — only the host acceptance run can say Figma
behaves that way, which is why it is a step in this README and not a claim in the self-check.

`mutations.sh` is what makes all three `--selftest`s' claims falsifiable: a mutation per reporting branch, each
asserting the exact line the run must print, plus one per lenience — those assert that the **baseline stops
being clean**, because a lenience fails by inventing findings on a correct file rather than by going quiet.
Its next-to-last section does the same for the config wire: the levers dropped, the path ignored, the
projection short a file, and a report that does not name the config it was built at — four quiet failures,
four named rows. Its **last** section covers the fix plan, and the two arms that carry it are the ones that
remove a *guard*: drop the "does this variable exist in the file" check and the un-rebindable twin leaks in
as an op; drop the raw-literal whitelist and a node property on a component the file does not have leaks in
as another. Both fail as a named `EXTRA` row, and nothing downstream of the plan could have caught either —
the in-memory apply performs a rebind to a missing variable as happily as a real one, because that write
only fails in Figma. **Commit before running it:** every revert is `git checkout -- <file>`, which reaches
back to `HEAD`.

Three boundaries worth knowing, all written up at length in that script's header. `--selftest` proves a
defect is reported under the right *category and subject*; it does not proof-read the *summary*, so the
mutations that only degrade a diagnosis assert against the rendered report instead. A mutation must suppress
the `findings.push`, never the guard above it — muting `if (!got) { push; continue; }` drops the `continue`
too, and the diff then crashes rather than going quiet, which is a red run that proves nothing. And two
branches of arm (i) are deliberately left unproven: both fire only on a style *missing* a property, which no
read of a real Figma file produces, so a fixture for them would prove the arm against a shape it cannot meet.

## What this does not check

Stated rather than stubbed, because a half-modelled surface in the join key makes the arms report on
something they cannot see.

- **Gradient geometry.** A paint style's stops and `paintType` are checked; its *shape* is not. The emission
  carries `angle` (linear) or `center`/`shape` (radial) and Figma carries the 2×3 `gradientTransform` matrix
  `apps/plugin/src/write-styles.ts` computes from them. Deriving that matrix here would make this harness a
  second implementation of the writer, and a scan that disagrees with the plugin because it does the maths
  differently is worse than one that says it did not look.
- **A library's interiors.** What a file consumes from a published library is *classified and counted* rather
  than checked: the record lives in the library document, which is a different file and its own scan. The
  count is in the report's notes, so the gap is visible with its size attached.
- **Geometry and layout the engine does not bind.** Only bound properties, the four plan namespaces and the
  four style files travel; a node nudged 3px with no variable involved is invisible here.
- **Order.** Scopes and modes are sorted on both sides. Figma's order is not the emitter's, and an order
  difference is not a defect.
