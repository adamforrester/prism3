## (2026-11-08) — Report a problem: a diagnostic bundle and a prefilled issue (#2069, Q116 A)

The owner decided (Q116 A) on a no-backend report for now: a diagnostic bundle the person can copy, and a link that
opens a prefilled GitHub issue, with the brand input included only if the person opts in. A backend comes later.

### How it works

- **The bundle** (`apps/studio/src/state/report.ts`, pure): the build stamp (`PRISM3_BUILD`), `ENGINE_VERSION`, the
  host, and each operation's latest result from the Activity drawer (verdict and lines, and whether an agent ran it).
  Built from those fields alone, as Markdown with a "What happened" heading first for the person's own words.
- **The brand, opt-in.** A checkbox, off every time the dialog opens. Off, the brand's settings are left out and its
  `id`, `name` and `root` are replaced with `[brand]` wherever a line carries them (every token name starts with the
  root). The product's own name is never replaced: the house brand carries it, and every result line says it.
- **No file names, no keys.** The panel never holds the Figma file's name. `scrub` removes a Figma file link (with or
  without its scheme), an absolute path (`/Users`, `/home`, `C:\`), an email address, a run of 16+ hex characters, a
  token-shaped run (20+ letters, digits, `-`, `_`, holding both a letter and a digit), and a 22-letter mixed-case file
  key. Token names, the 8-hex tree token and the short commit stay. A brand word under 3 characters (a root can be
  `g`) is replaced only as a whole segment, bounded by the start or end, `/`, `.`, `-`, a space or a quote.
- **The link.** `issueUrl` prefills `github.com/adamforrester/prism3/issues/new`, cut to 7,000 characters with a line
  saying the full report is on the clipboard; both actions copy the whole report first. The plugin posts `open-issue`;
  the main thread opens it with `figma.openExternal` only when `isIssueUrl` holds (this repo's issue form), so the
  offline plugin still makes no network call. `lint-network-reach`'s reason for `github.com` now says so.
- **Placement:** a "Report a problem" button at the foot of the Activity drawer, which only the plugin draws. The web
  has no placement yet. Placement and copy are DRAFT for the owner.

### Traps for whoever re-verifies

- The dialog shows the exact text both actions send; the box is rebuilt as the opt-in changes. A test that reads the
  textarea and the posted URL's body and finds them equal is the check that nothing extra is sent.
- `open-issue` is listed as plumbing in `lint-ecosystem.ts`, beside `open-docs`; whether Report a problem earns a
  feature entry on the ecosystem map is the owner's call. The guide citations that moved are re-cited.
- `URL_LIMIT` (7,000) is held to a literal ceiling in `test-report.ts` and `test-open-docs.ts`, under the roughly 8 KB
  at which GitHub refuses a prefilled issue URL (observed, not documented). The cut backs off a surrogate pair:
  `encodeURIComponent` throws on half an emoji.
- `copyText` (the drawer's, now exported) may select a hidden textarea in `document.body`; the dialog puts focus back
  on its button afterwards, or Escape stops reaching it.
