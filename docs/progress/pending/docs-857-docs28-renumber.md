## (2026-11-12) — docs/28 §5's subsection numbers are unique again (#857)

`docs/28-component-anatomy-schema.md` had two `### 5.1` headings, from two PRs that each added a subsection under §5 without seeing the other's number: the paint-keys decision (#758) and the slot vocabulary (#784). The slot vocabulary is now `#### 5.1.1`, nested under the decision it follows from. #784 fixed the slot half of the key that #758's move into the def had given away, so the nesting matches the content.

**Why 5.1.1 and not the next free number.** The issue's rule was to append so that no existing citation moves. Every inbound `docs/28` §5.1 citation in the live tree points at the paint-keys decision: `docs/42`'s index row and its convention paragraph, `docs/32`, and `lint-decisions-index.ts`'s header. So the first 5.1 keeps its number. §5.2 to §5.5 are all taken now, so appending would have given 5.6, printed between 5.1 and 5.2. 5.1.1 changes no existing number and keeps the document in reading order. The one citation of the slot vocabulary by number, at the end of §5.1 ("which is §5.1"), now reads §5.1.1. The slot vocabulary is not a `Decided (…)` heading, so `lint-decisions-index.ts` has no row for it and nothing in the index moves.

**Left as written:** `docs/progress/archive/2026-07-08.md` lists "`docs/28` §5.1" among the files the slot-vocabulary work touched. It is a dated record, and the log changes only through a fold.

**Not done:** #857 also asked whether `docs/28` §5 should get the numbering gate `docs/34` has. That is a separate call, and this PR doesn't make it.
