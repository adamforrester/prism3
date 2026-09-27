# 18 — Figma plugin & host architecture (what's shareable, and what the plugin can/can't do)

> `08` locks the *decision* (one shared control layer, the lever manifest is the seam) and
> names the two materialization routes; `10` is the emit contract; `14` is the component
> layer. This doc is the **capability grounding**: exactly how a Figma plugin executes, what
> its API can and cannot do, and how that maps onto Prism3's hosts — so when the plugin build
> starts we're precise about which code is shared and which is adapter-specific. Sourced from
> the current Figma Plugin API docs (developers.figma.com/docs/plugins, fetched 2026-07-05).

---

## 1. How a plugin executes — two contexts, and the split is load-bearing

A Figma plugin runs in **two separate JavaScript contexts that cannot touch each other's
capabilities**. This split *is* the architecture — it decides where each layer of our stack runs.

| | **Main thread (sandbox)** | **UI iframe** (`figma.showUI`) |
|---|---|---|
| Figma document (`figma.*`, canvas, variables, nodes) | ✅ **only here** | ❌ none |
| DOM / rendering | ❌ | ✅ |
| Network (`fetch`/`XHR`) | ❌ **cannot** | ✅ (gated by manifest) |
| `setTimeout`/`setInterval` | ❌ | ✅ |
| JS runtime | minimal (QuickJS-class): ES2020+, `Array/Object/Map/Set/Promise/Proxy/Reflect/JSON/Math/Date/RegExp/structuredClone` | full browser |

They communicate by **message passing only**: main → UI via `figma.ui.postMessage(msg)`; UI → main
via `parent.postMessage({ pluginMessage: msg }, '*')`, received on `figma.ui.onmessage`. Because the
main thread has **no network**, the canonical pattern is: *the UI iframe does any network, then
postMessages results to the main thread, which touches the document.*

**Why this matters for us:** our engine core is pure (no `node:`, no DOM, no network), so it can run
in **either** context. The clean split:

- **UI iframe** runs the **shared control UI + the engine core + the live preview** — literally the
  same code as the web dashboard (an iframe is just HTML/JS). It computes the token tree from the
  `BrandInput` and renders a DOM/CSS preview, exactly as the web host does.
- **Main thread** is a **thin Figma-write adapter** (plugin-only): it receives the resolved tree over
  postMessage and writes `figma.variables` / modes / styles / component nodes.

So the "render adapter" split from `08 §3` lands exactly on the thread boundary: everything above the
write step is shared with the web host; only the main-thread writer is plugin-specific.

## 2. The manifest (the plugin's contract)

Key fields (developers.figma.com/docs/plugins/manifest):

- **`main`** / **`ui`** — the sandbox code file / the iframe HTML.
- **`editorType`** — array of `"figma"` | `"figjam"` | `"dev"` | `"slides"` | `"buzz"` (note: `figjam` +
  `dev` together are unsupported). We target `"figma"` (and likely `"dev"` for a read/inspect surface).
- **`documentAccess: "dynamic-page"`** — **required for new plugins**. It's why the document getters are
  **async** (`getLocalVariableCollectionsAsync`, `getVariableByIdAsync`, …) — pages load on demand.
- **`networkAccess`** — `{ allowedDomains: [...] , reasoning, devAllowedDomains }`. `allowedDomains` is
  required (`"none"` / `"*"` / wildcards / explicit URLs); `"*"` or localhost needs `reasoning`. An
  unlisted request gets a CSP error. **Prism3 needs none of this at runtime** — the engine is bundled
  in, no server call — so we can ship `allowedDomains: ["none"]`, a real trust/reliability win.
- **`permissions`** — `currentuser` / `activeusers` / `fileusers` / `payments` / `teamlibrary`.
- **`capabilities`** — `textreview` / `codegen` / `inspect` / `vscode` (codegen/inspect = Dev-Mode surfaces).

## 3. What the plugin API can write — and what it can't

