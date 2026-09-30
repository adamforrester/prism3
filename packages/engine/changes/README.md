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
- **`engine`:** `patch`, `minor` or `major`, by the usual rule (a MINOR when the projected component
  surface grows or shrinks). A change that owes no bump carries no note.
- **Prose:** plain text for a code comment. No `*/`, and no line that opens with a version number.

Do not edit `ENGINE_VERSION` or the changelog in `version.ts`: `lint-emission-version.ts` fails a PR
that is not a fold for doing so. That gate and `lint-component-surface.ts` accept an added note as
the bump. `CONTRACT_VERSION` is not covered here: a PR still bumps it itself.

`fold.ts` at the repo root assigns one version per fold, at the highest class any note declares,
writes the prose under it, deletes the notes and regenerates the stamps. How to fold: `CONTRIBUTING.md`.
