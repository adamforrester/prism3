# 46 — Rebinding an existing Figma file to Prism3 (learnings)

**Status:** learnings from one pilot, not a built feature. On 2026-10-06 the Log In section (8 screens) of
"NB Stance Design System (Copy)" (`tEzl4Fuv18cgcy9nr2tfIH`) was rebuilt onto the file's local Prism3
variables, styles and components through the Figma Console MCP (`figma_execute`, desktop bridge). The
pilot finished with **0 rogue bindings** in the section and the backup page provably unchanged.

**Why this doc exists:** `docs/10` covers the opposite direction, the engine *writing* tokens into a
file. This covers *rebinding* a file someone else built: replacing a remote library's variables,
styles and components with Prism3's. That is the job #1145 (adjust existing files via the plugin) and
#1553 (MCP-driven Figma bridge, reverse-ingest) would automate. Read this before doing it again by
hand, or before building either.

What is here: the workflow that worked (§1), the plugin-API traps that cost reruns (§2), the mapping
traps (§3), what "0 rogue bindings" has to check (§4), the owner calls the pilot needed (§5), and what
is still open (§6). The reusable snippets are in §7.

---

## 1. The workflow that worked

**The rule above all the steps: never detach a Prism3 component to match a design** (owner,
2026-10-06). Place the component and match the design as closely as its variants, properties, text
content and *layout* overrides allow, without restyling its layers. Then list every visible
difference that remains, so the owner can change the component. A detached or restyled Prism3
component hides exactly the gap the rebuild is meant to find. Detaching is only for the *remote*
library's instances the rebuild is replacing (§2.7). The pilot first built its fields as plain bound
frames, which broke this rule, and then put Prism3 `text-field` back in their place (§3.1).

1. **Mapping pass first, read-only.** Every visible paint, stroke, text run, gap, padding, radius,
   effect and instance in the section, with what each is bound to, mapped to a Prism3 role with a
   confidence (`exact`, `close` with ΔE or px, `judgment`, `gap`). The ambiguous rows become owner
   questions *before* any write. The pilot's mapping pass took about 250k tokens. Building it as a
   shared master table (one row per value, referenced by ID from each section) is what made later
   sections cheap.
2. **Check the fonts in the runtime that will write.** Figma refuses any text edit in a font it cannot
   load, including placing a component that has a text layer (`unloaded font "Suisse Int'l Medium"`).
   The cloud Figma MCP could not load the brand fonts, so the pilot moved to the desktop client, which
   had them installed. Test `figma.loadFontAsync` for every family/style before planning anything else.
3. **Check what depends on the nodes you will edit (§2.1).** This is the step the pilot nearly missed.
4. **Fingerprint anything you promised not to touch** (§7.1), before the first write and after every
   structural step.
5. **One screen first, then compare it against the original.** Screen 1 surfaced all five script
   defects (§2). Each fix was followed by rebuilding screen 1 *from a fresh copy*, never by patching
   the half-built one, so every screen ran through the same final script.
6. **Make each screen's run a single call that starts from a fresh copy.** The runner deletes the
   previous copy, instances the untouched original, detaches it and rebuilds it. A failed or partial
   run is then repaired by running it again, with no manual cleanup. A 1440px desktop screen fitted
   in one `figma_execute` call under its 30s ceiling.
7. **Log every snap and every gray**, per screen, as the run happens: `{placed, snaps, grays, left,
   errs}`. Treat `left` as a to-do list. Most entries are false positives (§2.6), but the ones that
   aren't are real gaps.
8. **Finish with a read-only audit** across the whole section (§4, §7.2), then re-check the
   fingerprint.

## 2. Plugin-API traps

### 2.1 The backup page was instances of the work page

The work page's 8 Log In screens were **main components**, and the "DO NOT TOUCH" backup page's Log
In screens were **instances of them**, one each. Editing the screens in place would have rewritten the
backup through component propagation, with nothing on the backup page itself being written. Check
before writing:

```js
for (const n of targets) if (n.type === 'COMPONENT') (await n.getInstancesAsync()).map(i => /* page of i */);
```

The fix the owner chose: rebuild **detached copies** in place, and move the untouched mains into a
hidden, locked frame ("Original mains (backup source)") in the same section. Moving a main does not
change its instances, and neither does hiding an ancestor frame: the fingerprint matched before and
after. **The parked mains are still the backup's source.** Deleting them later would change the backup.

### 2.2 `figma.createAutoLayout` does not exist

Not in the desktop bridge's runtime, whatever a script written elsewhere assumes. Use
`createFrame()`, then `layoutMode = 'VERTICAL'`, `primaryAxisSizingMode = counterAxisSizingMode =
'AUTO'`, `clipsContent = false`.

