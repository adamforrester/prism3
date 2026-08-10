# 29 — Tone of voice: the voice we already have, and how it adapts per channel

> Prism3 writes a lot of prose it never planned as prose: lever descriptions, role
> `desc` strings, emitted `$description` fields, `.ai.json` `when_to_use` / `avoid_when`,
> reports, READMEs. Some of it ships to a designer's screen, some to an agent's context
> window, some to a developer's terminal. None of it has had a stated voice — and yet it
> is remarkably consistent, because it was all written by people holding the same
> instinct. This doc **codifies the instinct** rather than inventing a voice, then
> answers the part that isn't yet decided: **how the voice adapts across channels.**
>
> Scope note, same discipline as `28`: this did **not** re-derive the *shape* of a
> voice-and-tone artefact. KB `04-documentation` §"The voice-and-tone matrix as a system
> artefact" already commits the practice to that shape — voice across the top, tone
> contexts down the side, body cells specifying how voice expresses in each context —
> and names the field references. The open question was channel, and channel is what
> this adds.

---

## 1. What the survey found

Five references, four of them named by KB 04 as the canonical set.

**The voice/tone distinction is settled and worth stating once.** Mailchimp:
*"You have the same voice all the time, but your tone changes."* Voice is the constant;
tone is the adjustment. Everything below inherits that split — the four attributes in §3
never change, and §4 changes only register and permission.

**Polaris — the design-system-native reference — argues against an elaborate voice
apparatus.** Its guidance is, verbatim, *"Don't worry too much about voice and tone, just
focus on sounding human."* Plain language, everyday vocabulary, contractions, read it
aloud, roughly a 7th-grade reading level. **No channel differentiation at all.** This is a
useful corrective: the most-used design-system content guide in the field deliberately
does less than the practice's matrix implies. Restraint is a defensible position, not a
gap.

**Mailchimp differentiates by content type, and it is the only one that does.** Its guide
carries distinct sections for educational content, legal, email newsletters, social,
accessibility, translation, and web elements. Its voice attributes are *plainspoken,
genuine, translators, dry humor* — and **"translators"** is the one worth stealing
outright: demystifying B2B terminology is exactly what a token engine's UI does when it
turns OKLCH chroma into a decision a designer can make.

**Microsoft states the same split, independently** — *"our voice is constant regardless of
who we're talking to… we adapt our tone — from serious to empathetic to lighthearted — to
fit the context and the customer's state of mind."* Three principles: *warm and relaxed,
crisp and clear, ready to lend a hand*, plus style tips worth holding — get to the point
fast, prune every excess word, write for scanning first and reading second.

**Google's developer-documentation style guide is the authority for channel C**, and it is
stricter than instinct suggests. It prohibits, explicitly: **exclamation marks, buzzwords,
figurative language, culturally specific references, "please note", and "simply" / "it's
easy."** The stated reason is a global, non-native-English readership — which applies
directly here, since Prism3 targets enterprise clients across markets. Its framing of the
reader is the useful part: *"someone who's looking for it and may be in a hurry."* And it
argues for a **more conversational** register than formality instinct suggests — *"a
knowledgeable friend who understands what the developer wants to do."*

**The channel finding, corrected.** The first pass concluded "nobody differentiates by
channel." That was wrong, and the second pass shows why: **the field differentiates by
shipping separate guides per channel, not by publishing one matrix.** Google ships a guide
*specifically for developer documentation*, distinct from Material's product-content
guidance. Mailchimp splits by content type inside one guide. Microsoft ships one voice
spanning surfaces with tone adapting underneath. So §4 is not an invention — it is a
**consolidation of a practice the field already runs**, into a single table, for a product
whose four channels are unusually far apart.

---

## 2. The voice already in the repo

Pulled from live strings, not composed for this doc:

