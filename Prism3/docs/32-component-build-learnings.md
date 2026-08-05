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

## 2026-08-05 — from building the whole variant SET (#487 steps 4–5)

### `[SKILL]` A per-node read-back cannot see a per-SET bug — check the properties only the whole has

The paste payload reads every binding back after setting it, which caught real bugs in #503 and stayed
silent through all three of this step's, because all three are properties of the *set* rather than of any
node in it. Every variant was individually perfect and the set was unusable.

The three, as a checklist for the next component set:

1. **Axes** — read back `componentPropertyDefinitions`. Figma silently drops a member name it cannot
   parse, so a set can come back with fewer properties than its names declared.
2. **Positions** — two variants at one coordinate. `combineAsVariants` *preserves* member positions, so
   appending roots without setting one stacks the whole set at the origin: 21 deep, one button tall.
3. **Footprint** — variants that differ only in a non-geometric axis must measure the same box. An
   `outline` variant 2px wider than its `filled` sibling breaks any row of buttons, and both variants are
   individually correct.

The shape of the lesson generalizes past Figma: **a whole has invariants its parts cannot violate
individually.** Cardinality, uniqueness, alignment and coordinate collisions all live at the container,
so a verification loop built entirely out of per-item checks is structurally blind to them.

### `[KB]` A bound dimension conceals disagreement about that dimension

The `strokesIncludedInLayout` bug showed up on the **hug** axis only. Height was bound to
`size/md/height`, so the fixed axis absorbed the identical 2px in total silence — a component with two
fixed axes would have hidden it completely.

Worth stating plainly because it inverts the usual intuition: binding a dimension is normally the *safe*
move. It also makes that dimension **stop reporting**. When hunting a geometry discrepancy, measure the
axis that is free to move; the bound one will agree with you no matter what.

### `[GATE]` A prefix in a variant member name becomes part of the first axis key

`combineAsVariants` derives axes from member names and does **not** strip a slash prefix first. Members
named `button/intent=primary, …` produce a set whose first property is literally `button/intent`, which
no amount of correct token binding fixes and which a designer sees in the properties panel.

So: the component's identity belongs on the **set**; members carry **only** their coordinate. Two things
about how this was found are the transferable part. It was caught by the axis read-back written in the
*previous* PR, on that gate's first live run — a read-back's value shows up in the step *after* the one
that motivated it. And it was caught at **three** variants, not twenty-one, because the unknown API
behavior got a cheap probe before the expensive paste. Probe the API you have not used at the smallest
size that can exhibit the behavior.

### `[GATE]` A substring assertion against a self-documenting generated string tests the documentation

Recorded once below, hit twice more in the same session, which is why it is restated as a rule rather
than an anecdote. `planToPluginJs` output is the one string in the engine that is both a **deliverable**
and **heavily commented**, so any assertion that greps it for the words describing a behavior tests the
words.

It fails in both directions:

- **False pass** — `ok(js.includes('strokeWeight'))` and `/footprint -> /` both survived deleting the
  code they described. The report string is still in the payload when the condition around it is
  `if(false)`; the gate proved a message *exists*, not that it can ever be emitted.
- **False fail** — `(js.match(/combineAsVariants/g)||[]).length === 1` failed on a *correct* payload,
  because the payload comments on the function by name and the count was 2.

Anchor on syntax: `/node\.strokeWeight=/`, `/figma\.combineAsVariants\(/`,
`/if\(first\.box!==box\)footprint\.push\(/`. And note the detection asymmetry — **only mutation testing
finds the false-pass form.** Review cannot: the assertion looks correct and *is* correct about a string
containing that word.

### `[SKILL]` A probe whose measurement is insensitive to the treatment looks exactly like a pass

The first footprint probe reported "does not reproduce". It was wrong: with no children,
`primaryAxisSizingMode: 'AUTO'` falls back to a default 100px width instead of hugging, so the frame
could not have changed width whatever the stroke did. A clean, confident, meaningless result.

