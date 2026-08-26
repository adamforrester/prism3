# Gate-independence sweep — the unrun recipes

Companion to `gate-sweep-2026-08-26.md`. That note's boundary section lists nine recipes as
"recorded but not run"; **this file is what it was pointing at**, committed because a reference to
an uncommitted map is not a unit of work (CLAUDE.md principle 3). Filed as issue work in #1074;
M16 and M19 additionally called out there by id, because they were the two carrying no issue at all.

## What a row here is, and is not

Each row is a **hypothesis plus the edit that would test it** — not a result. Nothing below has been
run. The register's corollary 2 is why that distinction is load-bearing: a recipe with a
plausible-but-wrong edit sends the next agent to a mutation that changes nothing, and a non-mutation
is indistinguishable from a blind spot until someone reads *why* it passed. This sweep produced two
of those (M3's off-by-one `sed`; R1059-b's first attempt, whose module-scope `process.exit(0)`
killed an importer rather than suppressing a write) — both caught by asserting the diff and by asking
whether the mutated thing is the thing that decides. Do both here.

So every row states its **anchor** — the file and line the edit lands on — with one of two labels:

- **ANCHOR VERIFIED** — the line was read on `950d7dd` and says what this row claims. The *edit* is
  therefore applicable; the *outcome* is still a prediction.
- **ANCHOR UNRESOLVED** — the hypothesis is real and the edit site was **not** confirmed. Resolve it
  before running, and treat any green as unproven until you have.

Three agent-supplied line numbers were stale when checked against the tree (noted per row). Assume
line numbers drift; match on the quoted text.

---

## M4 — lint-paint's header states a blindness the gate may no longer have

**Hypothesis.** `lint-paint.ts`'s header (~:273–280) says a `checkbox` intent-boundary repoint is
outside arms 2/3. But `censusable()` requires only `anatomy`, and `checkbox` has one — so the census
may now reach it. Either result is a finding: a stale claim *about the gate's own blindness*, or a
confirmed decl hole.

**ANCHOR VERIFIED.** `packages/engine/lint-paint.ts:415` — `const censusable = (): ComponentDef[] =>
componentDefs.filter((d) => !!d.anatomy);`. `packages/engine/components/checkbox.ts:197` —
`'checked.icon': 'color.interactive.primary.on-fill',`. (Agent-supplied header line "311–317" was
stale; the claim is at ~:273–280.)

**Edit.** Repoint `checked.icon` to another family, e.g. `color.interactive.destructive.on-fill`.
**Run.** `npx tsx packages/engine/lint-paint.ts` alone.
**Predicted (sound):** `census/checkbox … DRIFTED` — i.e. the header is stale.
**Predicted (blind):** clean, confirming the documented hole.

---

## M6 — lint-context-nodes' vocabulary is a hand list, forward-only

**Hypothesis.** A *new* context segment (`on-dark`, an `inverse`-meaning rename) emitted as a **leaf**
is outside scope entirely; the `total ≥ 9` floor guards wholesale loss, not an additive or partial
move.

**ANCHOR VERIFIED for the claim:** `packages/engine/lint-context-nodes.ts:62` —
`const CONTEXT_KEYS = new Set(['inverse', 'on-inverse']);`.
**ANCHOR UNRESOLVED for the edit.** The agent recipe said "emit a context leaf in `tree.ts`";
`tree.ts` contains no `on-inverse` emission — the semantic color layer is built in `modes.ts`
(`:324`, `:956` discuss the qualifier). **Find the real emission site before running**, and prefer
adding a leaf under an existing role group so the mutation is minimal.

**Run.** regen, then `lint-context-nodes.ts`.
**Predicted:** clean; `token-contract --check` fires for the added path — a versioning reason, not
the shape reason, and it stops firing after a legitimate `--accept`.

---

## M12 — lint-voice's scope omits the root README

**Hypothesis.** `lint-voice`'s `gated[]` lacks the root `README.md` that `lint-us-english` covers, and
its header's account of the divergence (#948) names only `apps/plugin/dist` — so a banned-voice
phrase in the repo's front door ships past both gates with the divergence recorded nowhere.

**ANCHOR VERIFIED** by membership: the root `README.md` appears in `lint-us-english.ts`'s file list
and in neither `lint-voice.ts`'s `gated[]` nor its `REQUIRED_SURFACES`.

**Edit.** Add a §2-banned phrase (e.g. "This makes setup easy.") to `README.md`.
**Run.** both prose gates.
**Predicted:** `lint-us-english` clean (not its rule); `lint-voice` clean (file out of scope).

---

## M16 — GROUND_INPUT is a shared constant under both the refusal and the arm that checks it

**Hypothesis.** Corollary 1 of the register's test: deleting a row deletes the refusal *and* the
arm-D case together, so the arm asserts nothing about removals. What the override sweep then does is
**not** determinable by reading — run it to classify.

