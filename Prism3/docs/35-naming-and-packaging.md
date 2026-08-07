# 35 — Naming & packaging: the eject boundary

> Owner-raised 2026-08-07, from a concrete blocker: the Style Dictionary spike needed a
> home, and the workspace set up for it was named `code-library` — generic, hyphenated,
> and unlike any of its siblings. Rather than settle that one name, this doc takes the
> position the owner asked for: **decide the whole naming and layout now, before more
> debt accrues**, including the framework libraries we know are coming and the CMS
> targets we think are coming.
>
> `19` owns *what* the code library is and how it's delivered. This doc owns *what
> everything is called and where it sits*. It deliberately does **not** re-decide `19` §7's
> open items — see §8.

---

## 1. The organizing principle: the eject boundary

This repo contains two kinds of thing, and they have different lifecycles:

| | What it is | Lifecycle |
|---|---|---|
| **The product** | the engine, the theme studio, the Figma plugin | ours forever; versioned together; never leaves |
| **The deliverable** | tokens + the component libraries | **ejected into a client's repo**, where it becomes *their* design system (`19` §2) |

Everything in this doc follows from that split. The current layout doesn't show it — `web`,
`plugin`, and a would-be `code-library` sit as flat peers, so nothing signals that one of
them is destined to leave and carry its name into someone else's codebase.

**This is why the naming matters more here than in a normal monorepo.** A deliverable
package's name appears in a *client's* import statements long after Prism3 is out of the
picture. `code-library` is meaningless there; so, nearly, is `web`.

## 2. Layout: `apps/` + `packages/`

The standard monorepo convention (Turborepo, Nx) happens to map exactly onto the eject
boundary, which is why it's the right one here rather than merely conventional:

```
prism3/
├── Prism3/                  # the engine — stays at root (see §8, deliberately out of scope)
├── apps/                    # things we RUN. Never ejected.
│   ├── studio/              # @prism3/studio    (was: web)
│   └── plugin/              # @prism3/plugin    (unchanged name, new location)
├── packages/                # things we SHIP. Every one of these can eject.
│   ├── tokens/              # @prism3/tokens          ← Style Dictionary lives here (§6)
│   ├── web-components/      # @prism3/web-components  (the canonical implementation)
│   ├── react/               # @prism3/react           (thin wrapper over the headless core)
│   └── core/                # @prism3/core            (framework-agnostic behaviour)
└── Tokens/                  # legacy hand-built layer + regression target
```

`apps/` = we run it. `packages/` = a client installs or inherits it. A reader can tell which
side of the boundary anything is on from its path.

**Nesting also fixes a real defect:** a top-level `tokens/` directory is *impossible* today —
`Tokens/` already exists, and the owner's filesystem is case-insensitive (macOS). Under
`packages/` the collision disappears.

## 3. The renames, and why they're cheap now and expensive later

**`web` → `apps/studio` (`@prism3/studio`).** Two reasons, and the second is the load-bearing one:

1. It is a *dashboard / theme studio*, not a web SDK. `@prism3/web` is the least descriptive
   name in the repo.
2. **It occupies the namespace the component library needs.** `@prism3/web` (a dashboard)
   sitting beside `@prism3/web-components` (a component library) is a permanent source of
   confusion, in our own repo and on npm. Renaming a private workspace app costs an
   afternoon; renaming a published package that clients import costs a deprecation cycle.

**`plugin` → `apps/plugin`.** Location only; `@prism3/plugin` is already correct.

## 4. Component libraries: named by framework, not by category

**Decision: `@prism3/web-components` + `@prism3/react`, not `@prism3/components`.**

`19` §2 currently specifies `@prism3/components`. That was written before the multi-target
plan in §3 hardened, and the field says it's the name you outgrow at exactly the moment a
second target lands — which §3 explicitly plans.

The precedent is unusually direct. **Carbon's `packages/` still shows both generations side
by side**, because they lived through this migration:

| Their legacy names | What they moved to |
|---|---|
| `carbon-components` | `web-components` → `@carbon/web-components` |
| `carbon-components-react` | `react` → `@carbon/react` |

Fluent independently landed the same shape (`@fluentui/web-components`,
`@fluentui/react-components`). Adobe likewise scopes by target (`@adobe/react-spectrum`).
Nobody with two framework targets keeps a bare `components`, because it can't disambiguate
them.

Second Carbon lesson, which §6 leans on: **they keep tokens in packages separate from
components** (`themes`, `colors`, `type`, `motion`, `elements` vs `react`, `web-components`).

## 5. AEM and Drupal are integrations, not parallel libraries

The owner flagged possible AEM/Drupal support. The important POV is that **this does not
imply more component libraries** — and the reason is the decision `19` §3 already made.

Neither target is npm-shaped: **AEM** components are Java + HTL, delivered via Maven;
**Drupal** components are PHP + Twig (SDC), delivered via Composer. A parallel component
implementation for each would be three re-implementations of the same anatomy — precisely
the fork-per-target cost `19` §4 exists to kill.

But both platforms **render HTML and can consume custom elements**. That is the whole reason
`19` §3 chose *"WC as the neutral primary… matches deployment-neutrality (`15`)"*. So the
shape is:

