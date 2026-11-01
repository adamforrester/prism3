## (2026-11-01) — Running a lane: escape review on bug fixes, a corrections log, owner decisions re-read before Ready (#3240)

Owner decision Q-SI1 A, the process half of a self-check loop. `CONTRIBUTING.md` §4 gains "Running a lane", four rules for every lane:

- **Escape review.** A PR that closes a `type:bug` issue fills a new **Escape review** section in the PR template: which check should have caught the bug and why it didn't, and what was added or filed so it can't escape that way again. `.claude/commands/review-pr.md` has the reviewer check both answers against the diff.
- **Corrections log.** `docs/corrections.md` holds one line per owner correction to agent behavior: date, correction, where it became a rule, PR or issue. It is seeded with the five corrections from 2026-10-31, each citing stance-skills #15, the only record of them. None has a rule in this repo yet, so each says "Not yet" for the weekly retro to close.
- **Re-read before Ready.** Immediately before posting Ready, a lane re-reads the PR's and the issue's comments for owner decisions posted since it started, and applies each or says why not. The incident is #3204's Q3204.4–6. The reviewer checks the same, and a missed decision is blocking.
- **No stalls.** A lane never ends its turn while a long command is still running. The incident is the two stalls of 2026-10-31.

`CLAUDE.md` principle 6 gains one line pointing to the section.

**`lint-doc-gates.ts` arm 8.** The three places that carry the escape review (the template's heading, CONTRIBUTING's rule and the review step) must each keep their marker, as authored literals. It cannot check a PR body, which is not in the tree, so whether a bug fix filled the section in stays the reviewer's call. Mutations: renaming the template heading fails the arm naming the template, and dropping the bold marker from `review-pr.md` names that file. A self-check that cannot fail (`escapeReviewGaps` returning nothing) fails the gate's own self-check by name.