The fix is a habit, not a rule: **run the treatment and the known-good fix in the same probe.** The
redone version measured filled 56, outline-unfixed 58, outline-fixed 56 — three arms, one call, and
"reproduces" and "the fix works" both proven by the same numbers. If a probe cannot show the bug
appearing *and* disappearing, it has not established either.

Third instance of this family (see #500's control that varied in two variables, and the paste verified
by name). They share one root: **before trusting a negative result, confirm the measurement could have
come out the other way.**
## 2026-08-05 — from closing the #503 review's two should-fixes

### `[SKILL]` Execute the generated payload against a stub host — do not grep it

The strongest gate on a code-generating engine runs the code. Five assertions on the paste payload were
substring probes, and five could pass on a payload with the bug they named: `includes('createInstance()')`
survived inverting the ternary, because the call remained as dead code on the unreachable branch.

A stub host is cheap and pays for itself immediately. What it needs is small — name→object resolvers, nodes
that record bindings the way the real API does, and any setter whose SHAPE is the thing under test (Figma's
`setBoundVariableForPaint` *returns* a paint rather than mutating; a stub that mutates would let the exact
bug it guards through). Then run the emitted string via `AsyncFunction` so it sees one binding and nothing
from the test's scope.

The assertions that become possible are the ones text probes cannot express, and the most valuable is the
negative: **with everything resolving, the failure channel is EMPTY.** A read-back that cries wolf is as
broken as one that stays silent, and no substring check can tell them apart.

### `[GATE]` A read-back must iterate what the code DID, not what the plan declared

The bind loop skips a name that does not resolve; the read-back then iterated the declared props, so every
skipped prop collected a second, false miss saying the write was *"resolved, set, not retained"*. 13 real
causes, 12 phantoms shadowing them. The two sets — declared and written — are identical only on the happy
path, which is the one path where a read-back has nothing to say.

### `[SKILL]` Mutation-test the harness, not just the code it guards

