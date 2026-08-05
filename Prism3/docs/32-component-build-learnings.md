# 32 — Component build learnings (the skill backlog)

> Building Button revealed that the *repeatable* part of component work is not the component — it
> is the set of checks, gaps and traps that recur for every one of them. This file is the running
> capture of those, kept as a **skill backlog**: each entry is something a future skill should
> encode, or a gate that should exist, written down at the moment it was discovered rather than
> reconstructed later. Newest first. See `00-progress.md` for what shipped; this is what we *learned*
> while shipping it.

---

## Why this file, and what belongs in it

We will do this catalogue-wide. The KB gave us a schema and a component API (`components/*.md`
§15); #111 built the def tier; #487 found that tier still could not reach Figma. Every one of those
steps produced knowledge that was not in the previous step's plan, and none of it was written
anywhere a future agent would find it.

An entry belongs here when it is **transferable to the next component**. A Button-specific token
binding does not. "The def can bind tokens it has no API to trigger, and nothing checks that" does.

Three kinds of entry, tagged so they can be triaged:

- **`[SKILL]`** — a check or a step a build-a-component skill should perform.
- **`[GATE]`** — something that should fail a build rather than rely on someone remembering.
- **`[KB]`** — a finding worth contributing *back* to the knowledge base, because the KB's research
  did not consider it (see the standing note below).

### The KB's standing remit, and where we deviate

The knowledge base is field research across best-in-class systems. It was not built to serve Prism3,
and in particular **it does not weigh Figma's constraints** — it looks at how components are
modelled, not at what a variant axis costs when Figma has no context mechanism. So: reference it
first, follow it where it holds, and challenge it where Prism3 has a constraint the research did not
face. When we do deviate, that deviation is itself a finding — tag it `[KB]` and feed it back.

---

## 2026-08-04 — from #487 / #488 (Button → Figma, step 1)

### `[GATE]` A shipped skill can be silently invalidated by an engine change

`Prism3/skills/prism3-theme/SKILL.md:82` teaches an agent to "map adjectives → levers — this is the
judgment the brief pays for". #477 replaced that judgment with a controlled vocabulary the engine
resolves *and logs*. An agent following the shipped skill today hand-picks numbers instead of passing
`personality`, losing precisely the audit trail #471 existed to create. Line 61 has the same drift:
`radiusScale` is documented as number-only, and now takes named stops.

**Nothing caught this.** The skills are shipped surfaces with no gate — unlike `out/**`, the schema
contracts and `web/dist`, all of which the US-English gate scans. A skill that describes a stale API
is worse than no skill, because an agent trusts it. This is the same shape as #281 (no gate reads the
committed artifact), one tier out.

### `[SKILL]` A def can bind tokens it has no API to trigger

Button binds three `on-inverse.label` token slots and has **no** `inverse` prop. It can paint an
inverse button and has no way to ask for one. That inconsistency is why #487 §3's `on-inverse`
question could not be answered from the def — the def genuinely does not say.

Check both directions: every bound token family should be reachable from *some* prop, variant or
state, and every prop that implies paint should have bindings. Neither direction is checked today.

### `[SKILL]` Validate the spec against the def before building from it

#487 was written to be picked up cold. Two of its statements did not survive contact:

- §0.1 lists six state values; §0.4 forbids codifying the legacy sheet's names; the def declares
  **seven**. The six *were* the legacy names. Following §0.1 would have shipped `active`/`focused`/
  `loading` and silently dropped `inactive` — and moved the headline count from the correct 756 to
  648.
- §4 says `width` "should not be a variant" without noting it *already is one* in `variants`, so the
  action is to move it to `codeOnly`, not to leave it alone. And the slot axis §4 assumes does not
  exist — there is `modifiers`, a differently-shaped axis whose `pending` duplicates a state.

Neither was carelessness; both are what happens when a spec is written from a legacy artifact and the
def has moved. **Read the def first, then the spec, and reconcile explicitly.**

### `[GATE]` An axis Figma will not carry must be admitted, not merely absent

`anatomy.codeOnly` already existed as the place a def admits what the Figma leg drops, and it is
validated non-empty. #488 made the pairing mandatory: a `variants` axis missing from
`figmaProperties.variantAxes` with no `codeOnly` mention is an **error**. It did real work on first
use — it forced Button's two omissions to be written down with reasons instead of quietly vanishing.

