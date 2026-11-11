## (2026-11-11) — The prose gates read change notes where they are written (Q181 A, closes #3574)

A fold carries every change note verbatim into the served release pages ("In detail", #2650), where
`lint-us-english` and `lint-voice` read it and `lint-release-notes` forbids editing it. No prose gate read
`packages/engine/changes/*.md`, so en-GB in a note merged green and turned the 0.238.0 fold red (#3570). Owner
decision Q181 A: move the check upstream, and read the release pages' carried notes as a dated record.

### What changed

- Both gates walk `packages/engine/changes/*.md` as a REQUIRED surface, with its own `REQUIRED_SURFACES` line, so a
  note is clean before its PR merges.
- Both gates blank a release page's carried notes before the scan (`shippedText`): the `### <slug>` subsections of
  the `.md`'s "In detail" section, up to the next `## ` heading, and each `notes[]` entry's `slug` and `prose` in the
  `.json`, found by their exact JSON encoding. The page's items, headings and the section's intro line are still
  read. The carve fails closed: a release page with no "In detail" heading, or a note not found as encoded, is blind.
- `RELEASE_SELF_CHECK` in each gate samples every edge through `scanText`, the path `scan()` runs. A first draft
  sampled the carve function directly, and removing the carve from `scan()` then failed only on real notes, not by
  name. The split fixed that.
- False positives found on the existing notes, fixed by widening allow-sets: `revising`/`devising` in `NOT_EN_GB`
  (the `-ing` forms of listed verbs), `wrote` in `JUST_ALLOWED` ("the run just wrote"), and a new `NOTE_AS_NOUN`
  context for the `note that` filler. A lower-case `note` right after a determiner, on the same line, is a noun
  ("its note that the def…"). The four real hits are corrected in their notes by the companion PR, under the same
  decision.

### Verification

Mutations, each failing by name in the gate it targets:
- removing the carve from `scanText` gives `release record: a carried note under In detail is the dated record`;
- widening `RELEASE_PAGE` to `docs/public/` gives `…a page outside docs/public/releases/ is not carved` and
  `…the release index is not carved`;
- carving to the end of the page gives `…a section after In detail is still read`;
- blanking the whole JSON gives `…a JSON record's items[].text is still read`;
- dropping the slug carve gives `…notes[].slug is the dated record`;
- passing a page with no heading gives `…a release page with no In detail heading is blind, not clean`;
- dropping the `changes/` walk gives `the gate's SCOPE shrank … the pending change notes`;
- letting `NOTE_AS_NOUN` cross a newline, or ignore case, and dropping `revising`, each fail their own sample.

Against the real 0.238.0 pages from #3570, placed in the tree: with the carve, both pages pass both gates. Without
it, #3570 measured 23 and 4 hits on the same pages.
