# 40 — The MVP catalogue: which components, in what order, and what has to exist first

> `39` decided what a component projects into. This decides **which components**, and it is the last
> document before authoring starts. Twenty-five named components, of which seven exist; eighteen to
> author, plus **two substrate defs and one glyph set** that several of the eighteen cannot render
> without. The selection is weighted to a stated priority — *a complete Figma kit is worth more right
> now than code parity* — and that weighting is what produces the sharpest cut in §4, so it is stated
> up front rather than left implicit.
>
> Two things must land before def #8 is authored, and they are named in §6 rather than buried: the
> KB-divergence rule (#756) and the vocabulary closure (#821). Both get more expensive per def
> authored, and neither is visible as a problem until it has happened eighteen times.

---

## 1. What exists, counted honestly

Seven defs. **Four components and three substrate parts**, and the distinction matters for every
count below:

| def | what a consumer calls it |
|---|---|
| `icon` | a component |
| `button` | a component |
| `icon-button` | a component |
| `text-field` | a component |
| `focus-ring` | **substrate** — a part nested by other components, never placed alone |
| `field-label` | **substrate** — a field part |
| `field-message` | **substrate** — a field part |

So "25 components" means **eighteen more to author**, not thirteen. The three substrate defs are not
padding: `docs/38` Arc 2's argument is that they are the components whose absence makes the
interesting ones unmeasurable, and that argument holds for the two more this doc adds in §5.

## 2. The corpus we are selecting from

The knowledge base holds **45 component briefs** (`components/*.md`), 41 of them stable, across seven
categories: Foundations, Layout, Form, Navigation, Feedback, Data, Overlay. Each brief is a cited,
adjudicated cross-system anatomy — `28` §2 describes the shape and used `button.md` as its model.

**That corpus is the strongest asset going into this work.** The field research is already done for
almost everything we would pick, which is why the selection question is *which briefs to author
against*, not *what a component is*.

Three of the 45 have defs today: `icon`, `button`, `text-field`. `icon-button` derives from
`button.md`; `focus-ring`, `field-label` and `field-message` have no brief of their own — they were
extracted from `button.md` and `text-field.md` while authoring those.

## 3. The eighteen

| tranche | components | why this tranche, and why here |
|---|---|---|
| **1 — form** | `checkbox` · `radio` · `switch` · `textarea` · `select` | We are half-built here. `text-field`, `field-label` and `field-message` are stranded without their siblings, and a form is the first thing any real engagement builds. Highest dependency payoff per def. |
| **2 — status & feedback** | `badge` · `tag` · `banner` · `tooltip` · `spinner` | The tranche blocks need most: every block surface carries status. Also the cheapest tranche — small anatomies, mature briefs, low behavior. |
| **3 — surface & container** | `card` · `divider` · `accordion` · `list` | Where blocks actually live (`37`, `13` §8). `card` is the single most-requested surface in the corpus and the one that exercises composition hardest. `list` here is the ordered/unordered sense, not the data-table sense. |
| **4 — nav & overlay** | `link` · `tabs` · `dialog` · `menu` | Completes what a kit has to show to read as complete. `dialog` and `menu` are the two highest-behavior defs admitted, and that is deliberate — see §4. |

Eighteen, plus the seven, is **25 named components**.

The tranche order is dependency order, not preference. Tranche 1 needs only what exists plus the
glyph set; tranche 3's `card` wants §5's `text` substrate; tranche 4's `menu` and `dialog` want
`focus-ring` projecting, which is §6's dependency.

## 4. What is deliberately out, and why — this is the load-bearing half

An omission with no reason is indistinguishable from an oversight, so each exclusion carries one.

**Box, Stack, Grid, Section — no Figma component form at all.** These are auto-layout settings and
semantic wrappers, not components anyone places on a canvas. `28` defines `code-only` for exactly
this: anatomy that provably will not survive the Figma leg. Under a Figma-first weighting they are
the cleanest cut in the list, and this is the one place that weighting has a visible cost — **the
code leg's layout story stays unbuilt until Arc 4**, which is an accepted trade rather than an
oversight.

**Combobox, date-picker, file-upload, slider, table, tree — the behavior wall.** These are the
components #252 (author-headless vs. wrap) actually governs, and #252 is parked at `19` §3 ranks 5–6.
The KB calls Combobox *"the hardest widget in ARIA."* Admitting them to an MVP forces a parked
decision on its worst instance, in the tranche where we have least experience. They come after #252
resolves, which is the correct order.

Note the tension this leaves and do not pretend it away: `dialog` and `menu` are admitted in tranche 4
and both carry real behavior (focus trap, roving tabindex, dismiss semantics). The distinction is that
their behavior is *well-specified and bounded* where a combobox's is genuinely contested across the
field. If tranche 4 proves that line wrong, it is the right place to find out — two defs, late, rather
than six.

**Toast, breadcrumbs, pagination, segmented-control — fast follows.** Named as wanted, not needed for
MVP, with no dependency pressure from anything in the eighteen.

**Drawer, popover, progress, skeleton, empty-state, side-navigation, toggle-button, avatar — second
wave.** Nothing depends on them. `avatar` is cheap and would be easy to add; it is out because it is
rarely reached for in practice, which is a better reason to defer than difficulty.

**The four unbriefed components.** A brief is the input to authoring. Authoring without one inverts
the pipeline and produces a def with no research record behind it, which is what `notes.contested`
exists to carry.

## 5. The substrate the eighteen cannot render without

Three dependencies, and the third is not a def at all.

### 5.1 `text` / `heading` — a typography primitive

**Add it.** It is the component-tier expression of the `type.*` token ladder: a primitive with size
variants that card, banner, dialog and list all compose with, so their content is consistently sized
rather than hand-styled per instance. `38` Arc 2's argument applies unchanged — it is not preliminary
work in front of the interesting components, it is the thing whose absence makes them inconsistent.

**It is unbriefed.** There is no `text.md` or `heading.md` among the 45, so this is the one place the
pipeline runs backwards and a brief has to be written before the def. That brief is small — the field
convergence here is strong — but it should exist, for the same reason every other def has one.

### 5.2 `image` — an aspect-ratio frame

**Add it.** Consistent aspect ratios in cards and marketing surfaces is a real requirement from
practice, `card` wants it, and in a Figma kit an aspect-locked frame with a fill placeholder is a
component people actually place. Also unbriefed.

### 5.3 An icon set — a hard dependency, and not something the engine can generate

This is the one that blocks tranche 1 rather than inconveniencing it.

**`icon.name` is already typed against a vocabulary that does not exist.** `components/icon.ts:48`
declares the prop as *"typed to the set vocabulary… an unknown name must fail at compile time,
because a missing glyph otherwise fails silently as an invisible gap in production"*, and `:107`
states the glyph geometry *"is the SET's content."* Nothing anywhere defines that set. Filed as its
own defect (#833) — the same shape as #810, a def asserting a mechanism that does not exist, with
every gate green.

**Glyphs are vector geometry, not tokens.** The engine generates values and names; it cannot draw. So
the set is delivered, not derived, and it needs a storage decision the rest of this repo's patterns
answer cleanly.

#### What the eighteen actually require

Split by whether a component **cannot render** without the glyph, or merely wants one to demonstrate a
slot. The first list is a blocker; the second is not.

| glyph | required by | class |
|---|---|---|
| `chevron-down` | `select`, `accordion` | **hard** — a select with no caret is not a select |
| `chevron-right` | `menu` (submenu) | **hard** |
| `check` | `checkbox`, `menu` (selected) | **hard** |
| `minus` | `checkbox` (indeterminate) | **hard** |
| `close` | `dialog`, `tag`, `banner` (dismiss) | **hard** |
| `info-circle` | `banner`, `field-message` | **hard** — status is colour **and** icon, never colour alone |
| `check-circle` | success status | **hard**, same reason |
| `warning-triangle` | warning status | **hard**, same reason |
| `error-circle` | error status | **hard**, same reason |
| `chevron-up` | `select` (open state), `accordion` | common |
| `chevron-left` | pagination, carousels | common |
| `plus` | expand affordances | common |
| `search` | `text-field`'s most common leading visual | demo |
| `external-link` | `link`, external destinations (a11y convention) | demo |
| `arrow-right` | CTA buttons and links | demo |

**Nine hard, six useful.** Fifteen is a lean core and it is enough to build and demonstrate all
eighteen. Anything beyond that is a want, and the set should stay lean deliberately — every glyph is a
member of a vocabulary a consumer types against, and a large set is a large surface to keep stable.

#### How the set should be stored, and why

Two artifacts, in the pattern this repo already uses everywhere:

1. **Source SVGs, committed as authoring input** — `packages/engine/icons/*.svg`. Human-authorable,
   diffable, replaceable by a client.
2. **A generated TypeScript module** carrying the path data — the emitted artifact, produced by
   `regen.ts` from (1) and covered by `regen --check`.

**The second is not optional and the reason is a hard constraint rather than a preference.** The
engine is dependency-free and buildless *and it bundles into the Figma plugin sandbox*, where there is
no filesystem. An emitter that read `.svg` files at runtime would work in `tsx` and fail in the
plugin, which is the environment that most needs the glyphs. A generated module bundles.

That also makes the set the source of `icon.name`'s vocabulary — the generated module's keys are the
literal union the prop's description already promises, which closes #833 as a consequence rather than
as separate work.

**Classification:** the set is **payload** — it travels to a client on eject. `lint-payload-manifest.ts`
will fail until a human classifies it, which is that gate working as designed (#674). And it should be
**brand-neutral with a per-brand override**, the same call `39` §5 proposes for the catalogue: one
expensive copy, and a client swapping in their own set is a small per-brand file rather than a fork.

#### What the delivered SVGs need to satisfy

Stated in advance because these are expensive to correct after a set is drawn:

- **Square artboard on the icon rung system.** The engine's `icon.size` ladder is 16/20/24/32 with
  `md` = 24; draw at 24 and let the rungs scale.
- **Filled paths, not strokes.** A stroked vector's weight in Figma is absolute and does not scale
  with the artboard, and the `icon` paint slot binds a **fill**. Outline-style icons should be
  converted to filled outlines (`stroke-to-fill`) before delivery. This is the item most likely to
  require a redraw if it is discovered late.
- **No baked fills** — `currentColor` or no fill attribute at all. `icon`'s `tone` prop defaults to
  `inherit` precisely so the glyph tracks its host's cascade; a hardcoded hex defeats it and is
  invisible until a disabled or inverse context renders wrong.
- **One path per glyph where possible**, and no groups or transforms. Both complicate the Figma
  import and the code projection, for no gain.
- **kebab-case names** matching the vocabulary above.

None of these is unusual for an icon set; they are stated because a mismatch is discovered at paste
time, per file, and by then the set exists.

## 6. What must land before def #8

Two items, both of which get more expensive per def authored and neither of which is visible as a
problem until it has happened eighteen times.

**#756 — the KB-divergence rule.** A brief and the engine's token tier use the same rung names for
different values: `components/icon.md` says `md` = 20, the engine says `md` = 24. Both halves stay
valid, every gate passes, and the divergence is visible only to someone reading both files side by
side. The call is already made — **the engine's names win; a brief is input to authoring, not an API
surface** — and it has not landed anywhere: not in `28`, not in authoring guidance, and with no gate.
A decision made and unrecorded is the weakest state there is, and the issue's own words are the
argument: *"four authors resolve it four times in four PR comments and the fifth gets it wrong."*

Decided alongside this doc: **the divergence is recorded per-def**, one line where the author meets
it, as `icon` already does. Not a table — a table is one more artifact to drift, and the record's
whole value is sitting where the decision is made.

**And #756 and #824 are one problem.** #824 backfills `notes.contested` / `notes.unverified` on the
six under-documented defs. That field **is** the KB-divergence record — the rule says where a
divergence goes, the backfill applies the rule to what already exists. Landing them separately would
be writing the rule and then not applying it to the corpus that motivated it.

**#821 — close the `states` and `variants`-name vocabularies.** Free-form strings today, so nothing
stops one component saying `hover` and the next `hovered`. 254 bytes of `states` across all seven
defs; an eighteen-file migration afterwards. The research pass found **no design system anywhere**
enforcing that two components' shared axis names mean the same thing, so this is genuinely novel and
genuinely cheap, in that order.

Three further items are **not** blockers and should run alongside authoring: #822 (`contentModel`),
#823 (the name-surface contract), #833 (`icon.name`'s vocabulary, which the set closes).

`focus-ring`'s projection is a tranche-4 dependency rather than a gate: it needs #740's stroke field,
and `#795`'s declared-axes work plus the paste-time `offset` decision have already left `color` as its
single projected axis — which is what makes the **inverse** ring reachable at all.

## 7. How each def gets authored, so eighteen are one system

The consistency mechanism `39` §7 argued for, stated as the procedure:

1. **Read the brief.** It is the research record, not the spec.
2. **Author the def against the engine's names.** Where the brief and the token tier collide, the
   engine wins (#756), and the offset is recorded in the def as one line.
3. **Everything unresolved goes in `notes`.** A contested decision with a named alternative goes in
   `contested`; an assertion not yet verified goes in `unverified`. This is where #810 and #833 should
   have been and were not — both were found by a human reading, which is the mechanism not being used
   rather than the components being simple.
4. **Vocabularies are closed; a divergence is declared, not invented.** `PAINT_SLOTS`, part kinds,
   `NestingRelation`, and — after #821 — `states` and `variants` names. A component that genuinely
   needs something outside a closed list declares it with a reason, in the `lint-paint.ts` shape where
   the exemption is checked in both directions.
5. **The def is the deliverable, not the Figma output.** A def that cannot yet project is still a
   complete def — `text-field` has no `anatomy` block and is the most composition-heavy def in the
   set.

## 8. What this doc does not decide

- **Which glyph set** — licensed (Lucide, Phosphor, Material Symbols are all permissively licensed)
  or drawn. §5.3 specifies what the set must satisfy and what it must contain; the source is a
  separate call.
- **The `text`/`heading` and `image` briefs.** Named as required, unwritten.
- **Whether tranche 4's behavior line is drawn correctly.** `dialog` and `menu` are in, combobox and
  friends are out, and §4 states the distinction and where it would break.
- **#252.** Untouched. It governs the six components §4 excludes, which is the honest description of
  its scope and the reason it stays parked rather than blocking.
