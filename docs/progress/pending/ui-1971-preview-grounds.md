## (2026-10-04) — UI: Color › Surfaces & fills, the Background and Foreground previews follow the previewed mode (#1971)

**STATUS: branch `ui/1971-preview-grounds`, cut from `origin/main` at `69f09a3e` (S4f, #2040).** UI only: no engine change, no emitted artifact moves, no ENGINE bump, `CONTRACT_VERSION` unchanged. The follow-up S4f named: the owner's confirmed grounds for #1971 (relayed on #2040, 2026-10-03), which replace S4f's white containers (Q81).

### What the user sees on Color › Surfaces & fills

- **Background** sits on `background.primary` for the previewed mode, like every contrast-checking section: in Dark, the dark page. It was white in every mode.
- **Foreground** sits on the **contrast floor** for the previewed mode: the step `foreground.brand` is measured against (its `against`), for example `neutral.050` in prism3 Light, `neutral.100` in harbor Light, `neutral.900` in Dark. A line at the top of its ground names that step: "On the contrast floor (neutral.050)". It was white in every mode.
- Both keep S4f's no-badge rule (Q81). Everything else on the page is unchanged. The Style guide (Brand) is unchanged: it never used the white grounds.

### How

- `sections/kit.ts`: `ground()` takes an optional `bgHex`, which paints the ground a color other than its surface's own while keeping that surface's ink and border set. The Foreground ground is the Page surface's set on the floor's hex: the floor is what the page's inks are measured against, so that set is the one made for it. `whiteGround` and `WHITE_GROUND` are gone (no caller is left). `SgCtx` gains `againstHex(m, k)`, the context's existing resolver for a role's `against` (a role or a palette step), now exposed.
- `preview/surfaces.ts`: Background through `ground(plain, …, page)`; Foreground through `ground(plain, …, page, floorHex)`, then the label (`FLOOR_GROUND_LABEL`, hook `ground-label`) prepended inside its ground. Its ink is `--muted`, the ground's `text.secondary`, which is AA-gated against the floor, and it is chrome to the smoke sweep (no inline ink), so it is held to 4.5:1 there.
- `styles.css`: `.sg-floor-lab` (13px, `--muted`), and 12px between it and the first sub-heading.

### Proof

- **`test:smoke`**, every corpus brand × mode, against the committed emission (`loadEmission`, `emittedPalette`), never the studio's resolver: Background and every other section on the emission's `background.primary`; Foreground on the emission's floor, `foreground.brand`'s `against` in that mode, resolved as a role or a palette step to its hex; the Foreground ground carries the label naming that step (literal wording) and no other section carries one. A sweep-wide arm holds that the corpus has at least one cell where the floor differs from the page, so a Foreground on the page can fail.
- **`test:chrome`** section 18, web and figma hosts, light and dark chrome, every previewed mode prism3 has: the same grounds from `EMITTED_FLOOR` (a new oracle: `foreground.brand`'s `against` in the base tree or under the mode's overlay, resolved to a hex), the same label arm, and an oracle arm that the floor differs from the page in at least one mode. The no-badge arms (Q81) and the QA-I2 marks sweep are unchanged and green.

### Mutations (each after a `wip:` commit, restored with `git checkout -- <file>`, the studio rebuilt)

| Mutation | Failure |
|---|---|
| (a) both grounds back to white (`'#ffffff'` passed to `ground()` for Background and Foreground) | smoke: `✗ prism3 / Surfaces & fills / dark: section Background is a specimen root on the emission's background.primary #0d0d0e — on #ffffff`, `✗ prism3 / Surfaces & fills / light: section Foreground is a specimen root on the emission's contrast floor neutral.050 #e9e9e9 (#1971) — on #ffffff`, and every brand × mode (38 in all, harbor's `neutral.100` included); chrome: `✗ specimen ground: surfaces & fills web light 1280, previewing dark: Background is a specimen root on background.primary #0d0d0e — is the chrome card (#ffffff)`, and its Foreground twin, both hosts, both themes (18) |
| (b) the floor label not drawn | smoke: `✗ prism3 / Surfaces & fills / light: section Foreground names its ground "On the contrast floor (neutral.050)" — read null`, every brand × mode; chrome: `✗ #1971 surfaces & fills web light 1280, previewing light: the Foreground section names its ground "On the contrast floor (neutral.050)" — read null`, both hosts, both themes, every mode (12) |
| (c) Foreground on the page instead of the floor | smoke: `✗ prism3 / Surfaces & fills / dark: section Foreground is a specimen root on the emission's contrast floor neutral.900 #171718 (#1971) — on #0d0d0e`, every brand × mode; chrome: `✗ specimen ground: surfaces & fills web light 1280, previewing dark: Foreground is a specimen root on the contrast floor neutral.900 #171718 (#1971) — is #0d0d0e` (12) |

Run (a)'s chrome run then died later, in an unrelated section, on a 30 s click timeout (`fill-row-icon-brand`'s picker) while another worktree's suite ran on the machine; the unmutated run passed it, and (b) and (c) ran past it. It looks like #2080's load flake, not this change.

### Copy for owner approval

DRAFT, as built:

- **"On the contrast floor (‹step›)"**, the line at the top of the Foreground preview's ground, for example "On the contrast floor (neutral.050)". ‹step› is the palette step the engine measures `foreground.*` against in the previewed mode. "Contrast floor" is the approved row label from S4f.

### Held for the owner

- **Badges on Foreground.** The orchestrator's recommendation the owner confirmed says the floor ground makes Foreground's "badges then describe exactly the surface shown", but the brief for this PR says everything else is unchanged, and Q81 removed them. This PR keeps Q81 (no badges on Background or Foreground). Turning Foreground's badges back on is a one-word change (`plain` to `c`) and the matching flip of the no-badge arms.

### Traps

- **The floor is a palette step, not a role.** `foreground.brand`'s `against` is `neutral.050` (or `neutral.900`), so the oracle resolves it under `core.palette`, after trying it as a color role.
- **In Light, prism3's page is `#ffffff`.** A Foreground mutated back to white fails only where the floor is not white, which is every mode of every corpus brand today; the "floor differs from the page" arms keep the check from going vacuous if that changes.
