## (2026-11-16) — A plugin or studio test file dropped from its script fails lint-doc-gates by name (#3727)

**What.** `apps/plugin` and `apps/studio` list their test files by hand, in `&&` chains (`test`, `test:verdict`,
`test:roundtrip`, …). A merge that drops one entry left that file unrun with every gate green. `lint-doc-gates.ts`
gains a test-file arm. The expected side is the directory listing: every `test-*.ts` and `test-*.mjs` at each
workspace's root. The actual side is the files named by a `npx tsx <file>` or `node <file>` entry of a script that
`ci.yml` runs for that workspace (`npm run -w <name> <script>` as a whole line, so a comment does not count). A file
in neither fails by name, and so does a file whose only script CI stopped running.

**Helpers.** Studio has four `test-*.mjs` files that are shared modules, not tests (`test-bounded`,
`test-bundle-freshness`, `test-hooks`, `test-web-fonts-stub`). They are named in `TEST_HELPERS` with why. An entry must
still be imported by a file that runs, and must not itself be run, so the list cannot hide a dropped test. The plugin
has none.

**Measured.** The issue's scenario, `&& npx tsx test-report-redaction.ts` removed from the plugin's `test` (and
`test-name-refs.ts` from studio's): main's `lint-doc-gates` prints `✓ clean`; this one fails naming both files.
Disabling the arm's check fails its self-tests by name, and so does counting every script instead of only those CI
runs. 116 test files are checked today.

**Why an arm and not a new gate.** `lint-doc-gates` already parses `ci.yml` and reads the workspace scripts for the
orphan check, and its subject is "what CI runs". A separate gate would re-parse both.
