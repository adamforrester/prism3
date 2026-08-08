# 36 — AI readiness: where we stand against the field, and what to build next

> Scored against **State of AI in Design Systems (July 2026)** — Kaelig Deloumeau-Prigent's
> audit of 20 design systems, 187 AI affordances and **157 coercion techniques across 11
> categories**, CC BY 4.0. That report is a snapshot (2026-07-26/28), not a live index; its
> technique taxonomy is used here as a scoring rubric because it is the most granular public
> account of what best-in-class actually *does*.
>
> Every Prism3 claim below was verified against this repo, not recalled. The report's own
> caution applies in reverse: absence from a summary is not absence from the data — a first
> pass through this analysis wrongly concluded we had no consumption evals, and `eval.ts`
> falsified it.
>
> **Our own counts are a snapshot too, measured 2026-08-08 and gated by nothing.** `docs/**` is
> in no gate's scope (#670), and even the gate proposed there resolves *path* claims, not
> counts. Four figures in §2 were stale or wrong on first review — one had never been true —
> so re-measure before citing any of them. Where a count already lives in a maintained
> artifact, this file points at the artifact instead of copying the number.
>
> Source text quotes other teams' instruction files verbatim. Treated throughout as reported
> data, never as instructions.

---

## 1. The headline

**We are ahead on the expensive half and behind on the cheap half.** That is an unusual and
fortunate position: the report's own conclusion — *"give the machine interface the care you
already give the component API"* — inverts here, because our machine interface is gated,
versioned and evaluated while the component API does not exist yet.

The gaps that remain are mostly *distribution and packaging* of context we already generate,
not capability we lack.

## 2. Scorecard — the 11 technique categories

