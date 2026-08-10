# 13 — Inspirations: field notes on agent-first design systems

> A running review of external systems and practitioner maps that overlap with what
> Prism3 is building — logged so each review's *takeaways* survive context loss and
> feed the build (the component layer, the agent surfaces, the MCP adapter) rather
> than staying chat ephemera. Each entry: what it is, what we take from it, where we
> are already ahead. Convergences across entries get promoted to the summary table
> at the end. **Nothing here is a commitment; steals become commitments when they
> land in `00-progress` as decisions.**

---

## 1. Astryx — Meta's agent-first design system (reviewed 2026-07-03)

**What it is.** Meta's open-source design system (React + StyleX, `astryx.atmeta.com`).
"Agent-first" means something specific and narrower than our four-layer stack: **the
CLI is the agent interface**. Agents don't get docs bulk-loaded into context; they
retrieve on demand:

- `npx astryx search button` — ranked search across components/hooks/templates, every
  result carrying the follow-up command to run next.
- `npx astryx component Button` — the component's docs; `--compact` emits a
  token-budget-optimized rendering for LLMs; `--source` returns the implementation.
- `npx astryx agent-docs` — injects a *compressed component index* into the project's
  agent files (CLAUDE.md and equivalents), so an agent learns that the CLI exists and
  browses from there instead of guessing.

**Component docs are typed data, co-located with the component.** Each component ships
a `{Name}.doc.mjs` exporting a `ComponentDoc` object — description, features, props
(name/type/default/required), runnable examples, theming targets + CSS vars,
accessibility notes, keyboard interaction. This explicitly *replaced* per-component
README.md. A registry (`ComponentEntry`) built from these files drives the docsite
nav, search, playground defaults, and the CLI output — one source, multiple
projections. That is the KB's components-as-data thesis (KB 30: "the component data
file is the source of truth") shipping in production at Meta scale — strong external
validation of the direction `07-e2e-journey` §7 maps for our component layer.

**What we take:**

1. **Typed doc objects, compiler-checked.** The doc file carries a `ComponentDoc`
   type (JSDoc `@type` annotation), so metadata drift is a build error — the same
   "can't drift" philosophy as our lever-manifest / preview-spec gates, applied to
   component metadata. When our component layer lands, the per-component data file
   should be type-checked against a schema the same way, not freestanding JSON.
2. **CLI-as-agent-surface is a cheaper peer to MCP.** A plain CLI works in any agent
   harness with a shell — zero server, zero auth. We already have `cli.ts` for
   theming; a `query` subcommand over the `.ai.json` sidecar is a small step and
   would give the sidecar a retrieval surface before the MCP adapter exists.
3. **The `agent-docs` injection pattern.** A generated, compressed index dropped into
   the consuming project's agent files is the *discovery* layer our `.ai.json`
   currently lacks — the sidecar is only useful to an agent that knows it exists.
4. **`--compact` as a first-class flag.** Explicit token-budget tiers of the same
   metadata (index → summary → full entry). `.ai.json` should think in tiers too.
5. *(Footnote)* Astryx runs an agent-based conformance auditor ("Night Watch")
   enforcing tokens-only styling — agent-as-CI-gate rather than lint rules.

**Where we're ahead — their gaps confirm the engine's POV:**

- **Theming is hand-authored and unverified.** `defineTheme({ tokens:
  { '--color-accent': ['#0077B6', '#48CAE4'] } })` — the consumer supplies light/dark
  hexes themselves. No generation, no ramps, no contrast contracts, no HC modes.
  Prism3's generate-and-verify engine (488/488 contrast contracts, four modes) is a
  different class of thing; Astryx has nothing like it.
- **Their metadata schema is intent-poor.** No `avoid_when`, no `business_context`,
  no relationships graph (`alternativeTo`, `composesWith`) — the fields KB 29/30
  argue are the highest-value authored layer. Theirs is a props-table-plus; ours is
  a decision surface.
- **No Figma story found** — no Code Connect, no variables sync. Single-framework
  (React/StyleX only), so they never face the WC + React problem that motivates our
  neutral-source component definition.

## 2. "ds-brain" — a practitioner's DS × AI stack map (Reddit, r/DesignSystems, reviewed 2026-07-03)