```
packages/web-components/     ← the implementation
        ↑              ↑
   AEM integration   Drupal integration    ← thin adapters; author the markup, consume the elements
```

An AEM or Drupal deliverable is a **thin integration layer** (component templates that emit
our custom elements, plus the token CSS), not a fourth component library. Those integrations
live outside npm and are therefore **outside `packages/`** — filed when real, not scaffolded
now.

**Consequence worth stating:** this raises the stakes on WC being genuinely framework-neutral
and SSR-friendly, because three delivery targets depend on it rather than one.

## 6. Where Style Dictionary goes — the blocking answer

**`packages/tokens/` (`@prism3/tokens`).** Not inside `web-components`, not inside `react`,
not a standalone top-level directory.

Five reasons, in descending strength:

1. **Both component libraries consume the same token output.** Putting the build inside
   either one forces the other to depend on it — a sibling dependency that `19` §2's
   ejectability discipline explicitly forbids ("no monorepo-internal runtime coupling").
2. **`19` §2 already describes two artifacts**: the client installs *"`@prism3/components`
   **+ their generated tokens**."* Two things → two packages. Style Dictionary produces the
   second.
3. **Its input and output are both token-shaped** — DTCG in from the engine, platform files
   (CSS custom properties, SCSS, JS, iOS/Android) out. Nothing about it is a component concern.
4. **Carbon precedent** (§4): tokens are separate packages from components.
5. **The evidence from the spike itself.** PR #606 found that Style Dictionary 5.5.0 with
   `usesDtcg: true` emits `551 leaves → 551 CSS vars, 1:1` and is *silently blind to
   `$extensions`* — 133 wrong values for dark mode. That is a **token-contract** problem, and
   it belongs in the layer that owns the contract, not in a component package that would
   inherit the bug without owning the fix.

### What this deliberately does not decide

`19` §7 item 4 (**#253 — per-brand token package vs. runtime token loader**) stays open.
Style Dictionary is required under *either* answer: a per-brand package needs SD to build it,
and a runtime loader still needs SD to produce the CSS custom properties it swaps. So siting
the implementation does not pick a side.

This is called out explicitly because `19` §7 item 1 records the exact failure mode — an
architecture decision settled "as a side effect" of somewhere-to-put-the-work. Naming the
directory is logistics; #253 is architecture; they are being kept apart on purpose.

## 7. Delivery model — already decided, mechanism still open

`19` §2 settled the *what*: **both modes ship from one source.** Core library as an npm
package (stays connected, updates flow), or eject into the client's repo and cut the cord —
*"a packaging operation, not a repo split."*

What is **not** specified anywhere is the **mechanism**: whether ejecting is a CLI
(`npx @prism3/create`), a documented copy procedure, or a template repo. The owner raised
this directly. It is genuinely open and worth its own decision issue rather than an
assumption baked into the layout — the layout above supports all three.

## 8. Out of scope, deliberately

- **Moving the engine.** `Prism3/engine` is referenced by every doc, every CI step, and every
  `npx tsx Prism3/engine/…` command in the repo. It is conceptually `packages/engine`, but the
  churn is large and the benefit is cosmetic. Stays at root; revisit only if it ever publishes.
- **#252** (WC-first ordering, author-vs-wrap headless). §4 names the packages; it does not
  decide what goes inside them.
- **#253** (brand-token flow) — see §6.
- **The eject mechanism** (§7).
- **~~`Tokens/`~~ — REVISITED, and reversed (#649, 2026-08-07).** The original verdict was: *"the
  legacy layer keeps its name; it is a fixture, not a deliverable."* That reasoning was sound on its
  own terms — a fixture earns less naming care than a shipped surface — but it weighed the wrong
  cost. The name was not merely untidy; **it had already spent a decision.** §2 above records the
  consequence in its own words: a top-level `tokens/` was *impossible* because `Tokens/` existed on a
  case-insensitive filesystem, so `packages/tokens` was constrained by a capital letter rather than
  chosen on merits (the nesting turned out to be right anyway — but that is luck, not design). A
  fixture that vetoes a package name is not a cost-free fixture. Renamed to **`reference/`**, which
  names what the corpus is *for* — the hand-built systems the engine is measured against — rather
  than what it contains. Deliberately **not** `tokens/`: a top-level `tokens/` beside
  `packages/tokens/` would trade a capitalization oddity for a real ambiguity, and on this filesystem
  it would re-invite the very collision that prompted the rename. §2's tree and its collision note
  are left as written: the first is a dated snapshot of the layout this doc proposed, and the second
  is the historical reasoning that produced `packages/tokens` — rewriting either would erase the
  evidence for this reversal.

---

*Refs: `19` §2 (ejectability, the two delivery modes), §3 (WC-primary rationale), §4
(fork-per-brand), §7 (open decisions this doc must not preempt); `15` (deployment
neutrality); PR #606 (the Style Dictionary consumption evidence). Field precedent: Carbon
`packages/` (both naming generations visible), Fluent UI, Adobe Spectrum.*
