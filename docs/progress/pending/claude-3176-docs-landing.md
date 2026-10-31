## (2026-10-30) — Docs landing page: restyled, eight guides listed, a gated shared stylesheet (#3176, PR 1 of 3)

**Status:** `docs/public/index.html` restyled, new `docs/public/docs.css` and `docs/public/docs.js`, a DOCS arm in
`lint-ecosystem.ts`. No engine behavior, emission or contract change, so no change note. Owner decisions Q3176.1–9,
all A (2026-10-30); this is Q3176.9's first PR.

### What changed

- **The landing page** (Q3176.6 A) lists the eight guides inline, in `guides/index.md`'s order and with its own copy,
  so a task is one click from `/docs/` instead of two. Feature reference moves up beside the Ecosystem map and the
  Agent reference, and Release notes and Reports get their first links: both pages existed with nothing pointing at
  them. Their lines are each page's own first sentence (the Reports line drops the component count, which moves).
  The guide links still open the `.md` files; PR 2 renders them as pages and moves the links to `.html`.
- **A shared header** with an Auto · Light · Dark switch. Auto follows `prefers-color-scheme`; Light and Dark pin a
  theme in `localStorage` (`p3-docs-theme`). `docs.js` loads in `<head>` without `defer`, so a pinned theme is set
  before the first paint. The guide pages reuse both files in PR 2.
- **`docs.css` holds every style** the landing page draws. The page carries none of its own.

### The DOCS arm, and why the old comment was not enough

The landing page's header comment said it "uses the same values for the same roles and adds no pair of its own".
Nothing checked that. The DOCS arm does, against the ecosystem page, whose values the CONTRAST arm already checks:

- each token in each of `docs.css`'s three `:root` blocks equals the ecosystem page's value in the same block, its two
  dark blocks match, and every `var(--…)` it reads is one it defines;
- every text-on-ground pair it draws is in `PAIRS`. A rule that sets `color` and `background` together draws that
  pair; every other ink may land on every ground set without an `--on-*` ink beside it, so the arm counts each of
  those pairs as drawn. That is conservative on purpose: CSS inheritance can't be resolved without a browser, and the
  over-count costs nothing while the landing page draws seven pairs;
- no color is a literal, and each page in `DOCS_PAGES` loads `docs.css` and carries no `<style>` or `style=`.

It is an arm, not a gate, so `ci.yml`, `verify.ts`, CONTRIBUTING §3, CLAUDE.md and the PR template don't move.

| Mutation | Fails as |
|---|---|
| `--text-muted` in the light block → `#6a707a` | `DOCS: light: --text-muted is #6a707a in docs/public/docs.css, #545a65 on the ecosystem page` |
| `--bg` in the toggle's dark block only → `#101115` | `DOCS: the two dark blocks in docs/public/docs.css differ …` |
| a rule drawing `--link` on `--surface-raised` | `DOCS: docs/public/docs.css draws --link on --surface-raised, a pair the CONTRAST arm does not check` |
| a `<style>` added to `index.html` | `DOCS: docs/public/index.html carries a style of its own …` |
| a literal `color: #777777` | `DOCS: '.z' sets a color as '#777777' — use a token …` |
| a token the ecosystem page lacks | `DOCS: light: --brand in docs/public/docs.css is not an ecosystem page token` |
| the `docs.css` link removed | `DOCS: docs/public/index.html does not load docs.css` |

### Next

PR 2 renders the guides (Q3176.3 A). PR 3, the report form, waits for the owner's intake address.
