## (2026-11-18) — A Build set result that isn't clean offers "Show the set in Figma" while the file holds the set (#3119)

**Status:** plugin (`show-set.ts`, `main.ts`, `messages.ts`), studio (`write-adapter.ts`, `host-session.ts`,
`shell/activity.ts`, `main.ts`), a new plugin suite `test-show-set.ts`, `test-host-session.ts`, `test:chrome` section
`3119`, the Build components guide and a `patch` change note. `EXECUTOR_REVISION` unchanged (`lint-executor-revision`
agrees). CONTRACT unchanged.

### What changed

- **Owner decision on #3119 (2026-11-18, A):** a bad build offers "Show the set in Figma", only when the set exists. The
  wording was approved as built on 2026-11-18 (`SHOW_SET` in `activity.ts`).
- **Knowing the set exists.** The panel's `fileSets` is only re-read when Update file asks, so it cannot say whether a
  build left the set. The main thread now says so after every Build set, the panel's or an agent's, through one wrapper
  on the action table's entry (`thenTellSet`): `set-in-file { def, inFile }`. It is read by a fresh page-by-page search
  (`searchPagesYielding`, never the cache the build may predate) and `readPresent`'s rule (`setNodeOf`): a set or
  component named the id or a former id, and an icon def's `<id>/…` component. The wrapper sits outside the write guard,
  so the search does not hold up the next write.
- **The show.** `show-set { def }` finds the node the same way, makes its page current (`setCurrentPageAsync`) and fits
  the viewport to it (`scrollAndZoomIntoView`). It reads and changes the view only. It is ignored while a write holds the
  file, and the drawer's button is disabled then too, as Build again is. A set that has gone is answered with
  `set-in-file` false, so the offer goes rather than doing nothing.
- **The drawer.** The panel records which set the last build verdict was about (`componentSet`: the panel's own build, or
  an agent's whose start named it, #2087) and the main thread's word per set (`setInFile`). The components row offers
  the button among its next steps, after Build again and before Copy details, while that word is `true`, and never on
  an update check's result.

### Calls made here, for the owner

- **Wording (approved 2026-11-18):** "Show the set in Figma", the decision's own words, approved as built.
- Offered on every Build set result that is not clean, warnings ("built with problems") included, since those are the
  results next steps are drawn for, and the set is there to see. Also offered on an agent's build: showing a set doesn't
  depend on whose input built it, which is why Build again is withheld from agent results.
- Placed between Build again and Copy details, Copy details staying last (Q3113.4 A).

### The arms

- `test-show-set.ts` (new plugin suite, floor 13): the lookup (set by id, never a frame of that name; an icon def's
  first component; `<id>/…` only for such a def; a former id; none), `pageOf`, `showSetNode`'s order. Through the real
  `main.ts` it checks:
  - `show-set` switches to the set's page and fits the view;
  - a missing set moves nothing and answers `set-in-file` false;
  - a Build set is followed by `set-in-file` after its verdict.
- `test-host-session.ts`: the verdict's set (the panel's, an agent's, none), `set-in-file` per set with the `host`
  topic, and the verdict left as it was.
- `test:chrome` section `3119` (shard 3, after `3263`), plugin, both themes, 1280 and 380, an agent's Build set of Badge:
  - no button before `set-in-file`;
  - the button, labeled, before Copy details once the set is in the file;
  - a click posts exactly `show-set` for badge;
  - `set-in-file` false takes it away;
  - a clean result offers none.
- **Mutations, each failing by name:**
  - main's drawer code fails 8 of 12 in the chrome section;
  - the lend not reading `setInFile` fails 8 of 24;
  - main's `show-set` case and `thenTellSet` both dropped fail 4 of 15 in the plugin suite.
- **Review follow-up (should-fix 1 and two nits):**
  - `test-show-set.ts` holds the guard with a real Theme run and posts `show-set`: nothing moves and nothing is posted.
    The control is a second write refused `busy`, and the same post shows the set once the run ends. Dropping
    `if (guard.held()) return;` from `showSet` fails that arm by name. Floor 13 → 15.
  - `test:chrome` section `3119`: while an agent's Theme runs, the button is aria-disabled and a click posts nothing. It
    fails by name, 4 of 32, with the `aria-disabled` line dropped or with `can` returning true.
  - `test-write-adapter.ts`: `set-in-file` with a non-boolean `inFile` reads as not in the file. It fails by name under
    `=== true` → `!== false`. Floor 123 → 129.

### Guides

- `build-components.md` gains one line naming **Show the set in Figma**, cited to `SHOW_SET`.
- The new code moved sixteen citations in six guides to `main.ts` and `activity.ts`. They are re-pointed through a line
  map of each file's diff against its base, so each still cites the same block (fingerprints unchanged), and
  `lint-guide-claims` holds every one.
- `docs/public/ecosystem/ecosystem.json`: `show-set` joins the Build component sets feature's Figma lane, with
  `show-set.ts` in its sources, so `lint-ecosystem` sees the new plugin message claimed.
