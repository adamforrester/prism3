## (2026-10-05) — test:chrome holds the running write's "…" at full color while it measures (#2073)

**Status:** test-only. ENGINE unchanged (no change note: nothing emitted moves). CONTRACT unchanged.
Only `apps/studio/test-chrome.mjs` changes.

### What changed

`measure()` now holds the busy label's "…" (`span.p3-spin`) at the start of its `p3-spin-hide` fade
while the chrome audit reads the page, then puts the animation back as it found it: running, paused or
finished, at the same time. Only the span's own animation is held; the arc's spin on `::before` keeps
turning. Every measured state gets the same hold, not just "a write running".

**What the audit claims now:** the "…" at its full color clears 4.5:1. The fading and transparent states
are deliberately not audited. The fade is the spinner's exit, and the full-color "…" is the claim. This is
a call about how the test measures, made by the orchestrator and open to the owner's overrule. The two
other options were weighed and left: wait for the fade to finish and skip fully transparent text (the "…"
would then not be measured at all while a write runs), or exempt the "…" while it fades (treats it as
decorative). Both change what the audit claims.

### The diagnosis

The fade starts 300 ms after the busy label appears (`3 × --p3-dur-fast`, 100 ms each) and runs 100 ms.
On an idle machine the audit reads the "…" about 83 ms in, before the fade, at 18.13:1. Under load it can
land inside the 300 to 400 ms window, which is the 2.85:1 the issue reports. Held at fixed times with the
real `measure`/`check` (figma light 1280, the code before this change): t=330 and t=350 pass, t=370 fails
at 2.53:1, t=400 (finished) fails at 1:1. With the hold, all four pass.

### A trap for whoever re-checks this

**The audit does not skip transparent text.** `PROBE`'s text loop measures any element with a text node,
and `shown()` drops only `display: none`, `visibility: hidden` and `opacity: 0`. A text color's alpha is
never checked, so a fully transparent "…" composites to its ground and scores 1:1. The obvious fix,
"wait for `getAnimations()` to finish, then measure", therefore turns a sometimes-failure into an
always-failure. The audit only ever passed on the "…" because it measured early.

### Mutation

The probe pauses the fade at t=370 before the "a write running" audit. Without the hold:
`✗ figma light 1280 / a write running, fade held at t=370: every chrome text node clears 4.5:1 (3:1 large) — text span.p3-spin "…" 2.53:1`.
With the hold, the same held time passes, and the fade is back at t=370, paused, after the measure.

**A color mutation must be pale against the inverse ground, not the page.** The "…" sits on the primary
button (`--p3-inv-bg`: near-black in light, near-white in dark). In review, `.p3-spin { color: var(--p3-line-1) }`
passed all 15280 assertions, and `main`'s audit passed it too. The mutation was applied, but a page-ground
hairline color is high contrast on the inverse ground: 14.04:1 in light, 10.95:1 in dark. `color: var(--p3-text-2)`
is effective. With the hold, `test:chrome` fails 6 of 15280, all by name, for example
`✗ figma light 1280 / a write running: every chrome text node clears 4.5:1 (3:1 large) — text span.p3-spin "…" 3.52:1`
(3.6:1 in dark).