**Variables** (the v1 theming path — reliable today):
`figma.variables.createVariableCollection(name)` → `createVariable(name, collection, type)` where type ∈
`STRING | FLOAT | COLOR | BOOLEAN`; `collection.addMode(name)` + `variable.setValueForMode(modeId, value)`
for light/dark/HC; `createVariableAlias(variable)` for the semantic→primitive links; bind to nodes via
`node.setBoundVariable(field, v)` (simple) or `figma.variables.setBoundVariableForPaint/Effect/LayoutGrid`
(fills/effects/grids). Cross-file library values load via `importVariableByKeyAsync(key)`. Gotchas: getters
are **async**; fills/strokes/effects are **immutable arrays** (clone → mutate → reassign); the variable type
must match the bound field. This is precisely the shape `emit-figma` already targets (`10`).

**Components** (the component layer — `14`): `figma.createComponent()`, `figma.combineAsVariants(nodes,
parent)` → a `ComponentSet`, `addComponentProperty(name, type, default)` where type ∈ `BOOLEAN | TEXT |
INSTANCE_SWAP | VARIANT | **SLOT**`, `createInstance()`, `instance.setProperties({...})`. The **`SLOT`**
property type is the direct Figma expression of the KB `§15` slot contracts (`required_content` /
`optional_content`) — worth noting, it's newer than most plugin code assumes.

**What the API cannot express** (the real boundary — this is the "lossy" line, precisely):
- **Behaviour / interaction logic** — a working focus trap, arrow-key menu nav, a state machine. Figma has
  prototyping, not logic.
- **Accessibility semantics** — ARIA roles, names, live regions, the keyboard contract. Figma has no a11y layer.
- **Motion** beyond Figma's prototype/Smart-Animate.
- **Non-visual config** — an alert's autohide, a debounce.

These are **not a data problem we can solve with a richer spec** — they are *not representable on the Figma
canvas at all*. They live in **code**. So a Figma component is inherently the **visual/structural shell**;
the full component = Figma (visual) + code (behaviour/a11y) + docs + `.ai.json`, all generated from the one
`§15` data spec (`14`). Building the visual shell from data is reliable; expecting the `.fig` to be the whole
component is the mistake.

## 4. Materialization routes — and why offline `.fig` is out

Three ways bits reach a Figma file; two are viable (`08 §5`):

1. **Plugin (manual / no-LLM)** — UI iframe (shared engine + controls) → main thread writes variables /
   modes / styles / component nodes. The designer's journey.
2. **Figma MCP (agentic)** — the MCP writes variables and creates nodes directly (`get_variable_defs`,
   `create_new_file`, `use_figma`, …); no plugin UI. Same document API, different driver.
3. **Offline `.fig` generation — NOT viable.** `.fig` is Figma's **closed, proprietary binary format**;
   there is no public writer and reverse-engineered ones are fragile and break on format changes. The
   *only* reliable way onto the canvas is the Plugin API (routes 1–2), which runs **inside** Figma. Ruled
   out on reliability grounds — exactly the property we're optimizing for.

The reliable component workflow that composes these: **build once** in Figma (LLM + Figma MCP, route 2) →
**extract to `§15` data** (the Specs-CLI-style read leg, `14 §4`) → data is the source of truth → the
plugin **rebuilds any subset** the user picks (or "add all, delete unwanted"). The round-trip is what makes
it reliable — the data is generated from a real, working build, and can regenerate it.

## 5. What's shared vs. adapter-specific (the ecosystem map)

Everything hangs off the **lever manifest** (`08 §4`) — one machine-readable description of the controls,
rendered by every surface:

| Layer | Web dashboard | Figma plugin | Figma MCP | Shared? |
|---|---|---|---|---|
| Engine core (`brandTheme` → tree, preview, contracts) | UI | UI iframe | server-side | **shared, verbatim** (pure, runs anywhere) |
| Control UI (knobs from the lever manifest) | DOM | **same code**, in the iframe | tool schema derived from the manifest | **shared** |
| Live preview | DOM/CSS variables | DOM/CSS in the iframe | n/a | **shared** |
| **Write / apply tier** | CSS custom props on the page | **main thread → `figma.variables` / nodes** | MCP → document API | **adapter-specific** |

Only the bottom row differs. That's the payoff of `08 §3`: refining the web UI now hardens the plugin's UI
by construction, because it's the same control + preview code — only the write adapter is new.

## 6. Terminology guard — two unrelated "primitives"

The word collides across our two domains; keep them apart:

- **Primitive *token*** — a raw base value in the token tree (`palette.red.550`, `dimension.8`), the tier
  we hide behind semantic roles (`10 §3`, the `core-*` collections).
- **Headless *primitive*** — a low-level, **unstyled, behaviour-only component** (the Radix / React-Aria
  sense): keyboard model, focus management, ARIA, state — *no* styling. The base building block of the
  **component** layer, and (per KB `27-adaptive-interfaces`) what an LLM can actually compose against.

They're unrelated. In the component layer the two meet cleanly: a coded component = a **headless primitive**
(behaviour + a11y, the parts Figma can't hold) **skinned with Prism3 tokens** (including primitive tokens,
via semantic roles). The Figma component is that same thing's visual shell.

## 7. Open decisions this grounding surfaces

- **Bundling** — the engine + control UI must bundle into the plugin's iframe HTML (a browser/Figma bundle
  is a packaging step, not a port — `09`). No `npm install` at runtime; `networkAccess: none`.
- **Author our own headless primitives vs. wrap an existing lib** (React Aria / Radix / Ark) — a `14`-layer
  decision, deferred.
- **Dev-Mode surface** — whether the plugin also ships a `dev`/`inspect` capability (read tokens/specs in
  Dev Mode) alongside the design-mode theming surface.
- **Whether a Prism3 *widget* ships at all** — open, and the owner's call. What `§8` settles is narrower and
  technical: the **theming surface** cannot be a widget, ruled out on the same reliability grounds as the
  `.fig` route in `§4`. Candidate widget uses were explored and none is filed to build (`§8a` closes the one
  that looked strongest).

## 8. Widgets — a second host shape, and why the theming surface isn't one

Sourced from the current Figma Widget API docs (developers.figma.com/docs/widgets, fetched 2026-09-27).
`§1`–`§7` grounded the **plugin**. A widget is the other way code lives in a Figma file, and it was worth
asking whether the theming surface should be one — a widget sits on the canvas rather than in a modal, so
the hope was a larger view. **It is the opposite, and the reasons generalize past this one question.**

**Three reasons the theming surface is not a widget:**

1. **Widget rendering is not the DOM.** The whole vocabulary is eleven JSX components — `AutoLayout`,
   `Frame`, `Text`, `Rectangle`, `Image`, `Ellipse`, `SVG`, `Line`, `Input`, `Fragment`, `Span` — and the
   hooks `useEffect`, `usePropertyMenu`, `useStickable`, `useStickableHost`, `useSyncedState`,
   `useSyncedMap`, `useWidgetId`. No HTML, no CSS. So the shared control UI of `§5` — the *same code* that
   runs in the web dashboard and the plugin iframe — **cannot run in a widget's canvas rendering at all.**
   A widget version is a rewrite that forfeits the one-UI-many-front-doors property `§5` exists to buy.
2. **A widget's rich UI is the *same modal*.** `figma.showUI` from a widget *"creates a modal dialog with an
   `<iframe>` containing the HTML markup in the html argument"* — the identical window the plugin already
   opens. There is no size gain to have: the plugin opens at **1280×900** (`apps/plugin/src/main.ts`) and
   persists whatever the designer drags it to (#144). Figma documents plugin-UI *minimums* (width 70,
   height 0 at instantiation; ~100 on `resize`) and no maximum beyond the window, and docking is not a
   native feature for either shape.