Generalize: wherever a projection is allowed to be partial, the omission needs a named home, or
"partial" decays into "incomplete and nobody noticed".

### `[SKILL]` Check the token tier exists before declaring an axis

#487 §3 proposed an `accent` intent. `grep accent` across the emitted Figma variable names → **0
hits**. The axis was declared in prose and had nothing to bind. Same class: `filled elevated` needs
an elevation binding, and elevation is an *effect style*, not a variable — a different API
(`effectStyleId` vs `setBoundVariable`) that would fail at paste time if squeezed into `bound`.

**Before adding a variant value, resolve it against the emitted names.** A stubbed axis is worse than
a smaller correct set.

### `[SKILL]` Figma property kinds are not interchangeable, and only one carries layout

A Figma BOOLEAN drives one node's `visible` and nothing else. It cannot change an ancestor's
`paddingLeft` — which is exactly what #326's split inline padding needs. So **slot presence must be a
variant axis** while slot *content* is an INSTANCE_SWAP. Any property that implies a layout
consequence has to be a variant; nothing else can express one.

This is the general trap: the dev API shape (a `leadingVisual` prop) and the Figma shape (a variant
axis) diverge for a mechanical reason, and the divergence must be recorded rather than papered over.

### `[SKILL]` State the variant count before building, and re-state it when an axis moves

`3 × 3 × 3 × 7 = 189` today; `× 4` slots = **756**. Payload is ~866 bytes per variant against a 45KB
paste ceiling, so chunking is mandatory rather than an optimization. A test asserts the 189 so that
any axis change has to move a number a reviewer can see.

### `[SKILL]` A test suite that dies on the first defect reports zero, not one

Twice now, in suites written after the lesson. An invalid enum in a traits table threw deep inside
`componentSizes` and took a 1,409-assertion run with it — the static check had already recorded the
real cause, but the report never printed. Fail soft: record the throw, return a sentinel that cannot
compare equal to anything, keep going.

### `[KB]` Inverse / on-color — RESOLVED, after an analysis error worth recording

**Decision.** The `on-inverse.*` token family **stays**. Code gets container scoping; Figma gets a
variant axis; the tokens are the same either side.

The error that produced the wrong answer first: **"container-scoped" was conflated with
"mode-swapped".** They are not the same mechanism. In CSS a container scope *selects which named
token to use* —

```css
.hero--inverse .btn { color: var(--prism-color-interactive-primary-on-inverse-text-rest); }
```

— so the named mirror is not the alternative to scoping, it is **the vocabulary the scope switches
between.** That yields container scoping (one author toggle, no threading into every nested button)
*and* explicit named tokens, with no modes involved. Both halves of what looked like a trade.

**What the taxonomy actually contains** (measured on aurora, 597 tokens, 33 mentioning inverse):

| | count | what it is |
|---|---|---|
| **A — surfaces** | 6 | `background.inverse.*`, `foreground.inverse.*` — what a *container* paints itself |
| **B — the mirror** | 26 | `text/icon.on-inverse` + 8 slots × 3 interactive columns — ink and fill *for use on* that surface |

A is required by any model — it is what the dark band's background is set to. B was the only thing
ever in question: **5.4% of the 480-path guaranteed surface, growing ~8 names per interactive column.**

**Why B stays, in the order the arguments actually weigh:**

1. **Agent legibility, and we already argued this against someone else.** `docs/13 §1` criticises
   Astryx for being "intent-poor… a props-table-plus; ours is a decision surface." A mode-based
   inverse makes the inverse ink **unnameable** — no token to point an agent at, gate on, or attach
   an `avoid_when` to. Choosing modes would move us toward the thing we called out.
2. **White-label portability.** Every brand gets the same names with different generated values.
   A mode-based inverse means every engagement's Figma file needs its mode structure set up
   correctly — per-brand setup risk, landing on the people least equipped to absorb it.
3. **No mode doubling.** Inverse is explicitly *not* dark (`docs/20 §9`: a light-only brand still
   needs it). So as modes it would not reuse dark — a light-only brand would need **2** modes and a
   four-mode brand **8**. As names: zero new modes.
