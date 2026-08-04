# 30 — Versioning & compatibility

> The engine's whole purpose is to *change* token values — that is what regenerating a brand means.
> So the usual instinct, "version the output", is exactly wrong here: it would fire on every brand
> tweak and teach everyone to ignore it. This file records what is actually versioned, why it is the
> token **names** rather than their values, and how a breaking change is prevented from merging
> quietly.

---

## Two versions, deliberately independent

Both live in `Prism3/engine/version.ts`, which is a leaf module (it imports nothing from the engine)
so that `tree.ts` can stamp a version into every emitted artifact without an import cycle.

| | question it answers | bumps when | where you see it |
|---|---|---|---|
| `ENGINE_VERSION` | *what code produced this file?* | any behavior change, **including a pure value change** | `$extensions.generator.version` in every emitted tree; MCP `serverInfo.version` |
| `CONTRACT_VERSION` | *can my app still resolve the names it references?* | **only** when the guaranteed token-name surface moves | `contractVersion` in `Prism3/schema/token-contract.json` |

The split is the useful part. A consumer app writes `prism.color.text.primary` into a stylesheet. It
does not care that the brand's primary hue moved four degrees — that is the engine doing its job. It
cares enormously if `text.primary` stops existing, because the reference then resolves to nothing,
silently, with no build error anywhere in the chain. Tying the two versions together would either
cry wolf on every brand tweak or stay silent through a rename. Separating them lets each be strict.

`ENGINE_VERSION` starts at `0.1.0` and `CONTRACT_VERSION` at `1.0.0`. The inversion is intentional
rather than a typo: **the code is young, the names are settled.**

## What "guaranteed" means, and why it needed defining

The emitted token set is input-dependent. A brand declaring three extra brand colors emits three
extra palettes; a brand with six breakpoint floors emits a `breakpoint.xs` that a five-floor brand
does not. So "the list of paths the engine emits" is not a well-formed promise — it is a function of
the input.

What *is* well-formed is the **intersection across a corpus** chosen to span the ways an input can
vary:

| corpus member | what it varies |
|---|---|
| `nb` | the hand-built legacy system — `nbds.*` dialect, `rgb()` color format |
| `aurora` | engine-native brief, an extra brand color, compact density, 3:1 icon contrast |
| `harbor` | engine-native brief, a different lever combination |
| `wendys` | **standard dialect** — a flat `colors:` map classified into anchors; a different typeface |
| `minimal` | the three required fields and **nothing else** — the sparsest input the engine accepts |

That intersection is **477 paths**, with zero `$type` disagreements between any two members.

Two details are load-bearing:

**Paths are compared *below* the configurable root.** The root is itself a lever (`nbds` vs `prism`),
so comparing with it included yields an intersection of exactly zero — which is how this was nearly
defined into meaninglessness on the first pass. A gate that computes an empty set passes everything.

**`minimal` is what stops the number over-claiming.** Without it the intersection would be "whatever
four richly-specified brands happen to share", which is a much weaker promise wearing the same
label. It is worth recording that adding `minimal` removed **zero** paths: every one of the 477
survives the sparsest possible input. `wendys` earns its place by removing exactly one —
`font.typeface.inter`, a slug derived from a *value* — which is precisely the class of path that
should never have been promised.

Everything else the engine can emit is recorded as `brandDependent` (234 paths). Those are
informational: they exist for some inputs only, and they **never** force a version bump.

## Change classification

| change to the guaranteed set | level | why |
|---|---|---|
| a path is **removed** | MAJOR | a consumer reference resolves to nothing |
| a path's `$type` **changes** | MAJOR | same name, new meaning — breaks a consumer that did nothing |
| a path is **added** | MINOR | a new name cannot break an existing reference |
| only `brandDependent` moved | none | says something changed about the corpus, not the promise |
| only values changed | none | that is the engine working — bump `ENGINE_VERSION` |

## Deprecations

`DEPRECATIONS` in `version.ts` maps a retired path to its replacement and the `CONTRACT_VERSION`
that retired it. **It is empty today**, and that is the honest state — nothing in the guaranteed
surface has ever been renamed.

It exists anyway because without it MAJOR is a dead end: a consumer learns their build broke but not
what to write instead. With it, a removal ships its own migration, mechanically appliable by a
codemod or an agent. A deprecated removal still classifies MAJOR — it *is* a break for anyone who
has not migrated — it is merely a break that carries its own fix.

The gate refuses a `replacedBy` that is not in the *live* guaranteed set, so an entry cannot rot
into a pointer at nothing. That failure mode is what makes most deprecation tables worse than none.

## The gate, and the one rule that makes it work

```
npx tsx Prism3/engine/token-contract.ts --check     # fail (exit 1) if the surface moved
npx tsx Prism3/engine/token-contract.ts --accept    # rewrite the baseline (requires the bump)
```

`--check` runs in CI and in the pre-push sequence. `--accept` refuses unless `CONTRACT_VERSION` has
*already* been raised by at least the increment the diff requires — so the bump is enforced rather
than remembered, and an under-bump (minor for a breaking change) is rejected just as firmly as no
bump at all.

**The baseline must never become a `regen.ts` artifact.** `regen` rewrites every generated file and
`regen --check` proves the committed copies match. Run that way, deleting a token would rewrite the
baseline to agree with the deletion, and *both* gates would go green. #281's lesson was **no gate
reads the committed artifact**; this is the next one along:

> **A gate allowed to rewrite what it reads has no memory, and a baseline without memory is just a
> second copy of the output.**

`--accept` is therefore a separate, deliberate act, and the only thing that ever writes that file.

One consequence worth knowing about: the US-English gate imports its scope from `regen.ts`, so
keeping this artifact out of regen also kept it out of that gate. It is named explicitly in
`lint-us-english.ts` to close the hole. **Anything else deliberately excluded from regen needs the
same line** — the exemption and the blind spot arrive together.

## What this does *not* cover

- **Values.** By design, per above.
- **`brandDependent` paths.** Real tokens, but conditional on input; binding to one is the
  consumer's risk to take, and the file lists them so the risk is at least visible.
- **The `BrandInput` schema.** Versioned separately by `PERSIST_VERSION` in `persist-input.ts`,
  which guards a *stored* input blob against schema drift. Different contract, different consumer.
- **The MCP wire protocol.** Negotiated per-request against `PROTOCOL_VERSIONS` in `mcp.ts`, which
  is the protocol's own versioning, not ours.
