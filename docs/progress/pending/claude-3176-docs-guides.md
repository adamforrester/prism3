## (2026-10-30) — Docs guides: each guide's markdown drawn as a page at serve time and at site build (#3176, PR 2 of 3)

**Status:** new `apps/studio/docs-markdown.mjs` and `docs/public/guides/_page.html`; `docs-route.mjs` and
`build-site.mjs` draw `guides/<name>.html`; guide styles in `docs/public/docs.css`; new arms in `test-docs-route.ts`.
No engine change, no committed artifact (so `regen --check`'s count holds), no change note. Owner decisions
Q3176.3, Q3176.4 and Q3176.5, all A.

### What changed

- **A guide opens as a page.** Before, `/docs/guides/<name>.md` opened as markdown source, with every `src:` citation
  showing and links pointing at other `.md` files. Now `guides/<name>.html` is drawn from `guides/<name>.md`: by
  `serveDocs` on request in dev, and written by `build-site.mjs` for the deploy, through the same `renderGuide`.
  The `.md` files are unchanged and stay canonical: agents, `llms.txt` and GitHub read them. Each page links its
  source.
- **The renderer covers the guides' subset and nothing more** (about 130 lines, no dependency): headings, paragraphs, `-`
  and `1.` lists, tables, bold, italic, code, links (a `name.md` link becomes `name.html`; anchors are GitHub's
  slugs, so `#fragment` links keep working). HTML comments are dropped: the citations stay in the source.
  - `> text` is a message the plugin shows, labeled "Plugin message" (Q3176.4 A: no callout syntax yet).
  - `*[Screenshot placeholder: …]*` is a dashed frame with its caption until the image lands (Q3176.5 A).
- **Every string a page adds lives in `_page.html`:** its slots, and `<!-- part:name -->` fragments for the pager,
  breadcrumb, frame and message, which the renderer cuts out and fills. So `lint-us-english` and `lint-voice`, which
  walk `docs/public/`, scan all of it. A `_`-named file is neither served nor copied by the site build.
- **The page:** the guide list in `index.md`'s order (folded into "All guides" under 760px), the article at 68
  characters a line, "On this page" from the `##` headings (hidden under 1180px), Previous and Next in index order.
  The landing page's guide links move from `.md` to `.html`. `lint-ecosystem.ts`'s DOCS arm now reads `_page.html`
  too, and the new styles draw no pair it doesn't check: table heads sit on `--bg`, frames and messages on `--surface`.

### A trap the mutations found

The first renderer's paragraph branch could take zero lines. A `|` row with no separator under it matched no branch
and stopped the paragraph at once, so the loop never advanced: the "table branch removed" mutation hung the test
instead of failing it. A paragraph now always takes its first line. The `<!--` check was also too weak: a comment the
renderer kept came out escaped, as text, which a check of the raw HTML for `<!--` can't see; the visible-text pattern
now includes it.

### The arms (`test-docs-route.ts`), and the mutations each fails by name

The oracle is the `.md` files on disk, listed and parsed with the test's own patterns, never the renderer's.

| Mutation | Fails as |
|---|---|
| the table branch removed from `renderMarkdown` | `guides/<name>.html has no markdown left in its text`, for every guide with a table |
| HTML comments kept in the source lines | the same line, for every guide |
| `.md` links no longer rewritten | `every link on guides/<name>.html resolves` |
| the nav reversed | `guides/<name>.html's nav lists the guides in index.md's order` |
| the site build writing other bytes | `public/docs/guides/<name>.html is what GET /docs/guides/<name>.html answers, byte for byte` |
| the screenshot branch removed | `guides/<name>.html draws its N screenshot placeholder(s) as captioned frames` |
| the blockquote branch removed | `guides/apply-a-theme.html labels its 1 quoted line(s) as plugin messages` |
| the `_` guard removed from `docsPath` | `GET /docs/guides/_page.html is refused: the template is not a page` |
| the part pattern without `-` (empty breadcrumb) | `guides/<name>.html's breadcrumb names the page` |

### Next

PR 3, the report form, waits for the owner's intake address. Real screenshots replace the frames later, with `.png`
added to the route's types.