**ANCHOR VERIFIED, with corrected lines.** `packages/engine/modes.ts:311` — `export const
GROUND_INPUT: Record<string, string> = {`; the refusal at `:1518` — `if (groundRoles.has(rolePath)
&& GROUND_INPUT[rolePath]) {`. `lint-ratio-truth.ts:78` imports it; `:127` and `:260` filter
`OVERRIDE_CASES` on the same table. (Agent-supplied "301–304" and "1437" were both stale.)

**Edit.** Delete the `'background.primary'` row from `GROUND_INPUT`.
**Run.** `lint-ratio-truth.ts`.
**Predicted (partly unknown):** arm D silent for that ground; the removed ground re-enters
`OVERRIDE_CASES` (it no longer has an input) and is swept by arms A/B — **whether that sweep goes
red is the thing to measure.** Report which arm fires, by name.

---

## M19 — smoke's 2.0 floor vs the defect it was built for (shape 14, register row 2026-08-13)

**Hypothesis.** The floor sits below the motivating case. Re-introducing the fade should render
`.mo-playnote` at roughly 3.0:1 and pass a 2.0:1 floor.

**ANCHOR VERIFIED, and the reason this recipe exists.** `apps/studio/src/styles.css:646` is now
`.mo-playnote{font-size:10.5px;color:var(--muted)}` — **no opacity**: the defect was fixed at source,
so the sweep can never re-encounter it and no fixture keeps it. That is the register's own
"a threshold with a named motivating defect and no test of it is a comment rather than a bound."

**Edit.** Add `opacity:.68` to that rule. **Run.** `npm run -w @prism3/studio build` then `test:smoke`.
**Predicted:** both gates green. **The ~3.0 figure is a prediction, not a measurement** — record what
it actually renders, since the gap between it and 2.0 is the size of the finding.

---

## M21 — check-ignore's recognized set vs the bundle's real out-of-studio inputs

**Hypothesis.** docs/34's own stated "third revision" for this gate is unimplemented: the detector
recognizes `packages/engine/` only, so a bundle input from anywhere else is in neither the
recognized set nor `vercel-ignore.sh`'s `EXCLUDED`/`PATHS` — it would skip deploys silently and
pass the gate.

**ANCHOR VERIFIED for the mechanism** (`ENGINE_PREFIX` in `apps/studio/vercel-ignore-check.mjs`, plus
the two floors). **The import target is a CHOICE, not a fact** — pick any tracked module outside
`apps/studio/` and `packages/engine/` that the studio can actually resolve and that esbuild will
bundle (a `packages/tokens/` or `tools/` module), and use a real export so the build succeeds.

**Run.** `npm run -w @prism3/studio check:ignore`.
**Predicted:** clean, with the new input matching neither classification.

---

## M22 — the joint 2.0–4.5 hole between lint-contrast and smoke

**Hypothesis.** `lint-contrast`'s `PAIRS` is forward-only (nothing asserts every ink token
participates), and smoke's floor is 2.0 — so a *new* chrome pairing landing between them passes both.

**ANCHOR VERIFIED for half:** `apps/studio/src/styles.css:28` — `:root{` — is where the token goes
(e.g. `--hint:#8a8a90`, ~3.4:1 on `--paper`).
**ANCHOR UNRESOLVED for the other half:** the recipe needs that token actually *inked on rendered
text*, and the specific `main.ts` render site was never identified. Resolve it, or the run measures
a declared token nothing paints — which proves nothing about smoke.

**Run.** `lint-contrast`, then build + `test:smoke`.
**Predicted:** both clean.

---

## M26 — the runner's self-checks reach CI only through another file's import

**Hypothesis.** `verify.ts`'s import-time self-checks execute in CI **only** because
`lint-doc-gates` imports it; CI never runs `verify.ts` as a step. A plausible "decoupling" cleanup
removes them from CI with nothing saying so — #657's wider form, applied to the runner.

**ANCHOR VERIFIED.** `packages/engine/lint-doc-gates.ts:131` — `import { GATES, orphanGateFiles,
trackedGateFiles } from '../../verify.ts';`.

**Edit.** Replace that import with locally-defined stand-ins (the refactor a reviewer might suggest).
**Run.** the full list.
**Predicted:** every gate green, with the runner's self-checks no longer executing in CI at all.
**Note:** this mutation is large and easy to get subtly wrong — assert the import is gone *and* that
`lint-doc-gates` still passes for the right reason before believing the result.

---

## M27 — mcp-test's frontmatter probe may be reading its own fixture

**Hypothesis (shape 12).** Journey ⑥ asserts `/frontmatter/i` over `JSON.stringify(payload)` while
the fixture brief is the string `'no frontmatter, just prose'`. If the error payload echoes the
input, the probe passes regardless of what the diagnosis says.

**ANCHOR UNRESOLVED.** The probe's own site is in `mcp-test.ts`; the **mutation site** — where the
brief-parse error message is produced — was not located (`mcp.ts`'s hits are the tool *description*
and the input schema, not the error). Find the error-construction site first.

**Cheaper first step, and it settles the shape without any mutation:** change the fixture brief to
one that does **not** contain the word (e.g. `'just prose, nothing else'`) and see whether the
assertion still passes. If it does, the probe was reading the diagnosis; if it fails, it was reading
its own input.
