## (2026-11-01) — Update file copy: the Theme row, the busy refusal and the cover note name Update file (#3264 part 2)

**Status:** plugin and panel copy, built as the owner decided (#3264 decision 2, A). The three new strings are DRAFT,
shown verbatim on the PR for sign-off. ENGINE patch (change note): no committed artifact, emission or component surface
moves. The component executor is unchanged, so `EXECUTOR_REVISION` stays.

### What changed

- **The Activity row for the theme write** reads "Theme" (`OP_TITLE.apply`), the name of the Update file item that runs
  it. The main thread's copy of the title (`run-guard.ts` `TITLE['apply-theme']`) moves with it, as `test-agent-link.ts`'s
  `busy/titles` requires; the drawer's announcements follow from the title ("Theme, Writing to Figma…", "Theme finished.").
- **The busy refusal** reads "Update file is already running. Try again when it finishes." for every write. Since IA v2
  the panel starts every write through Update file, so the refusal names that rather than the step. The refusal's `cmd`
  still names the held operation, so it lands on the right Activity row.
- **The cover note** for a file with no brand (`cover-frame.ts`, the dry-run line and the skip line) reads "the file has
  no brand yet. Run Update file with Theme ticked, then it draws the cover." The old line named Apply Theme, which IA v2
  removed.
- **Two dead strings removed:** `RUN_COPY.order` (`state/build-queue.ts`) and `orderHint`
  (`preview/sections/component-sets.ts`), both "Apply Theme first…", neither read anywhere. The unread copy of
  `orderHint` in `test-chrome.mjs`'s `COMPONENTS_COPY` goes with them.

### Trap for whoever re-verifies

An agent's write that is refused while another agent write runs also reads "Update file is already running", though
no Update file run is out. The PR's Q-block asks the owner about that case.
