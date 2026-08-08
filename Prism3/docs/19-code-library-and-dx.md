# 19 — The code library, delivery & DX (components-as-data, realized as shipping code)

> `14` is the component-*data* layer (definitions bound to the token contract, the write/verify
> legs into Figma). `18` is the plugin/host *capability* grounding. This doc is the **code-library
> and delivery** half: how the one component-definition set becomes shipping code + Storybook +
> docs + Code Connect, how it's packaged and delivered (dependency **or** ejected accelerator), and
> the DX we're aiming past `prism2`'s fork-per-brand model. Planning altitude — decisions are
> flagged, not all locked. Companion artifact: the ecosystem map (`claude.ai/code/artifact/…`,
> 2026-07-05).

---

## 1. The unifying thesis — one data set, everything else a projection

A single **component-definition set** (seeded from the KB `§15` briefs, **bound to the locked token
names** — `14 §2`) is the source of truth. Every other artifact is a *generated projection* of it:

```
component definitions (data, bound to token names)
   ├─▶ Figma component library      (visual shell; via plugin / MCP — 18)
   ├─▶ code: Web Components + React  (headless behaviour + token skin)
   ├─▶ Storybook stories            (workbench + verification + theme demo)
   ├─▶ usage docs                   (themed, markdown/MDX)
   ├─▶ .ai.json registry            (agent selection surface)
   └─▶ Code Connect mapping         (Figma ↔ code, auto-maintained)
```

Because definitions bind to *names* not *values*, structure is built **once**; brands and modes are
value-columns the engine supplies. This is the coherence engine — no parallel truths to drift, and
it's the practice's named 2026 differentiator (KB `03 §6`).

## 2. Packaging & delivery — one monorepo, an ejectable package, two modes

**Repo:** the code library + Storybook are a **package inside the Prism3 monorepo** (the repo the
web dashboard and plugin already share — `09`), **not a separate repo**. The monorepo buys dev-time
coherence: atomic changes across token contract ↔ definitions ↔ code, shared tooling and evals.

