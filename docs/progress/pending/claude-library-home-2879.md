## (2026-10-23) — Plugin: a library file opens to a library home; one X on the start window; scrim.default behind every chrome dialog (#2879, #2560)

**Status:** PR 1 of #2879, built to the wireframe and the owner's Q613 A (all ten), plus #2560's Q486 A. Plugin and
Studio UI only. ENGINE unchanged (no change note owed: no engine code, no emitted artifact moves). CONTRACT unchanged.
No executor change, so `EXECUTOR_REVISION` stays. Audit (Q613 5) and Rebind (Q613 4) are later PRs.

### What changed

- **Detection** (`apps/plugin/src/file-kind.ts`, new). `restoreToUi` runs it only in its empty branch, so a file with a
  saved brand or an unreadable one never reaches it and #1197's §2 guard is untouched. The main thread posts
  `restore-input-reading`, reads the current page only within 1.5 s (Q613 2 A), and posts a fourth outcome,
  `restore-input-library`, when the page uses a Prism3 library and the file has no Prism3 collection of its own;
  everything else posts `restore-input-empty`, as before. `classifyFile` is the wireframe's table, first row deciding:
  local Prism3 collections (a `modes:owned` stamp) → brand; failed or past 1.5 s → undecided; stamped instances or
  bindings → library; unstamped remote use → undecided; nothing → new. "Local beats remote" lives in the classifier
  alone; the probe reads the page either way.
- **Identity is a stamp Prism3 wrote, never a name**: `memberStamp` on a remote main component (its first half is the
  version the home shows), or `modes:owned` on a remote variable collection. Q613 9 A: until step 0 measures whether
  shared plugin data travels with a published component or collection, a remote node with no stamp is undecided and
  opens the start window with its X.
- **The `teamlibrary` permission** (Q613 1 A), the one source of the library's name. Without it, or when the list does
  not hold the stamped collection, the home says "Prism3 library". `test-manifest.ts` and `lint-release-bundle.ts`
  hold the list in both manifests.
- **The homes** (`apps/studio/src/shell/home.ts`, new; the frame's new `home` layout). The library home: the library's
  name, its version line, the evidence on this page, the agent link, and "Set up a brand in this file…". The minimal
  home, where the X lands on a first run: "No brand in this file". "Reading this file" while the host decides. A home's
  bar names it ("Library file" badge, or "No brand") and draws no brand control: no brand switcher, Contrast, Export,
  Figma menu or Apply Theme, so nothing can apply the placeholder brand into a library file.
- **The agent-link switch** (Q613 3 A). The home's card holds an empty slot that `agent-link-ui.ts` fills with the
  chrome's switch, on the same main-thread state as the bar's Agent tile: both post `agent-link` and both render the
  published `agent-link-state`. The #2961 Minimize tile and its strip work from the home.
- **One X** (Q613 6 A, 7 A), replacing the reopen-only "Close": on every open in the plugin, first run included, and on a
  reopen on the web; the web's first run has none. Escape does what the X does. The X writes nothing and nothing
  remembers it (Q613 10 A). Its tooltip says where it goes: "Close — opens the file without a brand", or
  "Close — back to {brand}, unchanged".
- **The scrim** (#2560, Q486 A, Q613 8 A). The start window and its guard moved from `interactive.neutral.overlay.pressed`
  (white 20% in dark, which lightened the studio behind them) to `scrim.default` (black 40% light, 60% dark), the scrim
  Export and the prune review already sit on, on both hosts. `overlay-pressed` left the chrome's variable map, since
  the build refuses a mapped variable nothing reads.

### Verification

- `test-file-kind.ts` (new, in the plugin's `test`): one case per table row, each built as a file (local collections
  from `file-shim.ts`, stamped by `stampOwnedModes`; the page and the library side built by hand, since the shim models
  neither), plus the budget (before and after Prism3 evidence is read), the hard stop, the counts, the name, a forged
  stamp, and which outcome each kind posts (`outcomeOf`). Mutation: move the local row below
  the library rows → `file-kind: local collections + library instances → brand (got library)` fails. The first try of
  that mutation passed, because the probe also returned early on local collections; the early return is gone, so the
  rule is decided in one place.
- `test:start` §9 (new): reading, the library home with no start window and no editor, the X and Escape on a first run,
  a library answer after a choice changing nothing, a brand file never showing a home, and the home's switch and the
  #2961 strip. Mutation: make the first run's X load a blank brand → `X loads no brand: the minimal home, no editor, no
  brand switcher, and no write posted` fails. §4b and §7 follow the X and the fourth outcome.
- `test:chrome` §28: "start scrim is scrim.default (light|dark)" against the emission's own walk, and the guard's scrim;
  the X on the plugin's first run and its tooltips. §28b (new): both homes at 1280 and 380, light and dark, through the
  chrome's floors (text, edges, targets, fonts, focus rings), the bar's contents, the window over a home, and forced
  colors (the window's edge, title and the X's ring; the switch's track edge).

### Gaps

Each is filed on #2979.

- Not measured: whether shared plugin data travels with a published component or collection into a consuming file
  (step 0). Until it is, a real library file may read as undecided and open the start window with its X.
- Not measured: the probe's speed on a large page. 1.5 s is a budget, not a measurement; a single synchronous host call
  longer than that is not interrupted.
- Not built: the Activity line for a check past 1.5 s ("File check stopped at 1.5 s; opened the start window."), which
  needs a new Activity operation; the wireframe's row 6 (an enabled but unused library), whose identity cannot be
  confirmed without importing from it; remote styles as a signal.
