## (2026-11-06) — Agent adherence setup accepts a build whose only misses are usage panels or members already present (#3466)

The Figma half's `setup` stopped on both kinds of scratch file, because the runner's `send()` throws on any `ok:false`.
A used file answers `build-components button` with `⚠ already built`, and a fresh one builds all 576 variants and the
three sets it nests, then answers `ok:false` because no usage panel was drawn. Test tooling only: the plugin is
unchanged.

- **The diagnosis that made it small.** Both replies are `ok:false` for one reason: the file has no `_Doc-block`, so
  the plugin's missing-template warning turns the build's verdict `⚠`. Members already present are not misses by the
  plugin's own rule (`misses.length === skipped`), so "already built" alone would have been `ok:true`.
- **Read from data, not words.** The agent link strips `causes` from the verdict (`forAgent`), so
  `setupBuildAccepts` reads `completed` from the verdict and the facts the plugin's `ok` comes from in
  `result.data.build`: the report's misses (every one `ALREADY PRESENT`), no stale member, no miss on a set built
  first, and no missing template but `_Doc-block`. Any other `ok:false` still throws, with the reason appended.
- **Setup only.** `send()` takes an `accept` predicate per command key; only `setup()`, now exported, passes one.
  Both sides of `run` stay strict.
- **Self-test.** Five literal replies drive `setup()` through a stand-in client: "already built" and "no usage
  panels" carry on and write `golden.json`; a real miss, panels plus a real miss, and a build that did not complete
  still throw. One more arm shows `send()` without the acceptance still throws on the "already built" reply. With the
  acceptance dropped, `setup/already-built` and `setup/no-usage-panels` fail by name.
