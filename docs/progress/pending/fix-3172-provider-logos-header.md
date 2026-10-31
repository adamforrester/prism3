## (2026-10-30) — Provider logos: their own section header on Icons & assets, moved by Update from Brand marks (#3172)

**What.** Owner decisions Q3172.1–3, all A. Icons & assets now carries two Size=Medium `_Section-header`s: the icons'
(the page's lead header, as before) and "Provider logos", 80px over the logo block. Build draws it. On a file built
when the logos had their own page, Update and Set up file move that page's header with the marks (the same node and
id), rewrite its Title while it reads the placeholder or the old name ("Brand mark", "Brand marks") and its Description
while it reads the placeholder, keep any other text a designer typed, and report `Brand marks` as safe to delete. It is
never deleted. A second Update does nothing, and the header is the one a fresh build draws.

**How.** `TaxonomyLeaf.blockHeaders` names a non-lead def with a header of its own and its title (the plural title is
the owner's call, Q3172.2 A, so it is data, not `displayName`). A block's header is tagged with its def (`headerFor`
in the `prism3` namespace). That tag is how a rebuild finds it, and how the page's own header tells it apart: the
lead's present-check and first measure skip tagged headers and the block's components. `blockHeadersDue` is read by
the Update dry run (in the hash, listed, counted as work, with a named version), and `placeBlockHeaders` runs right
after `relocateSets`, so the header is placed over the block where the move left it. It runs whether or not a set moved
this run, which is what fixes the owner's file: an Update before this change moved the marks and left the header
behind, so no move is due now, but the header still is.

**Why a header moves only when it would be the last thing left.** A former page that still holds anything a designer
put there keeps its header, and the block gets a new one. Moving it would strip their page of its title.

**Held for the owner.** All wording is DRAFT: the "Provider logos header: moved from Brand marks to Icons & assets."
line, the "Would place 1 section header" / "✓ 1 section header placed" headlines, and " Section headers placed." in the
version description. The Description is rewritten only while it reads the placeholder. An older Prism3 summary
("…sign-in, wallet, card and social…") is kept as if a designer typed it, because nothing marks which text Prism3 wrote.

**Found, filed separately.** A fresh build of a single-component def lays its grid out from the page origin, so a
provider-logo build onto a page that already holds the icons draws over them. That's the executor's placement, so it's
out of scope here and filed as #3192.

**Verification.** `test-update-apply.ts` § block headers, against the real `previewUpdate`/`applyUpdate`: the
update-in-place arm (`blocks/apply`, `/apply place`, `/title`, `/page kept`, `/verdict`), the owner's file
(`blocks/rerun`), the designer-edited Title kept (`blocks/designer`), idempotence (`blocks/idempotent`), and the fresh
build (`blocks/fresh`, `/fresh lead`). Each mutation in the section header failed the arm it names.