### 2.3 A bound paint keeps its placeholder color, and that color can render

`figma.variables.setBoundVariableForPaint(paint, 'color', v)` returns a paint that keeps the
placeholder's own color (see also `docs/32`: it returns, it does not mutate). With a black
placeholder, `exportAsync` rendered single-run texts black (placeholders, the inactive tab, the
copyright line) even though each binding was correct and `resolveForConsumer` returned the right
gray. Multi-run text rendered correctly, which is why it looked intermittent. **Build the paint from
the variable's resolved value:**

```js
const bp = v => { const c = v.resolveForConsumer(root).value;
  return figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: c.r, g: c.g, b: c.b } }, 'color', v); };
```

Then a stale render shows the right color anyway.

### 2.4 Mixed-run text keeps stale node-level remote bindings

After every run of a multi-run text node was given a Prism3 text style and a Prism3 fill,
`node.boundVariables` still listed the remote `fills`, `fontSize` and `fontStyle` aliases, next to the
local ones. No run carried them. `setBoundVariable('fontSize', null)` had no effect, and `'fills'`
throws (paint bindings must be set on paints). **Set the whole node first, then the runs:**

```js
node.fills = [bp(firstRunVar)]; await node.setTextStyleIdAsync(firstRunStyle);
for (const r of runs) { await node.setRangeTextStyleIdAsync(r.start, r.end, r.style); node.setRangeFills(r.start, r.end, [bp(r.var)]); }
```

An audit that reads only `getStyledTextSegments` misses this. Read `node.boundVariables` too (§4).

### 2.5 A remote layout-grid style is a rogue binding

`gridStyleId` pointed at the remote library's "Desktop" and "Mobile" grid styles on every screen
frame, and on every mobile header. Neither the mapping pass nor the script looked at it. Prism3 ships
no grid styles. The pilot unlinked the style and wrote back identical `layoutGrids`. Grids are canvas
guides and never render, so this is not a design change.

### 2.6 Reading a bound paint's color gives the resolved hex