4. **Training cost is real and asymmetric.** "On a dark band use `text.on-inverse`" is one sentence.
   Figma mode-scoping on an ancestor frame is a mechanism most design teams do not use.

**Where Figma deviates, deliberately.** Figma has no CSS-scope equivalent, so it needs *something*:
a variant axis, which is the mechanism designers already know. That is an intentional deviation from
the code API (which needs no button prop, because the scope does it) and belongs in `codeOnly` — the
general rule this file already records, applied.

**The residual discipline:** add `on-inverse` slots *deliberately*, per component need, rather than
mirroring the whole interactive family by reflex. And it is still untested whether a brand-declared
`interactivePalettes` column gets an inverse treatment — no corpus brand exercises it.

**Still worth feeding back to the KB**, both independent of the decision: the **CMS-authoring lens on
component API design** (the KB's component research assumes an app developer, not a CMS component
developer with a content author downstream), and that **a contextual model needs an explicit escape
hatch for non-token grounds** (imagery, video) — which is what Spectrum's `staticColor` actually is,
and why it does not conflict with the contextual model.

> The transferable lesson is the error, not the answer: **naming a mechanism ("context") is not the
> same as choosing an implementation of it.** The first framing lost a whole design because one
> implementation of context got mistaken for context itself.

### `[SKILL]` Only one of five defs is materializable

`button` has an `anatomy` block. `icon-button`, `field-label`, `field-message` and `text-field` do
not — "semantically complete but not materializable", in the schema's own words. Any plan that reads
"apply this to the catalogue" should state which defs it can actually reach.

---

## 2026-08-05 — prior-art survey (external skills + the Figma component API)

