## (2026-11-10) — test-update-fresh: the strict host, and every set must complete clean (#3325)

**Status:** test only, so no engine bump, no artifact moves and `CONTRACT_VERSION` is unchanged.

### What changed

- **The host.** `test-update-fresh.ts` (#3128) patched the root's search to add the raw nodes on its pages. A raw
  node cannot make an instance, so each set that nests another picked one as its instance target and its build went
  wrong. Since #3308 the shim reads a suite's pages itself (`pages`, `liveRoot`, `liveComponents`, `identities`), so
  the suite now uses that, as `test-update-owner-run.ts` does, with no patch. The file also holds every variable and
  style the sets bind under the example brand, so a miss is a real one. The suite leaves the loose-host register
  and `test-loose-host.ts`'s seed, which may only shrink.
- **The oracle.** The suite read only each answer's `type`, so a failed build passed. Each set's answer must now
  have `completed` and `ok` true. Measured on this branch: all 62 buildable sets answer clean. A fixture assertion
  also checks that the host's and the root's methods are fixed, so a patch cannot come back quietly.

### Mutation, failing by name

The #3325 patch put back (the search returning the raw page nodes too, with the strict host opted out):
`fixture: the strict host …` and `sets/button: answered by a component-result that completed, clean
(… {"ok":false,"completed":true} ⚠ 96 misses)`, and the same for every set that nests another (Text field, the
checkbox, radio and switch sets, Tabs, Dialog and the rest).