A rebind pass that classifies paints by hex will meet paints it bound itself, now reading as the
Prism3 hex (#6A6868), and report them as unmapped. Skip paints that already carry
`boundVariables.color`, or expect those false positives in `left`.

### 2.7 Smaller ones

- **A FILL instance of a hugging component doesn't stretch what's inside it.** `text-field` hugs at
  320px and its `control` frame hugs too. Setting the instance to FILL in a 505px column stretched the
  label and the message but left the input box at 320. Setting the nested `control` to
  `layoutSizingHorizontal = 'FILL'` on the instance is a legal override that keeps the instance
  attached, and it fixed the input. It's still a component defect (§3.1). Screenshot after every swap:
  this one is invisible in the node tree.
- **Only detach remote instances.** Check `(await n.getMainComponentAsync()).remote` before
  `detachInstance()`; a local (Prism3) instance is never a detach target (§1).
- `detachInstance()` on an outer instance exposes the nested ones. Loop until no remote instance is
  left at the top level, and expect nested FPO/icon instances to surface late.
- `figma_execute` has a 30s ceiling. A partial run leaves no undo point you can reach from the API,
  which is why §1.6's fresh-copy runner matters.
- Reading another page needs `await page.loadAsync()`. That is a read, not a write.

## 3. Mapping traps

- **Stacked paint styles.** "Grey - 50" is #767676 *under two* #000000@20 overlays, and renders about
  #4C4C4C. The mapping pass (row C33) and the script both read only the first paint and sent it to
  `text/tertiary` (#838181). That made the footer links visibly lighter than the original, which the
  screen-1 comparison caught. **Classify the composited color, not the first paint.** Under the pilot's
  gray rule it went to `text/secondary`.
- **The same hex in different roles.** #151415 is text, icon fill, button fill, selected-tab underline
  and checkbox stroke. A hex-to-role table needs the node's context (type, ancestor names, underline,
  inside an `Input`), not just the color.
- **A remote variable whose value isn't in the table.** `pds/color/icon/primary/default` resolved to
  #24262D, which no row covered. It sat on hidden icon slots inside the fields, so screenshots never
  showed it, and only the binding audit found it.
- **`nbds/`-prefixed remote variables are not Prism3.** The remote collection called `color` uses
  `nbds/color/text/primary/default` and similar names. Tell them apart by `remote: true` and by the
  `/default` suffix and `button/` group, which the Prism3 schema doesn't have.
- **Prism3's `field-message` brings its own warning icon.** The design's error line had none. It's a
  correct semantic swap but a visible difference, so call it out in the review.

### 3.1 `text-field` against the Log In design: what the component can't match yet

The 10 fields are Prism3 `text-field` instances, still attached. How each design state was placed:
- **Rest with placeholder (×6):** `status=default, state=rest`, the design's placeholder text, message
  off.
- **Active password (×2):** `state=filled` with the masked value, and the trailing icon swapped to
  `icon/eye-off`.
- **Confirm, in error (×2):** `status=error, state=filled`, message on, with the design's text.
- **Labels (all 10):** the nested `field-label` takes the design's text, `required=true`,
  `emphasis=primary`, `weight=regular`, `size=small`, its smallest.
- **The one override:** `control` set to FILL (§2.7).

What is still different, measured against the original, for the owner to decide in the component:

| | Design | `text-field` today | Where it would change |
|---|---|---|---|
| Field height (rest) | 68 | 75 | follows from the rows below |
| Label | 10px Regular | 14px Regular (`field-label` size small is the smallest) | a smaller `field-label` size |
| Required "*" | right after the label | pushed to the row's far edge (`text` fills the row) | `field-label` layout; the held PR #1832 is this change |
| Label → input gap | 4 | 8 | `text-field` gap |
| Input text | 12px | 16px (`body/md`) | #2251, a small size (with the iOS zoom-on-focus tradeoff it names) |
| Input padding | 12 all round | 8 vertical / 16 horizontal | `text-field` padding |
| Corner radius | 1 | 2 | `text-field` radius |
| Active (focused, with a value) | black border, value shown | no such variant: `focus-visible` shows the placeholder and adds a ring, so `filled` (rest border) was used | a focused-with-value state, or `focus-visible` showing the value |
| Border at rest | #D0D0D0 | `field/border/rest` #838181 | a role or lever call, not the component |
| Placeholder | #999999 | `text/secondary` #6A6868 | as above |
| Error message | 10px, no icon | 11px `field-message`, with a warning icon | `field-message` |
| Error color | #92071F | `text/danger` #BB0025, `border/danger` #CF0A2C | the danger roles (pilot Q63) |
| Width | fills its column | hugs at 320 unless `control` is overridden to FILL | `control` should fill |

## 4. What "0 rogue bindings" has to check

A rogue binding is anything in the section that resolves to a remote library. The pilot's audit
(§7.2) walks every node outside a Prism3 instance and counts:

| Check | Where it hides |
|---|---|
| `node.boundVariables` (every key, every alias) | includes stale text aliases (§2.4) and size/spacing bindings |
| `paint.boundVariables.color` on fills and strokes | |
| `fillStyleId`, `strokeStyleId`, `effectStyleId`, `textStyleId`, **`gridStyleId`** | the grid style (§2.5) |
| per text run: `fillStyleId`, `textStyleId`, `boundVariables`, fills | multi-run text |
| instances whose main component is `remote` | nested ones surface only after detaching outer ones |

Report separately, as **left on purpose**: unbound visible paints, with a reason each; unbound hidden
paints; image fills; effects with no Prism3 equivalent. In the pilot those were the 6% black tint over
the hero photo ×4 (no role fits, and binding a `core` primitive is banned), the photo image fills ×24,
the mobile header's 75px background blur ×4 (no Prism3 blur effect), 20 hidden paints, and the
hamburger icon's stroke widths.

Pilot totals, after the fields became `text-field`: 0 remote variables, 0 remote styles, 0 remote
instances; 1,950 Prism3 bindings; 124 Prism3 instances, 10 of them `text-field`. The bound-frame
fields had carried 2,312 bindings and 136 instances. The difference is bindings and loose
`field-message` and icon instances that the component now owns.

## 5. The owner calls the pilot needed

These are this pilot's own question numbers (they collide with other `Q61`–`Q65` series in the log).
They are design decisions: a rerun on another section should confirm they carry over, not assume it.

- **12px body copy → `caption/lg`** (Prism3 has no 12px body role). Line height goes from 165% to 140%.
- **Off-palette grays → `text/secondary`**, every snap logged for review. The pilot logged 54 runs: 18
  #4B4B4B, 8 #444344, and 28 of the Grey‑50 composite (§3).
- **Error red → the danger roles** (`text/danger`, `border/danger`). Visibly brighter.
- **Fields: first plain frames, then `text-field` (superseded the same day).** The first call was
  plain frames bound to Prism3 variables, because the `text-field` input is 16px and the designs use
  12px (**#2251**). The owner then replaced it with §1's rule: place the attached `text-field`, and
  list the differences instead (§3.1).
- **Links vs actions.** Navigation is plain text with the link style and `text/link/default`. A real
  action ("Resend code") is a small text `button`, which grows from 20px to 36px tall.
- Also recorded with the plan and kept as written: snaps go to the nearest space step, with ties to the
  lower one; the active field gets `border/focus` and the error field `border/danger`; Remember me is a
  `checkbox-control` plus 12px text rather than `checkbox-row`; the cart count is a `badge`.

The structural call in §2.1 (detached copies, mains parked) was also the owner's.

## 6. Open

- **The `text-field` differences in §3.1** are the owner's to decide in the component: label size,
  the "*" position (#1832), gaps, padding, radius, a focused-with-value state, `control` sizing, and
  the input size (#2251). Once they're fixed, the 10 placed instances pick the changes up.
- **Components or frames.** The rebuilt screens are plain frames now. Whether they should become
  components again (the originals were mains, for prototype reuse) is open.
- **Missing Prism3 pieces the pilot rebuilt as bound frames:** header and promo bar, tabs, footer
  (desktop columns and mobile accordion), the 6-slot code input, the password checklist, and the
  hamburger icon. All of them repeat in the other five sections. Building them as components is the
  biggest saving before rebinding the rest of the page, and a design call each.
- **The script.** The pilot's runner and audit live outside the repo (the owner's working folder). If
  this becomes repeatable work, it belongs in `tools/` with its own audit as the gate, per
  `tools/CLAUDE.md`. That would be its own PR.

## 7. Reusable snippets

### 7.1 Fingerprint a section you must not change

Hashes structure, geometry, visibility, paints and their bindings, and text runs. Run it before the
first write, keep the output, and compare after every structural step.

```js
const hp = p => p.type === 'SOLID' ? [p.color.r, p.color.g, p.color.b, p.opacity, p.visible].map(x => typeof x === 'number' ? x.toFixed(4) : x).join(',') + (p.boundVariables && p.boundVariables.color ? 'v' + p.boundVariables.color.id : '') : p.type;
const fp = n => { let s = `${n.type}|${n.name}|${n.visible}|${n.width.toFixed(2)}x${n.height.toFixed(2)}@${n.x.toFixed(2)},${n.y.toFixed(2)}`;
  if ('fills' in n && Array.isArray(n.fills)) s += '|f' + n.fills.map(hp).join(';');
  if ('strokes' in n) s += '|s' + n.strokes.map(hp).join(';') + (typeof n.strokeWeight === 'number' ? n.strokeWeight : 'mix');
  if (n.type === 'TEXT') s += '|t' + n.characters + JSON.stringify(n.getStyledTextSegments(['fontName','fontSize','fills','textStyleId','lineHeight']).map(g => [g.fontName, g.fontSize, g.textStyleId, g.lineHeight, g.fills.map(hp)]));
  if ('children' in n) s += '[' + n.children.map(fp).join('/') + ']';
  return s; };
const h = s => { let a = 5381; for (let i = 0; i < s.length; i++) a = ((a * 33) ^ s.charCodeAt(i)) >>> 0; return a.toString(16) + ':' + s.length; };
// for (const c of section.children) out[c.id] = h(fp(c));
```

### 7.2 Rogue-binding audit (read-only)

```js
const vn = async id => { const v = await figma.variables.getVariableByIdAsync(id); return v ? (v.remote ? 'R:' : 'L:') + v.name : 'MISSING'; };
const sn = async id => { if (!id || typeof id !== 'string') return null; const s = await figma.getStyleByIdAsync(id); return s ? (s.remote ? 'R:' : 'L:') + s.name : 'MISSING'; };
for (const n of [root, ...root.findAll(() => true)]) {
  // skip descendants of instances: a Prism3 instance's internals are the component's business
  if (n.type === 'INSTANCE' && (await n.getMainComponentAsync()).remote) /* rogue instance */;
  for (const [k, v] of Object.entries(n.boundVariables || {})) for (const a of [].concat(v)) /* vn(a.id) startsWith 'R:' → rogue */;
  for (const k of ['fills', 'strokes']) for (const p of (Array.isArray(n[k]) ? n[k] : [])) /* p.boundVariables?.color → vn */;
  for (const k of ['fillStyleId', 'strokeStyleId', 'effectStyleId', 'textStyleId', 'gridStyleId']) /* sn(n[k]) */;
  if (n.type === 'TEXT') for (const seg of n.getStyledTextSegments(['fillStyleId', 'textStyleId', 'boundVariables', 'fills'])) /* same, per run */;
}
```
