## (2026-11-20) — `lint-voice` reads the plugin bundle, and an unbuilt bundle is reported as unbuilt (#948, #949)

**#948: the voice rules read `apps/plugin/dist`.** #937 put the plugin bundle (`main.js`, `ui.html`) in
`lint-us-english.ts` and left `lint-voice.ts` behind, so the component defs' prose that ships there met no
voice rule. #1099, the blocker the issue's comment named, is closed: the bundle carries a hash now, not a
developer's path. So the widening went ahead:
- The voice rules now walk both files through `walkRequired`, and each file is claimed in its own
  `REQUIRED_SURFACES` entry.
- `ui.html` is stripped of comments like a `.js` bundle, because it inlines the UI script.
- Measured when it landed: one §2 hit, "rather than just true" in a materialization-rename rule's `why`,
  reworded (DRAFT). The three "simply" the issue measured in August had gone since.
- Main's gate is clean over a plugin bundle carrying that "just"; this one names it at `main.js:24090`.
  With `ui.html` alone moved aside, the scope check names `ui.html` alone. A third file in `dist/` fails as
  unclaimed.
- The headers, `verify.ts`'s `why`, CONTRIBUTING §3 and CLAUDE.md no longer describe the gap as open.
- `ci.yml`'s step comment is the CI lane's to touch, so it was left alone.

**#949: the build command reaches the reader.** The SCOPE check runs before the `blind[]` report and exits.
So a contributor who had not built the bundles was told the gate's scope had shrunk, and was invited to edit
`REQUIRED_SURFACES`. The line saying "not built — run `npm run -w @prism3/plugin build`" never printed.
- Both gates now keep each empty required directory by path. A missing surface whose path lies under one
  prints that directory's remedy, followed by "NOT BUILT, not dropped … Do not edit REQUIRED_SURFACES for it".
- The SCOPE check still runs first, so a scope regression is still never reported as a spelling result.
- A self-check drives the line-building function. With its annotation removed, both gates fail
  `self-check (#949)` by name.

**#3827 was already fixed** on main by #3866 (as #3843): one awaited write, a stated line count, and
`readListing` naming a short delivery. The evidence is commented on the issue. It is not in this diff.
