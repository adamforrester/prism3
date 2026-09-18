# `tools/binding-audit/` — expected part→variable ledger + unbound / mis-bound detection

A **measurement harness** (#1499). It answers one question — *are any tokens unbound or bound to the
wrong role?* — and exits 0. It is not wired into `ci.yml`; see [why it has no gate sibling](#why-a-tool-and-not-a-gate).

```bash
npx tsx tools/binding-audit/audit.ts            # the report: ledger summary + findings
npx tsx tools/binding-audit/audit.ts --json     # the findings as machine JSON
npx tsx tools/binding-audit/audit.ts --ledger    # the full per-member expected ledger (JSON, for the live-file diff)
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

## Live-file companion (read-only)

The ledger (`--ledger`) is what makes a **live Figma file** auditable. Paste the script below into the
Figma **console** (Plugins → Development → Open console, or a quick-plugin scratch) with the audit
selection on the page, or run it from a plugin. It **reads only** — it never writes — surfacing (a)
nodes bound to the wrong variable and (b) nodes unbound where the ledger expects a bind.

1. Generate the ledger next to the file you are auditing:
   ```bash
   npx tsx tools/binding-audit/audit.ts --ledger > ledger.json
   ```
2. Load `ledger.json` into the plugin (via `figma.ui` file input, a fetch, or by pasting the JSON
   into the `LEDGER` constant), select the component set(s) to check, and run:

```js
// tools/binding-audit — READ-ONLY live-file diff against the expected ledger.
// LEDGER = the parsed output of `npx tsx tools/binding-audit/audit.ts --ledger`.
// It reads node.boundVariables and reports mismatches; it writes nothing.
async function auditSelection(LEDGER) {
  const key = (...parts) => JSON.stringify(parts); // composite map key, no delimiter collisions
  const byName = new Map(); // variableId -> slash-pathed name, resolved lazily
  async function varName(id) {
    if (byName.has(id)) return byName.get(id);
    const v = await figma.variables.getVariableByIdAsync(id);
    byName.set(id, v ? v.name : null); // Figma variable names are already slash-pathed
    return byName.get(id);
  }
  // A node's OWN first bound fill/stroke variable name, or null.
  async function ownBind(node, field) {
    const bv = node.boundVariables || {};
    const entry = bv[field] && bv[field][0];
    return entry && entry.id ? await varName(entry.id) : null;
  }
  // Expected binds split by where they land: own fill/stroke ON the node, vs. glyph ink on a VECTOR
  // DESCENDANT of the node (`descendantFills` — the ink is a per-instance override on the vector inside
  // the swapped/nested instance, NOT the node's own fills; this is the #1471 class, so it must be
  // followed rather than skipped).
  const own = new Map();        // key(component, member, node, "fills"|"strokes") -> variable
  const descendant = new Map(); // key(component, member, node) -> variable
  for (const [component, members] of Object.entries(LEDGER.components)) {
    for (const m of members) for (const b of m.bindings) {
      if (b.field === 'descendantFills') descendant.set(key(component, m.member, b.node), b.variable);
      else own.set(key(component, m.member, b.node, b.field), b.variable);
    }
  }

  const findings = [];
  function pathOf(node, root) {
    const parts = [];
    for (let n = node; n && n.id !== root.id; n = n.parent) parts.unshift(n.name);
    return '/' + parts.join('/');
  }
  // The variable bound to the FIRST descendant that carries a bound fill (the glyph vector inside an
  // instance). Read-only; returns null if nothing beneath the node is bound.
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
  async function walk(node, component, member, root) {
    const path = pathOf(node, root);
    for (const field of ['fills', 'strokes']) {
      const want = own.get(key(component, member, path, field));
      if (!want) continue;
      const got = await ownBind(node, field);
      if (!got) findings.push({ kind: 'UNBOUND', component, member, node: path, field, want });
      else if (got !== want) findings.push({ kind: 'MIS-BOUND', component, member, node: path, field, want, got });
    }
    const wantInk = descendant.get(key(component, member, path));
    if (wantInk) {
      const got = await descendantInk(node);
      if (!got) findings.push({ kind: 'UNBOUND', component, member, node: path, field: 'descendantFills', want: wantInk });
      else if (got !== wantInk) findings.push({ kind: 'MIS-BOUND', component, member, node: path, field: 'descendantFills', want: wantInk, got });
    }
    if ('children' in node) for (const c of node.children) await walk(c, component, member, root);
  }

  for (const sel of figma.currentPage.selection) {
    const members = sel.type === 'COMPONENT_SET' ? sel.children : [sel];
    for (const member of members) {
      // Figma names a variant member by its coordinate string ("appearance=filled, size=small, …"),
      // which is exactly what --ledger stores as `member`. Match by whichever ledger component carries
      // that coordinate (matching by set name is unreliable across brands/renames).
      const coord = member.type === 'COMPONENT' && member.variantProperties
        ? Object.entries(member.variantProperties).map(([k, v]) => `${k}=${v}`).join(', ')
        : member.name;
      for (const component of Object.keys(LEDGER.components)) {
        if (LEDGER.components[component].some((m) => m.member === coord)) {
          await walk(member, component, coord, member);
          break;
        }
      }
    }
  }

  console.table(findings);
  console.log(`${findings.length} finding(s): ` +
    `${findings.filter((f) => f.kind === 'MIS-BOUND').length} mis-bound, ` +
    `${findings.filter((f) => f.kind === 'UNBOUND').length} unbound.`);
  return findings;
}

// Usage: await auditSelection(LEDGER);
```

The companion is intentionally small — it is the read-only diff #1499 asks the README to carry, not a
shipped plugin, and it makes two simplifying assumptions worth stating: it takes the first bound fill
beneath a node as the glyph ink (right for the corpus's single-glyph slots), and it matches a member
by its variant-coordinate string. The interim unbound-only console script the owner was running catches
only the baked (unbound) class; this ledger diff catches the **mis-bound** class too, because it
compares the actual variable against the one the ledger names — including the glyph ink that #1471 was.
