## (2026-11-01) — lint-us-english sees the `-ring` form of the `-re` stems (`centring`) (#3186)

**Status:** gate change + one shipped comment. ENGINE patch (change note): no committed artifact moves. CONTRACT
unchanged. No executor change.

### What changed

- `prose-rules.ts` gains `RE_RING`, a sibling of `RE_ENDINGS` over the same stem list with the stem's `e` dropped
  before `-ing`: `centring`, `manoeuvring`, `decentring`. `RE_ENDINGS` matches `centre` as a substring, so the
  `-ring` form, which never contains `centre`, was invisible by construction. en-US `centering`/`maneuvering` keep
  their `e`, so the new arm cannot reach them.
- `lint-us-english.ts` SELF_CHECK samples it both ways: `the centring box` and `manoeuvring the thumb` must trip,
  `centering and maneuvering it` must not.
- The wider scan found one shipped occurrence, a `/* */` comment in `apps/studio/src/styles.css`, which ships
  verbatim in the web bundle and in the plugin's `ui.html`. It now reads `centering`. The `toast.md` line #3186 names
  is not on `main`; `out/**` is clean.

### Verification

- Mutation (committed first): `RE_RING` removed from `enGb`'s loop. SELF_CHECK fails by name on
  `"the centring box" should be flagged` and `"manoeuvring the thumb" should be flagged`.
- The reverse: the styles.css fix reverted, bundles rebuilt, and the gate names `centring` in
  `apps/studio/dist/main.js` and `apps/plugin/dist/ui.html`.
