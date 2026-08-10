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

- **`prism3-consume`** (`skills/prism3-consume/SKILL.md`, 2026-07-05) — the
  downstream-consumer skill; eval-measured at 100%/100% compliance, 0% invented, 0%
  leak (docs/17 §5).
- **`prism3-theme`** (`skills/prism3-theme/SKILL.md`, 2026-07-05) — the
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

**Raised 2026-07-28 · status: done (2026-07-29).** The name reflects the
repo's origin (a place to build a new token set); it has since become the monorepo for
the engine, both surfaces, and — per `19 §2` — the code component library. The name
should describe what it is now.

**Recommended name: `prism3`.** The strongest evidence is that the repo already calls
itself that internally: the root `package.json` is `"name": "prism3"`, and the workspaces
are `@prism3/studio` / `@prism3/plugin` with `@prism3/components` planned. The repo name
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

**Checklist (12 references outside the history log):**

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
| `docs/13-inspirations.md` | one reference (line ~287, "promote when `prism3-tokens` has real external consumers") — missing from the original checklist, added 2026-07-30 |
| `docs/00-progress.md` | 7 references — **leave alone**, it's an append-only history log and those statements were true when written |

Also update after renaming: the local remote (`git remote set-url`), and any bookmark or
integration configured by URL.

---

## Idea 5 — Normative requirement levels (RFC 2119) on generated guidance

**Raised 2026-08-04 · status: partly scoped — the payload slice by #675 (2026-08-10); the rest
still logged.** Owner-raised from a Nathan Curtis post endorsing Cloudflare's
engineering-standards approach. Worth taking seriously on lineage alone: Curtis is the source of
several POVs this repo already builds on (components-as-data, the Specs CLI read-back verifier in
`14` §4, the three-tier token taxonomy).

