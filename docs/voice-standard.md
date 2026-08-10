# Prism3 voice standard

> **The operative rules for writing any Prism3 copy** — plugin and dashboard UI, lever and
> role descriptions, emitted `$description` prose, `.ai.json` fields, READMEs, reports,
> marketing. Short by design: this is meant to be read before writing, pasted into a prompt,
> or held in a generator's header. Self-contained — you should not need anything else to
> write correctly from it.
>
> **The reasoning behind every rule lives in `29-tone-of-voice.md`.** This file is the
> standard; that one is why. Change this only by changing that.

---

## 1. Voice — four attributes, constant everywhere

**Precise.** Name the mechanism and the number. If a contract exists, cite it (`4.5:1`, `AA`,
WCAG 1.4.11). Vagueness is a bug in a product whose claim is verified output.

**Declarative.** Present tense, system as subject. Constraints are facts about how the system
works, never apologies.

**Translating.** Carry the *why* with the *what* — usually after an em dash. The engine does
colour science; the reader needs a decision.

**Recessive.** Prism3 builds *other people's* brands. In every product surface, the tool's
voice must not compete with the brand on screen. This is the attribute that separates us from
first-party systems (Polaris, Material, Carbon) — do not borrow their confidence about
personality. It binds wherever a brand is on screen, which is two carve-outs and no more: it
relaxes on the **marketing site**, where the brand is ours, and it does not reach the **payload
agents** channel (§4), where the reader is a model and there is no screen.

---

## 2. Never — on any surface

| Banned | Why |
|---|---|
| **"simply", "just", "easy", "obviously"** | If the reader is stuck, this tells them the fault is theirs. Never adds information. (Exception: `just` meaning *exactly/barely* — "just below the floor" — is fine.) |
| **Exclamation marks** | Manufactured enthusiasm. |
| **"please note", "note that"** | Filler. State it or cut it. |
| **Figurative language, idiom, cultural reference** | Reads as noise to a non-native English reader — much of our client base. |
| **Buzzwords, unexplained acronyms** | Costs trust in a product claiming precision. |
| **Apology copy** ("Oops!", "Sorry, something went wrong") | Vague and infantilising. State what failed and the next action. |
| **A guarantee the engine does not verify** | The single most expensive error available to us. If it isn't gated, phrase it as intent, not promise. |

**Scope:** shipped prose — UI strings, emitted artifacts, docs, marketing. **Code comments
are exempt**, matching the existing US-English carve-out in `CLAUDE.md`.

---

## 3. Write like this

| Not | Yes |
|---|---|
| "Choose a good neutral hue." | "Hue the grays lean toward — a small chroma tints them to the brand for cohesion." |
| "Sorry, light mode can't be disabled." | "Light is always generated — it's the base mode, so it can't be turned off." |
| "Peak chroma of the neutral ramp." | "Peak neutral chroma (~0.004–0.02); tapers to near-0 at the ramp ends. 0 = pure gray." |
| "Great contrast!" | "Clears 4.5:1 against the page." |
| "This might not meet contrast." | "3.9:1 against the page — below the 4.5:1 floor for body text." |

**Mechanics that make it sound right:** the system is the subject, in present tense; an em
dash carries the reason; numbers appear inline and unhedged; a semicolon pairs the contrast
("Pinned, never shifted; the engine places it…"); parentheses hold the optional precision so
the main clause stays short.

---

## 4. What changes per channel

Voice never changes. **Register** and **permission** do.

| | **Plugin / dashboard UI** | **Usage guidance** | **Developer docs** | **Marketing** | **Payload agents** |
|---|---|---|---|---|---|
| **Reader** | Designer mid-task, theming a brand | Deciding *which* thing to use | Integrating, in a hurry | Evaluating, skeptical | A model, in an ejected client repo, with no system to query |
| **Job** | Let them act without stopping to learn | Prevent the wrong choice | Get them working, then to the contract | Land the thesis in one screen | Resolve token names correctly from what the payload contains |
| **Register** | Terse. Label + one line | Prose, decision-shaped. Do/don't pairs | Instructional, task-ordered. Code first | Confident, concrete, whole sentences | Normative. RFC 2119 levels (`MUST` / `SHOULD` / `MAY`), one rule per line |
| **Person** | System as subject | Second person ("Use this when…") | Second person imperative ("Run…", "Bind…") | First person plural allowed ("we generate") | Second person imperative, addressed to the agent ("Read the inventory first") |
| **Length** | ≤1 line per control (~90 chars for a `desc`) | 1–3 sentences per rule | As long as correctness needs | Short; each sentence earns the next | One rule, one sentence. No preamble |
| **Jargon** | Recognizable terms in **labels**; precise terms allowed in **descriptions** | Introduce, then use — this is where vocabulary is taught | Full precision; token paths, exact types | Translate everything | Full precision; token paths verbatim — a paraphrased name is a wrong name |
| **Numbers** | Inline, always | Inline, with the standard named | Exact, with units | Only when the number *is* the argument | Exact, and checkable against a file that travels in the payload |
| **Personality** | **None** | **None** | **None** — conversational ≠ characterful | **Permitted** — still no hype, §2 still applies | **None** — and no register borrowed from the client's brand |
| **Fails when** | Chrome talks more than the work | Rules with no reason attached | Prose where a code block would do | Claims the engine can't back | A `MUST` the reader can't check — a label with no gate behind it |

