## (2026-11-12) — Report a problem: every brand-authored path segment is redacted (#3561)

Owner decision A on #3561, which widens Q147: when "Report a problem" leaves the brand out, the redaction treats every
path segment the brand author named as a brand word. Before, `brandWords` (`apps/studio/src/state/report.ts`) took the
brand's `id`, `name` and `root`, plus `brandColors[].name` and `customModes[].name` (#3523). Interactive palette names
and glass role keys leaked through every line that named their variables, #3518's collision refusal included.

### What changed
- `brandWords` also takes `interactivePalettes[].name`, `gradients[].name` and the keys of `glassRoles`, each as a
  `{ whole }` word, so a name inside an ordinary word stays (`lagoons`). `gradients: true` is the engine's default set
  and adds no word.
- `test-report.ts`:
  - The issue's reproduction (an interactive palette's and a glass role's variable in a collision refusal, plus a
    gradient path), opt-in off and on.
  - A **represented, not listed** arm (docs/34). It builds the same brand twice, once with every authored name renamed,
    and takes the keys that differ between the two trees as the authored segments. That way the engine says which
    segments the author named, not `brandWords`' own field list. Every one of them must come out of each of the brand's
    834 token paths, and out of a mode line, as `[brand]`. A guard checks that the diff found every name the fixture
    authors, so the arm cannot pass on an empty set.
  - Mutations: dropping `interactivePalettes`, `gradients` or `glassRoles` from `brandWords` each fails its own
    `#3561 A opt-in: off, … is replaced` arm and `#3561 A every brand-authored segment … — LEAKED seaside / sunrise /
    lagoon`.

### Trap for whoever re-verifies
A glass role keyed on a brand palette emits a compound key (`tidewater-500-alpha`). Scrubbing gives
`[brand]-500-alpha`, which is correct: `-` bounds a whole segment. A check that wants the whole compound to become
`[brand]` reports a false leak.

### Not changed
`REPORT_COPY.brandOff` ("Its name and token prefix are replaced with [brand].") is owner copy (Q-PMR.3). It already
undersold #3523, and it undersells this more. Flagged on the PR as an owner decision.