Surveyed before writing any skill of our own, per #492's "don't write it from a sample of one".
Sources: `figma/mcp-server-guide` (Figma's own agent skills), `firebenders/sync-figma-token-skill`,
`travisvn/awesome-claude-skills`, and our own `adamforrester/xd-toolkit`.

### `[GATE]` Figma's own guidance caps variant matrices at ~30. We plan 189, then 756.

`figma-generate-library` says to cap a variant matrix at roughly **30 combinations** and split larger
sets into sub-components. #487 §6 plans **189 today and 756 at full slots** — 6× and 25× that.

This is convergent with a number we derived independently: ~866 bytes per variant against a 45KB
paste ceiling puts 189 variants at ~16 chunks. **Two unrelated sources reaching the same conclusion
is worth more than either alone**, so the variant count should be treated as an open question rather
than a settled one. The likely resolution is that a Button "component" is several component sets
split on a natural axis (per intent, or per intent × appearance), not one 189-variant monolith —
which is also what makes a failed chunk diagnosable.

*(Sourced from a summarization pass, not a direct read of the file. Confirm before it drives a
decision — it is load-bearing.)*

### `[SKILL]` Four Figma API facts we did not have

Each of these is a property of the API, learned from prior art, and each would have cost a build
cycle to discover:

1. **Variants stack at (0,0) after `combineAsVariants`.** They must be grid-laid-out and resized
   afterward. We have zero occurrences of `combineAsVariants` in the repo, so we had no knowledge of
   what happens *after* the call.
2. **Mutation calls must be strictly sequential** — no parallelizing writes. This constrains the
   chunked paste directly: chunks are a queue, not a fan-out.
3. **A state ledger belongs on disk**, recording created node IDs, never reconstructed from memory.
   At 16–35 chunks that is not optional.
4. **Every variable wants a scope and a code syntax.** We already derive scopes from the role family
   (docs/10); whether we emit **code syntax** (`var(--color-bg-primary)`) is worth checking — it is
   the field that makes a Figma variable legible to a developer reading the design file.

Two of our existing calls were independently confirmed: INSTANCE_SWAP for icons rather than a variant
per icon (#487 §4), and variables before components (our `dims-create` → `dims-aliases` ordering).

### `[GATE]` Nothing checks that a live Figma file still matches what we emitted

`sync-figma-token-skill`'s value is its model, not its code: drift detection with a dry run that
**stops for approval**, alias mismatch treated as a distinct drift category, and broken-alias
detection.

We have `regen --check` for committed artifacts and `planBindingErrors` for the plan — but **every
gate we own compares the engine to itself or to its own committed output.** Nothing verifies that the
Figma file a designer is working in still matches the emitted artifact. That is the #281 shape one
leg further out, and it is the gate that would catch a hand-edited variable in a client file.

Two smaller patterns worth taking: `disable-model-invocation: true` for a destructive write path
(explicit invocation only), and a stated source-format priority (DTCG first) rather than sniffing.

### `[SKILL]` Licensing decides the take-vs-vendor question here, and it decides it cleanly

`figma/mcp-server-guide` has **no license** — no LICENSE file, no badge, no SPDX statement. The only
legal text is *"By using the Figma MCP server and the related resources (including these skills), you
agree to the Figma Developer Terms."* An unlicensed repository grants no copying rights; the default
is all rights reserved.

So the rule is not a preference, it is a requirement: **learn the facts, write our own words, copy no
text.** The API behaviours above are facts about a system and are not copyrightable; the prose that
describes them is. Everything recorded in this section is restated, not lifted.

The general policy this suggests, which holds beyond this one repo: **fork the judgment, defer on the
API.** A skill's opinions about *how to sequence work* are ours to rewrite and improve. Its knowledge
of *call shapes for an API we do not control* goes stale in a fork — so invoke the upstream skill at
runtime (`figma-use` is already declared mandatory before `use_figma`) rather than restating it.

### `[SKILL]` Do not vendor `figma-generate-library` — its first half contradicts this engine

Its Phases 0–1 are "analyze the codebase, create variable collections, primitives, semantic tokens."
**That is our engine's output.** An agent following it would invent a token layer instead of reading
one that is already generated, contrast-verified and name-gated. Take its Phase 3 component mechanics
and the gotchas above; replace Phases 0–2 with "read `out/figma/**` and the anatomy plan."

This generalizes: an external DS skill almost always assumes the agent *authors* the tokens. Ours are
generated. Any borrowed workflow needs that phase removed, not adapted.

### `[KB]` `awesome-claude-skills` has nothing in this domain yet

~25–30 curated skills; **none** touch design systems, tokens, Figma, component libraries or contrast.
Worth a revisit later; nothing to take today. Notable mostly as evidence that the domain is unserved.

### The xd-toolkit connection — already real, and undocumented

`adamforrester/xd-toolkit` ships `extensions/ds-pack` (21 skills + a Storybook MCP),
`extensions/ux-design-skills` (63 skills), `packages/brand-skills`, and `schema/brand/` — 17 files
defining a **tiered** brand package (minimum / standard / comprehensive).

**Prism3's "STANDARD dialect" is that pipeline's output.** `standard-design-md.ts`'s own header says
it is "the engine's front door for a `design.md` authored by **`brand-skills`**", and Wendy's is a
fixture in *both* repos (`Prism3/examples/wendys.design.md` ↔ xd-toolkit `tests/fixtures/wendys/`).
The two systems already interoperate; nobody has written that down as an architectural fact, and it
is the strongest existing answer to "where does a brand brief come from before Prism3 sees it."

Two consequences worth chasing:
- The `.brand/` schema's **tiers** map suspiciously well onto the engine's own input gradient (three
  required fields → a full brief). Whether "standard" in that schema is *exactly* what
  `standardToBrandInput` expects is checkable, and if it has drifted, that is a live integration bug
  neither repo would currently catch.
- `ds-pack`'s 21 skills are the closest prior art we have to the internal build-a-component skill
  #492 describes. **Enumerate them before writing anything new.** — *corrected below: they are
  VENDORED third-party skills, not ours, and the tier claim above came from a stale README.*

### Corrections to the section above, and what the primary sources say

Two claims above were wrong, both from reading a **stale vendored copy** rather than the source. That
is itself the lesson: *a vendored copy is a snapshot with no freshness signal, and it will be read as
current by whoever finds it first.*

1. **`ds-pack`'s skills are not ours.** They are vendored from
   [`murphytrueman/design-system-ops`](https://github.com/murphytrueman/design-system-ops) — third
   party, **MIT licensed**. MIT means we may adapt or vendor with attribution, so the practical
   answer is unchanged, but "no licensing question at all" was simply false.
2. **The minimum/standard/comprehensive tiers** come from xd-toolkit's copy, not from
   `adamforrester/brand-skills`, whose documentation does not mention tiers at all. Treat the tier
   model as unconfirmed.

### `[SKILL]` design-system-ops (MIT, Murphy Trueman) — 34 skills, and the overlap is the finding

Four categories: **Audit** (token-audit, component-audit, system-health, drift-detection,
naming-audit, figma-variable-audit, codebase-index, system-benchmark, theme-audit, docs-coverage),
**Govern** (contribution-workflow, deprecation-process, decision-record, change-communication,
backlog-generator, version-bump-advisor, release-retrospective, governance-encoder, session-memory,
codemod-generator, triage), **Document** (ai-component-description, pattern-documentation,
token-documentation, usage-guidelines, component-decision-tree, context-engine-builder,
metadata-schema-generator), **Validate** (design-to-code-check, accessibility-per-component,
token-compliance, schema-validator, component-api-validator, cicd-integration).

**Roughly a third of them describe work this engine already does deterministically**, and that is the
decision rule rather than a coincidence:

| skill | what we already have |
|---|---|
| `version-bump-advisor` | `token-contract.ts` — *refuses* an unbumped breaking change |
| `drift-detection` | `regen --check` (88 artifacts, byte-compared) |
| `token-compliance` / `token-audit` | `scoreContractCompliance`, `isPrimitiveRef` primitive-leak warning |
| `component-api-validator` | `validateComponentDef` + `figmaPropertyErrors` |
| `schema-validator` | the hand-rolled validator over `theme-schema.json` |
| `accessibility-per-component` | the per-mode contrast contracts |
| `deprecation-process` | the `DEPRECATIONS` table + dangling-replacement gate |
| `cicd-integration` | `.github/workflows/ci.yml` |
| `ai-component-description` / `context-engine-builder` | `.ai.json` + `ComponentDef.ai` |

> **Where we have a gate, an LLM skill is a regression.** A skill that *advises* a semver bump is
> strictly weaker than a command that *refuses the commit*. Point the skill at the gate; never
> re-derive the judgment in prose.

So the take is the complement: the skills earn their place exactly where we have **no** gate —
`figma-variable-audit` (the live-Figma drift gap recorded above), `docs-coverage`, `system-benchmark`,
`contribution-workflow`, `change-communication`, `release-retrospective`, `codemod-generator` (which
would pair with `DEPRECATIONS` to actually apply a migration). That is a much smaller, sharper set
than 34, and it is the set worth adapting.

### The brand-skills handshake is real, and #477 just broke half of it

[`adamforrester/brand-skills`](https://github.com/adamforrester/brand-skills) emits a `.brand/`
package plus a **`design.md` following the `google-labs-code/design.md` spec** — which is exactly what
`standard-design-md.ts` names in its own header ("a `design.md` authored by `brand-skills`"). The
integration is real and identified precisely.

The extension point Prism3 relies on is `x-prism3`, which carries eight levers (`radiusScale`,
`typeScale`, `density`, `motionTempo`, `actionPalette`, `iconContrast`, `surfaces`, `gradients`).
Two problems, both verified by running them:

```
NATIVE   radiusScale: 'soft'            → 1.5
STANDARD x-prism3.radiusScale: 'soft'   → THROWS "must be a number (0=sharp … 2=soft)"
STANDARD x-prism3.personality           → SILENTLY DROPPED (no passthrough)
```

**#477 widened the native dialect and left the standard dialect behind.** The `radiusScale` guard
even names `soft` in its own error text as the invalid example — written when that was true, and now
it rejects a value the engine accepts everywhere else. Worse, `personality` has no passthrough at
all, so a brand-skills brief cannot reach the vocabulary #471 was filed to create, and fails
*silently* — the precise failure mode that issue existed to eliminate.

This is the "two enforcement points that differ" trap from `vocabulary.ts`, recurring one level up:
not schema-vs-engine this time, but **dialect-vs-dialect**. Neither `wendys.design.md` (our only
standard-dialect fixture) nor any test exercises `x-prism3`, which is why nothing caught it.

`[GATE]` **Any lever the native dialect accepts should be reachable from `x-prism3`, and a test
should assert the two dialects agree.** Without it, every future input-surface widening silently
forks the two front doors again.
