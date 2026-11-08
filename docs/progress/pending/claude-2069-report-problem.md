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
- **No file names, no keys.** The panel never holds the Figma file's name. `scrub` removes a Figma file URL, a run of
  16+ hex characters, and a token-shaped run (20+ letters, digits, `-`, `_`, holding both a letter and a digit). Token
  names, the 8-hex tree token and the short commit stay.
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
- `copyText` (the drawer's, now exported) may select a hidden textarea in `document.body`; the dialog puts focus back
  on its button afterwards, or Escape stops reaching it.
