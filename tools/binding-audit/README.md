# `tools/binding-audit/` — expected part→variable ledger + unbound / mis-bound detection

A **measurement harness** (#1499). It answers one question — *are any tokens unbound or bound to the
wrong role?* — and exits 0. It is not wired into `ci.yml`; see [why it has no gate sibling](#why-a-tool-and-not-a-gate).

```bash
npx tsx tools/binding-audit/audit.ts                         # the report: ledger summary + findings
npx tsx tools/binding-audit/audit.ts --json                  # the findings as machine JSON
npx tsx tools/binding-audit/audit.ts --ledger                # the full per-member expected ledger (JSON)
npx tsx tools/binding-audit/audit.ts --reconcile export.json # diff a LIVE file's actual binds vs the ledger (#1511)
npx tsx tools/binding-audit/reconcile.ts --selftest          # the reconcile fixture round-trip (exit 1 on fail)
```

## What it does

The owner found unbound and incorrectly-bound tokens during QA — the icon-button glyph bound to a
`text.*` role instead of `icon.*` (fixed as **#1471**) is the motivating case — and wanted that
systematized rather than eyeballed. A console pass over a live Figma file can see *bound vs unbound*
but **not** *bound to the wrong token*; the whole value here is the second half. So the tool builds
the **expected** binding map from the component defs / the engine's projection and diffs the
**actual** emitted binding against it. Three outputs, exactly as #1499 asks:

1. **The expected ledger.** From `figmaAnatomyPlan` → each Figma member's nodes, the
   `(component, member, node, slot) → bound-variable` map. This is the source of truth for *what
   should bind to what*, and the reference a live Figma file is diffed against. The plan carries
   variable **names**, not resolved values, so the ledger is **brand-invariant** — one ledger audits
   a live file of any corpus brand.

2. **Unbound detection.** A color binding a def *declares* that the projector returns at **no**
   coordinate. In the emitted plan every painted slot is a bound variable (the plan cannot bake a
   literal), so the in-repo signal for the *baked-where-it-should-bind* class is a declared bind that
   emits nothing: in a live file the node it was meant for is then unbound (a baked default). This
   overlaps `packages/engine/lint-paint.ts`'s arm-3 reachability gate on purpose — the value here is
   one consolidated report beside the ledger and the mis-bind pass. Ring **nominations** (a color a
   *nested* `focus-ring` component draws, not a slot the host paints) are excluded by shape, so they
   are not reported as dead binds.

3. **Mis-bound detection (the #1471 class).** A slot bound to a role whose **family** mismatches the
   slot's **kind** — a glyph inking a `text.*` role, a border painting a `fill` role, a surface
   painting an ink role. The slot kind is read off the plan node (a `FRAME`'s `fills` is a surface,
   its `strokes` a border; a `TEXT`'s `fills` is text ink; any `descendantFills` is glyph ink), and
   the role family off the emitted variable. The heuristic map of *slot-kind → allowed role-family*
   lives in `ALLOWED` in `audit.ts`; anything outside it is reported for human review, grouped by
   component and severity-ordered (mis-bound before unbound).

A run over today's corpus reports **0 mis-bound** and one hedged unbound (`field-message`'s
`default.icon`, a code-only glyph with no Figma member — the category-(b) case `lint-paint.ts`
documents). That is what a healthy audit looks like: the instrument's value is that it **lights up on
a regression**. Reverting #1471 (repointing an icon-button glyph back to `interactive.<family>.text.*`)
makes it name the defect precisely:

```
icon-button | /container/icon [glyph-ink] -> color/interactive/primary/text/rest  family=text  ×120
...
```

## Why a tool and not a gate

Per `tools/CLAUDE.md`: a tool answers a question and exits 0; a gate asserts an answer and fails. The
mis-bind pass is a **heuristic**, and that is the reason it must be a tool. Its map encodes what a
slot-kind *should* bind from design semantics, and the corpus carries deliberate, already-pinned
cross-slot bindings the heuristic would otherwise flag:

- the disabled outline edge binds `color.disabled.icon` rather than `color.disabled.border` so the
  edge tracks the disabled ink and clears 3:1 on an inverse ground (**#1349**, pinned *by name* in
  `packages/engine/test.ts`);
- the switch thumb paints `on-fill` (a filled knob whose color *is* the on-fill ink);
- the switch on/off glyphs are tinted with the track's own `fill` role so they read as subtle marks.

Those are design decisions, not defects, so `ALLOWED` admits them **with a stated reason**. Encoding
them as gate exemptions would duplicate what `test.ts` and `lint-paint.ts` already pin. If a
*specific* mis-binding later hardens into a contract, a gate enforces **that one** separately (#1499),
independently of this survey. The independence discipline (`docs/34`) is still honored: the expected
constraint (`ALLOWED`) and the reachability sentinels are authored apart from the defs they check —
see `audit.ts`'s header.

## Live-file reconcile (#1511)

`audit.ts` audits the **engine's emission** — correct by construction. The real QA risk is a **live
file drifting** from that intent: a manual rebind, a stale projection, a wrong swap. The interim
console script the owner ran during QA found nodes with **no** variable bound, but never checked
whether the bound ones point at the **right** variable. The reconcile mode closes that gap, in two
halves that stay in sync because they share one documented interface:

1. a **console export snippet** (below) the owner pastes into Figma — it **reads only** and dumps the
   file's *actual* per-node bindings as small, versioned JSON;
2. **`--reconcile <export.json>`** — ingests that JSON and diffs it against the expected `--ledger`,
   reporting per `(component, member, node, slot)`:

   | verdict | meaning |
   |---|---|
   | **MATCH** | bound to the variable the ledger expects |
   | **WRONG-TOKEN** | bound, but to a *different* variable (reports got X / want Y) — *the check that did not exist before* |
   | **UNBOUND** | the ledger expects a bind; the file reports none (the class the console script found) |
   | **EXTRA** | the file binds a field the ledger does not cover at that node |
   | **UNKNOWN-NODE** | a node in the export the ledger cannot place (renamed set, hand-added node, stale member) |

   plus a **COVERAGE** summary. **Partial exports are normal** — a QA file may hold only some
   components — so a ledger coordinate simply *absent* from the export is reported as *not covered*,
   **never** as UNBOUND. Only a node the export actually carries, with that field reported `UNBOUND`,
   is an UNBOUND finding.

### The matching key (snippet ↔ ledger)

The diff is a plain key join on the projection's **deterministic name-path** — the coordinates
`ledger.ts` builds and the console snippet reproduces:

- **component** = the Figma **set name** = the engine's `def.id` (`set.name = plan.component`).
- **member** = the variant-**coordinate string** (`appearance=filled, size=small, …`) — both
  `planComponentName`'s output and Figma's own member name.
- **node** = the name-path of a node **within** the member, **member-relative**: the member root is
  `/`, its child `foo` is `/foo`. This is load-bearing — the plugin converts the plan's root frame
  (`container`/`glyph`) *in place* into the member component and renames it to the coordinate
  (`createComponentFromNode` in `apps/plugin/src/write-components.ts`), so the live member **is** the
  plan root. The ledger stores the root name as its first path segment (`/container/icon`); the
  reconciler strips it (`memberRelative`) to line up with a live walk that starts *at* the member,
  and the snippet emits member-relative paths directly.
- **field** ∈ `{fills, strokes, descendantFills}` — the same three the snippet reports.

A coordinate the ledger cannot place becomes **UNKNOWN-NODE**, never a crash.

### The console export snippet (read-only)

Paste into the Figma **console** (Plugins → Development → Show/Hide console) with the component set(s)
to audit **selected** on the page. It **writes nothing**. It logs the JSON `--reconcile` ingests;
`copy(JSON.stringify(await exportBindings(), null, 2))` puts it on the clipboard.

```js
// tools/binding-audit — READ-ONLY console EXPORT of a live file's ACTUAL bindings (#1511).
// Select the projected Prism 3 component set(s), run, save the logged JSON to a file, then:
//   npx tsx tools/binding-audit/audit.ts --reconcile <that-file>.json
async function exportBindings() {
  const nameById = new Map();                          // variableId -> slash-pathed name (Figma names ARE slash-pathed)
  async function varName(id) {
    if (nameById.has(id)) return nameById.get(id);
    const v = await figma.variables.getVariableByIdAsync(id);
    nameById.set(id, v ? v.name : null);
    return nameById.get(id);
  }
  // A node's OWN bound variable name for a paint field, or null.
  async function ownBind(node, field) {
    const e = node.boundVariables && node.boundVariables[field] && node.boundVariables[field][0];
    return e && e.id ? await varName(e.id) : null;
  }
  // The glyph ink of a swapped/nested INSTANCE: the first bound fill on any descendant (the #1471
  // class — the ink is a per-instance override on the vector INSIDE the instance, not the node's own).
  async function descendantInk(node) {
    const stack = 'children' in node ? [...node.children] : [];
    while (stack.length) {
      const n = stack.shift();
      const got = await ownBind(n, 'fills');
      if (got) return got;
      if ('children' in n) stack.push(...n.children);
    }
    return null;
  }
  // Vector/shape leaves whose OWN fill IS the glyph ink (a glyph drawn in place, not swapped).
  const SHAPE = new Set(['VECTOR', 'BOOLEAN_OPERATION', 'STAR', 'ELLIPSE', 'POLYGON', 'LINE', 'RECTANGLE']);
  const nodes = [];
  function pathOf(node, root) {                         // MEMBER-RELATIVE — the member root is '/'
    const parts = [];
    for (let n = node; n && n.id !== root.id; n = n.parent) parts.unshift(n.name);
    return '/' + parts.join('/');
  }
  // The three fields the ledger keys on, chosen by node type so a container never reports a spurious
  // `descendantFills` picked up from a bound label beneath it (which would read as EXTRA).
  async function fieldsOf(node) {
    const f = {};
    if (node.type === 'TEXT') {
      f.fills = (await ownBind(node, 'fills')) || 'UNBOUND';                 // text ink
    } else if (node.type === 'INSTANCE') {
      f.fills = (await ownBind(node, 'fills')) || 'UNBOUND';
      f.strokes = (await ownBind(node, 'strokes')) || 'UNBOUND';
      f.descendantFills = (await descendantInk(node)) || 'UNBOUND';          // swapped glyph ink (#1471)
    } else if (SHAPE.has(node.type)) {
      f.descendantFills = (await ownBind(node, 'fills')) || 'UNBOUND';       // a glyph drawn in place
    } else {                                                                 // FRAME / COMPONENT / GROUP
      f.fills = (await ownBind(node, 'fills')) || 'UNBOUND';                 // surface
      f.strokes = (await ownBind(node, 'strokes')) || 'UNBOUND';            // border
    }
    return f;
  }
  async function walk(node, component, member, root) {
    nodes.push({ component, member, node: pathOf(node, root), fields: await fieldsOf(node) });
    if ('children' in node) for (const c of node.children) await walk(c, component, member, root);
  }
  for (const sel of figma.currentPage.selection) {
    const component = sel.name;                          // the SET name = the engine's def.id
    const members = sel.type === 'COMPONENT_SET' ? sel.children : [sel];
    for (const member of members) {
      const coord = member.type === 'COMPONENT' && member.variantProperties
        ? Object.entries(member.variantProperties).map(([k, v]) => `${k}=${v}`).join(', ')
        : member.name;                                   // the member coordinate = the ledger `member`
      await walk(member, component, coord, member);      // member IS the ledger root -> '/'
    }
  }
  const out = { format: 'prism3-binding-export', version: 1, capturedFrom: figma.root.name, nodes };
  console.log(JSON.stringify(out, null, 2));
  return out;
}
// Usage:  await exportBindings();
//   or:   copy(JSON.stringify(await exportBindings(), null, 2));
```

The export shape is small, stable and **versioned** (`format`/`version`), so the snippet and the
reconciler can evolve together without silently disagreeing:

```json
{
  "format": "prism3-binding-export",
  "version": 1,
  "nodes": [
    { "component": "icon-button", "member": "appearance=filled, …, state=rest",
      "node": "/", "fields": { "fills": "color/interactive/primary/fill/rest", "strokes": "UNBOUND" } },
    { "component": "icon-button", "member": "appearance=filled, …, state=rest",
      "node": "/icon", "fields": { "descendantFills": "color/interactive/primary/on-fill" } }
  ]
}
```

Two simplifying assumptions the snippet makes, worth stating: it takes the **first** bound fill beneath
an instance as the glyph ink (right for the corpus's single-glyph slots), and it classifies a node's
field by **type**. Because it emits `descendantFills` only for `INSTANCE` nodes (and reports a plain
shape's own fill under `descendantFills` at the shape itself), a glyph container that is a `FRAME`/`GROUP`
in the live file has its ink reported one level down on the child shape rather than on the container the
ledger keys. The **reconciler** absorbs that on the ledger side (#1523) so the snippet need not know a
slot's live node type: `foldDescendantInk` lifts a child shape's `descendantFills` onto the container
coordinate the ledger expects, and `mapLooseComponents` remaps a loose `icon/<name>` component (a
standalone `COMPONENT` with no variantProperties) onto the ledger's `icon`/`name=<name>` coordinate. So
the composite controls (buttons, icon-buttons, fields — swapped `INSTANCE` glyphs), the non-instance
glyph containers (spinner, checkbox mark/dash, switch glyphs, …) and the loose icon set all reconcile
cleanly. The field mapping is documented here precisely so it can be adjusted in lockstep with the
reconciler if a live file's structure ever differs again.

**Group sets paint nothing of their own, so their ledger is empty by design (#1523).** A live
`checkbox-group` / `radio-group` binds `/label/text`, each row's `/label`, and each row's
`/controlBox/control` stroke, yet the group ledger is `[]` — and that is correct. The group defs declare
no paint slots (`components/checkbox-group.ts`: "THE GROUP PAINTS NOTHING OF ITS OWN"); every one of
those binds is painted by a **nested** instance from its own definition — the label a nested
`field-label`, each row a nested `checkbox-row` (which nests `checkbox-control`). Those binds are
therefore audited under the `field-label` / `checkbox-row` / `checkbox-control` sets, never the group,
and reading them as UNKNOWN-NODE on the group set is the instrument working as intended (the mechanism
behind ~500 of the run's UNKNOWN-NODE entries). No coverage hole exists: nothing binds *only* through a
group set. Were a group def ever to gain a paint slot of its own, that would be an **engine projection**
change (a new binding in the group ledger), not a reconciler one.

### Worked example (export → reconcile → report)

A committed fixture — a partial `icon-button` export seeded to exercise every verdict —
`fixtures/example-export.json`, run through the reconciler:

```bash
npx tsx tools/binding-audit/audit.ts --reconcile tools/binding-audit/fixtures/example-export.json
```

```
Prism3 binding reconcile (#1511) — live file vs. expected ledger

── Coverage ───────────────────────────────────────────────────────────────────
  2/2190 ledger members touched · 4/5558 expected binds evaluated (0%).
  Partial exports are normal — a coordinate absent from the export is NOT counted as unbound.
  Components present in the export:
    icon-button              2/216 members

── Verdicts ───────────────────────────────────────────────────────────────────
  2 MATCH · 1 WRONG-TOKEN · 1 UNBOUND · 1 EXTRA · 1 UNKNOWN-NODE

── Findings (drift from the ledger) ───────────────────────────────────────────
  ✗ WRONG-TOKEN   icon-button · appearance=filled, …, state=hover · / [fills]
                   got color/interactive/primary/fill/pressed  ·  want color/interactive/primary/fill/hover
  · UNBOUND       icon-button · appearance=filled, …, state=hover · /icon [descendantFills]
                   want color/interactive/primary/on-fill  ·  file binds nothing
  + EXTRA         icon-button · appearance=filled, …, state=hover · / [strokes]
                   binds color/disabled/icon  ·  ledger covers no binding here
  ? UNKNOWN-NODE  icon-button · appearance=filled, …, state=rest · /__hand-added-badge__
                   binds fills=color/disabled/fill  ·  ledger cannot place this node
```

### The fixture round-trip (acceptance)

`reconcile.ts --selftest` builds its scenarios from the **live ledger** (so they never go stale against
a hand-written fixture) and asserts each verdict in isolation — all-correct → all MATCH; one
wrong-but-valid → exactly one WRONG-TOKEN; one blanked → one UNBOUND; one stray node → one
UNKNOWN-NODE; one uncovered field → one EXTRA; plus the two root-normalization arms (#1522). It also
carries one arm per #1523 coverage extension, each of which fails **by name** when its fix is reverted:

- **gap 1** — a non-`INSTANCE` glyph-container's ink, reported on a child shape, folds up and MATCHes
  (revert `foldDescendantInk` → the bind is skipped and the child scores UNKNOWN-NODE);
- **gap 2** — a loose `icon/<slug>` component maps to `name=<slug>` and MATCHes (revert
  `mapLooseComponents` → UNKNOWN-NODE);
- **gap 3** — the group-set conclusion, pinned both ways: the `checkbox-group` / `radio-group` ledgers
  are empty, and the roles a live group carries MATCH under the atom/row sets while scoring UNKNOWN-NODE
  under the group (a paint slot added to a group def would trip it — an engine change, not a reconciler
  one).

It exits non-zero on any mismatch. It is a self-check the author runs, **not** a wired gate — the
reconciler diffs a *live* file, which is not in CI, so the gate count stays 60 (`tools/CLAUDE.md`).
