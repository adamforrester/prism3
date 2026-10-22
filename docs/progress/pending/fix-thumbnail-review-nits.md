## (2026-10-21) — Library cover: the review's open items (#2893 follow-up)

**S1 was already in.** The retyped-wordmark case (`edited/a retyped wordmark alone reads as edited`) landed with #2893 in `test-cover-frame.ts`; nothing was redone.

**S2, the thumbnail fail-safe.** A host whose `getFileThumbnailNodeAsync` throws now asserts the cover is drawn and `setFileThumbnailNodeAsync` is never called (`thumb/a thumbnail read that throws: never set`). A failed read cannot tell a designer's thumbnail from the default, so the rule must not write. Mutating `settleThumbnail` to read a throw as `null` fails that line by name.

**The unedited-cover-without-version branch.** `drawCover` drew a fresh cover "beside the old one" when an unedited cover had lost its version text, and `coverDue` called that `missing`. `ownCover` returns the first tagged frame, so every Update after would have drawn another. No draw reaches it (a draw always makes the version text, and deleting it moves the fingerprint), but a cover with a recorded print taken after the deletion does. A gone version text now reads `no-version` and writes nothing, edited or not; no new string. The test forges that record and asserts one cover stays on the page. Restoring the old branch fails `edited/no version text, unedited print: …` by name.

**Prose.** The `coverFrame` rule says "Every Update sets the version text while it is there", since it does not when the text is deleted or its font refuses to load. `figma-conventions.json` moves, so the change note is `minor`.
