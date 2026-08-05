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
