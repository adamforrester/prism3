# Block capture

Records **what shape** each block variant is, for the layout-axes corpus (`docs/37`, #693). One JSON
row per variant plus a screenshot, from a real browser.

```bash
npm i -D playwright && npx playwright install chromium      # not a repo dependency — see below
npx tsx tools/block-capture/capture.ts targets.json
npx tsx tools/block-capture/capture.ts targets.json --viewports desktop,mobile --headed
```

Output lands in `tools/block-capture/out/`, which is **gitignored on purpose** — see *What not to
commit*.

## Why a browser

`docs/37` §4 records two limits this exists to lift.

**The gated libraries render client-side**, so an anonymous fetch lands on an error state rather than
the component — Relume's preview URLs return *"component not found"* to a plain fetch while rendering
normally in a browser. That is bot/render behavior, not a paywall: **try without a session first.**

**And a screenshot is layout-only by construction.** It cannot give landmark structure or the slot
inventory that approximates a content model, and both are in scope for this tier. A live DOM can, and
that is the reason this harness beats sending pictures.

## What it records, and what it deliberately does not

Per variant, per viewport: section geometry and whether it is full-bleed; surface background color,
computed luminance and a light/dark verdict; heading **levels** and count; the landmark list
(`tag`, `role`, whether it carries an accessible name); media elements with their kind, width ratio
and position relative to the primary heading; whether media sits *behind* the heading or is painted
as a background image; action counts total and filled; list count; and text alignment.

That set is chosen to answer `docs/37` §2's axes mechanically — arrangement, media side, media kind,
alignment, surface, action count, supporting list — plus the one contract no screenshot reaches: KB
`components/section.md`'s **don't-over-landmark** rule, since a page assembled from N of these
multiplies whatever each one declares.

**It never extracts body copy and never serializes markup.** Element counts, geometry, roles and
heading levels only. That is a property of the tool rather than a rule someone has to remember: its
output *cannot* become a copy of a licensed component library. Keep that line if you extend it —
measurements in, no `innerHTML` or `textContent` out.

## What not to commit

`out/` is gitignored, and both halves of that matter. **Screenshots of a commercial product don't
belong in this repo**, and neither does anything resembling their source. What we keep is the derived
axis table in `docs/37` — a taxonomy observed from the field, which is ours — with the library named
as the witness. Two of these libraries are paid products; whether their terms permit automated access
with your own session is the operator's call, and this tool takes no view on it.

## Verify the probe before you trust a run

```bash
npx tsx tools/block-capture/capture.ts --self-check
```

Two fixtures with hand-known shapes, asserted field by field. **This is not ceremony — the probe's
failure mode is a plausible number about the wrong thing, and a corpus built from that is worse than
no corpus.** Its first run caught two defects that read as perfectly reasonable output: the section
under test was excluded from its own landmark count (`0` for a named `<section>`, in the field whose
whole purpose is the don't-over-landmark contract), and every transparent action was counted as
filled, because `rgba(0, 0, 0, 0)` parses to three zeros and reads as black.

Both were confirmed by mutation — revert either fix and the self-check names the failure:
`landmarks: got 0, expected 1`, `filled: got 2, expected 1`.

The fixtures are deliberately **ours**, not captured pages. A captured page holds no independent
answer for what it ought to classify as, so checking against one would compare the probe with itself
and report that as a pass (`docs/34`). **Add a fixture whenever you add a measurement.**

## Running it

`targets.example.json` shows the shape: a `library`, a `family`, an optional CSS `selector` for the
section under test, and the variant list. Without a selector it takes the largest `<section>`/`<main>`
child, which is the section-preview shape these libraries use — **check one row before trusting a
run of fifty**, because a wrong root silently produces plausible numbers about the wrong element.

Environment overrides, all optional: `PW_STORAGE` (a `storageState.json` for a site that genuinely
needs a session — Tailwind Plus does, Relume appears not to), `PW_CHROMIUM` (an explicit browser
path when Playwright's pinned build isn't the one installed), `PW_PROXY`.

**playwright is not a repo dependency.** This repo is dependency-free and buildless, and this harness
runs on a workstation rather than in CI — like everything in `tools/`, it answers a question rather
than asserting an answer, so it is deliberately not wired into `ci.yml`.

## Known limits

- **One classification per viewport pass.** Responsive *behavior* — what reflows and when — needs more than the two sizes here, and the daisyUI Blueprint description (`docs/37` §3) lists it as part of a page-level content model. Not solved.
- **The content model is approximated, not read.** Slot inventory is what the DOM shows; which fields an author may edit is not in the DOM at all.
- **Heuristics that will misread some sections:** "filled" actions are detected by background-luminance distance from the surface, so a ghost button on a tinted band may read as filled; media under 6000px² is dropped as an icon; and `relToHeading` reduces a 2D arrangement to one label.
- Fetched shapes are **a vendor's current business decision**, not a property of the library. Re-test before relying on a row.