**What it is.** A practitioner's architecture diagram (drawn *before* building, then
iterated) for an AI-powered design system. Three horizontal layers — **DS** (Figma UI
Kit ↔ Component library, with a central **"DS Brain — documentation package (.md +
metadata)"** and Storybook off to the side), **AI Enablement** (an "AI
Context/Guidance" block — structured knowledge for AI: components, props, patterns,
rules, examples, best practices — plus Cursor rules/skills), and **Work** (the
outputs: normal Figma designs, AI-powered static Figma prototypes, AI-generated UI
in IDE/Cursor, AI-powered interactive coded prototypes). The stated bets:

- The **brain sits in the middle** — not Storybook, not the component source files.
- **Maintain docs once** — skills, rules, indexes, and Storybook fragments all fall
  out of a *generator* over the brain.
- **Storybook is a consumer of the brain**, not the other way around.
- The IDE/Cursor path is where they've shipped and measured most; **AI inside Figma
  "still needs love — MCP? CLI?"** (an open frontier for them).
- **They measure**: outputs scored against a rubric; counting when agents *invent
  components that don't exist*; trials run in isolated environments so experiments
  don't contaminate retrials.
- The closing thesis: *"Don't start with the AI box. Start with the documentation
  package. Everything else is plumbing."*

**What we take:**

1. **The eval harness is the genuinely new idea for us.** Rubric-scored agent
   outputs, an *invented-component rate* (the component-tier hallucination metric —
   ours would add an invented-token rate), and contamination-controlled trials.
   Prism3 verifies *generation* exhaustively (contrast contracts, alias resolution,
   byte-regression) but has **no methodology for measuring agent *consumption*** —
   "did an agent given our `.ai.json` / MCP surface produce compliant UI?". When the
   component layer / MCP adapter lands, build the eval alongside it: a rubric, an
   invented-name counter (checkable mechanically against the locked name contract —
   `11`'s names-are-the-API makes this cheap), and isolated re-runs.
2. **"Everything falls out of a generator" now has three independent witnesses** —
   this map (brain → skills/rules/indexes/Storybook fragments), Astryx
   (`agent-docs` injection + registry projections), and our own engine (one
   `BrandInput` → every artifact). The per-harness *discovery* artifacts (Cursor
   rules, skills, CLAUDE.md indexes) are themselves generated projections — that's
   the same steal as Astryx #3, now a confirmed pattern, not one system's habit.
3. **The sequencing lesson matches ours.** "Don't start with the AI box; start with
   the documentation package" is the consumption-side restatement of our build
   order (token layer verified first, agent surfaces after). Comforting, and
   quotable for the KB's commercial argument.

**Where we're ahead / what the map is missing:**

- **No generation layer.** The diagram assumes the DS exists and the brain documents
  it. Prism3 sits *upstream*: the engine generates the system the brain would
  describe. Their stack starts where our layer 1 ends — the maps compose rather
  than compete.
- **Docs-as-source is the third position in the source-of-truth debate** — code-first
  (Astryx: typed doc objects beside the implementation), data-first (KB 30 /
  Spectrum / our component-layer plan: neutral definition, everything projects), and
  now docs-first (`.md` + metadata as the brain, even component source downstream in
  spirit). Docs-first has a drift problem the map doesn't answer: what keeps the
  brain true to the shipped component source? (KB 30's freshness-hash CI is our
  answer; the brain diagram has no equivalent.) Our data-first position stands.
- **"AI inside Figma still needs love"** — the frontier they're stuck on is the one
  we're actively building (`emit-figma` + the MCP materialization route, `10`).
  Single-brand, too: no white-label / multi-brand dimension anywhere in the map.

## 3. Specs CLI — DirectedEdges (Nathan Curtis), verified 2026-07-03

**What it is.** The public tool operationalizing the components-as-data POV
(github.com/DirectedEdges/specs; KB GLOSSARY + 15). Reviewed here to answer the
owner's question: could it be leveraged to *build* components in Figma from data,
LLM-free? **Verified against the repo: it is extraction-only.** `init` → `fetch` →
`scan` → `generate` reads a Figma file via the REST API (PAT auth) and emits
schema-valid YAML/MD specs *from* it; its stated workflow is "Update Figma →
Generate specs → Agents refine → Update component." There is no
build-Figma-from-specs direction. Its virtue is determinism: scripted, **"0 AI
tokens per component"** (vs ~25k for agentic extraction).

**What we take:**

1. **The read-back-verifier seat.** Extraction-diff as the component-tier
   regression gate: materialize components from our data → extract specs from the
   resulting file → diff against the source. Deterministic, zero-LLM round-trip —
   the `nb-regression` pattern at the component tier. Full contract in `14` §4.
2. **`@directededges/specs-schema` as the reference schema** (JSON Schema + TS
   types — `Component`, `Element`, `AnyProp`): the shape to stay
   conformant-or-mappable to, same follow-don't-fork posture as `design.md`.
3. **The correction itself is the finding** — KB 15's "produces (or assists in
   producing) Figma component sets" read was optimistic; its own "verify the
   current scope at the repo" caveat did its job. KB-side correction flagged.

