# Change notes

A PR that owes an `ENGINE_VERSION` bump adds one file here instead of editing `version.ts` (#1807).
The note declares the bump class. The fold picks the number.

```
---
engine: minor
---
The changelog prose that used to go above ENGINE_VERSION in version.ts. Write {{ENGINE_VERSION}}
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
- **Prose:** plain text for a code comment. No `*/`, no `{{` other than the placeholder, and no line that opens with a version number or
  with the placeholder, which becomes one once folded. Two changelog entries take two notes
  (`<slug>.md`, `<slug>-2.md`).
- **Once merged, a note is not edited.** It is another PR's declaration until the fold consumes it, and
  `lint-emission-version.ts` fails a diff that changes it. To correct it, add a note of your own.

Do not edit `ENGINE_VERSION` or the changelog in `version.ts`: `lint-emission-version.ts` fails a PR
that is not a fold for doing so. That gate and `lint-component-surface.ts` accept an added note as
the bump. `CONTRACT_VERSION` is not covered here: a PR still bumps it itself.

`fold.ts` at the repo root assigns one version per fold, at the highest class any note declares,
writes the prose under it, deletes the notes and regenerates the stamps. How to fold: `CONTRIBUTING.md`.
