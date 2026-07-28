# 27 — Future Ideas (discovery log)

> A rolling log of owner-raised ideas that are **discovery-level only** — captured so
> they survive context loss, grounded against what already exists in this repo and the
> knowledge base, but deliberately not yet scoped, issued, or built. Same discipline as
> `03-open-questions`: nothing here is implemented until it graduates to a decision in
> `00-progress` (or a GitHub issue). One H2 per idea; append new ideas at the end; when
> an idea graduates, replace its body with a pointer to where it went.

---

## Idea 1 — A Dev Mode surface for the plugin (+ Token Press in Dev Mode)

**Raised 2026-07-25 · status: logged, not scoped.** This graduates the docs/18 §7 open
decision ("Dev-Mode surface") from a bullet into a shape.

**Framing.** The design-mode plugin is the *write* surface (a designer turns knobs,
variables materialise). Dev Mode is the natural *read* surface — and not a second
plugin: the manifest takes `editorType: ["figma", "dev"]` on the same plugin (docs/18
§2; it's `figjam`+`dev` that's unsupported), with `codegen` / `inspect` as the two
Dev-Mode capabilities. A third face on the same portable core.

**The unfair advantage.** Native Dev Mode inspect knows resolved variables. Our plugin
persists the actual `BrandInput` in shared data (#131) and bundles the whole engine —
so a Dev-Mode panel can re-resolve the **full model**: not "this fill is `#1a73e8`"
but the derivation, the modes, and the contracts behind it.

**Candidate features (v1-cut discussion pending):**
- **Semantic-role inspect** — selection → token *path* (`interactive.primary.fill.hover`),
  per-mode values across every shipped mode, and the alias chain. The contract, not
  just the variable.
- **Contrast verification at point of inspection** — the engine's contrast gates
  surfaced as a handoff check: "this ink/surface pair clears 4.5:1 in all shipped
  modes" (or which mode fails, and why). Nothing else in the ecosystem can do this.
- **Codegen with token names, not values** — the `codegen` capability emits snippets
  into Dev Mode's code panel referencing `var(--…)` token names instead of baked
  hexes. The KB's "MCP-first beats screenshot-first" POV in plugin form: the dev
  copies system-compliant code, not pixels.
- **Later (layer 2):** surface per-component `.ai.json` + Code Connect mappings for
  the selection (docs/19 already anticipates Dev Mode showing real code via Code
  Connect; a codegen plugin is the interim and the complement).

**Constraint:** Dev Mode plugins can't write to the document — the apply/theme path
stays design-mode-only. That split falls out of the existing bridge architecture.

**Token Press:** add `"dev"` to its `editorType` — likely the cheaper, more immediate
win. Export is a *developer* action (stage ③ of the docs/07 pipeline) and read-only, a
perfect Dev Mode fit; dev-seat holders can run Dev-Mode plugins but not design-mode
ones, so today a dev may need a full seat just to pull tokens. No overlap with the
Prism3 dev surface: Token Press exports the whole set (file-level); the Prism3 panel
explains the selection (node-level semantics + contracts).

---

## Idea 2 — AEM base library: Core Components themed with Prism3 tokens

**Raised 2026-07-25 · status: logged, not scoped.** Downstream of the code component
library — but only half of it actually is (see phasing). The strategic thinking
already exists in KB file 10 (*CMS and Platform Integration* — AEM at depth); this
idea composes committed POVs rather than needing new ones.

**Why it fits.** Token delivery into AEM is a solved shape the KB documents: DTCG →
Style Dictionary → `tokens.css` → a base clientlib (`myproject.tokens`) at the bottom
of the clientlib dependency graph. The engine emits DTCG today and Style Dictionary
consumption is already stage ④ — so **AEM is a consumption target of the existing
export contract, not an engine feature** (keeps the engine platform-neutral per
docs/15). And the multi-brand fit is exact: KB 10's "theme clientlib per brand"
pattern — brand clientlibs redefining the *same custom property names* with different
values — is docs/11's north star ("names are the contract, values are the fill")
already running in production AEM practice. A Prism3 brand family maps 1:1 onto brand
clientlibs.

**Phasing — the load-bearing observation:**
- **Phase 1 — "Prism3 AEM starter" (does NOT wait on the component library):** tokens
  clientlib + a Prism3 skin layer over AEM Core Components' predictable markup (proxy
  components via `sling:resourceSuperType`) + Style System policies whose
  author-selectable variants map to token-driven classes (the KB's "code-owned CSS,
  content-owned policy" governance model). A themeable AEM base with zero custom
  components, buildable off today's DTCG output. Commercially this is the generative
  "~10% cost for the Nth brand" pattern applied to VML's most common enterprise
  platform: theme the starter with a client's `BrandInput`, get a branded AEM
  baseline in hours.
- **Phase 2 — atomic elements (waits on layer 2 / the code component library):** Web
  Components delivered via clientlib, HTL emitting custom-element tags, Sling Models
  feeding attributes — the Spectrum Web Components pattern KB 10 documents.

**KB guardrails to honour when scoped:** target Universal Editor / HTL-native paths
(SPA Editor deprecated Jan 2025 — no new investment); on AEMaaCS keep tokens in an
independently deployable package so a token-only change doesn't ride a full Cloud
Manager pipeline; expect the CMS-side wrapping at 30–50% of build hours in the
traditional shape.

---

## Idea 3 — The Prism3 skills portfolio

**Raised 2026-07-25 · status: logged; two skills already shipped.** The question is
not "should Prism3 have skills" — that was decided (backlog #6, 2026-07-04: skills
are the *instructions + discovery* layer, complementary to the MCP surface's callable
*tools*) and the first two are built and verified:

- **`prism3-consume`** (`Prism3/skills/prism3-consume/SKILL.md`, 2026-07-05) — the
  downstream-consumer skill; eval-measured at 100%/100% compliance, 0% invented, 0%
  leak (docs/17 §5).
- **`prism3-theme`** (`Prism3/skills/prism3-theme/SKILL.md`, 2026-07-05) — the
  authoring skill; cold-agent verified (two fresh briefs compiled first-try, all
  contracts holding).
- Plus one internal: **`review-pr`** (`.claude/commands/`) — the independent PR
  reviewer.

The idea is the **portfolio**: what else, for whom, and where do they live. The
candidate map, by audience:

| Audience | Skill | Status / note |
|---|---|---|
| Downstream agent building UI | `prism3-consume` | ✅ shipped; extend as layer 2 lands (components-as-data + `.ai.json` consumption) |
| Agent authoring a brand | `prism3-theme` | ✅ shipped; becomes the MCP surface's companion (skill teaches WHEN/HOW, MCP provides tools — the two compose, neither replaces the other) |
| Designer inside Figma | Figma-side skill(s) | 🔎 investigate: Figma's skill mechanism (incl. plugin-shipped skills consumed by agents). Candidates: "theme this file with Prism3" (drive the plugin), "check this frame's contrast against the contracts", "which token should this be?" |
| Internal (us, building Prism3) | component-def authoring; web-UI conventions | The docs already encode the disciplines (docs/14 ComponentDefs; docs/23–26 UI conventions + rollout checklist) — a skill is the packaging that makes a cold agent honour them without re-reading everything |
| Platform-specific consumers | AEM / Style Dictionary consumption; WordPress `theme.json` | Pairs with Idea 2 (phase 1's tokens-clientlib discipline is exactly a skill's shape); KB 10 documents the per-platform transforms |
| Docs writers (human or agent) | usage-guidelines / dev-docs skill | Grounded in KB 29 (per-component documentation template) + KB 30 (generated-from-data docs) — a skill that writes Prism3 component docs in the practice's committed shape |
| DS governance / consumers' CI | compliance-audit tier (à la `igloude/ds-skills`) | See below — later, possibly an offering |

**The ds-skills pattern (`github.com/igloude/ds-skills`) — noted, deliberately
downstream.** Two report-only skills: `ds-align` (review app code against the DS —
token violations, hallucinated tokens, duplication, a11y gaps) and `ds-prep` (audit
the DS itself → conformance manifests), on a gate-and-batch model (expensive model
judges, cheap executors fix), writes only to `plans/`. Relevance: (a) our consumption
*eval* already measures exactly what `ds-align` reviews — invented tokens / primitive
leaks / contract compliance — so a Prism3 audit skill could be *measured, not just
written*; (b) `ds-prep`'s manifest generation is close to what the engine already
emits (`.ai.json`); (c) as a consumer-facing offering it's a governance product, not a
build tool — which is why it's later. Several other open-source DS skill packages
exist to mine for patterns when this is scoped.

**Open questions to resolve when scoping:** placement/distribution (already flagged
open in 00-progress — this repo vs `brand-skills` vs a distributable package; the
portfolio sharpens it: internal skills stay in-repo, consumer skills need a
distribution story, Figma-side skills need the Figma mechanism verified); whether the
MCP surface and the skills ship together as one "agent-facing release"; and which
skill the eval harness gates next (precedent: a skill's value is measurable — hold
that bar).

---

## Idea 4 — Repo rename: `prism3-tokens` → `prism3`

**Raised 2026-07-28 · status: agreed in principle, not yet done.** The name reflects the
repo's origin (a place to build a new token set); it has since become the monorepo for
the engine, both surfaces, and — per `19 §2` — the code component library. The name
should describe what it is now.

**Recommended name: `prism3`.** The strongest evidence is that the repo already calls
itself that internally: the root `package.json` is `"name": "prism3"`, and the workspaces
are `@prism3/web` / `@prism3/plugin` with `@prism3/components` planned. The repo name
should match the npm scope already in use. (`prism3-platform` was considered and rejected
in `09 §1` — though as the name for a *fresh* repo, a different question. The extra word
disambiguates nothing when there's only one.)

**Timing — it blocks nothing.** Labels and issues live on the repo object and survive a
rename; GitHub redirects both web and git URLs indefinitely (until something claims the
old name), so existing clones keep working. So filing issues need not wait. The argument
for doing it *soon* is only that references accumulate — and that work is currently
paused, which is the cheapest window there will be.

**Sequencing caution:** don't rename while an agent session is mid-flight — a Claude Code
remote session's repo scope and git proxy are pinned to the repo slug at session start.
Merge what's in flight, rename, then start a fresh session.

**Checklist (11 references outside the history log):**

| File | What |
|---|---|
| `README.md` | H1 |
| `CONTRIBUTING.md` | H1 |
| `.github/ISSUE_TEMPLATE/config.yml` | 3 absolute `github.com/...` URLs (redirects would cover them, but fix) |
| `.claude/commands/review-pr.md` | the `adamforrester/prism3-tokens` slug |
| `docs/09-architecture-and-repos.md` | §3 layout diagram; §1.2's "grown from `prism3-tokens`" is a historical decision statement — keep, it's true of the past |
| `docs/08-theming-interfaces.md` | one reference |
| `docs/07-e2e-journey.md` | §11.6 "Built **here** (prism3-tokens)" — historical, safe to leave |
| `docs/25-output-style-guide.md` | one reference |
| `docs/00-progress.md` | 7 references — **leave alone**, it's an append-only history log and those statements were true when written |

Also update after renaming: the local remote (`git remote set-url`), and any bookmark or
integration configured by URL.