**Where we're ahead:** the write leg. Specs CLI's world keeps Figma as the
authoring surface; ours makes Figma an *output* — the deterministic
data→plugin materialization (`14` §3) is the direction it doesn't have.

## 4. Southleft — "the site is the pitch" theme console (essay + live site, reviewed 2026-07-25)

**What it is.** A design-systems-and-AI agency (`southleft.com`) whose rebuilt site *is*
the argument: a header console where you type a vibe ("cathedral at dawn") and the whole
site re-skins in ~1s. The essay's load-bearing claim — *"AI is only as good as the
structured context it can reach… the design system is your AI strategy's substrate"* —
and the mechanism behind the demo:

- **AI returns decisions, not CSS.** A Cloudflare Pages Function calls Claude with a
  strict JSON schema; the model proposes ~44 parameters (personality, accent hue,
  canvas chroma, texture, motion feel, light/dark lead, a typeface from a curated
  catalog or any Google font). *"The JSON schema is the contract. Anything that can
  emit that shape can be the art director."*
- **The design system disposes.** A browser OKLCH engine takes the proposed hue/chroma
  and derives the full palette, **binary-searching lightness until each fg/bg pair
  clears WCAG AA** — then writes into a 3-tier semantic token layer (primitives →
  semantic aliases → component) and the alias re-point re-skins everything. *"The model
  proposes, the solver disposes… it cannot ship an inaccessible theme, by construction."*
- **A deterministic seed engine underneath** (keyword→hue / mood→chroma) renders an
  instant theme with zero network, so the AI only *refines* and is never a single point
  of failure.
- **No hand-maintained snapshots.** `/tokens.json` (DTCG) is **generated at build by
  parsing the actual CSS**, with assertions that fail the build if the parse breaks —
  after the hand-kept version had silently drifted ~40 tokens. *"Make the correct state
  the only possible state."* Plus `/llms.txt`, shareable `#theme=` URLs, and a typed
  `@property <color>` layer so themes **crossfade** (~600ms) instead of snapping.

**What we take:**

1. **The prompt → re-theme console (new task).** A natural-language front door to a
   partial `BrandInput`: type a phrase → map to primary hue + personality levers
   (density, motion tempo, radius, chroma) → `apply()` live. We already have every
   piece — `brandState → apply()/renderWorkspace()`, the `standard-design-md` prose→
   `BrandInput` path, and `theme-schema.json` *as* the JSON contract their schema plays.
   A local keyword→hue seed map (their fallback) is the graceful-degradation + "small
   model can drive it" story. This is the console version of the same argument the
   manual dashboard already makes.
2. **Kill the last hand-maintained snapshot (new task).** Their drifted-`tokens.json`
   story maps *directly* onto our one remaining hand-sync: the legacy dual-format
   `reference/` layer (raw-figma + DTCG, *"the same logical tokens twice… edit both,"*
   CLAUDE.md). The engine already embodies generate-don't-duplicate; decide whether
   `reference/` stays an authored source or becomes a pure engine artifact with a parity
   assertion (the lever-manifest drift-gate pattern).