3. **The execution model forbids reading the document during render.** *"The plugin API can only be used in
   event handlers and hooks."* Render *"runs synchronously and should solely depend on a widget's state"*,
   and *"widget rendering code won't be able to read and access data outside of the particular widget's
   state."* Finally: *"Widgets only run in response to user interaction and only on the specific client that
   initiated this interaction."*

**Reason 3 is the architectural one, and it is the `§4` reliability argument again.** A widget cannot read
the file's variables in order to display them. To show the current theme it must *mirror* the variables into
its own synced state — at which point the file holds **two authorities for the theme**, and they diverge the
moment anyone edits a variable directly. That is the same class of defect as a regenerable baseline agreeing
with its own deletion (principle 5): a store allowed to answer for itself has no memory.

**What widgets are genuinely good at**, kept here so the next person doesn't re-derive it: they **persist
past the session**, they are **multiplayer** — *"Unlike plugins that run for a specific person, everyone can
see and interact with the same widget"* — and `usePropertyMenu` supplies native `color-selector`, `dropdown`
and `toggle` controls with no HTML. `findWidgetNodesByWidgetId(widgetId)` lets one instance aggregate across
every sibling instance in the file. **If an idea does not need all three of persist / shared / glanceable,
it is a plugin panel, not a widget.**

**Two packaging facts that decide the shape of any widget we ever ship.** One manifest per widget — the
"multiple widgets" page is about multiple *instances*, not several distinct widgets in a package — and synced
state is id-scoped: *"The synced state on each widget node will only be visible to widgets that have the same
`WidgetNode.widgetId`."* So a *set* of widgets is N Community submissions and N mutually blind islands. **One
widget with modes selected from the property menu is the only coherent shape.** Also: `useStickable` /
`useStickableHost` are *"only available in FigJam"*, so no widget can follow a node in Figma Design.

### 8a. Widget synced state is unreachable from every write route we have

Recorded because it is counter-intuitive and it killed a good idea. The appealing use for a widget was
**agent memory**: the plugin route (`§4` route 1) or the MCP route (route 2) writes an agent's findings and
plan into a durable, visible, in-file object that survives the session and the next agent reads back. Every
step of that is blocked:

- *"The plugin cannot create WidgetNodes. The only possible way is to clone already existing nodes in the
  file."*
- `WidgetNode.setWidgetSyncedState(...)` *"only sets the synced state for widgets with a matching
  `node.widgetId`… this means that running this function only works inside of a widget."*
- `WidgetNode.widgetSyncedState` *"is only readable by widgets created by the same `manifest.id`."*
- `cloneWidget(...)` overrides *"are only applied if a widget is cloning itself or other widgets created by
  the same `manifest.id`."*

**A plugin's manifest id never matches a widget's** — they are separate manifests with separate published
ids. So a plugin can neither create a widget, nor write its synced state, nor even *read* it. Widget synced
state is reachable only from inside that widget.

**The shape that does work, if the need ever justifies it:** `setSharedPluginData(namespace, key, value)` is
the store — *"Any data you write using this API will be readable by any plugin"*, with a namespace mandatory
and *"The total size of your entry (`namespace`, `key`, `value`) cannot exceed 100 kB"* — and the widget is a
**read-only projection** of it, refreshed when someone clicks. That inverts cleanly: one authority, one
viewer, no mirror.

**But the trade is bad, and this is why nothing is filed to build it.** Because a widget only runs on
interaction, the projection is **stale until clicked** — it shows the previous agent run's findings to
someone who has not touched it. A node board *drawn* by the plugin (the same mechanism `applyComponentPlan`
already uses) is current as of the last write, needs no Community publish, no review, and no second id. The
widget buys buttons and costs a staleness class. **The underlying need is real — agent work has no durable,
reviewable trace in the file where the work happened — and `sharedPluginData` plus a drawn board is the
answer to it. A widget is not.**