The first mutation run against the new stub harness found a defect **in the harness**: a degrade that threw
inside the payload took the whole suite down and reported *zero* failures rather than one
(`review-pr.md:133`'s fail-hard trap). A harness that dies cannot tell you which assertion it would have
failed, and the failure looks like a crash rather than a finding. Catch inside the harness, turn the throw
into an observation, and let the gates judge it.

### `[KB]` Writing a lesson down does not find its existing instances

The self-documenting-string trap was recorded in `00-progress.md`, then hit twice more in the same session —
and both live instances were two files away from the entry describing them. Documenting a pattern makes the
*next* one recognizable; it does nothing about the ones already shipped. When a trap is worth an entry, it is
worth a grep for the pattern across the surface it applies to, in the same sitting.

---

## 2026-08-05 — from building the SKILLS GATE (#492)

### `[GATE]` A self-check written against a REIMPLEMENTATION validates the copy, not the shipping code

The gate shipped with a self-check that called a private `fakeScan` — a parallel copy of the scan
loop, inlined 40 lines below the original. The shared regexes and sets were real, so it verified
*those* were intact; it could not verify that anything still **called** them. A review proved the
consequence: neuter the real `findings.push`, leave `fakeScan` alone, and the gate reports clean —
with the exact `action.*` regression this gate was written to catch injected into a real skill file.

Fixed by extracting `scanText(text, rel, findings)` and having both `scanSkill` and the self-check
drive it. The mutation now fails the gate.

**Why the original mutation test missed it, which is the sharper half:** the mutation targeted
`DOTTED` — a constant *both* paths share. Both broke together, the gate went red, and that read as
proof the self-check worked. **A mutation on a shared dependency cannot distinguish two code paths
that depend on it.** Mutate the call site, not the constant.

It is #281 one layer along: there, no gate read the committed artifact; here, the self-check did not
read the live code path.

### `[GATE]` Adding a surface to a gate's scope is two edits, and the second is the one that rots

`Prism3/skills/**` was added to the US-English gate's scan but not to its `REQUIRED_SURFACES` list —
so deleting the walk dropped two files and the gate still printed a confident `clean`, exit 0. That
is precisely the false-pass class `REQUIRED_SURFACES` exists to prevent, and CLAUDE.md already writes
the rule: coverage follows `regen.ts` for everything *except* surfaces named by hand, and each of
those needs its own line. The comment adding skills even said "named by hand, because skills are not
a `regen` artifact" — and then didn't add the line.

**Whenever scope is widened by hand, the widening and its guard are one change.** Also worth keeping
the run's summary string honest: it still named four surfaces after a fifth was added, so a reader
could not tell from the log whether skills were scanned.


### `[GATE]` The gate's first run found worse than the defect it was written for

It was built for a known drift: `prism3-theme` teaching an adjective→lever mapping #471 replaced. It
found that, and first found something larger — **`prism3-consume` was teaching the pre-rename
`action.*` family.** `docs/20 §11` renamed `action.*` to `interactive.*`; the skill that tells an
agent which tokens to reference still named `color.action.default`, `action.disabled`,
`text.on-action`, `text.disabled`, `text.on-disabled`. An agent following it emits references that
resolve to nothing. **Six distinct dead paths** across seven occurrences, in the one file whose
entire job is naming tokens correctly. (The PR body said "seven dead paths" — that was the finding
count, not the path count, and a review caught it. On a change whose thesis is *shipped prose must
make true claims*, its own count is a claim worth getting right.)

**A rename is a two-tier event.** The token tier renamed cleanly and every gate stayed green, because
no gate read the prose that teaches the names.

### `[SKILL]` The obvious check would not have caught the defect it was written for

"Every name a skill quotes must resolve" is the natural design, and `radiusScale` resolves fine —
what rotted was the prose around it and the total absence of `personality`. Measured *before*
building, which is the only reason the gate has a second, different scan: a **coverage** check, where
a skill declaring `documents: brandInput` must mention every top-level input property or name it in
`omits:`. That is the check that fires on the real class, and reference-resolution never would have.

Generalizes: **a gate built from the defect you already know will catch that defect and nothing
adjacent.** Ask what shape the defect *is* — dead reference, or missing coverage — before choosing a
scan, because they are different mechanisms.

### `[SKILL]` A skill teaching "don't guess this name" must quote a name that doesn't resolve

Unanticipated, and found on the first real run: `prism3-consume` says *"it's
`color.foreground.success-subtle` …, not `color.feedback.success.surface`"*. Both were flagged. The
counter-example is the most useful sentence in the file, and a naive gate punishes it. Exempted by
detecting `not` / `never` / `rather than` / `instead of` immediately before the backtick — with a
self-check asserting the exemption does **not** become a blanket amnesty.

### `[GATE]` Reading a gate's output through `grep` turned a crash into a pass

`matchAll` throws on a non-global regex. It did — and the run was piped through `grep -c`, which
printed `0` and read as *clean*. The gate had crashed before scanning anything.

Third instance of this family in one session, after `grep -i fail | tail` swallowing an exit code and
two unguarded test helpers. **The pattern is always the same: a filter between you and a gate's real
result.** Run a gate bare before believing it; `grep` is for reading output you have already seen
exit 0.

### `[SKILL]` A mutation that does not apply is indistinguishable from one that is not caught

Mutation 1 replaced `` `color.text.primary` `` — a string the file does not contain. Zero findings,
which reads exactly like "the gate misses dead paths". It was a no-op. Confirm the edit landed
(`grep -c` the literal *before* mutating) or a mutation run quietly proves nothing, which is the
failure mode mutation testing exists to prevent.

---

## 2026-08-05 — from implementing `INSTANCE_SWAP` (#487 step 3)

### `[SKILL]` Verify a paste by node ID, never by component name — the file holds your old attempts

The read-back after the first successful paste reported the slot as a `FRAME`, i.e. the exact bug the
paste had just fixed. It was the *previous* paste: `findOne(n => n.name === 'button/size=medium,
leading')` matched #482's component, still sitting in the file with its empty-frame slot. Two
components, one name, and `findOne` returns document order.

The near-miss is what makes this a skill rather than a note. The next move would have been to probe
`createComponentFromNode` for an instance-to-frame conversion that does not exist — a plausible
hypothesis, a real API, and half an hour spent proving something already working was broken. **A
generated artifact whose name is a function of its inputs will collide with every previous run**, and
component names here are exactly that (`button/size=medium, leading`). So: capture the id the paste
returns and read back by `getNodeByIdAsync`, or delete prior artifacts first. Names are for humans.

Related, same root: a paste is only verified when the *binding* is shown live, not present. Present
means `boundVariables.width` has an entry; live means moving the variable moves the node. Mutating
`icon/size/md` to 40, watching the slot become 40×40, and restoring it is three extra lines and it is
the difference between "the write was accepted" and "the write is load-bearing" — the same distinction
the `constrainProportions` finding below turns on.

---

## 2026-08-05 — from implementing the COLOR layer (#487 step 3, second half)

### `[SKILL]` Dump the whole variant grid as a table before believing a paint projection

I wrote the projection, stated in a comment that it handled the appearance-specific rules, and was
wrong about three of them at once: the overlay family was never consulted (so every `outline`/`text`
hover and pressed resolved to its rest value and rendered pixel-identical), `text` disabled grew a fill
*and* a border it never had, and `filled` disabled grew a border. All three were found by printing the
21-cell grid — intent × appearance × state, one row per cell, columns for fill/stroke/ink/icon — and
looking at it. None were found by re-reading the code, including immediately after writing it.

The reason this generalizes: **over a ragged grid, a lookup that silently resolves nothing is
indistinguishable from a lookup that correctly resolved nothing.** `outline` genuinely keys no fill, so
`fills: undefined` on an outline button is right; it is also exactly what a missing overlay lookup
produces. The signal is not in any single cell, it is in the *shape* of the table — two columns that
should differ between rows and don't. A grid you can see has that shape; a grid you reason about does
not. This applies to any per-variant projection, not just paint.

### `[GATE]` A substring assertion against a self-documenting generated string tests the documentation

Two of the new gates passed with the code they guarded deleted:
`ok(js.includes('strokeWeight'))` and `ok(js.includes('setBoundVariableForPaint'))`. Both are true of
the payload with the assignment and the call removed — because the payload carries **comments explaining
why `strokeWeight` and `setBoundVariableForPaint` are needed**. The prose that documents a decision
satisfies the check that the decision was implemented.

`planToPluginJs` output is the one string in this engine that is both a *deliverable* and *heavily
commented*, so every `includes()` against it is exposed to this. Anchor to syntax, not vocabulary:
`/node\.strokeWeight=/`, `/figma\.variables\.setBoundVariableForPaint\(/`. And note what caught it —
**mutation testing, not review**. Writing the assertion and reading it back cannot detect this, because
the assertion looks correct and is correct about a string that contains the word. Deleting the
implementation and expecting red is the only thing that asks the right question. Same family as the
`lint-us-english` self-check that sampled only singulars (CLAUDE.md): a check written from the same
mental model as the thing it checks inherits its blind spot.

### `[SKILL]` One field per Figma API shape — four shapes now, and paints read back somewhere else

`bound` (`setBoundVariable`), `textStyle` (`setTextStyleIdAsync`), `effectStyle`
(`setEffectStyleIdAsync`), and now `paints` (`figma.variables.setBoundVariableForPaint`). Squeezing any
of them into `bound` type-checks, passes every offline gate, and fails only at paste time — the whole
argument for the split, now confirmed a third time.

Paint has two wrinkles the other three do not, both worth checking on any new component:

- **The setter returns a value instead of mutating.** `setBoundVariableForPaint(paint, 'color', v)`
  hands back a *new* paint that must be assigned into the `fills`/`strokes` array. Dropping the return
  value is a silent no-op — nothing throws, nothing lands in `misses[]`.
- **The binding is not where you look for the others.** It lives on the paint object inside the array,
  so `node.boundVariables.fills` is empty on a correctly bound node. Read back
  `node.fills[0].boundVariables.color`. A read-back written by analogy with the dimension one would
  report every paint as `DISCARDED`, or — with the polarity flipped — pass unconditionally.

And **ink for a swapped icon belongs on the VECTORs inside the instance, not the instance** — an
instance fill paints a square behind the glyph. It is a per-instance override and it survives
`createComponentFromNode` plus one further level of instance nesting (measured). Any component with an
icon slot needs this, so it is a field on the plan (`descendantFills`) rather than a paste-time detail.

### `[KB]` Ragged is the design: `filled` restyles its fill, `outline`/`text` overlay it

`filled` expresses hover as a fill change; `outline` and `text` have no fill to change, so they express
it as a translucent overlay. In Figma **both land on the same node's `fills` array** — one array, two
token families, selected by appearance. The KB's component research models states per appearance but
does not name this collapse, because in CSS `background-color` and an `::after` overlay are separate
concerns and in Figma they are one.

The practical consequence for the def tier: a missing key is not necessarily a gap. `outline` keying no
`.fill` is correct. Which means a completeness gate over paint keys cannot be a cross-product check —
it has to know the per-appearance rule, or it will demand keys that should not exist. Related: the same
distinction makes `disabled` cross-cutting over **intent** but not over **appearance** (one gray serves
every intent; it must not give a ghost button a box), which the KB's "one disabled treatment" framing
also does not distinguish.

---

## 2026-08-05 — from probing a real `INSTANCE_SWAP` target (#487 step 3 prep)

The owner authored two components by hand in the test file — an `FPO-default-icon` and a `focus-ring`
component set — and the paste path was probed against them over the live bridge rather than reasoned
about. Everything below came out of that probe. Two of the four are silent-failure findings, which is
the class this file exists for: the plan asserts a capability, nothing throws, and the artifact is
quietly wrong.

### `[GATE]` `constrainProportions` silently drops a dimension binding — and the first diagnosis was wrong

`figmaAnatomyPlan` emits `bound: {width, height}` for every `slot` part, from the one
`size.{size}.icon` key. Against the owner's icon component, only ONE of the two survives, and
neither `setBoundVariable` call throws:

```
setBoundVariable('width', v); setBoundVariable('height', v)   → ["height"]   width dropped
setBoundVariable('height', v); setBoundVariable('width', v)   → ["width"]    height dropped
```

**The cause is `constrainProportions: true` on the node**, which the icon component has (and which
its instances inherit). A proportion-locked node cannot hold two independent dimension bindings, so
the second write evicts the first — plain last-write-wins. Unlock it and both bind:

```
FRAME      constrainProportions=true   → ["height"]            ← one dropped
FRAME      constrainProportions=false  → ["width","height"]    ✅
COMPONENT  constrainProportions=true   → ["height"]
INSTANCE   constrainProportions=false  → ["width","height"]    ✅ verified tracking both axes
```

So the fix is `node.constrainProportions = false` before binding — one line, and it applies to slots
of every node type.

**This entry originally recorded the wrong cause, and how it went wrong is the more useful finding.**
It claimed the limitation was *INSTANCE-specific* and that *which axis survived depended on the
parent's `layoutMode`*. Both were artifacts of the probe design. The "FRAME keeps both" control used a
fresh `createFrame()`, which defaults to `constrainProportions: false` — so the control differed from
the instance in **two** variables at once (node type and proportion lock) while only one was being
attributed. And the apparent layout-mode dependence was just call order differing between the two
probe arms. A control that varies with the treatment is not a control; had the first probe locked a
FRAME or unlocked an INSTANCE, the real cause would have been immediate. **When a difference is
attributed to node type, vary node type alone.**

The `misses[]` point stands and is the durable one: that array only fills when `byName.get(varName)`
finds nothing, so a binding that resolves and is then discarded is invisible to it. A component pasted
this way looks successful, reports zero misses, and has half its icon sizing missing. Generalizing:
*a Figma setter that accepts a call is not a Figma setter that honored it.* #493's
three-namespaces-three-fields rule assumed a mismatch announces itself as a throw; here nothing
announces anything, so **the gate must read the value back** — which is exactly what caught this
correction.

One more trap on the same surface, found while verifying the fix: **`resize()` clears every dimension
binding on the node**, on FRAME, COMPONENT and INSTANCE alike. The original entry prescribed
"`resize()` plus `layoutSizingHorizontal`/`Vertical`" as the fix, which would have destroyed the
binding it was meant to preserve. `resize()` before binding is fine; after is not. `appendChild` into
auto-layout and setting `layoutSizing*` are both safe — bindings survive those.

### `[GATE]` `INSTANCE_SWAP`'s default value is a node ID, not a component key

```
addComponentProperty(name, 'INSTANCE_SWAP', icon.key)  → throws "Property value is incompatible
                                                          with component property type"
addComponentProperty(name, 'INSTANCE_SWAP', icon.id)   → OK  ("leadingVisual#73:0")
```

`key` is the wrong guess in the most plausible way available: it is what `figma_search_components`
returns, what cross-file instantiation consumes, and the stable identifier every other part of this
workflow uses. It is not what this setter wants. Wiring then needs a second, separate step —
`slot.componentPropertyReferences = {mainComponent: propId}` — and the returned property ID carries a
`#nodeId` suffix that must be used verbatim, not the bare name.

This one at least throws, which is why it is a footnote rather than the entry above. Worth recording
because the error message names neither `key` nor `id` and gives a reader no direction.

### `[KB]` The focus ring is an ABSOLUTE sibling — which dissolves the collision, and names the fifth part kind

#493 left the ring's projection open with two options, both lossy: draw it on the target and lose
`appearance: outline`'s border to it, or add a part. The hand-authored component answers it with a
third: `layoutPositioning: ABSOLUTE`, zero children, `clipsContent: false`.

That is strictly better than either option and was not on the list. An absolutely-positioned sibling
has **its own stroke**, so the 550-ring/500-border/550-fill contention over one node's single stroke
simply does not arise, and it takes no space in the row so no geometry shifts. It also confirms the
ring must be a part after all — but a part with a property no current kind has, which is the schema
finding: `anatomy.parts`' four kinds cannot express "does not participate in layout flow." `overlay`
is the near miss and its validation demands `replaces:`, because its semantic is *takes another part's
position*; the ring takes nobody's. The fifth kind is **absolute sibling of the target**, and it stays
the first kind whose materialization needs another component to already exist in the file.

The component set also carries a `color = default | inverse` axis, which lands on emitted pairs
(`color/border/focus`, and the `color/interactive/{intent}/on-inverse/*` family) — evidence for the
"one shared thing with a per-context parameter" reading in the entry below, from a source that had no
reason to be arguing for it.

### `[SKILL]` A hand-authored prototype encodes the structure, not the bindings — read it for the former

The ring's structure is the finding above. Its bindings are all legacy or placeholder: strokes
hardcoded (`#2D65D4` / `#AFC7F3`), radius `0`, and stroke weight bound to a **remote** variable
(`pds/border/width/md`, from the old NB library) while Prism3's own `focus` collection emits
`ring/width`, `ring/offset` and `ring/offset-field` unused. Likewise the icon's vector fill is a
hardcoded gray.

Neither is a defect — a component authored to demonstrate a shape is not a component authored to ship,
and the shape is what was being communicated. But the two read very differently and an agent taking a
handed-over artifact as authoritative will faithfully reproduce its placeholders. **Take the structure
from a prototype and the bindings from the def.** Same shape as "a spec derived from artifacts can be
confidently wrong about intent" below, with the polarity flipped: there the artifact was generated and
authoritative and still wrong about *why*; here it is hand-made and provisional and exactly right
about *what*.

One binding gap is real rather than provisional, and it is the def's: there is no
`color/interactive/{intent}/icon` variable at all. The def routes icon color through `on-fill` and
`text.rest`, so an icon's color has to be set on the vector *inside* the instance as a per-instance
override — a different mechanism from every other binding in the plan, and one the projection has no
field for yet.

---

## 2026-08-04 — from #487 step 2 / #493 (the third namespace, and an unbound state)

### `[SKILL]` Read the ALIAS, not the value

#487 §3 said: bind `focused`, because `color/interactive/{intent}/fill/focused` is emitted and the def
binds it zero times, so the state axis promises a variant that renders identically to rest. The
premise was true. The conclusion was wrong.

```
color/interactive/primary/fill/hover     → palette/red/600
color/interactive/primary/fill/focused   → palette/red/600     ← the SAME alias
color/border/focus                       → palette/red/550
```

`fill/focused` does not merely *equal* `fill/hover` — it **aliases the same palette step**, in all
three intents across all four modes. Binding it would not have fixed "focused renders like rest"; it
would have made focused render like **hover**, which is a worse answer that also looks like progress.

Two emitted names with equal values may be one palette step wearing two hats. **Compare aliases when
deciding whether two tokens are the same decision**, and treat an equal *value* as a question rather
than an answer.

### `[SKILL]` An unbound state is as often a correct def as a gap — ask what it binds INSTEAD

The reason `fill/focused` is unbound is that focus in this system is not a fill change. The def
already says so: `focus-ring → color.border.focus` at a *different* palette step, plus `ring-width`
and `ring-offset`. The binding was not missing; it was somewhere else, one file away.

So before recording "state X binds nothing" as a gap, look for what the def binds *for that state
under a different mechanism*. Verified for Button: `focus-visible`, `pending` and `inactive` all bind
zero color tokens out of the seven values #488's state axis declares — but `focus-visible` has the
ring, and `pending` has `anatomy.parts.spinner`. Only `inactive` is a genuine gap, with neither token
nor part. A blanket "three states are unbound" would have been three-for-one wrong.

### `[SKILL]` A spec derived from artifacts can be confidently wrong about intent

This is the sharper second instance of the "validate the spec against the def" entry below. That one
caught a spec written from a **legacy Figma artifact**. This one was written from the engine's own
**emitted name list** — a generated, current, authoritative artifact — and was still wrong, because a
name list records what exists and not what it is *for*. `fill/focused` appeared present-and-unused;
the def's `focus-ring` slot, which explains why that is correct, is not in any emitted artifact.

**Emitted names tell you what is available. Only the def tells you what was intended.** Read the def
before acting on a gap inferred from artifacts.

### `[GATE]` One namespace per API, and check each against its own name set

Figma has three separate namespaces a part can reference, each with its own API: variables
(`setBoundVariable`), text styles (`setTextStyleIdAsync`) and effect styles (`setEffectStyleIdAsync`).
`FigmaNodePlan` now has three peer fields to match. The failure mode that justifies the symmetry:
**there is no `setBoundVariable('effects', …)`**, so an effect style squeezed into `bound`
type-checks, satisfies every offline gate, and fails only at paste time against a live file — the
most expensive place to learn it.

`planBindingErrors` takes three separate `Set`s for the same reason. A merged set would let a name
pass by matching something in the wrong namespace, and here it would have done real damage: both
shadow ladders emit (`shadow/*` **and** `shadow-dark/*`), so a light-only name would look satisfiable
by its dark twin.

Generalize: **when a projection field maps to a distinct API call, it gets a distinct field and a
distinct verification set.** Convenience merging of name sets trades a real gate for a shorter
signature.

### `[KB]` Effect styles are not mode-aware, so elevation cannot theme the way fill does

A bound color variable resolves per mode, so a bound fill themes across light/dark/hc-\* for free
(#487 §2 — the reason the Prism3 set is half the legacy sheet's width). **Effect styles have no
equivalent.** The engine emits `shadow/*` and `shadow-dark/*` as two distinct names, and a node
references one of them.

So any component with elevation carries a mode asymmetry its fills do not: theme-aware color,
manually-selected shadow. This must be admitted in `anatomy.codeOnly` wherever elevation lands
(#494), and it is a real argument for keeping elevation out of a default variant set rather than a
cosmetic one. Worth feeding back: the KB's component research does not weigh which token categories
survive a mode switch, and the answer is not uniform across them.

### `[SKILL]` The focus ring wants to be a shared nested component, and the schema cannot say so

Owner practice, and it is a better answer than anything the projection could reach for on its own: in
Figma, author the focus ring **once as its own component** and nest it inside every component that
needs a focused state.

It dissolves a collision rather than trading a loss. A ring drawn on the interaction target competes
with `appearance: outline`'s border for the single stroke a Figma node has — at three different
palette steps (550 ring / 500 border / 550 rest fill). A nested ring has its own node, so there is
nothing to resolve. It also removes N-way duplication: the ring is not any one component's
(`focus.ring.*` and `color.border.focus` are top-level families, and `focus.ring.offset-field` already
emits as a separate value — evidence the ring was always meant to be one shared thing with a
per-context parameter).

**The schema gap is the finding.** `anatomy.parts` has four kinds and the ring is none of them: not a
`slot` (that is swappable content the *consumer* supplies), not an `overlay` (validation demands
`replaces:`, and the semantic is *takes another part's position* — the ring takes nobody's), not a
`box`. It needs a fifth kind, and note it would be **the first part kind whose materialization
depends on another component already existing in the file** — every current kind is created from
nothing. That publish-then-nest ordering is the component-tier echo of `materialise-to-figma.ts`'s
create-before-alias pass ordering and needs the same treatment.

Also unresolved: `composition.composesWith` exists but is pure documentation — nothing materializes
from it. A nested ring would be the first composition relationship the Figma projection must honor.

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

### `[KB]` Where does "inverse / on-color" live — the component or the container?

Unresolved, and the most interesting open question of the batch. Our own research (`docs/20 §9`)
reframed inverse as a **surface context**, explicitly to escape Prism2's hand-mirroring (60 of 122
action tokens). The field is split: Material 3 and Carbon apply it contextually; Adobe Spectrum makes
it a Button prop (`staticColor`) — because context cannot be computed when the ground is a
photograph, which is a case the contextual model genuinely cannot serve.

The consumer lens the KB does not carry: **our components are consumed by CMS component developers**
(Drupal / AEM / Sitecore / SFCC) building larger authorable components. A content author toggles
"dark background" on a *container* — a hero, a promo band. If inverse is a Button property, that
setting must be threaded from the container into every nested button, and then into headings, links,
icons and dividers too — Prism2's mirroring problem re-emerging one tier up, as a variant of every
component rather than a token twin. If inverse is container-scoped context, the author's single
toggle maps to one attribute and every descendant adapts.

So the question is not "is inverse a Button variant" but **"at which tier does inverse live"** — and
the CMS-authoring lens argues for the container. Figma does not force a deviation here: modes set on
an ancestor frame cascade to nested instances, which is the same context mechanism, and is already
the established pattern for dark (#487 §2).

The cost is what makes it a decision rather than a conclusion: the engine emits `on-inverse.*` as
distinct **names**, `CONTRACT_VERSION` went to 1.1.0 *adding* `on-inverse.border`, and collapsing
those into modes would remove ~23 guaranteed paths — a MAJOR contract event plus a deprecation table.

Two things worth feeding back to the KB regardless of which way it goes: the **CMS-authoring lens on
component API design** (the KB's component research assumes an app developer, not a CMS component
developer with a content author downstream), and the observation that **a contextual model needs an
explicit escape hatch for non-token grounds** (imagery, video) — which is what Spectrum's
`staticColor` actually is, and why it is not in conflict with the contextual model.

### `[SKILL]` Only one of five defs is materializable

`button` has an `anatomy` block. `icon-button`, `field-label`, `field-message` and `text-field` do
not — "semantically complete but not materializable", in the schema's own words. Any plan that reads
"apply this to the catalogue" should state which defs it can actually reach.
