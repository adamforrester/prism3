## (2026-11-01) — Chrome motion follow-ups: the closed drawer no longer sinks at boot; the verdict wait fails by name (#3217)

**Status:** studio and plugin chrome, and two harnesses. ENGINE patch (change note): no token, emitted tree or component
surface moves, so CONTRACT is unchanged. No executor change, so `EXECUTOR_REVISION` stays. The three nits from the
independent review of #3213.

### What changed

- **The drawer's exit plays on a real close only.** `p3-drawer-down` (wide) and `p3-strip-down` (380) were keyed on
  `data-open="false"`, which also matches a drawer drawn closed at boot, and one the width changes under. The move was
  0px, so nothing showed, but every settle-wait waited for it. The drawer now marks `data-closing` in the paint that
  turns it from open to closed, and clears it on the exit's `animationend` (or `animationcancel`). Under reduced motion
  the mark is not set: that path plays no animation, so nothing would ever clear it.
- **`test-build-verdict.mjs`'s drawer wait** is the capped `settleMotion()`, the same capped wait as `test-smoke.mjs`
  and `test-start-screen.mjs` (5000ms). The old wait timed out after 3000ms and measured whatever frame it got,
  silently. A tripped cap now fails by name, listing what was still running.
- **`test-smoke.mjs`'s #1069 comment** said the stylesheet transitions no opacity. True when it was written, not since
  #3213. It now says why the carve-out still stays out: the chrome's fades run to full opacity and `settle()` waits
  for them.

### Gates

`test:chrome` §3150 gains three arms on the plugin at 1280 (at boot the closed drawer plays no exit; a narrow → wide
resize under it plays no exit; once the exit ends the mark goes) and one at 380 (the strip appearing closed plays no
exit, which replaces the arm's old carve-out for `p3-strip-down`). DECLARED names the two rules by their new selectors.

Mutations, each failing by name:
- the exit keyed back on `data-open="false"` → `#3150 LIVE figma light 1280: at boot the closed drawer plays no exit`,
  `… a narrow → wide resize under the closed drawer plays no exit`, `#3150 LIVE figma light 380: the strip appearing
  closed plays no exit`, and DECLARED on both selectors;
- the shell never setting `data-closing` → `#3150 LIVE figma light 1280: the drawer sinks on 100ms` and
  `… 380: the sheet sinks back into the strip on 100ms`;
- `SETTLE_CAP_MS` at 1 in `test-build-verdict.mjs` → `#1890 apply-result: every finite animation settles within 1ms
  before measuring — still running: … p3-drawer-up on div.p3-drawer`.

### Trap

Reading the boot arm by running animations alone would pass on the old CSS: a 100ms move has finished long before the
page is ready. The arm reads the closed drawer's computed `animation-name`, which names the exit for as long as the
rule matches.