**Why payload agents are a channel and not an exception.** Register changes per channel; voice
does not. The payload reader is a model, its job is name resolution, and its failure mode is a
confident invention of a token that does not exist — three differences that make it a channel on
the same terms as the other four. The recessive attribute does not reach it (§1): a payload rules
file carries no brand voice and is not on screen. Per-artifact exceptions would accrete, one line
per emitted file, until the standard read as a list of places it does not apply. Reasoning:
`29-tone-of-voice.md` §4.1, decided in #675.

**Normative levels, and what a `MUST` costs.** RFC 2119 keywords are permitted in this channel and
in no other. `MUST` means *a check exists* — not *we mean it strongly*. A normative label with no
check behind it manufactures the appearance of rigor (`27-future-ideas.md` Idea 5). An ejected
client's repo runs no Prism3 CI, so the check has to be one the reader itself can run:

> **A `MUST` in emitted payload prose requires a check the reading agent can run against artifacts
> present in the payload. Anything else is a `SHOULD`.**

Primer's Hallucination Guard — *if you cannot verify a token name, annotate it rather than guess* —
is a legitimate `MUST`: the emitted inventory travels in the payload, so the agent can run that
check itself. A rule that needs our CI cannot be a `MUST` in a repo that does not have it.

**This channel is not gated yet, and that is a dated debt, not a permission.** No payload artifact
ships today (#668 is unbuilt), so `lint-voice.ts` has no payload prose to scan and carries no
channel logic. When #668 emits payload prose, **that PR teaches the gate this channel** — a
carve-out the gate cannot see is not enforceable, which is the argument `lint-us-english.ts` makes
about `apps/studio/src` comments. Until then no `MUST` ships anywhere, so the rule above binds the
first payload PR rather than excusing one.

**Declarative ≠ formal.** Describe the system declaratively; instruct the reader
imperatively. "The engine places it on the ramp by its lightness" and "Run `npx tsx
packages/engine/cli.ts <design.md>`" are both correct. Neither licenses stiffness — contractions
are fine, passive voice and ceremony are not.

---

## 5. Tone by situation (product surfaces)

| Situation | How the voice expresses |
|---|---|
| **Applied / success** | State what changed, in the artifact's terms. No congratulation. "Applied — 88 variables written to 9 collections." |
| **Contrast miss** | Name the pair, the measured ratio, the floor it missed. Never block, never scold — an override is a legitimate expert action. |
| **Derived / not editable** | State the derivation, so it reads as *explained*, not broken. |
| **Empty** | Say what will appear here and what produces it. Never "Nothing to see." |
| **Destructive** | Name the consequence and its scope. Match the verb to the outcome ("Remove palette", not "Confirm"). |
| **Error (ours)** | What failed, then the next action. No apology, no blaming the user. |

---

## 6. Before you ship a string

1. Does it name the **mechanism** or just a label?
2. Is every **number** it implies actually stated?
3. Would this compete with the **brand on screen**? (product surfaces only)
4. Does it contain anything from **§2**?
5. Does it claim something the engine **doesn't verify**?
6. If it says **`MUST`** — is there a check the reader can run, on a file it already has? If not,
   it's a `SHOULD`. (Payload channel only; §4.)

---

*Applies to: `apps/studio/src` UI strings · `packages/engine/levers.ts` · `packages/engine/ai-metadata.ts`
(generated `meaning` / `when_to_use` / `avoid_when`) · emitted `$description` prose in `out/**`
· `packages/engine/README.md` · reports. Most Prism3 prose is **generated, not typed** — so
applying this standard usually means editing a generator, not a string.*
