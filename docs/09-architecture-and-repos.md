# 09 — Platform architecture & repo strategy (how the pieces are packaged)

> `07` argues *why* the engine is a portable core; `08` maps the *surfaces* that drive
> it. This doc answers the packaging question those two raise but don't settle: **which
> code lives in which repo, how the web dashboard and Figma plugin both consume one
> engine, and which of the owner's existing plugins get absorbed, kept downstream, or
> left alone.** It records the locked repo/packaging decision so the host-renderer work
> (`08 §7` B1c/B2/B3) starts from a settled shape instead of an implicit one.

---

## 1. The decision, up front

**Locked (2026-07-02, owner):**

1. **One engine, two rendering hosts.** The web dashboard and the Figma plugin are
   **two adapters over one core** — they import the same engine module and render from the
   same shared contracts (lever manifest + preview spec + `resolvePreview`). Not two
   products; two faces (`08 §1`). This is already ~40% true: the core is pure/`node:`-free,
   and B0/B1a/B1b built the shared contracts both hosts read from.
2. **Monorepo, grown from `prism3-tokens`.** The engine, the web dashboard, and the Figma
   plugin live as packages in **this repo** (not a fresh `prism3-platform` repo, not three
   published repos). The core becomes a workspace package both hosts import; a lever change
   lands everywhere in one commit. `brand-skills` and `knowledge-base` stay their own repos
   (upstream *extract* + reference; different lifecycles, brand-skills is separately
   versioned and public).
3. **Web dashboard first.** Fastest loop (DOM/CSS, no sandbox/font/variable-API
   constraints) and the cleanest proof that the shared contracts drive a real UI. The
   Figma plugin then becomes "the same renderer wearing a Figma face," not a first-of-its-
   kind build.

*Reassess trigger for (2):* if the monorepo's build tooling collides with the legacy
`reference/` corpus or the space-containing working paths, splitting the engine into a fresh
repo is cheaper later than merging repos would be now — so we start here and revisit only
if it hurts.

## 2. The layered architecture

```
Layer 0  PURE CORE            color · ramp · scale · modes · theme
         (no I/O, no node:)   ── runs identically in node, browser, Figma sandbox
                │
Layer 1  SHARED CONTRACTS     lever-manifest · preview-spec · resolve-preview
         (define once)        ── every surface renders FROM these; continuity is
                │                structural (both hosts read one source), not a manual sync
                │
Layer 2  ADAPTERS      ┌────────────┬──────────────┬───────────────┬──────────┐
         (thin)        CLI ✅       Web dashboard   Figma plugin     MCP server
                       design.md    knobs+preview   knobs+preview    tool calls
                │                        │               │
Layer 3  MATERIALIZE                DOM/CSS vars   Figma vars+styles   DTCG/SD · code
```

The load-bearing rule: **adapters never re-implement the brain.** Every historical pain
point (plugin missing engine options, namespace breakage, hand-mapped font weights) is a
symptom of a *second* brain; one core dissolves them (`07 §5`). The `node:`-free purity of
Layer 0 is the precondition — it's what lets the same module bundle into a browser and a
Figma sandbox with no port.

## 3. Repo & package layout

```
prism3/                            (this repo — grows into the monorepo)
├── reference/                     legacy hand-built layer + regression target (unchanged)
├── packages/
│   ├── engine/                    the core, a workspace package (@prism3/engine)
│   │   └── schema/                lever-manifest.json · preview-spec.json · theme-schema.json
│   └── tokens/                    the consumability gate (@prism3/tokens)
├── apps/
│   ├── studio/                    the dashboard adapter (DOM/CSS host)
│   ├── plugin/                    the plugin adapter (Figma sandbox host)
│   └── tokenpress/                the Figma -> DTCG exporter, ported in (@prism3/tokenpress)
├── docs/                          the numbered design record + superpowers/
├── skills/                        shipped product skills (prism3-theme, prism3-consume)
└── tools/                         measurement harnesses, run by hand, outside CI
    └── exporter-comparison/       both DTCG exporters over one brand, differences classified

brand-skills/      own repo — EXTRACT (assets → design.md)   [upstream, public]
knowledge-base/    own repo — the practice POV / reference    [reference]
```

**Build boundary.** The "no build, run via `tsx`" invariant applies to the **core's dev
loop** and stays intact. The **adapters** (`apps/studio/`, `apps/plugin/`, `apps/tokenpress/`) get a
bundler for the first time — a browser/Figma bundle is a packaging step, not a port (`08 §2`). Keep
the bundler at the adapter layer; the core is imported as source, never pre-built. **One** bundler,
esbuild: `apps/tokenpress/` arrived with vite and was swapped on port, because two bundlers means two
sets of target/define/shim behavior to keep in your head.

