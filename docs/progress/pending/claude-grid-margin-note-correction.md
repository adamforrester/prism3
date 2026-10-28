## (2026-10-28) — Grid margin note: a correction note for #3065's 41px sentence (#3070 follow-up)

**What.** #3065's change note `claude-grid-margin-lever.md` says the reference brand's md margin of 44 gives
"whole-pixel 41px columns at 1440 with 24 columns and 16px gutters". #3070 found that true only of the brand's
two-mode desktop spec, not of the engine's 5-breakpoint grid (md is 8 columns; a 44 margin gives 71px columns at
768), and fixed the code comments, but left the note because a merged note is not edited. This PR adds
`claude-grid-margin-note-correction.md`, an `engine: patch` note that names the sentence and corrects it.

**Why this route.** It is the one the rules already sanction: `packages/engine/changes/README.md` ("To correct it,
add a note of your own") and `lint-emission-version.ts`'s ONE WRITER refusal ("the fold writes both under the same
version"). No gate or fold change was needed, so the gate's independence is untouched. The wrong sentence still
reaches `CHANGELOG.md`, with the correction beside it in the same version's section; editing the original note
would have needed ONE WRITER loosened, which is a bigger change than the error.

**Class.** `patch`, because no committed artifact moves (`regen --check` clean). The fold takes the highest class in
the batch, and #3065's own note is `minor`, so the correction adds no version of its own if both fold together.
If the fold consumes #3065's note first, this note folds alone and costs one patch version.
