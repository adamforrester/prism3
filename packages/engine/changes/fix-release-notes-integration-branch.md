---
engine: patch
---
`lint-release-notes.ts` now reads each release's fold from the `main` a tree carries when the PR's base is a
branch other than `main` (#3863). An integration branch refreshed from `main` by a squash holds a single-parent
commit setting `main`'s version, and the gate took that commit as the version's fold, so it judged `main`'s
release notes against a diff they never had. On `main` and on PRs to `main` the gate reads HEAD's own history, as
before. Gates and tests only; no committed artifact moves.
