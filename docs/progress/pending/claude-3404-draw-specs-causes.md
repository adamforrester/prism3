## (2026-11-07) — Draw specs verdicts carry causes (#3404)

Every Draw specs verdict that is not ok now carries one cause, so the Activity drawer can say why. It was split out of
#3492 by the independent review's option B and held for #3404's owner questions. **This changes what the drawer
shows.** The drawer already renders `causes` (`apps/studio/src/shell/activity.ts`), so Draw specs verdicts that are not
ok gain a cause disclosure and a new status-line reason. The words are existing headlines and items. No executor code
moved.

### Owner decisions (2026-11-07)

- **#3404 Q1: yes.** Draw specs verdicts carry causes.
- **Q89 A:** each cause's kind follows `runCause`, so the cause's mark matches the headline's: ⚠ → `warn`, ✗ → `bad`.
  The first build mapped "nothing drawn" to `bad`, a ✗ cause under a ⚠ headline; that is gone.
- **Q90 A (#3404 Q2):** a run that drew every panel but has a note is not ok, so its headline reads ⚠
  (`⚠ drew 1 spec panel`), not ✓. Before this, a ✓ headline could post `ok: false`.
- The per-family causes proposal is not decided and stays out.

### The mapping

The cause is the run's own (`subject: null`): `runCause`'s kind and wording from the headline, its reasons the items
the lines already print, or the summary when no set is on the page. So: no set → ✗ / `bad`; nothing drawn or some
drawn → ⚠ / `warn`; all drawn with a note → ⚠ / `warn`; the throw → ✗ / `bad`. The status-line reason moves from the
first line (`Drew n of m`) to the first item.

### Gates

`test-build-completed.ts` section 8a, `causes/draw specs noted` (section 8's own run, every panel drawn with a note),
and section 8b, `causes/draw specs none` (no set on the page) and `causes/draw specs refused` (the host refuses every
new frame), each literal. The `causes/every verdict` invariant no longer leaves Draw specs out. Mutations: the causes
emptied → all three arms and `causes/every verdict`; the kind taken from what was drawn (✗ under ⚠) →
`causes/draw specs refused`; ✓ put back for the note case → `causes/draw specs noted`; the causes keyed on `ok` alone,
ignoring items → `causes/draw specs noted` and `causes/every verdict`.
