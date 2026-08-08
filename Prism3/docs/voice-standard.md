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
personality. It relaxes **only** on the marketing site, where the brand is ours.

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

| | **Plugin / dashboard UI** | **Usage guidance** | **Developer docs** | **Marketing** |
|---|---|---|---|---|
| **Reader** | Designer mid-task, theming a brand | Deciding *which* thing to use | Integrating, in a hurry | Evaluating, skeptical |
| **Job** | Let them act without stopping to learn | Prevent the wrong choice | Get them working, then to the contract | Land the thesis in one screen |
| **Register** | Terse. Label + one line | Prose, decision-shaped. Do/don't pairs | Instructional, task-ordered. Code first | Confident, concrete, whole sentences |
| **Person** | System as subject | Second person ("Use this when…") | Second person imperative ("Run…", "Bind…") | First person plural allowed ("we generate") |
| **Length** | ≤1 line per control (~90 chars for a `desc`) | 1–3 sentences per rule | As long as correctness needs | Short; each sentence earns the next |
| **Jargon** | Recognizable terms in **labels**; precise terms allowed in **descriptions** | Introduce, then use — this is where vocabulary is taught | Full precision; token paths, exact types | Translate everything |
| **Numbers** | Inline, always | Inline, with the standard named | Exact, with units | Only when the number *is* the argument |
| **Personality** | **None** | **None** | **None** — conversational ≠ characterful | **Permitted** — still no hype, §2 still applies |
| **Fails when** | Chrome talks more than the work | Rules with no reason attached | Prose where a code block would do | Claims the engine can't back |

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

---

*Applies to: `apps/studio/src` UI strings · `packages/engine/levers.ts` · `packages/engine/ai-metadata.ts`
(generated `meaning` / `when_to_use` / `avoid_when`) · emitted `$description` prose in `out/**`
· `packages/engine/README.md` · reports. Most Prism3 prose is **generated, not typed** — so
applying this standard usually means editing a generator, not a string.*