## 4. The owner's other tools: absorb / downstream / leave alone

The owner built several pipeline tools (`07 §11.1`). They do **not** all get pulled in —
they split by role:

| Tool | Function | Disposition | Trigger |
|---|---|---|---|
| **Theming plugin** (Figma) | themes a duplicated file's variables | **Absorb** into the new Prism3 plugin (B2) | when B2 reaches variable-theming parity |
| **Text-style plugin** (Figma) | binds variables into text styles | **Absorb** into B2 | when B2 binds text styles |
| **Style-guide generator** (Figma) | lays out **all tokens as frames on the Figma canvas** — canvas documentation, *not* HTML | **Absorb as a B2 feature** (a distinct canvas-render capability; the `visualize.ts` HTML preview does **not** cover it) — filed as **#259** (`lane:plugin` — the "absorb" language here means plugin code, not manual canvas craft) | when B2 can render token frames to canvas — **unblocked**, B2's write-executor machinery already ships |
| **TokenPress** (Figma) | Figma → Style Dictionary / DTCG export | **Ported in** as `apps/tokenpress/` (`@prism3/tokenpress`) — superseding the "downstream, never shared code" call below; see the note after this table | done (the port); the shared-core question stays open |
| **CLI templating system** | dupes component library, drops tokens/fonts → SD → Storybook | **Downstream consumer** via DTCG/SD | Layer-D component-library stage |

Two principles behind the split:

- **Absorb function, never code.** The three Figma plugins each carry a *separate brain* —
  pulling their source in re-creates the drift we're eliminating. Rebuild their capability
  on the shared core inside B2. The consolidation is real: **three Figma plugins collapse
  into one** (`07 §5`).
- **Connect downstream tools through the interchange contract, not the codebase.** The CLI
  templating system sits at the consume end; it reads the engine's DTCG output. Integration =
  format conformance, not a merge.

**TokenPress is the exception, and it is worth saying why it does not break the rule above.**
It was classified downstream on the assumption it lived in a different org. It does not — the
same owner owns both, so the reason for keeping it at arm's length was never the reason stated.
It is now `apps/tokenpress/`, ported in whole: copied unmodified first, then adapted only where
it fought the monorepo (workspace name, one bundler, one test runner).

What has *not* happened is the merge the principle warns about. TokenPress still has its own
brain — its own DTCG emitter, its own alias resolution, its own mode handling, none of it shared
with `packages/engine`. Living in the same repo has not made them one system; it has only made
the duplication visible and measurable. Whether a shared export core is worth extracting is
open, and answering it is the point of the portability measurement in the port PR. Being in the
same tree is what makes that answerable; it is not itself the answer.

## 5. Sequencing & triggers

1. **Record this** (done — this doc + `00-progress`).
2. **Scaffold the monorepo workspace + `apps/studio/` package** — **✅ DONE (2026-07-02).** Root
   `package.json` (workspaces `["web"]`, `type: module` — safe, the engine is already fully
   ESM); `apps/studio/` is an esbuild + vanilla-DOM adapter (one dev-dependency; no framework) that
   imports the pure engine modules by relative path and renders **15 knobs from the lever
   manifest + 22 preview chips + a 4-mode contrast overlay from `resolvePreview`**. Verified
   by headless Chromium: boots all-green. The engine stays buildless; only the adapter bundles.
   New I/O shell `engine/emit-brandinput.ts` → `schema/example-brands.json` gives the browser a
   **validated** boot brand without the node-only `design.md` parser (a `test.ts` gate keeps it
   current + asserts every example resolves all-green; 218/218).
3. **B1c/B3 — web dashboard host (in progress)**: **colour + radius + type knobs are live**
   (PR #24 colour; PR #25 + B geometry/type). `buildTree` is now in the pure `tree.ts`, so
   `resolvePreview` returns `dims` + `type` and the chips render real radius/padding/type;
   `radiusScale` + `typeScale` re-resolve live alongside the colour axis. Density/motion/shadow
   stay read-only (chips don't render those axes yet). **Next:** promote the engine to a named
   `@prism3/engine` workspace package; render shadow so `shadow.softness` can go live.
4. **B2 — Figma plugin host**: same renderer, Figma face; begins absorbing the three Figma
   plugins (variables → text styles → canvas style-guide, in that order of parity).
5. **C — MCP adapter**: tool schema derived from the same lever manifest.

**Parallel, no new repo (start anytime):**
- **Figma-MCP import** of `out/*.tokens.json` — de-risks B2's materialization before it's
  built and unblocks Token Press testing. Highest-value near-term validation.
- **Style Dictionary consumption** — proves the export edge (owner-driven).
