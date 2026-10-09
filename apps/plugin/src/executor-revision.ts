/**
 * THE EXECUTOR REVISION (#1098, #2265) — which revision of the component executor wrote a member.
 *
 * The member stamp's plan half moves when the plan moves, and nothing in it moves when only the
 * executor does: 7 of the 22 commits touching the component pipeline between 2026-07-01 and #827's
 * stamp changed `write-components.ts` alone. An in-place update has to see those changes too, or it
 * reports a member the executor now writes differently as current. So the stamp carries this number as
 * its third field, and the update's dry run compares it.
 *
 * A HAND-BUMPED INTEGER, not the bundle's build identity (`PRISM3_BUILD`). A build identity moves on
 * every build, including the ones that change nothing a member carries, so comparing it would mark
 * every member out of date after every release. An integer moves only when someone says the executor's
 * output moved, which is the question being asked.
 *
 * Hand-bumped numbers get forgotten, so `apps/plugin/lint-executor-revision.ts` fails a PR that changes
 * the executor's code at all without raising this number. Raise it by one; the lint does not care by
 * how much, only that it rose. A change that genuinely moves no member output still bumps it, and the
 * cost of that is one dry run that reports members as needing a re-apply with no field difference.
 *
 * Its own file so that the lint can name exactly the files whose change requires a bump, and so that
 * bumping it is not itself a change to those files.
 */
export const EXECUTOR_REVISION = 4;