**What #675 took, and what it left.** #675 decided the register for emitted payload prose (#668)
and admitted RFC 2119 keywords into that one channel — so *"Where it would land first"* below has
an answer for the payload case, and **The trap** below is now a binding rule rather than a cost to
price. It is recorded in `voice-standard.md` §4 with the reasoning in `29-tone-of-voice.md` §4.1:
a `MUST` in payload prose requires a check the reading agent can run against artifacts present in
the payload, because an ejected client's repo runs no Prism3 CI. Everything else here is
untouched and still logged — levels on `.ai.json`, the approved → enforced lifecycle, and
machine-readable `status` in doc frontmatter. **The body stays rather than collapsing to a
pointer** (contra this file's own graduation rule) because only one of three proposals moved; the
rule applies when the last of them does.

### Lineage

- **RFC 2119** (Bradner, 1997) — the IETF convention giving `MUST` / `SHOULD` / `MAY` precise,
  agreed meanings in specification prose. Decades old; the novelty is not the keywords.
- **Cloudflare Codex** ([blog, 2026](https://blog.cloudflare.com/engineering-standards-enforcement/))
  — engineering standards written as RFCs with 2119 levels, enforced by AI agents across code
  review, a local CLI, linters, spec review and incident reports. Scale: ~230,000 violations
  flagged, ~16,000 merge blocks. Two-stage lifecycle: **approved** RFCs produce non-blocking
  findings; only after **explicit promotion to enforced** do `MUST` violations block a merge.
  Structure they landed on:
  ```json
  { "rfc": 14, "title": "…", "status": "approved", "domain": "control-plane",
    "statements": [ { "slug": "…", "section": ["…"], "level": "MUST", "text": "…", "href": "…" } ] }
  ```
- **Curtis's read** — *"RFCs, supplemental requirements in MUST/SHOULD/…. This is where design
  systems are going, augmenting the more strongly modeled visual, prop and binding intent with
  additional content that can be not just accepted or governed, but ENFORCED."* The punchline he
  pulled out is about **format**: *"Over time, we moved to a richer structured format so that
  agents could filter the content they needed more accurately."*

### Why this reads differently from here than it does for most systems

The article is a story about an org with lots of **written** standards and no enforcement,
building enforcement. Prism3 is the mirror image, and that inverts what's worth taking.

| | Cloudflare's starting point | Prism3 today |
|---|---|---|
| Written normative statements | extensive | **implicit** — `avoid_when` prose carries no level |
| Enforcement | the thing they had to build | **already 5 gates in CI** — `regen --check` (byte-drift), `test.ts`, `nb-regression`, `lint-us-english`, `token-contract --check` (485 pinned paths + `CONTRACT_VERSION`), plus computed contrast contracts and alias resolution |
| Mechanism | AI agents, because the standards aren't computable | **deterministic**, because ours mostly are |
| Structured for agents | the lesson they learned over time | **already done** — `lever-manifest.json`, `preview-spec.json`, the `.ai.json` sidecar |

So the gap is not enforcement. It is the cheap half: **the guidance the engine already generates
is normative in intent but unlabelled.** Shipping today in `out/*.ai.json`:

> `avoid_when: "Do not use for surfaces placed on the page (use foreground.*) or for ink (use text/icon)."`

That is a `MUST`, in an agent-facing artifact, with no level and no gate.

### What looks worth adopting

1. **Levels on generated guidance.** `level: MUST | SHOULD` on `.ai.json` entries. Cheapest
   possible change with real payoff — the prose is *generated*, so it is one edit in
   `ai-metadata.ts`, not thousands of strings; and it serves precisely the agent-filtering point
   Curtis pulled out.
2. **The approved → enforced lifecycle.** The genuinely smart bit, and we have an *unnamed*
   version already: `26-cross-page-ui-conventions` is effectively "approved" (a checklist someone
   audits), `lint-us-english.ts` is "enforced" (blocks CI). `token-contract.ts`'s `CONTRACT_VERSION`
   bump is a promotion ceremony in all but name. Naming the states makes the distinction legible.
3. **Machine-readable `status`.** Docs carry status *implicitly* — `06` says "Status: proposal,
   for red-line"; `03` items say RESOLVED — but an agent can't filter on prose. Cloudflare puts it
   in frontmatter.

### What looks wrong to adopt

- **The RFC governance ceremony** — numbering, domains, an approval workflow. That is org-scale
  machinery for coordinating many teams against 230k findings. This is one repo. Adopting the
  ceremony without the scale is the speculative abstraction `CLAUDE.md` working-principle #2 rules
  out.
- **AI code review as the primary mechanism.** The sharpest divergence. Cloudflare reaches for an
  AI reviewer *because their standards aren't mechanically checkable*. Ours mostly are, and this
  repo's whole thesis is deterministic verification. **An AI reviewer is strictly weaker than a
  test wherever a test is possible** — non-deterministic, unauditable, and it cannot be
  tamper-tested the way every gate here is. Rule if we adopt: **mechanize first; agent-review only
  the genuinely unmechanizable residue.**

### The trap

**A normative label with no gate behind it is worse than no label** — it manufactures the
appearance of rigor. Same failure KB `04` names for the voice matrix ("decays into a docs page
nobody reads"). So `MUST` must mean *"a gate exists"*, not *"we mean it strongly."* Under that
rule, adopting levels **creates an obligation**: every `MUST` either gets a gate or gets
downgraded to `SHOULD`. That is a feature — it keeps the label honest — but it is the real cost,
and it should be priced before starting.

### Where it would land first

- **The component layer** (`14`, `28`) — not yet built, so requirements could be labelled at
  authoring time instead of retrofitted. `14` §3 already notes a11y contracts "are not
  representable in Figma at all — they live in the definition, the `.ai.json`, and the code
  outputs": MUST-shaped statements explicitly needing an enforceable home.
- **The voice standard** — `voice-standard.md` §2 is a MUST list awaiting a gate (#617). The
  pattern was already moving; this would name it. **Landed, in the reverse direction:** #617
  built the gate (`lint-voice.ts`), and #675 then wrote the trap above into the standard as a
  rule — `voice-standard.md` §4 and §6 question 6.
- **The eject payload** (#668) — decided by #675, above. The payload is where the trap has the
  most force, because the reader has no CI to appeal to.

*Refs: `14` §3–§4 (component-layer contracts + the Specs CLI verifier), `28` (the anatomy schema
that would carry them), `30-versioning-and-compatibility` (the closest existing governed
contract), `voice-standard.md` §2 + #617, `voice-standard.md` §4 + `29-tone-of-voice.md` §4.1 +
#675 (the payload slice, scoped), #668 (the artifact it binds), KB `04` (enforcement-or-decay),
`13` (inspirations — where Curtis-sourced ideas are logged).*
