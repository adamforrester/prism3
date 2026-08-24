# 42 — Current decisions index

> One row per live decision — what was decided, when, and which doc § owns it. The individual docs
> stay the record; this file is the router. See #886 for why this exists and why it is an index
> rather than a fifth vision document.

---

## Why this file, and why not a vision document

Prose staleness in this repo is caught by four gates, and their combined scope is narrow: a stale
**path** (`lint-layout-claims.ts`), an expired **advisory window** (`lint-advisory-expiry.ts`), the
**gate list** drifting (`lint-doc-gates.ts`), a shipped **skill** making a false claim
(`lint-skills.ts`). **Nothing anywhere catches a decision superseded by a later decision.** That was
caught by convention — the repo marks superseded claims (`**Corrected 2026-08-12**`, `**Re-cut**`,
retained superseded-text blocks) rather than deleting them — which works where an author remembers and
is invisible where one doesn't.

The instinct is a single vision doc. That is the wrong shape and the corpus already proved it: three
documents claimed north-star status (`07-e2e-journey`, `11-multi-brand-vision`,
`35-naming-and-packaging`), all three went eight days without a touch while `19` §3's platform
reversal, `38` Arc 4's re-cut, and docs 39/40/41 landed around them. A vision doc restates content that
lives elsewhere, which makes it the fastest artifact in the repo to go stale **and** the one least
amenable to a gate — its claims are prose about intent, not checkable references. A fourth would
freeze like the first three.

**An index is pointers, and pointers are checkable.** `lint-layout-claims.ts` already proves the
pattern for paths — a claimed path must resolve, and a real directory must be described, **both
directions**. The same shape applies here: every decision named below must resolve to a real doc
section that exists, and every doc section marked as recording a decision must appear below. The
second arm is the one that does the work and the one it is tempting to skip — without it this file
silently narrows to whatever someone remembered to add, reports clean, and becomes exactly the
artifact it was built to replace (`docs/34` shape 9).

## The convention

A decision-recording section is a heading — any level from `##` to `####` — matching:

```
Decided (YYYY-MM-DD, #NNN): <title>
```

or, where no single issue owns it, `Decided (YYYY-MM-DD): <title>`. The date and (where present) the
issue number are part of the heading text itself, not metadata beside it, so the gate's detector needs
nothing but the heading. `docs/28` §5.1 and §5.2 are the original two instances this convention is
lifted from verbatim.

**Heading-level, not inline.** An inline `**Decision: ...**` paragraph reads fine but is not a
section a reader can be routed to and is not reliably distinguishable from ordinary bold emphasis at
scale — the same scope-vs-promise gap `lint-doc-gates.ts` (#704) hit checking a whole file instead of
a declared region. A handful of decisions predate this convention and are still written inline:
`docs/07-e2e-journey.md` (two), `docs/20-interactive-color-system.md` §5, `docs/23-dashboard-ia-and-component-system.md`,
`docs/35-naming-and-packaging.md`. **Named here as a known, visible gap rather than migrated
silently** — the friction of a real decision not yet indexable is the feature (same posture
`lint-payload-manifest.ts` and `lint-schema-classification.ts` take: a file not yet classified fails
loudly rather than being defaulted in or out).

`docs/00-progress.md` is exempt by genre, the same exemption `lint-layout-claims.ts` and
`lint-advisory-expiry.ts` grant it: its dated entries describe the repo as it was at the time, so a
decision recorded there is correct prose forever and is not this file's subject — the *topic* doc is.

## The index

| decision | date | doc § | issue |
|---|---|---|---|
| Paint keys are declared by the def, as templates | 2026-08-13 | `docs/28-component-anatomy-schema.md` §5.1 | #758 |
| The engine's rung names are the API, and the default is `md` | 2026-08-14 | `docs/28-component-anatomy-schema.md` §5.2 | #756 |
| Inverse surface-context: cascade to publish, surface as its own Figma collection | 2026-08-20 | `docs/20-interactive-color-system.md` §9.1 | #871 |
| Normalize `on-inverse` and `-inverse` to `.inverse.` | 2026-08-21 | `docs/20-interactive-color-system.md` §9.2 | #891 |
| A colour control's range is decided case-by-case, not by one universal rule | 2026-08-21 | `docs/20-interactive-color-system.md` §9.3 | #894 |
| `docs/34` holds the diagnosis; `CLAUDE.md` holds a countermeasure only when it's unhookable and statable in one clause | 2026-08-22 | `docs/43-agent-instruction-surface.md` | #922 |
| The inverse surface-context is not optional — the `inverse` lever is removed | 2026-08-23 | `docs/20-interactive-color-system.md` §9.4 | #895 |
| A ground is declared, not overridden | 2026-08-23 | `docs/20-interactive-color-system.md` §9.5 | #956 |
| `against` means one thing; a wash declares that it is one | 2026-08-23 | `docs/20-interactive-color-system.md` §9.6 | #963 |
| Overriding a ground re-derives its dependents' ratios; their values stay, and say so | 2026-08-23 | `docs/20-interactive-color-system.md` §9.7 | #964 |

## Known gaps, named rather than silent

- **The four pre-convention inline decisions** listed above under "The convention" — real decisions,
  not yet in heading form, so not yet indexable. Migrating one is a small, welcome PR; the gate does
  not ask for it and does not let it happen invisibly either, since an inline `**Decision:**` is not
  matched by the detector at all.
- **Two more levers can delete guaranteed paths**, found by the sweep #895 prompted and **not** yet
  indexed for the same reason #895 was not until it was decided: `outlineInteraction` at
  `solid-tint`/`none` removes 18 `interactive.*.overlay.*`, and `typography.displayCeiling` below
  `xl` removes up to 3 `type.display.*.strong`. Both are structurally what #895 was, but neither
  resolves the same way — removing those paths is each lever's declared purpose, so the honest fix is
  probably to demote the paths to `brandDependent` rather than delete the lever. That is the owner's
  call; filed as an issue with the measurement, and indexed here once made.

  (#895 itself is now indexed above — it was held out of the table while the decision was still open,
  which is the posture this bullet is repeating rather than a new kind of exception.)

## Maintaining this file

Add a row and a `Decided (date, #issue): title` heading in the same PR that lands a decision. The gate
(`packages/engine/lint-decisions-index.ts`) fails in both directions: a row here that does not resolve
to a real heading, and a `Decided (...)` heading anywhere in `docs/` that has no row here. Run
`npx tsx packages/engine/lint-decisions-index.ts --accept` to append a newly-found heading's row — it
appends only, the same posture `lint-shape-index.ts` takes, so a superseding rewrite of an existing
row still has to be made by hand.

---

*Cross-refs: `34` (gate independence — both-directions is this file's own load-bearing arm),
`28` §5 (the two original `Decided` headings this convention generalizes from).*
