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

- **~~Moving the engine~~ — REVISITED, and reversed (#650, 2026-08-08).** The original verdict was:
  *"`Prism3/engine` is referenced by every doc, every CI step, and every `npx tsx Prism3/engine/…`
  command in the repo. It is conceptually `packages/engine`, but the churn is large and the benefit is
  cosmetic. Stays at root; revisit only if it ever publishes."* The churn half of that was measured
  correctly and has only grown. **The verdict on the benefit was wrong, and one clause names why: it
  hangs the decision on "if it ever publishes," as though the cost lands only on outsiders.** It lands
  on every surface we build ourselves, today.

  **The benefit is not cosmetic: a dependency stops being a path.** Every surface currently reaches the
  engine by counting directories —

  ```ts
  import { brandTheme } from '../../../Prism3/engine/theme';
  ```

  — which expresses a dependency as **filesystem depth**. The same engine is reached at two different
  depths depending on where the importing file happens to sit: **59 relative chains across tracked
  files** — 34 × `../../../` from `apps/*/src/`, 25 × `../../` from the plugin's test files one level up
  — one dependency, two spellings, neither meaning anything. One of those 25 is
  `packages/tokens/sd.consumer.mjs`, which matters more than its count: it is a **third** surface, in a
  third workspace, already reaching the engine by counting directories. **A compiler cannot see a wrong
  count of `../`** — it only sees whether the resulting path exists. #648 broke on exactly this twice in
  a single PR, on `typeRoots` depth and on `readFileSync` paths that were not imports, and **both passed
  typecheck**.

  As a named workspace the count disappears:

  ```ts
  import { brandTheme } from '@prism3/engine';
  ```

  Depth-independent, identical from every surface, and wrong in a way a tool can detect. This matters
  now rather than at publication because the number of surfaces is about to multiply: `19` plans
  `@prism3/web-components` and `@prism3/react`, and §5 above anticipates AEM and Drupal targets. Each
  one otherwise adds its own relative chain to the same engine. **The fragility scales with adoption,
  which is precisely the wrong property for a project going from zero users to many.**

  The rest of the reversal is that the original bullet's subject did not exist. **`Prism3/` is not the
  engine.** It is six unrelated things held together by having been the first directory in the repo:
  `engine/` 154 files, `docs/` 39, `fixtures/` 9, `schema/` 7, `examples/` 3, `skills/` 2. Only
  `engine/` is package-shaped, so "move `Prism3/` → `packages/engine`" was never available as stated —
  it either drags 39 design docs and 2 shipped agent skills inside a package where they do not belong,
  or it requires a home for five other things. That makes this a **decomposition**, not a rename. And a
  repo named `prism3` containing a directory named `Prism3` is a tautology: the name carries no
  information, which is why the capitalization question dissolves here rather than being answered.

  **Target layout:**

  ```
  apps/           studio, plugin              # what we run, never ejected
  packages/       engine, tokens, …           # what is consumed or ejected
  docs/           the design record           # already exists, holding superpowers/
  skills/         the agent surface           # shipped, and not part of the engine
  reference/      the legacy corpus           # done (#654)
  ```

  With **`schema/`, `examples/` and `fixtures/` moving *inside* `packages/engine/`.** The spike proved
  this is required rather than tidiness: left as siblings, every `../schema` reference breaks; moved
  inside, they become `./schema` and the package is self-contained. That is what makes `@prism3/engine`
  a package rather than a directory that happens to have a name. `schema/token-contract.json` keeps its
  principle-5 status unchanged — it must still never become a `regen.ts` artifact.

  **The spike (#650, run in a throwaway worktree) settled the one thing that could have redirected
  this:** the buildless invariant survives. `packages/engine/package.json` carries a name, `type:
  module`, and an `exports` map pointing at `.ts` files — **no build script, no dependencies** —
  because **`exports` is configuration, not a build**, and npm's workspace symlink is enough for `tsc`,
  esbuild and `tsx` alike. Measured, not reasoned about: named subpaths resolve with no `paths` mapping
  (and non-vacuously — a deliberate `@prism3/engine/ramp-NOPE` errors); the studio bundle builds; the
  plugin typechecks in **both** contexts and its bundle carries **0 `node:` builtins**; `tsx` runs the
  engine CLIs from the new home; **`regen --check` stays 104 byte-identical**.

  **Three PRs, not one — engine, then docs, then skills.** Each has a different risk profile, and
  bundling them means a reviewer cannot tell which one broke something:

  1. **`Prism3/engine` → `packages/engine`** (plus schema/examples/fixtures inside) — **functional.**
     All of the payoff and all of the risk: every import, every `resolve()`, every CI command.
  2. **`Prism3/docs` → `docs/`** — **editorial.** No functional risk; the open question is how 39
     numbered docs join a directory that already holds `superpowers/`, and every cross-reference in them
     is written as `docs/NN`. **Decide this before PR 1 even though it lands after** (#658's review): PR
     1's sweep rewrites those same cross-references, so settling the target afterwards means touching
     them twice. Deciding early costs nothing; deciding late costs a second sweep over the corpus PR 1
     just swept. Worth its own decision issue rather than being settled inside a mechanical PR.
  3. **`Prism3/skills` → `skills/`** — changes a **shipped surface** and `lint-skills`' scope. The two
     `SKILL.md` files quote engine paths about themselves, so this one moves the thing being checked
     *and* what checks it.

  **Two execution hazards the spike found, which are the brief for those three PRs:**

  **(a) Sibling and root references exist in four syntactically distinct forms, and a sweep written for
  one is blind to the others.** In the spike they were found *one at a time, each after fixing the
  last*, because each sweep was written against the form in front of it:

  | # | form | example |
  |---|---|---|
  | 1 | string literal | `'../schema/lever-manifest.json'` |
  | 2 | path segments | `resolve(here, '..', 'schema', 'token-contract.json')` |
  | 3 | template literal | `` resolve(here, `../examples/${file}`) `` |
  | 4 | repo-root-anchored | `resolve(repo, 'Prism3/schema/theme-schema.json')` |

  **Anchor the search on the sibling *name* (`schema|examples|fixtures`), not on the surrounding
  syntax.** Sweep once, then assert zero survivors across all four. This is the same shape as #648's
  bare-directory blindness (#651): a sweep anchored on one way of writing a path cannot see another way
  of writing the same path. `Prism3/` is more exposed than `Tokens/` was, because 289 of its 467
  references are markdown prose, where the slashless form ("the Prism3 directory") is how the name
  actually gets written.

  **(b) A rename can silently disable a gate whose detector is anchored on the old name.**
  `lint-skills.ts:163` detects engine references with a hardcoded `/Prism3\/[A-Za-z0-9\/_.-]+\.ts/g`.
  The spike's sweep rewrote its **fixtures** but not its **detector**, so the fixtures stopped matching
  and the gate stopped detecting anything.

  **State this as a rule, not a file list.** An earlier draft of this bullet named 9 gate files and a
  count, and #658's review demonstrated why that is the wrong shape: the list **omitted
  `apps/studio/vercel-ignore.sh`**, whose 5 hardcoded occurrences are the most dangerous in the repo. So:

  > **Every non-`.md` file carrying the literal is a candidate. Triage by how its failure presents:**
  > **loud** (an import or `resolve()` that stops resolving — the compiler or the run reports it) or
  > **silent** (a detector, a glob, a trigger list — it keeps running and matches nothing).

  Sweeping tracked non-`.md` files, `git grep -l 'Prism3/' -- ':!*.md'` returns **49**. That rule finds
  `vercel-ignore.sh` *by construction*, along with `.claude/settings.json` and
  `.github/ISSUE_TEMPLATE/config.yml`, none of which a remembered list contained. A count invites
  transcription; a rule invites a sweep — so the command is written here and the size of the silent
  subset is not. **An earlier draft said "48 carry the literal; the silent set is ~18"; both numbers were
  wrong** (49, and no basis reproduced ~18 — hand classification lands anywhere from 15 to 28 depending
  on whether a doc URL, a comment quoting a command, and an emitted artifact's own prose count as
  detectors). Which is the bullet's own argument turned on it: the fix for a number nobody can reproduce
  is a command anybody can run, not a better number.

  **`apps/studio/vercel-ignore.sh` is the priority, because its failure ships nothing.** Its trigger list
  hardcodes the name — `PATHS=(apps/studio Prism3/schema … Prism3/engine)` — and per the script's own
  header **`exit 0` → SKIP the build**. A stale path there does not fail loudly; it **silently stops
  deploying engine changes**, which is the failure mode `00-progress` already flags as the reason this
  script needs care.

  **And its checker cannot cover the repoint, because it has no self-check.**
  `vercel-ignore-check.mjs:46` filters bundle inputs with `.filter((p) => p.includes('Prism3/engine/'))`
  — a detector holding the same literal. Repointing it alone, with nothing else moved, was measured:

  ```
  Vercel ignore gate — 0 engine files in the bundle, 29 on the skip list.
    ✓ no bundled engine file is on the skip list.
  ```

  **Zero files found, reported as a pass.** So PR 1 owes that gate the fix shape 9 prescribes: **assert
  the bundled-engine-file count is non-zero**, which is exactly the assertion that turns the run above
  into a named failure. Do this *before* the sweep, so the gate can defend itself during it.

  Then **re-run each gate's self-check explicitly rather than trusting a green suite.** Recorded as
  sub-shape 9 in [`34-gate-independence.md`](34-gate-independence.md), because it is a general property
  of renames, not a fact about this one.

  Re-measured on `66c4990`: **467 references** across the repo — 289 markdown, **77 functional**, 11 in
  `ci.yml` — and **215 files** inside `Prism3/`. **The basis matters more than the figures**, because a
  bare count is re-derivable three ways that differ by 2×: *functional* here means **lines** (not
  occurrences) in `.ts`/`.mjs`/`.json` that carry the literal **and** a path-consuming construct
  (`from '`, `require(`, `resolve(`, `readFileSync`, `existsSync`, `writeFileSync`, `import(`),
  repo-wide **including engine-internal** references. Counting occurrences instead gives ~137; excluding
  engine-internal gives ~70. All three are the same repo. **Re-measure before starting, and state which
  you counted** — PR 1 will size its sweep against this number.
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
