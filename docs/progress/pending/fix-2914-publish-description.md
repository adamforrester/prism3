## (2026-11-12) — The publish description says what the publish brings (#2914)

Owner decision A on #2914: the first line of the library publish description that an Update offers reads "Prism3 updated
<sets>." It used to be the named version's title ("Saved before Prism3 updated 2 sets."). That wording fits version
history, but in a publish note it told subscribers what the library was *before*.

### What changed
- `apps/plugin/src/library-about.ts` `publishDescription`: the head is `Prism3 updated <set ids, comma-joined>.` whenever
  the Update changed a set. The ids are the same `changed` list the item lines below it already use. The version title
  itself (`version-title.ts`) does not change.
- `test-library-about.ts`: the three word-for-word literals and the end-to-end Update check now read the new head. A new
  `publish/head` arm feeds `publishDescription` the real title `versionOf` builds, and asserts the head starts "Prism3
  updated <sets>." and never with `MARKER` or a "before". The end-to-end run asserts its description does not open with
  its own saved version's title. `test-build-verdict.mjs`'s drawer fixture quotes the new wording.
- Mutation: putting the head back to `o.title` fails `publish/head: "Prism3 updated <sets>.", never the version title's
  "Saved before Prism3" (#2914)` and `update/publish does not open with the version title (#2914)`, plus the three
  literals: 6 of 69.

### Left open
An Update that saves a version but changes no set (one that only reorders pages) still opens with the version title, as
before. That case is outside the decision, and it is flagged on the PR as an owner decision.
