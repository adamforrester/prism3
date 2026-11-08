## (2026-11-08) — Report a problem: palette and custom mode names replaced with [brand] (#3523, Q147 A)

The #3522 review (finding 4) found that with the brand's settings off, a report still carried the brand's palette and
custom mode names, as in `hf/core/palette/tidewater/500` or `mode night-watch`. The owner decided (Q147 A) that those
names are brand input under Q116 A, so they are replaced with `[brand]` too.

### How it works

- `brandWords` (`apps/studio/src/state/report.ts`) now adds each `brandColors[].name` and `customModes[].name` after
  the `id`, `name` and `root`. A name the brand already lists as one of those three keeps that word's rule.
- **Always a whole segment.** Palette and mode names are often ordinary words, so they are returned as
  `{ whole: name }`, and `scrub` matches them only as a whole segment (the same `SEGMENT` bound as a short root), at
  any length. `tidewaters` and `overnight-watchers` stay whole. The `id`, `name` and `root` keep their rules: a
  substring match from 3 characters, a segment match under that.
- `test-report.ts` adds the reviewer's two fixtures as arms. Each mutation fails its arm by name: palette names
  dropped, mode names dropped, and either matched by substring.

### Traps for whoever re-verifies

- The off-state note (`REPORT_COPY.brandOff`) still says only "Its name and token prefix are replaced with [brand]."
  It is now incomplete. New wording is proposed in the PR as the owner's call and is not changed here.
- A plain string in `brandWords`' result still means "the length decides"; only `{ whole }` forces a segment match.
  The existing literal arms that compare `brandWords` output as JSON are unchanged for that reason.
