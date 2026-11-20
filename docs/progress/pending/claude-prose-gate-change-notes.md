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
- False positives found on the notes, fixed by widening allow-sets: `devising` and `pairwise` in `NOT_EN_GB`. The
  hits the first CI run listed (8, three of them the real `colour` hits #3574 named) were corrected in their notes by
  #3618, under the same decision.
- Each gate's self-check also samples a second carried note, so a carve that stopped after the first note fails by
  name.

### How it sits beside the 0.238.0 fold (#3798)

While this PR waited, the 0.238.0 fold (#3798) put the release pages in full scope and cleared their false positives
with allow-sets instead: `EN_GB_SLUGS`, `revising`, `nraises`/`notherwise` in `NOT_EN_GB`, `wrote` in `JUST_ALLOWED`,
and `FILLER_NOUN_BEFORE` for "note" as a noun. Those stay. They are widenings, so they are harmless beside the carve,
which blanks the carried notes before any of them is consulted. This PR's own `NOTE_AS_NOUN` was dropped in the
refresh in favor of `FILLER_NOUN_BEFORE`, so there is one noun context, and its `revising` and `wrote` duplicates went
with it. Reading `changes/` then surfaced a note `FILLER_NOUN_BEFORE` missed: "each code-only note that names
motion" (#4174's note), where a modifier sits between the determiner and "note". `FILLER_NOUN_MODIFIED` widens the
allow-set for that case only: one modifier word, a lower-case `note`, on the same line. What this PR adds that `main` does not have is part 1 of Q181 A: the notes are read in `changes/`, before
they merge.

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
- dropping `pairwise` from `NOT_EN_GB` fails its own self-check sample.
- dropping `FILLER_NOUN_MODIFIED` gives `"each code-only note that names motion" should NOT be flagged`; letting it
  cross a newline gives `"the ramp\nnote that it moves" should be flagged as 'filler'`; letting it ignore case gives
  `"Read the guide Note that it moves." should be flagged as 'filler'`.

Against the real 0.238.0 pages from #3570, placed in the tree: with the carve, both pages pass both gates. Without
it, #3570 measured 23 and 4 hits on the same pages.