> *"The exact brand anchor. Pinned, never shifted; the engine places it on the ramp by its lightness."*
> *"The ink on the fill — auto-picked to clear contrast on the button surface."*
> *"Full guarantees AA text (4.5:1); Reduced dims to a floor you set, no lower than 3:1."*
> *"Light is always generated — it's the base mode, so it can't be turned off."*
> *"Drives component sizes (control height + paired padding). The name stays stable; the metrics shift."*
> *"Hue the grays lean toward (a small chroma tints them to the brand for cohesion)."*

The shared mechanics, which are the actual house style:

- **The system is the subject, in present tense.** "The engine places it." "Drives component
  sizes." Not "you can set" — the copy describes behaviour, not permission.
- **Em-dash appositive carries the *why*.** "The ink on the fill — auto-picked to clear
  contrast." The what, then the reason, in one breath.
- **Numbers appear inline and unhedged.** `4.5:1`, `~0.004–0.02`, `no lower than 3:1`.
  Never "good contrast."
- **Constraints are stated as facts, never apologies.** "It's the base mode, so it can't be
  turned off." No "unfortunately," no "sorry."
- **The semicolon does contrast work.** "Pinned, never shifted; the engine places it…"
  "The name stays stable; the metrics shift."
- **Parentheses hold the optional precision** so the main clause stays short.
- **No exclamation marks, no second-person cheerleading, no personality for its own sake.**

That is already a voice. It needs naming and defending, not replacing.

---

## 2b. Standard vs differentiated — the alignment question

The honest answer: **follow the standard for most of it.** There is no value in sounding
different for its own sake, and every source converges on the same fundamentals. Prism3
adopts them wholesale:

> plain language · everyday words · clarity over personality · voice constant, tone varies
> by context · write for scanning first · sentence case · contractions are fine · introduce
> a term before using it · the §3.5 ban list · don't be cute

That is ~80% of the guidance, and none of it is ours to reinvent.

**Four things are genuinely different — and all four are structural, not stylistic.** Each
one exists because of a property of this product that no surveyed system has:

| # | Differentiator | Why no one else has it |
|---|---|---|
| 1 | **Recessive voice** (§3.4) | Polaris, Material, Carbon and Spectrum are **first-party** systems: the design system's voice *is* the company's voice, and the product on screen *is* their brand. Prism3 is a tool for building **other people's** systems — its UI sits beside a brand a designer is actively theming. A characterful tool voice competes with the client's work. This is the one attribute that would be wrong to borrow from any of them. |
| 2 | **Most user-facing prose is generated, not written** | `ai-metadata.ts` synthesizes `when_to_use` / `avoid_when` from a deterministic role→intent model; `levers.ts` prose is inlined into the web bundle. No surveyed guide contemplates this, because none of them generate their microcopy. It relocates voice from a *writing culture* to *generator code* — and makes a mechanical gate more valuable than editorial review (§7). |
| 3 | **Agents are a reader** | `out/*.ai.json` is consumed by LLMs, not humans. Every surveyed guide assumes a human reader. Whether that is a fifth channel with its own register is genuinely open (§8.4). |
| 4 | **Claims are verifiable, so overclaiming is expensive** | This product's differentiator is that output is *gated* — contrast contracts, alias resolution, byte-reproduction. "Never claim a guarantee the engine doesn't verify" (§4) is a voice rule with teeth here in a way it isn't for a system that makes no checkable claims about its own output. |

**The practical read:** copy the standard, and spend the differentiation budget entirely on
#1 and #2 — being recessive in-product, and enforcing voice in the generators. #3 and #4
are guardrails, not a style.

---

## 3. Voice — four attributes (constant across every channel)

### 3.1 Precise
Name the mechanism and the number. A lever description says what the engine *does* with the
value, not that the value is "important." If a contract exists, cite it (`4.5:1`, `AA`,
`WCAG 1.4.11`). Vagueness in this product is a bug: the whole thesis is that the output is
verified, and copy that hedges undercuts the artifact.

**Not:** "Choose a good neutral hue." **Yes:** "Hue the grays lean toward — a small chroma
tints them to the brand for cohesion."

### 3.2 Declarative
Present tense, system as subject, no hedging. State what happens. Constraints are facts
about how the system works, not failures to apologise for.

