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

`apps/` = we run it. `packages/` = **package-shaped and consumed by name** — it has a
`package.json`, and everything that uses it imports `@prism3/<name>` rather than a relative path.
A reader can tell which side of the boundary anything is on from its path.

**Amended (#650 PR 3), because the original sentence read "a client installs or inherits it" and
that stopped being true the moment the engine moved into `packages/`:** no client inherits the
engine, and `@prism3/tokens` is a gate we run rather than something we ship. Ejection is a
property of the **package** — declared by the package, and true of `web-components`/`react`/`core`
when they exist — not a property of the directory. Reading it as a directory-level promise makes
`packages/engine` look like an eject target and `packages/tokens` like a deliverable, and #625 is
the issue that inherits that imprecision if this is left as it was.

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

  **What PR 1 actually hit (2026-08-08).** Both hazards were real and both landed; the plan above was
  right about the shapes and wrong about one thing worth recording.

  - **Form 2 was the one a reasonable sweep misses.** Five `resolve(here, '..', 'schema', …)` call sites
    survived a substitution written against `'../schema'`, exactly as (a) predicted. Anchoring on the
    sibling *name* found them.
  - **A fifth form the table does not list: the package specifier a sweep itself creates.** Rewriting
    `'../../Prism3/schema/nb-measured.json'` → `'@prism3/engine/schema/nb-measured.json'` is correct
    inside an `import`, and **wrong inside `readFileSync(resolve(HERE, …))`** — an `exports` map is not
    a filesystem path. Three call sites (two plugin tests, `sd.consumer.mjs`) took the substitution and
    would have failed at runtime. The lesson generalizes past this move: **a mechanical sweep that
    changes the *kind* of reference, not just its text, has to be triaged by what consumes it** — import
    specifier or path — because both live inside the same quotes.
  - **`lint-skills.ts`'s detector needed widening, not repointing**, and this is the non-obvious part.
    `Prism3/` is still a real prefix (docs/ and skills/ stayed), so a detector narrowed to
    `packages/engine` would stop matching stale `Prism3/engine/…` references *and report clean* — the
    rename's own failure mode, inside the gate for it. It now matches both prefixes, with a self-check
    fixture asserting a stale path still fails. It immediately caught a genuine stale reference in
    `prism3-theme/SKILL.md`, which is the gate working rather than a nuisance.
  - **The vercel floor paid out on its first real use**, and the outcome is written up in doc 34's shape
    9: the count went 15 → 16 because `example-brands.json` moved *inside* the prefix, which a loose
    floor surfaced as a question and an exact pin would have mis-read as a regression.
  - **A hazard the plan does not have a slot for: the *procedure* files.** `CLAUDE.md` and
    `review-pr.md` both told every agent to symlink the whole `node_modules` directory into a worktree.
    That is correct advice about a repo of paths and a **false-pass generator** in a repo of workspaces —
    workspace links are relative, so through a directory symlink `@prism3/engine` resolves against the
    *main checkout*, and a worktree silently builds and tests the tree you are not working in. Reviewing
    caught it; the sweep could not, because nothing about the string `Prism3/engine` appears in the
    broken instruction. **PRs 2 and 3 should re-read the setup instructions as part of the move, not
    just the references** — the question is not "which paths changed" but "which procedures assumed the
    old shape." The same applies to any future PR that adds a workspace package.

  **What PR 2 actually hit (2026-08-08).** `Prism3/docs` → `docs/`, and it confirmed the sequencing
  argument above paid for itself: because the destination was settled *before* PR 1, this PR did not
  re-sweep a single cross-reference PR 1 had already touched.

  - **The dominant risk was the edit this PR must NOT make.** The prose already wrote `docs/NN` about
    ten to one, so the move repaired **592** references and broke **61**. A sweep that normalized the
    bare form into `Prism3/docs/NN` on its way past would have broken 592 while looking like tidying,
    and **nothing in CI reads a markdown cross-reference.** The load-bearing check was therefore a
    before/after count in both directions (bare **592 → 600** naive / **550 → 583** anchored, prefixed
    **61 → 36**, of which 8 are this write-up naming the move) — not a gate, because no gate exists for
    this. Any future prose move should assert the
    same way, and should carry *two* bases: the naive and anchored bare-form counts differ by exactly
    the prefixed-numbered count (592 − 550 = 42) because the naive pattern also matches the tail of
    `Prism3/docs/NN`. One number would have hidden that; the reconciliation is what makes either
    trustworthy.
  - **The one defect the sweep introduced was relative depth, and PR 3 will face it identically.**
    `apps/{studio,plugin}/README.md` held `../Prism3/docs/NN` — correct from two levels down. Deleting
    the `Prism3/` segment, right everywhere else, yielded `../docs/NN` = `apps/docs/NN`. **A path-segment
    deletion is not depth-preserving, so sweeping one is not a string operation.** Worse, the first
    verification pass missed it because it resolved every reference *from the repo root*, which is true
    of `../docs/NN` as a string and false of it as a path. **Validate a relative reference against its
    containing directory or the check is vacuous** — a Shape-9 gate (a true statement about the wrong
    set). The corrected resolver: 89 references checked, 12 unresolvable, all 12 dated records, 0 live.
  - **Forms 2, 3 and 5 had zero instances, and the reason is worth recording rather than the count.**
    This move relocates *prose*; PR 1 moved *code*. A path only appears as segments, as a template, or
    as a specifier-in-a-path-slot when something consumes it at runtime, and only three references lived
    in a `.ts` file at all — all three in comments and error text inside `lint-voice.ts`. Neither prose
    gate *scans* the design docs; they cite them.
  - **Two stale layout descriptions were invisible to the sweep**, which is the §8 hazard about
    procedures generalized one step further. `Prism3/README.md` drew a tree claiming the directory held
    `docs/`, `schema/` and `engine/`; the root `README.md` listed `Prism3/` as "the generation engine."
    **Neither contains the string `Prism3/docs`**, so neither was in the 61. A reference sweep finds
    references; it cannot find a *description* that has quietly become false. Ask both questions.
  - **`CLAUDE.md`'s layer table was left for this PR on purpose and was worth deferring.** Rewritten once
    against the settled layout, it now carries a deliberately-kept `Prism3/` row marked *transitional*,
    because PR 3 still needs somewhere to point at.
  - **The two-prefix detector cannot be narrowed yet, and PR 3 is where that changes.** `Prism3/` is
    still real after this PR (it holds `skills/`), so #661's self-check still fires when the detector is
    narrowed to `packages/engine` alone — verified on this tree. PR 3 removes the ambiguity and is the
    PR that must prove narrowing is safe rather than merely convenient.

  **THE DECOMPOSITION IS COMPLETE (2026-08-08).** Three PRs, in the order this section planned:
  **#661** (`Prism3/engine` → `packages/engine`, functional), **#663** (`Prism3/docs` → `docs/`,
  editorial), **PR 3** (`Prism3/skills` → `skills/`, a shipped surface plus its gate). `Prism3/` no
  longer exists — the directory, its signpost README, and the transitional `CLAUDE.md` row are all
  gone, and the layout at the top of §1 is reached. What PR 3 found:

  - **The narrowing PR 2 handed forward was the wrong move, and measuring it is what showed that.**
    The brief was to narrow `lint-skills`' two-prefix detector back to `packages/engine` now that
    `Prism3/` cannot occur. Justified by the tree — verified three ways: no directory, **0** tracked
    files under `Prism3/`, no path-consuming construct naming it. But narrowing is a *smaller* allow-list,
    and the shipped skills held `engine/lint-skills.ts` — a stale pre-#650 path that **both** the
    two-prefix pattern and the narrowed one miss, because it carries neither prefix. So the detector is
    now the shape of the **claim** (`*.ts` must exist) rather than a list of places the engine has lived:
    strictly wider than either predecessor, and needing no edit the next time the engine moves. **A
    prefix allow-list can only catch a stale path that is stale in a way the list anticipated, which is
    the one property a stale path never has.** It caught a real defect in a shipped skill on its first
    run — the same way #492's first run did.
  - **"Retire the scaffolding" and "delete the assertion" are different actions.** #661's fixture named
    a directory (`Prism3/engine`); its successor asserts the *class* — both a retired-location path and
    an **unprefixed** one must be read and rejected. The retired-location case is kept, not deleted:
    a skill written before #650 is exactly the input the check exists for, and the directory being gone
    is why the reference is stale rather than a reason to stop looking for it.
  - **A scope move is two edits in the prose gates, and the second is the one that rots.**
    `lint-us-english` and `lint-voice` each carry the `walk()` **and** a `REQUIRED_SURFACES` predicate;
    moving only the walk leaves the promise describing a path that no longer exists. #492 committed that
    exact pair-splitting once already (see doc 32). Both moved together, and both predicates were
    **anchored to the repo root** rather than left as `includes('/skills/')` — the old test could afford a
    substring because `Prism3/skills` was unique by construction, and a top-level `skills/` is not.
  - **The zero-skills floor fired on the move itself**, before any reference was swept: `❌ no skills
    found under Prism3/skills — the layout moved, or the scan is pointed at nothing.` Exactly the design
    intent, and the cheapest possible demonstration that the floor is load-bearing.
  - **Two more descriptions were stale without containing the swept literal**, the #663 class a third
    time: `docs/09`'s repo-layout tree still drew `Prism3/{engine,schema,docs}` with top-level `web/`
    and `plugin/`, and the root `README.md`'s layout table had **no `skills/` row at all** — an omission
    no sweep can find, since the defect is an absent line. Also `apps/studio/README.md` and
    `review-pr.md` both claimed the deployed bundle reads `Prism3/{engine,schema}`, false since #661.
    **Ask what the move made false, not just what it made unresolvable.**

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
