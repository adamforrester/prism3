## (2026-10-04) — plain words for the shape, motion, layout and type levers, and transitions that name their real curve (#2050, #2005, #2062)

**Status:** DRAFT COPY, held for owner approval (the PR is titled DO NOT MERGE). ENGINE `{{ENGINE_VERSION}}`
(`engine: minor`, not the briefed patch; see below). CONTRACT unchanged
(`token-contract --check`). No lever key moves. `regen` moves only `schema/lever-manifest.json`.

### What changed

- **#2050 and #2005: lever names and descriptions** in `packages/engine/levers.ts`, for 23 levers across
  Shape, Depth & motion, Layout and Type. No PR existed for #2005 (the typography sibling), so it's included.
  Also the three `REQUIRED_WEIGHT_ROLES` lock reasons, which #2005's follow-up comment added. They had named
  code (`type.label.*.emphasis`, `buttonLabelWeight`) in a tooltip.
- **#2062:** each `motion.transition.*` `$description` names the curve its easing role resolves to, not the
  transition's fixed default. `easingRoles.default: 'calm'` now emits `(normal + calm)`, not
  `(normal + standard)`. No corpus brand sets `easingRoles`, so no artifact moves.

### Where the words come from

The Studio already shows its own wording for these levers, so the engine's text follows it rather than
coining a parallel vocabulary:
- **Type:** approved copy on `main` (`TYPE_COPY`, `S63` in `domains/type.ts`).
- **Layout:** the drafts in #2060 (`LAYOUT_DRAFT`).
- **Depth & motion:** the drafts in #2063 (`DEPTH_COPY`).
- **Shape:** S7 has no PR yet. The page still shows the manifest's text, so the owner's rules apply directly
  ("Base radius", "corners").

Two strings are kept verbatim on purpose: "Blur:offset dial" (owner), and density's last sentence (approved
copy, pinned by the smoke suite's `PER_MODE_DENSITY_SENTENCE`). A mechanical check confirms none of these
words appear in the new strings: face, band, rung, muted, ramp, ladder, leading, tracking, category, cut,
weight role, fluid, pill-able. "column" appears only in the layout grid's lever.

### Version class: minor, not the briefed patch

The brief asked for `engine: patch`. `lint-emission-version` refuses it: `schema/lever-manifest.json` is a
committed artifact and it moves, and "anything that moves the emission is a behavior change, and the class
for that is `minor`" (#1807). So the note declares `minor`.

**A trap for whoever re-checks this:** run before committing, the same gate reported "nothing emitted moved,
so no bump was owed" and accepted `patch`. That pass was vacuous: the gate diffs the committed branch against
its base, and nothing was committed yet. Only a run on the committed tree means anything.

### Studio follow-ups (UI lane, not touched here)

These are the Studio's own strings that still name the old wording:
- `apps/studio/src/size-labels.ts`: "the Responsive type lever scales it…". The lever is now labeled
  "Headings scale between mobile and desktop".
- `apps/studio/src/main.ts`: the legacy Layout page's own "Container max" and "Base column count…". S10
  (#2060) replaces that page.

The frozen concept mockups under `docs/superpowers/ui-redesign/` quote the old manifest and are left as
historical design artifacts.
