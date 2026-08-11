# 37 — Block layout axes: the vocabulary, and the corpus it has to be derived from

> The tier above components is **blocks** — section-level compositions keyed to the page role
> they fill (`13` §8, KB `09` §1.36). This file holds the thing worth owning at that tier: not a
> catalogue of blocks, but the **axes** each block family varies along, and the rationale for
> which combinations are worth shipping. A list of blocks is a shopping list; the axes are a
> generator, and they are the composition-tier form of the move the engine already makes for
> color — ship levers, not swatches.
>
> **Status: one witness, hero only.** Everything in §2 is derived from a single library's 22 hero
> variants. It is a starting vocabulary with named holes, not a finding. §3 is the corpus the
> derivation actually needs and §4 is what blocks it.

---

## 1. Why the axes rather than the layouts

Twenty-two hero variants is not twenty-two designs. It is a handful of axes multiplied out, and
only some of the combinations get shipped. Capturing the twenty-two is inventory that ages the
moment the vendor adds a twenty-third; capturing the axes plus the pruning rationale is reusable
across engagements and survives the vendor entirely.

**The pruning is the POV.** An axis list alone says what is possible. What a practice is paid for
is which cells are worth filling, and why the empty ones are empty. Adobe states the sharpest
version of this rule for its own collection: a block earns inclusion by being **used on more than
half of all projects** (`adobe/aem-block-collection`). That criterion applies at both levels —
which families exist, and which combinations within a family.

## 2. Hero — axis vocabulary v0

Derived from 22 hero variants in one commercial library, read from screenshots on 2026-08-10.
**Two-thirds of what follows is the classification; the last third — the holes — is the part
worth reading.**

The 22 reduce to four arrangements:

- **Text beside media** — media trailing, or mirrored to leading
- **Centered, media below**
- **Centered, no media**
- **Split header** — headline in one column, body and actions in the other

With these slots layered on top:

| Axis | Values observed | Notes |
|---|---|---|
| Arrangement | beside / below / none / split-header | The four above |
| Media side | trailing · leading | Leading appears once in 22 — a mirror, not a peer |
| Media kind | image · video · portrait crop · multi-image (2 or 4) | Distinct from placement; a video slot is not an image slot with a play button |
| Content alignment | start · center | No end-aligned variant exists |
| Social proof | none · rating + avatar cluster · logo strip | **Two different slots, not one** — different positions, different jobs |
| Supporting list | none · checkmark bullets | Appears only in the beside-media arrangement |
| Action count | 1 · 2 (primary + text link) | Never more than two |
| Surface | light · dark · two-tone band | The band splits the section into text zone + media zone |

### What this witness does not contain, which is the more useful half

Empty cells, all confirmed absent across the full 22:

- **No background media.** Not one variant sets text over a full-bleed image or video. This was in the pre-survey hypothesis and is simply not how this vendor builds heroes.
- **No dark surface with media.** Both dark variants are media-free. Whether that is a deliberate constraint or an unfilled cell cannot be told from outside.
- **No form in the hero** — no email capture, no search entry.
- **No true 50/50 edge-to-edge split**, and no carousel or rotating hero.
- **Nothing commerce-shaped** — no price, no product, no availability, no add-to-cart.

### What the exercise corrected in the hypothesis

Recorded because it is the argument for deriving from a corpus rather than from memory, and
because the same correction rate should be expected for every family that follows.

- **One axis invented that is not there** — background media.
- **One axis that needed splitting** — social proof is two slots.
- **Three axes missed entirely** — media kind, surface, and the split-header arrangement.

## 3. The corpus this has to be derived from

One witness cannot separate *the genre's grammar* from *one vendor's enumeration*. The known
libraries, and what each is good for:

| Library | Shape | Why it is in the corpus |
|---|---|---|
| Initium | 23 types / 197 blocks, React + Tailwind, shadcn registry | The first witness. Marketing-only; **no commerce at all** |
| Relume | 1k+ components, wireframe styling | Breadth, and **the only known witness with an Ecommerce set** — Product List Sections, Product Headers, Category Filters. Also carries an Application UI set |
| daisyUI | 211 page architectures matched by intent | Cited in `36` §2 as an exemplar benchmark; open |
| Tailwind UI | Marketing + ecommerce + application catalogues | Open enough to read markup |
| `adobe/aem-block-collection` | hero, cards, columns, carousel, FAQ | Open source, and the **membership rule** worth adopting |

**Commerce is not an append.** Initium's omission is invisible from a type list, and PDP work is
the practice's most common surface — the engine's own regression brand is a shoe PDP. Relume's
ecommerce set and Tailwind UI's are the two known sources; both need reading before any family
priority is set.

## 4. What blocks the derivation, measured

**Per-variant previews are not fetchable anonymously.** Relume's preview URLs — the pattern
`relume.ai/preview?cid=<category>/section_<name><n>&context=react` — return *"The component you
were looking for could not be found"* both with and without the `context` parameter, tested
2026-08-10. The **category index is** fetchable, so the taxonomy (categories, and the ecommerce
split above) can be captured without a session; the individual layouts cannot. Initium's hero
index is worse — it returns 22 entries named *"Hero Section 1–22"* with no layout description of
any kind.

So the capture divides cleanly, and the division is the plan:

- **Agent-side, no help needed:** taxonomy and counts from public indexes; full markup from the open libraries, which is also the only route to **landmark structure** and something approaching a **content model**.
- **Human-side, unavoidable:** per-variant layouts from the two session-gated libraries, as screenshots.

**A screenshot answers the layout axes and nothing else.** It cannot give spacing values, token
usage, breakpoint behavior, DOM landmark structure, or the content model — and two of those are
in scope for this tier (#693). Any family derived from screenshots alone carries those halves
unanswered, and the doc should say so per family rather than let the gap go unrecorded.

## 5. Method, so the next family is cheaper than this one

The practice already has a research convention and this should not invent a second one: the KB's
dual-agent run (`_research/README.md`) — one identical prompt against two agents, raw outputs
preserved unedited under `_inbound/`, synthesis separate, promotion into a numbered file. The
component tier's precedent is `28`, which derived button anatomy from a field survey rather than
from one system and recorded the decisions it closed.

Per family, the loop is:

1. Capture what the public indexes give (taxonomy, counts, names).
2. Read markup where it is open — landmarks and content model come only from here.
3. Take screenshots where it is gated, and mark those families as layout-only.
4. Classify into axes; **name the empty cells explicitly**, since they carry more than the filled ones.
5. Prune with a stated rule, Adobe's threshold being the sharpest available.
6. Record what the survey corrected in the going-in hypothesis — the correction rate is itself evidence about how much the next family needs surveying.

**Order families by our demand, not by the vendors' depth.** Hero and feature run deepest in the
commercial libraries because they sell; that is a fact about their market, not about ours.

---

*Sources: Initium hero set (22 variants, screenshots, 2026-08-10); Relume category index
(fetched 2026-08-10); `adobe/aem-block-collection` and `aem.live/developer/block-collection`;
daisyUI and Cloudscape figures via `36` §2. Cross-refs: `13` §8, `14`, `27` Idea 2, `28`, `35`,
`36` §2 row 6, KB `09` §1.36, KB `components/section.md`, #693.*
