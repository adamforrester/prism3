# tools/release: the release record

`prepare.ts` prepares the record of one org-private publish of "Prism3 Studio" and "Prism3 Studio Offline" (#3147,
the owner's Q3147.18 A). **It publishes, tags and pushes nothing.** It writes files and prints the commands, and the
owner runs them.

```bash
npx tsx tools/release/prepare.ts --figma-version <N>             # N: the version number Figma gave this publish
npx tsx tools/release/prepare.ts --figma-version <N> --out <dir>  # somewhere other than tools/release/out/
```

Run it after publishing both plugins from `apps/plugin/release/` and `apps/plugin/release-offline/` (the steps are in
`apps/plugin/README.md`, "Releasing to the organization").

It refuses, and writes nothing, when:
- the checkout is dirty, behind `origin/main` or can't be compared with it (the release build's own check,
  `releaseCheck` in `apps/plugin/git-stamp.mjs`);
- either build folder is missing a file, or a bundle's build stamp names another commit, so the zips would not be the
  bytes that were published;
- the tag `studio-r<N>` exists already.

It writes `tools/release/out/studio-r<N>/`, which git ignores:
- `prism3-studio-r<N>.zip` and `prism3-studio-offline-r<N>.zip`: each folder's `manifest.json`, `main.js` and
  `ui.html` at the archive's root, as Figma imports them (system `zip`);
- `release-note.md`: the draft GitHub release note. It gives Figma's version, the commit, `ENGINE_VERSION`,
  `EXECUTOR_REVISION`, the privacy note for the publish page, the PRs merged since the last `studio-r` tag, and how to
  roll back.

Then it prints, for the owner:

```bash
git tag -a studio-r<N> <commit> -m "Prism3 Studio r<N>"
git push origin studio-r<N>
gh release create studio-r<N> --draft --title "Prism3 Studio r<N>" --notes-file <note> <zip> <zip>
```

**Rollback** is a new publish of the previous record's zip: import its `manifest.json` in Figma and publish it as a new
version, with a note that says "rollback to r<N>".

It is a tool the owner runs, not a gate, so it is not in `ci.yml`. The check it shares with the release build is gated
in `apps/plugin/test-git-stamp.ts`.