3. **Live crossfade via typed `@property <color>` (cheap delight).** Registering the
   preview's colour vars as typed custom properties lets the browser interpolate them —
   the dashboard's `apply()` snap becomes a morph, making "change one input, the system
   agrees" visceral. The light/dark toggle inherits it for free.
4. **Shareable theme URL** — encode the `BrandInput` in the hash (we already persist to
   localStorage; a URL makes a generated theme a sendable artifact, same spirit as the
   DTCG export).

**Where we're ahead — and the one place they're a genuine peer:**

- **First reviewed system with a real contrast solver.** Every prior entry hand-authored
  theming; Southleft actually solves fg/bg to WCAG AA. But it solves for the *lead*
  pairs of a *single* accent, light/dark-lead, ~44 tokens, one brand, client-side around
  a live model call. Prism3 verifies **488/488 contrast contracts across four modes**,
  multi-brand, with status/interactive/gradient families, gamut-aware ramps, per-mode
  overrides, and a byte-regression target — and a **fully deterministic** engine (the AI
  is entirely upstream producing the `BrandInput`; a *cleaner* proposes/disposes split
  than their in-browser-around-Claude design). Ours is the enterprise generation system;
  theirs is the re-theming toy that proves the thesis at marketing-site scale.
- **The essay is a quotable external anchor** for the KB / `brand-skills` commercial
  argument: *"the design system is your AI strategy's substrate"* and *"start with the
  documentation package; everything else is plumbing"* restate the KB POV verbatim, from
  an agency selling it. Cite it there.
- **Watch the gravity of the demo.** The delight is the re-skin-from-a-sentence trick;
  the *value* is that the re-skin stays accessible by construction. Build the prompt
  console because it makes our per-mode-contract rigor legible — not because it's fun.

## 5. Zinnia — Zapier's "AI-first design system" (practitioner essay, reviewed 2026-07-25)

**What it is.** A DS lead's year-one retrospective on making Zapier's system (Zinnia)
"AI-first." Same thesis as Southleft but from the **consumption / org** side, not the
generation side: *"Design systems do not just ship components anymore. They ship
context… a design system is one of the richest, most structured sources of context an
organization has."* The concrete moves:

- **Docs authored machine-first.** Markdown + front matter, structured for agent
  consumption, in a git repo (Zinnia Docs); they *dropped* their docs-portal tool when
  they caught themselves round-tripping human-docs ↔ markdown, then **AI-generated the
  human website *from* the repo** — author for agents, export for humans.
- **A Zinnia MCP over those docs won a stack argument.** Leadership asked "switch to
  Tailwind/ShadCN since that's what agents default to?" — answer: *"not a stack problem,
  a context problem."* They built the MCP, showed agent output measurably improved with
  real context, and kept their stack.
- **Context needs layers:** universal (Gestalt) → org/platform → surface/product. A good
  designer holds all at once, so bending a rule is intentional. Layers extend past the
  company wall (vet outside sources into the KB — this review is that habit).
