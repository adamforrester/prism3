## (2026-11-02) — The Activity drawer's monospace text at 10px (#3305)

**Status:** chrome change (`apps/studio/src/chrome.css`, `apps/studio/chrome/tokens.mjs`, `apps/studio/chrome/spec.mjs`),
shared by both hosts, and a new `test:chrome` section, `3305` (shard 3). ENGINE patch (change note): no committed
artifact, emission or component surface moves.

### The change

The owner's decision on #3305: the drawer's mono text, set in JetBrains Mono, drops from the drawer's inherited 12px to
10px. That text is a run's console lines (`.p3-op-summary`), an Update's publish description (`.p3-op-publish-text`) and
the status strip's counter (`.p3-status-n`). Its UI-face text stays at 12px: a bad result's reason, the row's title and
the strip's words. The chrome had no 10px step, so it gains one the way it adds every token. `fs-10` reads the
emission's `core.font.size.10` in `TILE_VARS` and is listed in `SHELL_VARS`. The leading needs no new token. The drawer's
`lh-normal` is unitless (1.5), so the mono lines sit on a 15px line, and the arm reads that height.

### Floors

`lint:contrast` passes, and so do the chrome's text-contrast arms. The mono inks are unchanged (`text`, `text-2`), and
the 4.5:1 floor applies at every size below the large-text threshold. The chrome declares no minimum font size, so
10px breaks no stated floor. Nothing was raised to the owner.

### The arm

Section `3305` checks both hosts, light and dark, at 1280 and 380. On the plugin, it reads the strip planted by a
`run-progress` reading, then an agent's Update result with a reason, two console lines and a publish description,
each read as drawn. The studio runs no write, so it draws no drawer (section 10). There, the same classes are mounted in
its frame and read through the studio bundle's own stylesheet, and the assertion labels say it is a probe. The 10px,
15px and 12px values are literals typed in the test.

Mutation, from a `wip:` commit: `.p3-op-summary`'s `font-size: var(--p3-fs-10)` removed → `#3305 <host> <theme> <w>: a
run's console lines (.p3-op-summary) are 10px on a 15px line, in the mono face (read {"size":"12px",…})`. It fails 8
times, once per host, theme and width, and nothing else fails (48/56).