**Not:** "Sorry, light mode can't be disabled." **Yes:** "Light is always generated — it's
the base mode, so it can't be turned off."

### 3.3 Translating
Every piece of user-facing copy carries the *why* alongside the *what*. This is the
attribute that earns the product its keep: the engine is doing colour science, and the
designer needs a decision, not a lecture. Mailchimp's "translators," applied.

**Not:** "Peak chroma of the neutral ramp." **Yes:** "Peak neutral chroma (~0.004–0.02);
tapers to near-0 at the ramp ends. 0 = pure gray."

### 3.4 Recessive — *the constraint specific to this product*
**Prism3 is a tool for building other people's brands.** Whatever is on screen in the
plugin sits beside the brand a designer is actively theming. A characterful tool voice
competes with the work. This is why Prism3 does **not** take Mailchimp's fourth attribute
(dry humor) into the product surfaces, and why Polaris's restraint is the right model
in-product: the voice should be invisible enough that the brand being built is the loudest
thing in the room.

This attribute is what makes §4 necessary. It binds hard in the plugin, and it **relaxes in
marketing** — because on the marketing site, the brand on screen *is* ours. It does not reach
the **payload agents** channel at all, and for a different reason than marketing: there is no
screen and no human reader there. See §4.1.

### 3.5 Declarative ≠ formal — the reconciliation
Google argues developer docs should read as *"a knowledgeable friend,"* conversational
rather than formal. That is not in tension with §3.2, because the two apply to different
sentences: **describe the system declaratively, instruct the reader imperatively.**
"The engine places it on the ramp by its lightness" (describing) and "Run `npx tsx
packages/engine/cli.ts <design.md>`" (instructing) are both correct. What neither licenses is
stiffness — passive voice, nominalisation, or ceremony. Contractions are fine.

### What we are not
Not chatty. Not apologetic. Not cute. Not a personality. Not vague-friendly ("Oops!
Something went wrong"). Not academic — precise is not the same as dense, and a paper about
OKLCH is not the goal.

**Banned outright, on every surface** (adopted from Google's developer-documentation guide;
the reason is a global, non-native-English readership, which is our client base too):

| Never | Why |
|---|---|
| **"simply", "just", "easy", "obviously"** | If the reader is stuck, this tells them the fault is theirs. It never adds information. |
| **Exclamation marks** | Manufactured enthusiasm. The one exception is nowhere. |
| **"please note", "note that"** | Filler. If it matters, state it; if it doesn't, cut it. |
| **Figurative language, idiom, cultural reference** | Translates badly and reads as noise to a non-native reader. |
| **Buzzwords / unexplained acronyms** | Costs trust in a product whose whole claim is precision. |

These are mechanically checkable, which is what makes them worth writing down (§7).

---

## 4. The channel matrix — what changes, and what never does

Voice (§3) is constant. Two things vary: **register** (density, length, person) and
**permission** (how much personality is allowed). Recessive-ness is the dial.

| | **A · Plugin & dashboard UI** | **B · Usage guidance** | **C · Developer docs** | **D · Marketing site** | **E · Payload agents** |
|---|---|---|---|---|---|
| **Reader & state** | Designer mid-task, theming a brand. Attention is on their work, not our chrome. | Designer/dev deciding *which* thing to use and whether they're using it right. | Dev integrating, terminal open, wants it to work. | Evaluator deciding whether this is worth their time. Skeptical. | A model working in an ejected client repo. No engine to call, no CI, no system to query. |
| **Job of the copy** | Let them act without stopping to learn. | Prevent the wrong choice; make the right one obvious. | Get them to a working state, then to the contract. | Make the thesis land in one screen. | Resolve token names correctly from what the payload contains, and refuse to guess. |
| **Register** | Terse. Fragment-friendly. Label + one line. | Prose, but decision-shaped. Do/don't pairs. | Instructional, task-ordered. Code first, prose after. | Confident, concrete, whole sentences. | Normative. RFC 2119 levels (`MUST` / `SHOULD` / `MAY`), one rule per line, no preamble. |
| **Person** | System as subject ("Drives component sizes"). Second person only for direct action. | Second person permitted ("Use this when…", "Don't…"). | Second person, imperative ("Run…", "Bind…"). | First person plural permitted ("we generate", "our engine"). | Second person imperative, addressed to the agent ("Read the inventory before writing a name"). |
| **Length** | ≤1 line per control; ~90 chars for a `desc`. | 1–3 sentences per rule. | As long as correctness needs. | Short. Every sentence earns the next. | One rule, one sentence. |
| **Jargon** | Recognizable names only in **labels**; precise terms allowed in **descriptions** (see §6). | Introduce the term, then use it. This is where vocabulary gets taught. | Full precision assumed. Token paths, API names, exact types. | Translate everything. A term the reader doesn't know is a lost reader. | Full precision, verbatim. A paraphrased token path is a wrong one — there is nothing here to teach vocabulary to. |
| **Numbers** | Inline, always (`4.5:1`). | Inline, with the standard named. | Exact, with units and types. | Only when the number *is* the argument (e.g. "432 contrast contracts, every build"). | Exact, and checkable against a file that travels in the payload. |
| **Personality** | **None.** Recessive binds hardest here. | None. | **None** — corrected. The first draft allowed "dry asides where they aid recall"; Google's guide bans exclamation marks and figurative language outright for non-native readers, and that reasoning holds for us. Conversational ≠ characterful. | **Permitted** — this is our brand, not the client's. Still no hype, and the §3.5 bans still apply. | **None**, and recessive does not apply either — §3.4 has nothing to be recessive against here (§4.1). |
| **Failure mode to avoid** | Chrome that talks more than the work. | Rules with no reason attached. | Prose where a code block would do. | Claims the engine can't back. | A `MUST` the reader cannot check — a normative label with no gate behind it. |

### The one rule that spans all five
**Never claim a guarantee the engine doesn't verify.** Prism3's entire differentiator is
that its output is gated — contrast contracts, alias resolution, byte-reproduction. Copy
that overstates in marketing, or implies a contract in the UI that no test enforces, spends
the one asset the product has. If a claim isn't gated, phrase it as intent, not guarantee.

Column E is that rule with the volume turned up, because normative keywords make the claim
explicit. §4.1 is what follows from taking it seriously.

### 4.1 Column E — payload agents (added 2026-08-10, #675)

#668 proposes emitting a **rules** artifact into the eject payload, modeled on Primer's
`DESIGN_TOKENS_GUIDE.md`: RFC 2119 keywords plus a "Hallucination Guard" telling the reading
agent to annotate an uncertain token name rather than invent one. Emitted prose is gated —
`lint-voice.ts` scope imports from `regen.ts`, so a new artifact is covered the day it exists —
and normative shouting reads as close to the opposite of §3.4. #675 was filed to settle that
collision before the emitter was written rather than at gate time.

**The prior question had to resolve first: does this standard reach prose whose reader is a
model?** Partly. §3's four attributes are about how Prism3 says things, and three of them —
precise, declarative, translating — apply to a rules file as well as they apply to a lever
description. The fourth does not. §3.4 exists so the tool's voice does not compete with **the
brand on screen**, and a payload rules file has no brand voice in it and is not on screen: it is
instructions about token names, read by a model. The attribute was written before that surface
existed, so extending it there is over-application rather than consistency. The standard's own
pre-ship check already scopes it this way — "would this compete with the brand on screen?
(product surfaces only)".

**Why a channel and not a per-artifact exception.** Three options were on the table: carve out the
channel, drop RFC 2119 and write declarative prose, or permit the keywords in the rules file
alone. The third is narrowest and the gate can express it, which is what makes it tempting and
what makes it wrong over time. §4 exists precisely to say that register varies while voice does
not, and payload agents vary on every axis §4 tracks: a different reader (a model), a different
job (name resolution with nothing to query), a different failure mode (a confident name that does
not exist). That is a channel by the same test that made C a channel. A per-artifact exception,
by contrast, accretes — the second payload artifact gets its own line, then the third, until the
standard is a list of places it does not apply. A channel row stays one row.

**What the decision costs, and this is the part that binds.** `27-future-ideas.md` Idea 5 holds
this repo's position on 2119 keywords, and it rules that **a normative label with no gate behind
it is worse than no label** — it manufactures the appearance of rigor. So `MUST` has to mean *a
gate exists*, not *we mean it strongly*, and adopting levels creates an obligation: every `MUST`
either gets a gate or becomes a `SHOULD`. The payload is the hardest case for that rule, and the
issue did not carry it when filed. **An ejected client's repo runs no Prism3 CI.** A `MUST` there
is the canonical instance of the thing Idea 5 rules against, unless the check travels with it.

So the rule recorded in `voice-standard.md` §4 is narrower than "2119 is allowed here":

> A `MUST` in emitted payload prose requires a check the **reading agent** can run against
> artifacts **present in the payload**. Anything else is a `SHOULD`.

Primer's Hallucination Guard passes that test and is the worked example — *if you cannot verify a
token name, annotate it rather than guess* is mechanizable by the reader, because the emitted
inventory travels in the payload and the agent can check a name against it without us. A rule that
needs `regen --check` cannot be a `MUST` in a repo that does not have `regen`. The stronger form,
when a rule is mechanizable, is to emit the checker beside the rules rather than only state the
rule; the honest fallback is `SHOULD`.

**The obligation is dated, not waived.** No payload artifact ships today, so `lint-voice.ts` has
no payload prose to scan and no channel logic in it — writing that logic now would be speculative
code against an artifact whose shape #668 has not fixed. What is recorded instead is when it comes
due: **the PR that emits payload prose teaches the gate this channel**, and mutation-tests both
directions — banned §2 prose in a payload artifact must still fail by name, and the same prose in a
non-payload artifact must still fail, because a carve-out that silently widens is a deleted gate
(`34-gate-independence.md`). A carve-out the gate cannot see is not enforceable, which is the
argument `lint-us-english.ts` makes about `apps/studio/src` comments.

**One thing this does not decide.** Idea 5's other observation is that `.ai.json` already ships
MUST-shaped prose with no level — `avoid_when: "Do not use for surfaces placed on the page…"`. The
payload artifacts inherit that problem rather than introduce it, and §8's open question 4 (*is
`.ai.json` a channel?*) is still open. #675 settled the register for prose written *as* rules for
an agent; it did not retroactively relabel prose already shipping.

---

## 5. Tone by context (per KB 04's matrix, at the plugin surface)

The channel sets register; the situation sets tone. Only the contexts this product
actually has:

| Context | How the voice expresses |
|---|---|
| **Success / applied** | State what changed, in the artifact's terms. No congratulation. "Applied — 88 variables written to 9 collections." |
| **Contrast miss (the signature warning)** | Name the pair, the measured ratio, and the floor it missed. Never block, never scold — the override is a legitimate expert action. "3.9:1 against the page — below the 4.5:1 floor for body text." |
| **Derived / can't be edited** | State the derivation, so "disabled" reads as *explained*, not broken. The `"Light is always generated"` string is the model. |
| **Empty** | Say what will appear here and what produces it. Never "Nothing to see." |
| **Destructive** | Name the consequence and its scope. Match the verb to the outcome ("Remove palette", not "Confirm"). |
| **Error (ours)** | State what failed and the next action. No apology, no blame-shifting to the user. |

---

## 6. A live inconsistency worth resolving

`26-cross-page-ui-conventions` §Controls & labels says: *"Human-readable copy. No internal
jargon in the UI (`ink`→`text`, `action`→'default interactive color')."* But the shipped
copy does both — `label: 'On-fill text · inverse'` sits directly above
`desc: 'The ink on the inverse (light) fill…'`.

Two readings, and they need adjudicating rather than leaving:

1. **Deliberate layering** — labels use the word a designer recognizes; descriptions use the
   system's precise term, and the description is where the vocabulary is taught. This is
   defensible and matches §4's jargon row.
2. **Drift** — the rule was written for labels and descriptions quietly diverged.

Reading 1 is the better system, so the fix is likely to **sharpen doc 26's rule to scope it
to labels explicitly**, not to purge "ink" from descriptions. Flagged, not decided.

---

## 7. Enforcement, or this decays

KB 04 is blunt: *"Without enforcement, the matrix decays into a docs page nobody reads."*
It names three disciplines. Mapped to what this repo already has:

- **Mechanical gate — precedent exists.** `lint-us-english.ts` already gates every shipped
  surface for spelling and runs in CI after the web build. Some of §3 is mechanically
  checkable in the same shape: no exclamation marks in emitted `$description`s, no
  "Oops"/"Sorry", a length ceiling on lever `desc` strings. Worth scoping as an issue; the
  scanner pattern is proven and its scope already imports from `regen.ts`.
- **Matrix-as-system-prompt** — KB 04 calls this the most aggressive discipline. Prism3 has
  a live use for it: `ai-metadata.ts` *generates* `when_to_use` / `avoid_when` prose from a
  deterministic role→intent model. That generator is voice-bearing code, so §3 belongs in
  its header as the standard it writes to.
- **Review** — the cheapest: the four attributes are a four-question check on any
  copy-bearing PR.

The generated-prose point is the sharpest one. Most of this product's user-facing words are
**emitted by a generator, not typed by a person** — so voice here is enforced by editing
`ai-metadata.ts` and `levers.ts`, not by asking writers to remember. That is a genuinely
unusual position and it makes mechanical enforcement more valuable than review.

---

## 8. Open questions

1. **Does the marketing channel exist yet?** §4 column D is authored ahead of need. If
   there's no marketing site planned near-term, that column is speculative and should be
   marked as such rather than treated as settled.
2. **Does the plugin need a distinct voice from the web dashboard?** Treated as one channel
   here because they share `apps/studio/src` (docs/09). If the plugin ever addresses a different
   reader — e.g. a Dev Mode surface (docs/27 Idea 1) reads to a *developer*, not a designer
   — that's a column of its own, not a variation of A.
3. **Doc 26 §Controls & labels** — resolve §6.
4. **Is `.ai.json` a channel?** Its reader is an agent, not a human. Current prose reads as
   channel B, which is probably right, but it has never been decided deliberately and the
   KB's AI-surface content guidance (04) may argue otherwise. **Still open after #675**, and
   sharper for it: §4.1 admitted column E on the argument that a model-reading surface is a
   distinct channel, and `.ai.json` is a model-reading surface that also travels in the payload.
   The two answers differ in what the prose *is* — E is rules written for an agent, `.ai.json` is
   guidance about a token that an agent happens to read — but that line is worth testing rather
   than assuming. Deciding it also decides whether `avoid_when`'s MUST-shaped prose takes a level.

---

*Sources surveyed (2026-07-31 → 2026-08-04): Mailchimp Content Style Guide — the
voice/tone distinction, four voice attributes, and content-type sections; Shopify Polaris
*Voice and tone* — the de-emphasis position and plain-language standard, no channel split;
Microsoft Writing Style Guide *brand voice* — voice-constant/tone-variable stated
independently, three principles, and the scanning-first style tips; Google developer
documentation style guide *tone* — the authority for channel C, source of the §3.5 ban
list and the non-native-reader rationale. **Still unretrieved:** Carbon (MDX path 404s;
rendered page truncates) and Atlassian (JS-rendered) — so the read of the design-system
field in §1 rests on Polaris alone, and a second DS-native opinion would strengthen it.
In-repo
evidence: `packages/engine/levers.ts`, `apps/studio/src/main.ts` role descriptions,
`packages/engine/ai-metadata.ts` (the generated-prose surface), `26-cross-page-ui-conventions`
§Controls & labels, `CLAUDE.md` US-English gate. KB: `04-documentation` §"The
voice-and-tone matrix as a system artefact" (the shape this inherits), `00-principles`
("descriptions = highest-ROI; avoid_when > when_to_use").*