- **Principles carried the most weight** — in their "Polish" skill, principles ("one
  platform, one language") explained *why* a fix mattered, more than components/patterns,
  especially to non-designers.
- **"Polish" skill** = a pre-verification step that checks a proposed change against DS
  context + principles + patterns *before* acting, and dedups against existing Jira/MR.
- **Greenhouse**, a code-based prototyping sandbox that leans on the DS ("how do I make
  it look like Zapier?" is always the second prompt); designers now start in *interaction*
  design (a prompt to a coding agent), not Figma/visual.
- **Shipped a breaking major package *with* a migration skill** → 66% of critical surfaces
  migrated in 4 weeks (vs. months).
- **"Three audiences": human / agent / mix** — ask who consumes each artifact.
- Closing frame: *"design systems are becoming the laws of physics of your world"* — define
  the rules, humans and agents build inside them (programmatic design).

**What we take (mostly validation + framings — the concrete steals are already in flight):**

1. **"Context needs layers" is a clean vocabulary to adopt** for our agent context —
   universal / org / surface maps onto `brand-skills`' `.brand/` tiers and `ai-metadata`'s
   per-role intent, and it explains *why* intent-rich metadata (`avoid_when`/`when_to_use`)
   beats a props table. Third witness (after KB 29/30 and Astryx) that the **principle/
   intent layer is the highest-value authored one** — Zinnia's "principles weigh most" is
   the sharpest statement of it.
2. **Author-machine-first, export-human-second.** This is already our output posture
   (`25` / `style-guide-generator` generate the human artifact from the single source).
   The sharper move Zinnia adds: apply it to the *docs* too — worth an audit of whether
   `docs` + the KB are authored agents-first or humans-first.
3. **The MCP-proves-the-stack demo is ROI evidence.** Second witness (after ds-brain)
   that a docs/context MCP measurably lifts agent output *and that you should measure it*.
   Our `prism3-consume` skill + cold-agent differential (`#1–#6`, **done**) already run
   that eval; the MCP adapter is planned (`07`/`09`). Zinnia strengthens the case to
   prioritize it.
4. **"Three audiences" (human / agent / mix)** as a standing design-target question for
   every Prism3 surface — dashboard = human, `.ai.json`/DTCG/MCP = agent, docs = mix.
5. *(Candidate, not yet actionable)* **Ship a migration/adoption skill alongside breaking
   token changes** (their 66%-in-4-weeks). Folds into the `prism3-consume` skill family;
   promote when `prism3` has real external consumers.

**Where we already are / ahead:**

- Like ds-brain, Zinnia **documents an existing DS — no generation engine.** Prism3 sits
  upstream: we generate the system Zinnia's docs would describe. Their "laws of physics /
  define the rules, agents build inside them" *is* the `BrandInput`→engine thesis, reached
  from the consumption side. Convergent, not competitive.
- **Second docs-first source-of-truth witness** (after ds-brain), with the same unanswered
  drift question — what keeps the docs true to the shipped system? Zinnia's answer is
  proximity ("author in the repo agents read"), not verification; ours stays generation +
  gates. Our data/generation-first position holds.
- **Net for us:** high validation, few *new* tasks — most of what Zinnia recommends
  (consume skill + eval, intent-rich metadata, machine-first output, MCP) we've built or
  planned. Its gift is framings (context-layers, three-audiences, principles-weigh-most)
  and evidence the direction pays off, not a new feature.

---

## 6. Convergences so far (updated as entries land)

| Pattern | Witnesses | Status in Prism3 |
|---|---|---|
| Component metadata as structured data, one source → many projections | Astryx (`.doc.mjs` → registry/CLI/docsite), ds-brain (brain → skills/rules/fragments), Zinnia (Zinnia Docs repo → MCP + generated human site), KB 30 | Planned — component layer (`07` §7); engine already does this at the token tier |
| Generated per-harness discovery artifacts (agent-file index, Cursor rules, skills) | Astryx `agent-docs`, ds-brain generated outputs, Zinnia (Polish + migration skills) | **Gap** — `.ai.json` has no discovery layer; steal when agent surfaces land |
| Context authored machine-first, human artifact generated from it | Zinnia (docs repo → AI-exported website), our `25` / style-guide-generator | Output side done; **open audit** — are `docs` + KB agents-first? |
| Context has explicit tiers (universal / org / surface); intent/principles weigh most | Zinnia ("context needs layers", "principles carried the most weight"), KB 29/30, Astryx (intent-poor, a gap) | Adopt the vocabulary for `ai-metadata` + `brand-skills` tiers |
| Retrieval-first agent access (search → fetch-on-demand, compact tiers) | Astryx CLI; ds-brain "AI index" | **Gap** — candidate `cli.ts query` subcommand; MCP adapter tool schema later |
| Metadata that cannot drift (type-checked / CI-enforced) | Astryx typed `ComponentDoc`; KB 30 freshness hash; Southleft (`tokens.json` generated from CSS at build, drift-asserted) | Engine gates prove the philosophy at the token tier; carry into the component layer. **Open task:** the legacy dual-format `reference/` layer is the one hand-synced snapshot left |
| Consumption-side evals (rubric, invented-name rate, isolated trials) | ds-brain, Zinnia (MCP-lifts-output demo + package-adoption dashboard) | **Partially closed** — `prism3-consume` cold-agent differential (`#1–#6`) runs it; extend when the MCP adapter lands |
| Deterministic zero-LLM tooling as the differentiator over agentic equivalents | Specs CLI ("0 AI tokens" extraction), Southleft (local seed engine under the AI), our engine + planned plugin write leg | Core posture — `14` extends it to the component tier (write leg ours, verify leg Specs-CLI-shaped) |
| AI proposes params → system derives (NL vibe → schema → live re-theme) | Southleft (prompt console; JSON schema = the contract) | **Gap / candidate task** — we have the plumbing (`brandState`→`apply`, `standard-design-md`, `theme-schema.json`); missing the NL front door |
| Verified *generation* (contrast contracts, regression, modes) | Southleft (WCAG-AA solver — but single accent / lead pairs / one mode-lead); the rest none | **Prism3's differentiator holds** — ours verifies 488/488 contracts across four modes, not one lead pair |
| Figma as the underserved agent surface | ds-brain (open question), Astryx (absent) | Actively building — `emit-figma` (`10`), MCP materialization route |
| A section-level composition library ("blocks") as the shipped artifact above components | Initium (197 blocks / 23 types), daisyUI (211 page architectures matched by intent), Cloudscape (181 addressable exemplars) — the last two via `36` §2 | **Gap** — no tier above components exists; `preview-spec.json` is 8 product-UI components. Note the convergence: `36` scores us Behind on *exemplars*, and a block library is the same artifact serving both audiences (§8) |

---

## 7. Vocabulary watch — naming the Figma ⇄ JSON engine (Nathan Curtis poll, 2026-08-09)

A different kind of entry from §1–§5: not a system review, a **naming signal**. Logged because Curtis is
the lineage source behind several POVs this repo already builds on (components-as-data, the Specs CLI
verifier in `14` §4, the three-tier taxonomy, `27` Idea 5) and because the thing he is naming is the thing
we are adjacent to.

**The question, verbatim:** *"How do you refer to a deterministic transformation engine between Figma +
JSON schema-based contract that goes both ways without data loss?"* Options offered: **Lossless ·
Bi-directional transpiler · Round tripping · Reversible UI serializer.**

**What it tells us: we are not that, and the difference is the product.** All four candidate terms
presuppose **isomorphism** — both sides carry the same information, so a faithful mapping runs either
way. Prism3 is deliberately asymmetric. `BrandInput` is *smaller* than the token system it produces:
sparse anchors go in, and the engine supplies the color science, the contrast contracts and the scale
math. That gap is the value. The inverse is not determined, which is why #677 rules out reconstructing a
`BrandInput` from emitted tokens rather than filing it as work.

**The distinction worth keeping — reversible is not reproducible.**

| | means | what it buys |
|---|---|---|
| **Reversible** | you can reconstruct the input from the output | round-trip editing across two equal representations |
| **Reproducible** | the same input at the same `ENGINE_VERSION` always yields the same output | a **byte-identical baseline**, which is what a three-way merge needs (#668) |

For handoff, the second is strictly stronger. A reversible transpiler would let a client invert the
artifact; a reproducible generator lets them carry the input forward and regenerate. Only the second
gives the pristine baseline that shadcn has lacked since 2023 (`00` 2026-08-09 entry). **Reversibility
would not have helped there** — worth stating, because "goes both ways" sounds like the more powerful
property and for this problem it is not.

**Where we do claim a round trip, it is much narrower.** `$extensions.figma.variableId` is the linkage
keeping the DTCG and raw-figma projections reconcilable — identity preservation at the token level, not
information-preserving transformation of a system. Do not let the broader term attach to it.

**Read this as vocabulary, not evidence.** It is a poll with single-digit votes, and the terms on offer
are the author's, not the field's settled usage. The value is having a crisp answer to *"is Prism3 a
bi-directional transpiler?"* — no; it is a generator with a versioned name contract — rather than
adopting whichever term wins. `27` Idea 5's caution applies: a label with nothing behind it manufactures
the appearance of rigor.

**One real question it exposed**, filed rather than logged: the plugin writes Figma variables and reads
only to reconcile during that write. If a designer edits those variables afterward, we cannot tell. That
is the **Figma-side twin of the three-way-merge problem** #668 solves for code, and it is unsolved.

---

## 8. Initium — a block library as the tier above components (reviewed 2026-08-10)

A commercial library of **blocks**: section-level compositions of components (hero, pricing, testimonial,
logo wall, bento) organized by the *page role* they fill, plus a smaller set of pre-built page examples
assembled from them. Reviewed from the product's own navigation rather than a write-up, so the counts
below are the shape of the catalogue, not a claim about its quality.

**The measured shape, because the density is the interesting part.** 23 block types carrying **197
blocks**, plus 10 page-example types carrying 28 examples. The distribution is steeply uneven and that
unevenness is the signal — Feature 23, Hero 22, Header 20, Gallery 12, LP Navbars 10, Contact 9, Footers 9,
Logo 8, Blog 8, then a tail of 3–7 across CTA, Pricing, Testimonials, Stats, Bento, FAQ, Comparison,
Banners, Rich Text, Timeline, Team, Career, Empty and 404. **Where the count is high, the block is not one
thing with options — it is a family of genuinely different layouts.**

### What we take from it

**1. The tier is real, and it is missing from both repos.** Prism3 has tokens, and `14`/`28` plan
components. Nothing occupies the layer above. `preview-spec.json` today is 8 components / 25 variants —
button, input, card, alert, nav-item, badge, typography — all product-UI primitives, and it is a *render
spec* for proving tokens, not a composition library. On the practice side the gap is sharper than it
looks: KB `patterns/` is keyed to **user goals** (`ask-for-data`, `navigate`, `show-data`), which is why
`patterns/app-shell.md` states it does *not* apply to a marketing site. A hero section resolves no user
goal. **Blocks are keyed to page role, not user intent** — a genre neither `components/` nor `patterns/`
covers. Logged as a KB gap.

**2. Capture the axes, not the gallery — this is the whole difference.** 22 hero layouts is not 22 designs;
it is a small set of axes multiplied out. The working hypothesis, to be tested against the field rather
than assumed: media placement (none / trailing / leading / below / background), content alignment (start /
center), container (contained / full-bleed / split), primary-action count, and whether a social-proof slot
is present. Five axes of that shape span ~120 combinations, of which roughly 22 are worth shipping — so
**the valuable artifact is the axis set plus the pruning rationale, not the 22 outputs.** This is the same
move the engine already makes one tier down, where we ship levers rather than swatches, and it is what
separates generating a block library from copying one.

**3. A block library *is* the exemplar library.** `36` §2 row 6 scores us **Behind** on exemplars, citing
daisyUI's *"211 page architectures matched by intent"* and Cloudscape's *"181 addressable few-shot
exemplars at predictable URLs."* Initium is 197. Same order of magnitude, same artifact — and it serves a
human picker and an agent's few-shot retrieval from one source. That reframes blocks from a distant
surface into the concrete answer to a deficiency we scored ourselves on this week.

**4. The inventory is a demand signal for the component backlog.** 23 block types tell you which components
to build first by *actual composition demand* rather than by catalogue convention, and they surface
several nothing has briefed — logo wall, stat, timeline, bento cell. The taxonomy depends on none of the
component work, so capturing it **before** that lane activates is what makes it useful rather than
retrospective.

### Where we would be ahead

**Blocks are the first artifact that actually proves the token system.** A hero exercises surface/content
color pairing, the type scale at display sizes, container width and the spacing scale *simultaneously*.
Every contrast contract we generate today is proven against components in isolation; a block is the first
place a mode can look wrong while every individual contract still passes.

**And one contract the field gets wrong by default.** KB `components/section.md` carries the
don't-over-landmark rule: twelve benefit blocks on a page must be **one** named `<section>` containing a
grid of twelve generic containers, not twelve landmarks. A block library assembled by picking sections
produces exactly the twelve-landmark page, and the failure is invisible to everyone not using AT. Encoding
that in the block definitions — so the page-level structure is a property of the composition rather than
the author's discipline — is the "better than the examples" bar here, and it is already briefed.

### What not to take

**197 as a build target.** The count is a description of a mature commercial catalogue, not a scope. Read
it as evidence that block families are unevenly deep, which is the useful part.

**And the packaging question is unanswered for this tier.** Blocks are mostly *markup*, and `35` commits
to ejectability — the client takes the system and leaves. Whether blocks ship as a package, get generated
on demand, or exist only as agent exemplars is a real fork that `35` §1's boundary does not currently
resolve. Worth settling before an inventory tempts anyone into building all of them.

### What depth we actually have, stated plainly

**Names and counts only — no layouts.** The catalogue was read from the product's navigation: 23 type names
and a count per type. The hero index was then fetched directly and lists its 22 entries as *"Hero Section
1–22"* with **no layout description of any kind** — no media placement, no alignment, no split-vs-full-width.
So the five-axis hypothesis above is exactly that: derived from what hero sections generally vary by, **not
read off this library**. Nothing here is evidence about how these 22 differ, and #693 exists to replace the
hypothesis with field-derived axes rather than to confirm it.

### The distribution model, which answers a question §8 opened

The install command is `npx shadcn@latest add @initium/<section-name>`. **Blocks ship as a shadcn registry —
source copied into the consumer's repo, not a runtime dependency.** That matters more than it looks: the
packaging fork this note raised (package / generate-on-demand / exemplars-only) already has a field answer,
and it is the *eject* model `35` commits to. A block library and an ejectable deliverable are not in tension;
the registry pattern is how the field ships exactly that. Note also what it implies about the tier — these
are React + Tailwind source, so "a block" here is markup, not a configuration of a component API.

### The AEM mapping — closer than the component tier is

**Blocks map onto authorable CMS components far more cleanly than our component tier does**, and Adobe has
converged on the same word. Edge Delivery Services calls its unit of page composition a **block**, ships an
open-source collection (`adobe/aem-block-collection`) containing hero, cards, columns, carousel and FAQ, and
sets a membership rule worth stealing outright: **a block earns its place by being used on more than half of
all projects.** That is a sharper pruning criterion than any we have, and it applies to the axis work too.

Classic AEM Sites is the same shape by a different route — an authorable component is a dialog plus a content
schema plus HTL, and a Teaser or Carousel is a block in everything but name. `27` Idea 2 already phases the
AEM lane (Phase 1: token clientlib + skinned Core Components, no custom components; Phase 2: Web Components
via clientlib once the code library exists). **Blocks are the missing Phase 3**, and naming them as such is
what keeps Phase 2 from being mistaken for the whole story.

**The path is projection, not conversion.** Building blocks as React or Web Components and then porting them
to AEM is a one-way lossy translation that immediately drifts — the same failure `14` §1 rejects at the
component tier. If the block is **defined as data**, then React, Web Components, an AEM component and an EDS
block are four projections of one definition, and the engine's existing posture carries straight up.

**But a definition that captures only layout axes cannot generate the AEM projection.** An authorable
component needs a **content model** — which fields exist, which are required, which the author edits versus
which the system fixes — and neither React nor Web Components force you to state it. EDS makes this most
visible: its blocks are authored as *tables*, so the content model is literally the block's shape. **So each
block needs a content model alongside its layout axes**, and that half is what makes the definition portable
to a CMS at all. Recorded as scope on #693 rather than discovered later.

### The gap the reference library has, which is the one we most need

**There are no commerce blocks in it.** All 23 types are SaaS-marketing shaped — hero, pricing, testimonial,
logo wall, careers. No product grid, no faceted filtering, no product detail page, no cart or checkout. **A
taxonomy built by mirroring this library would miss the surface the practice works on most**, and would miss
it silently, because the omission is invisible from the type list unless you go looking for it.

Product detail pages are bespoke per brand and genuinely vary — but they share a skeleton (media gallery,
title/price/rating, variant selection, quantity and add-to-cart, delivery promise, specification accordions,
reviews, recommendations, and the sticky mobile buy bar), which is exactly the condition that makes a block
family worth deriving rather than hand-building each time. Worth stating that **the engine's own reference
brand is a commerce brand**: New Balance is a shoe PDP, so the corpus we regress against is already the case
this library does not serve. Filed as scope on #693 and as a practice-side note in KB `09` §1.36.

**Status: nothing committed.** Field note plus a filed axis-derivation run (#693); the axis work is next, and
it should prove the method on hero — the deepest family — before committing to 23 of them.
