## (2026-11-13) — The busy refusal names the write that holds the file (#3718 D3718.1 B)

Since #3718 (#3697 R7) any write holds the whole file, so a request can be refused behind a write other than the one
asked for, but the refusal still read "Update file is already running. Try again when it finishes." whatever held the
file. The owner decided D3718.1 B: name the holder, from `run-guard.ts`'s existing `TITLE` table.

### What changed

- **`busyMessage(held)`** returns `` `${TITLE[held]} is already running. Try again when it finishes.` `` and is called
  with the refusal's `held`, never its `cmd`, at both call sites in `main.ts`: the `refusal` the panel and agent sinks
  are posted, and the message the dispatcher's `refuse` hands an agent. Its DRAFT marker is gone: the words are
  owner-approved (D3718.1 B). The guide sentences #3718 added were approved as written (D3718.2) and carried no DRAFT
  marker in source; the buttons stay as they are (D3718.3).
- **No fallback is needed for an absent `held`.** The plugin's main thread writes the message where the holder is
  always known; the panel shows the message it is sent, so an older host keeps sending its own words.

### For whoever re-verifies

- A build-family holder (a build, an update check, a baseline capture, Draw specs) now reads "Build set is already
  running. …", from `TITLE`, where it read "Update file is already running. …". That follows from B as decided.
- `test-agent-link.ts`'s `busy/words` arms hold the rendered words as literals, including a file setup and an agent's
  build refused behind Theme. Wording the refusal by the asked `cmd` fails the last of them by name.
- The guides' quoted "is already running. Try again when it finishes." stays true; `lint-guide-claims` needed no
  re-stamp, because the cited lines `run-guard.ts:49-52` are still the comment and the function.