**The ejectability discipline** is what serves the accelerator use case (owner: *primary* delivery is
"scaffold, then disconnect into a client's repo"). The package is authored with **no monorepo-internal
runtime coupling** — it depends only on the *published token output* (a brand's generated token set),
never on sibling packages' internals. That yields two delivery modes from one source:

- **Core library — npm package.** Client installs `@prism3/components` + their generated tokens;
  stays connected to upstream (updates flow).
- **Accelerator — eject to client repo.** Copy the self-contained package + the brand's tokens into
  the client's repo and cut the cord. This is the `prism2` "disconnect" — but from a **clean package**,
  not a forked repo, so no upstream baggage or drift history rides along.

The eject is a *packaging* operation, not a repo split; both modes ship from the same package.

## 3. Output target — WC primary, React fast-follow, framework-agnostic headless core

`14 §6` already plans WC + React + Storybook + `.ai.json` + Code Connect from one definition, so
"primary output" is a **sequencing** call. The shape that keeps every target cheap:

- **Behaviour = framework-agnostic headless** — state machines / a11y / keyboard model with no
  styling (Zag-style; the "headless *primitive*" of `18 §6`, *not* a token primitive). Author our own
  or wrap an existing lib (React-Aria / Radix / Ark) — an open sub-decision.
- **Styling = token-bound** — the visual skin resolves through the token contract, so it re-themes by
  input.
- **Emit WC as the neutral primary** (matches deployment-neutrality, `15`), **React as a thin
  wrapper** over the same headless core. Because behaviour lives in the framework-agnostic core,
  adding a target is a wrapper, not a re-implementation.

Per KB `27` (adaptive interfaces): open primitives + rich intent metadata are what an LLM composes
against — so we generate *primitives + metadata*, not a sealed catalogue.

## 4. The DX leap — kill the fork-per-brand model

`prism2` today: duplicate the repo, set the brand, drop in tokens/fonts, run Storybook. That's a
**fork per brand** — every brand diverges from upstream and every fix must be re-propagated. The new
architecture removes the fork:

- **One library; brands are token *inputs*, not repo copies.** Theming = data injection.
- Onboarding becomes: generate the brand's tokens (CLI / plugin / MCP) → the *same* library consumes
  them → **Storybook themed instantly**, no fork, no re-clone.
- **Storybook theme-switch via token-set globals** (a brand / light / dark toolbar), one set of
  **generated** stories themed by input — not a rebuilt fork.

Net: no drift, no per-brand maintenance, instant re-theme. The eject mode still exists for clients who
want ownership — but it's now the *exception path*, from a clean package, not the default fork.

## 5. Code Connect, the AI surface, Storybook — all generated projections

- **Code Connect (missing today) → generated from the definition.** The spec knows both the Figma
  component and the code component, so the mapping is derived and auto-maintained; Dev Mode shows real,
  current code with zero hand-authoring.
- **AI surface — mirror the token-layer win.** A rich component **`.ai.json` registry** (toward
  Wolosin's 12 fields — `when_to_use` / `avoid_when` / `common_partners` / `trigger_keywords`, KB
  `03 §7`) + **one portable `component-consume` skill** (the analog of `prism3-consume`), measured by the
  same eval discipline. Lesson carried from the token result: the *portable skill beat the per-role data
  dump* — so **one strong skill + a rich registry over 40 thin per-component skills**; per-item skills
  only where a component is genuinely idiosyncratic. Three learnings folded in from `13` (inspirations):
  (a) **token-budget tiers** — the registry projects at three widths (index → summary → full entry), the
  Astryx `--compact` idea, so an agent pulls only what fits its context; (b) a **generated discovery
  index** injected into the consuming project's agent files (Astryx `agent-docs`) — the `.ai.json` is only
  useful to an agent that knows it exists, so shipping a compressed index into `CLAUDE.md`-equivalents is
  the discovery layer; (c) **retrieval-first access** — a `cli query` subcommand over the registry
  (search → fetch-on-demand), the zero-server peer to the MCP tool that works in any shell.
- **Storybook (a requirement) is three things:** the **workbench**, the **verification surface** (a11y
  addon + visual regression, per component per theme), and the **theme-switch demo** — and its stories
  are **generated** from the definitions. Another projection, and another gate.

## 6. Usage docs — markdown is the store; generated baseline + authored overlay

Two audiences, one pipeline (KB `29`/`30`, docs-from-data):

- **Client design docs** — brand-themed, designer-customizable; ship with the eject.
- **Prism3 product docs** — how the framework works; live with the framework.

The low-overhead, ejectable, themeable path:

- **Structural docs generate from the definition** (props / states / a11y / do-don't) — zero
  hand-maintenance.
- **Designer customization in markdown/MDX** with a **generated-vs-authored merge discipline** — the
  same additive/preserve pattern brand-skills uses for `voice.md` (regenerated sections vs. preserved
  hand-authored ones).
- **Themed automatically** — the docs render with the brand's tokens/components, so they look like the
  brand.
- **CMS, if any, is a thin git-backed editor over the markdown** (Decap / Tina-style), **never the
  store** — or we lose ejectability and versioning.

Architectural implications *now* (even though the docs build is later): (a) the **definition schema
must carry the doc fields** (usage, do/don't, content guidelines) so docs are a projection, not a
re-author; (b) **commit to markdown/MDX as the source of truth** so we never get CMS-locked.

## 7. Open decisions (pin over time, not now)

1. **Repo boundary** — monorepo-package (decided lean) vs. separate repo. *Leaning monorepo-package
   with ejectability discipline.* **Re-affirmed 2026-07-28 (owner)** when a separate code repo was
   considered, so the reasoning is on record: the trigger was wanting somewhere to file
   component-library work *now*, while the upstream lanes continue — and that need is met by a
   `lane:code-library` label in this tracker, without settling the architecture as a side effect. Two
   costs weighed against the split: GitHub's **sub-issues and dependencies are same-repo**, so a
   second tracker turns this layer's dense cross-lane relationships (token contract ↔ definitions ↔
   code) back into prose; and the client-delivery case that usually motivates a split is already
   served by §2's ejectability discipline (*the eject is a packaging operation, not a repo split*).
   Still an open decision — but revisit it as its own `[decision]` issue against this section, not
   as a by-product of backlog logistics.
2. **WC-first vs. React-first**, and **author-headless vs. wrap** (React-Aria / Radix / Ark / Zag).
   Filed as **#252** — split into the two decisions this bullet bundles: §3's WC-primary/
   React-wrapper ordering already has a stated lean (just needs confirming); author-vs-wrap is the
   one genuinely open fork, no lean recorded anywhere.
3. **Definition format** — ~~largely settled in `14`... confirm when the layer activates~~
   **RESOLVED BY ACTIVATION (found 2026-07-28).** The layer is live: `packages/engine/component-schema.ts`
   is the real, current contract (DRAFT v0 — TS objects, one file per component under `components/`,
   not the `component.yaml`/`@directededges/specs-schema`-mapped form this bullet described), and five
   `ComponentDef`s already exist against it (`button.ts`, the Text Field family, `icon-button.ts`). This
   bullet was stale prose describing a decision the code had already made silently — corrected here
   rather than filed as an issue, since there's nothing left to decide.
4. **Brand-token flow into the library** — a per-brand token package vs. a runtime token loader.
   Filed as **#253**. Grounding here is thin (this bullet was the whole spec) — the issue is mostly
   reasoning laid out for a call, not doc-sourced analysis; flags that the two options optimize for
   different things this repo already committed to (§2's ejectability vs. docs/11's runtime
   brand-switch vision).
5. **Docs surface** — Storybook autodocs vs. a static-site generator (Astro/Starlight, Nextra) for the
   client design docs; markdown-as-truth either way. Filed as **#254** — grounded in §6's constraints
   (markdown as source, generated/authored merge, themed automatically) and names a third option §6
   implies but never states: split by audience, since §6 already treats client design docs and
   Prism3 product docs as structurally different.

## 8. First slice (endorsed, from `14 §6`)

Definition schema + **three components** (Button, Text Field, Card — already the preview-spec core) →
generate Figma + WC + one Storybook + `.ai.json` for those three → prove the whole projection chain
end-to-end before scaling to the ~40. Same "small first increment" discipline every engine axis used.

**Status (2026-07-28):** the schema is live (§7 item 3) and 2 of the 3 definitions exist (Button,
Text Field family) — Card is filed as **#255**. The projection chain is split into its Figma leg
(**#111**, MCP-driven, filed earlier) and its code leg — WC + Storybook + `.ai.json` — filed as
**#256**, plus the two things that fall out once both legs exist: a `component-consume` skill
(**#257**, explicitly not ready to start yet) and generated Code Connect (**#258**, depends on both
legs). The canvas-side sibling from docs/09 §4 (a style-guide generator absorbed into the plugin,
not part of this slice but adjacent) is **#259**.

---

## 9. First consumption evidence (2026-08-06 spike) — the DTCG output is not consumable unmodified

The whole chain below §8 assumes a standard tool can read our DTCG. **Nothing had ever tested that.**
A scratch spike ran Style Dictionary 5.5.0 against `out/nb.tokens.json`. Findings, all measured:

| # | finding | severity |
|---|---|---|
| 1 | **Modes silently dropped.** 551 leaves → 551 CSS vars, 1:1. Per-mode values live in `$extensions.prism3.modes`, which SD does not read. 133 of 551 vars wrong for dark, 138 for hc-dark. No warning. | 🔴 |
| 2 | **Aliases flattened.** Zero `var()` references; every alias resolved to a literal. The semantic→primitive relationship is erased unless the consumer sets `outputReferences: true`. | 🟠 |
| 3 | **Composite typography lossy.** 38 tokens collapse into a CSS `font` shorthand that drops letter-spacing, text-case, text-decoration, and the fluid *minimum* size. | 🟠 |
| 4 | **A mode-aware adapter is ~15 lines** — a preprocessor swapping `$value` from the extension, plus `outputReferences`, yields correct per-mode files with references intact. | 🟢 |

**The generalization, which is bigger than Style Dictionary:** `$extensions` is defined by DTCG as
ignorable, so **every conforming consumer is blind to our modes**, not just SD. An adapter would be
load-bearing forever. See `12 §10c` — this is now the gating decision for this whole layer, because
whatever the code library consumes is whatever the engine emits.

Two consequences for §8's first slice:

- The **token→CSS leg is available now** and is not blocked by §7's open decisions; it depends only on
  the DTCG output. The **component leg is genuinely blocked** on §7.2 (author-headless vs wrap), which
  has no lean recorded anywhere.
- Findings 2 and 3 are **Style Dictionary configuration and transform choices**, not token-side defects
  — worth knowing before anyone "fixes" the emitter for them.

**Also settled by the spike:** who owns platform output. Since the mode representation is a Prism3
extension, no third-party tool can be expected to handle it — so a first-party adapter or emitter is
required regardless of whether Style Dictionary is in the pipeline. Leaving it to consumers means each
writes it independently and unverified, which relocates the risk the token contract exists to prevent
to somewhere we cannot gate.

The mode decision this forces is filed as **#609**, with the unified-export target (`12 §11`) as its
motivating use case — whatever this layer consumes is whatever that decision produces.

**Style Dictionary would be this repo's first real runtime dependency.** It belongs in a workspace
alongside `apps/studio`/`apps/plugin`, never imported by the engine core — the buildless, no-`npm install` invariant
is what lets the engine bundle into the Figma plugin sandbox.

---

*Cross-refs: `14` (component-data layer + build sequence), `18` (plugin/host capability), `08`
(shared control layer / lever manifest), `09` (monorepo), `15` (deployment neutrality). KB: `03 §6/§7`
(components-as-data + the .ai.json fields), `27` (headless primitives + intent metadata for LLM
composition), `29`/`30` (docs-from-data), `components/_schema.md` (the §15 seed corpus).*