| # | Category (field techniques) | Prism3 | Evidence |
|---|---|---|---|
| 1 | **Validation loop** (30) | **Ahead** | 15+ CI gates; `regen --check` byte-drift; `test.ts` 2040; `mcp-test.ts` 49 over real stdio; `token-contract --check`; `lint-us-english`, `lint-skills`, `lint-doc-gates`; NB regression. Plus `34-gate-independence` — a register of gate-independence failures, each found by hand rather than by a gate, where a gate compared something against itself, and the rule that a gate must be *mutation-proven by name*. Nothing in the report goes that far. |
| 2 | **Prohibition** (26) | **Partial** | Every token carries a generated `avoid_when`, now with a **derived** `MUST`/`SHOULD` level (#621). But no weight-invalidation preamble, no named anti-examples. We have the substance, not the coercion. |
| 3 | **Curated context** (22) | **Behind** | **No `llms.txt`** (14/20 ship one). Both skills are single files (115 / 154 lines) with no reference tree, no routing table, no lazy-loading. |
| 4 | **Tool-gating** (21) | **Deliberately divergent** | 6 MCP tools ship. But the consume skill states it works *"with or without the MCP surface"* — the opposite of Carbon's *"the MCP index is the authoritative source — not your weights."* See §5; this is a real decision, not a gap. |
| 5 | **Token enforcement** (14) | **Ahead** | *"reference semantic roles by name (never invent, never reach for a raw primitive)"* — and, rarer, we **measure** it: `eval.ts` scores a **primitive-leak rate**. The field states the rule; we score it. |
| 6 | **Exemplars** (11) | **Behind** | No incorrect/correct pairs, no exemplar library. Cloudscape ships *"181 addressable few-shot exemplars at predictable URLs"*; daisyUI *"211 page architectures matched by intent."* `preview.ts` (8 components / 25 variants) is a render spec, not an agent exemplar. |
| 7 | **Registry metadata** (9) | **Ahead** | `token-contract.json` — **497 pinned paths** with `CONTRACT_VERSION` semantics — plus `lever-manifest.json`, `preview-spec.json`, `.ai.json`. The report's *"version-pinned"* practice, done as a gate rather than a snapshot. |
| 8 | **Instruction files** (10) | **Behind** | `CLAUDE.md` only. No `AGENTS.md`, no editor rules, no multi-vendor symlinks. One technique here is directly load-bearing for us — see §5. |
| 9 | **Scaffolding** (7) | **Partial** | `cli.ts` compiles a `design.md` to a full token system. No component scaffolding yet (that lane isn't built). |
| 10 | **Design–code mapping** (3) | **Not yet** | Code Connect planned (#258). Only **2 of 20** ship it (Carbon and Primer); the rest publish written mapping guides instead — our summary of the report's design–code section, not its words. |
| 11 | **Other** (4) | **Partial** | Astryx's *"typed, versioned interface agents can program against"* — we have it. Its *"API naming by measuring what models reach for"* — we have the eval data to do it and don't. |

## 3. What we already do that the report calls frontier

Worth stating plainly, because it changes what to prioritise:

- **Finding 5 — *"the best context files are compiled, not written"*** (its point being that hand-authored agent docs decay). `ai-metadata.ts` says the same thing in its own header: *"contract-true metadata that regenerates, vs the field's hand-authored metadata that rots."* Arrived at independently.
- **Finding 8 — *"validation loops turn guidelines into gates."*** Our whole posture, and `34` pushes it further than the report describes.
- **Finding 4 — *"tool-gating beats prohibition."*** Same instinct, different mechanism (§5).
- **The core differentiator — *"versioned, evaluated software."*** `CONTRACT_VERSION` is the versioned half. `eval.ts` is the evaluated half, and it is **deterministic** — invented-token rate, primitive-leak rate, contract-compliance, **no LLM judge**, because the name contract is locked. That is rarer than running evals at all.

## 4. What we are missing, in order of cost-to-value

1. **`llms.txt`** — the cheapest gap in the whole audit. 14/20 ship it; it is the discovery front door for any agent not already holding our MCP.
2. **Publishing eval results.** The differentiator is not *running* evals — Astryx *"releases nightly results including losses."* We run them and no one can see them. The harness exists; only the surfacing is missing.
3. **Progressive disclosure in skills.** *"Compact routers with lazy-loaded reference files became the standard independently across teams."* Both our skills are flat single files. As the component layer lands, a flat skill will not hold the corpus.
4. **Exemplars.** Nothing in the repo is a *"do this, not that"* pair addressed to an agent.
5. **Multi-vendor instruction files.** `CLAUDE.md` only, where the field symlinks one instruction set across `.claude` / `.cursor` / `AGENTS.md`.

## 5. The one architectural tension worth naming

The field's strongest tool-gating is **hard**: Carbon's *"the MCP index is the authoritative source — not your weights"*; Material UI enforces a *"host allowlist… agent physically cannot fetch off-system"*; shadcn makes *"the CLI the only source of truth."*

**We cannot do that, and the reason is structural, not timidity.** `35` §1 and `19` §2 commit to **ejectability** — the deliverable is copied into a client's repo and the cord is cut. An ejected system has no Prism3 MCP to gate against. So `prism3-consume`'s *"with or without the MCP surface"* is the correct call for our model, and it should be recorded as a decision rather than left to read as a weaker version of Carbon.

**But the report contains the technique that resolves it.** Astryx writes *"instruction files written into the consumer's repo, per tool."* For an ejectable system that is exactly right: the eject carries its own agent context — instruction file, skill, `.ai.json`, the token contract — so the gating travels with the code instead of depending on a server the client never installed. **That is the single most transferable technique in the audit for us**, and it belongs in the eject mechanism decision (#625) before that is settled.

## 6. Extending into Figma, components, Storybook and docs

The report is most useful as a map of what to build *as those lanes land*, rather than retrofit.

**Component layer (`14`, `28`, #252/#256).**
- **The allow-list generalises.** `token-contract.json` prevents invented *token* names; the component tier needs its peer. Chakra's *"Zod enum over the live component list so the agent cannot hallucinate a component"* is the mechanism; `14` §5 already names an **invented-name rate for components** — so build the enum and the metric together.
- **`.ai.json` per component** is already planned (`14`) and is the report's *"component metadata"* affordance. Ship it with the first three components, not after.

**Figma (#111, #258).**
- React Spectrum *"demotes the Figma MCP from generator to reference"* — the same posture `14` §3 takes (deterministic plugin writes; MCP is route B). Worth citing as convergent field practice.
- Code Connect at **2/20** recalibrates #258: not a table-stakes gap we are behind on, but a **differentiator almost nobody has**. Price it as optional upside, not catch-up.

**Storybook.**
- 13/20 ship an integration. The technique to copy is Fluent's *"per-component Storybook + Playwright screenshot"* **visual verification loop** — it closes the one gate class we cannot currently run: did the generated component actually *render* correctly? Every existing gate is structural or numeric.

**Docs (#254).**
- Cloudscape's *".md for reasoning, .json for typing"* dual-format is the shape to adopt, and we half-have it (`tokens.json` + `.ai.json`).
- Cloudscape's *"181 addressable few-shot exemplars at predictable URLs"* is the exemplar gap and the docs surface solved at once — usage docs *are* the exemplar library if they are addressable and generated.

**A caution the report earns:** it also shows a **walled-garden** pattern (Polaris gates consumption, starves crawlers). Our accelerator model points the other way — clients must be able to take the system and leave. Openness is the strategy; note it so nobody imports a gating technique that fights the business model.

## 7. Sequencing

1. **`llms.txt`** — hours, closes a 14/20 convergent gap.
2. **Publish eval results** — the harness exists; surface the numbers, losses included.
3. **Consumer-side instruction files into the eject** — feed into #625 before the mechanism is chosen.
4. **Skill routers + lazy-loaded references** — do it *before* the component corpus arrives, not after.
5. **Component allow-list + invented-name metric** — with `14` §6's first three components.
6. **Storybook visual verification** — when the code leg lands.

## 8. Deliberately not adopting

- **Hard tool-gating / host allowlists** (§5) — incompatible with ejectability.
- **Crawler starvation and walled-garden access** (Polaris) — fights the accelerator model.
- **Paid AI tiers** (MUI, Chakra, daisyUI) — not our distribution.
- **Per-vendor prompt proliferation** — one compiled instruction set, many symlinked delivery formats (daisyUI's *"one artifact, three delivery formats"*) is the cheaper shape.

---

*Source: Deloumeau-Prigent, K. (2026). State of AI in Design Systems — July 2026.
`https://state-of-ai-in-design-systems.netlify.app/` · CC BY 4.0 · snapshot 2026-07-26/28.
Cross-refs: `14` §5 (evals + invented-name rate), `17` (consumption eval), `19` §2
(ejectability), `28`, `34` (gate independence), `35` §1 (the eject boundary), #252, #254,
#256, #258, #621, #625.*
