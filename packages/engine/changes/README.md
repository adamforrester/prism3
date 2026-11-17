# Change notes

A PR that owes an `ENGINE_VERSION` bump adds one file here instead of editing `version.ts` (#1807).
The note declares the bump class. The fold picks the number.

```
---
engine: minor
---
The changelog prose, which the fold writes into ../CHANGELOG.md. Write {{ENGINE_VERSION}}
where the number goes; the fold fills it in.
```

- **Name:** your branch name with `/` turned into `-`, for example `lane-merge-independence.md`.
- **`engine` — the bump-class policy:**
  - **`minor`** for any behavior change. Every bump before #1807 was one.
  - **`patch`** only when no committed artifact changes (`regen --check` clean before and after).
    `lint-emission-version.ts` refuses a patch note over a moved emission, and
    `lint-component-surface.ts` does not count one over a moved component surface.
  - **`major`** is refused while `ENGINE_VERSION` is below 1.0, by the gate and by the fold. Going to 1.0
    is the owner's decision.
  - The fold takes the highest class in the batch. A change that owes no bump carries no note.
- **Prose:** plain text, folded into `CHANGELOG.md` as written. No `{{` other than the placeholder, and no line that opens with a version number or
  with the placeholder, which becomes one once folded. Two changelog entries take two notes
  (`<slug>.md`, `<slug>-2.md`).
- **Once merged, a note is not edited.** It is another PR's declaration until the fold consumes it, and
  `lint-emission-version.ts` fails a diff that changes it. To correct it, add a note of your own.

Do not edit `ENGINE_VERSION` in `version.ts`, the changelog in `CHANGELOG.md`, or the version stamps in
`out/`: `lint-emission-version.ts` fails a PR that is not a fold for editing the constant or its
changelog. Run `regen.ts` as usual; your `out/` diff carries your real changes under the old stamp,
and the fold restamps. That gate and `lint-component-surface.ts` accept an added note as
the bump. `CONTRACT_VERSION` is not covered here: a PR still bumps it itself.

## Rename stamps

A rename rule's `since` (#1816) is the other version number a PR would otherwise write. A PR that adds
an entry to `MATERIALIZATION_RENAMES`, `MATERIALIZATION_DELETIONS` or `COLLECTION_RENAMES` stamps it
`since: '{{ENGINE_VERSION}}'`, and writes the same quoted placeholder in `test.ts`'s table for it
(`EXPECTED_SINCE` or `EXPECTED_COLLECTION_SINCE`).

- **The same diff adds a change note.** Another PR's pending note does not count, because the fold may
  consume it before your PR merges. The fold fills both stamps with the version it assigns.
- **An existing stamp never changes**, in a fold or out of one. A rule whose change needs a new stamp
  is a new rule, with a new id, the placeholder and a note. A fold only fills placeholders; it adds no
  stamp of its own.
- In those three files the quoted placeholder is reserved for stamps, because the fold replaces every
  one: a test fixture that needs it builds it by concatenation.

`lint-emission-version.ts`'s RENAME STAMPS arm fails each of these by name.

## The fold

`fold.ts` at the repo root assigns one version per fold, at the highest class any note declares,
writes the prose under it, deletes the notes and regenerates the stamps. How to fold: `CONTRIBUTING.md`.
