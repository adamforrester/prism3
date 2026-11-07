## (2026-11-07) — Draw specs verdicts carry causes, held for the owner (#3404)

Every Draw specs verdict that is not ok now carries one cause, so the Activity drawer can say why. It was split out of
#3492 by the independent review's option B: whether Draw specs shows causes at all, and which mark each case gets, is
#3404's first owner question. **This changes what the drawer shows.** The drawer already renders `causes`
(`apps/studio/src/shell/activity.ts`), so Draw specs verdicts that are not ok gain a cause disclosure and a new
status-line reason. The words are existing headlines and items; the marks and whether to show them at all are the
owner's call. The PR body lists each visible change under "Owner sign-off needed". No executor code moved.

### The mapping as built

The cause is the run's own (`subject: null`), worded by its headline without the mark, as `runCause` words the other
verdicts. Its reasons are the items the lines already print, or the summary when no set is on the page. The kind is
`bad` when nothing was drawn and `warn` when some panels were drawn, following `messages.ts`' definitions. So
`⚠ drew 0 of 1 spec panels` carries a `bad` cause, a ✗ under a ⚠ headline, where `runCause` would map ⚠ to `warn`. And
section 8's `✓ drew 1 spec panel` verdict, `ok: false` because of a note, carries a `warn` cause under a ✓ headline.
The status-line reason moves from the first line (`Drew n of m`) to the first item.

### Gates

`test-build-completed.ts` section 8b: `causes/draw specs none` (no set on the page) and `causes/draw specs refused`
(the host refuses every new frame), each literal. The `causes/every verdict` invariant no longer leaves Draw specs out.
Mutations: the causes emptied → both arms and `causes/every verdict`; the kind taken from the mark (`runCause` for all)
→ `causes/draw specs refused`; the causes keyed on `ok` alone, ignoring items → `causes/every verdict`.
