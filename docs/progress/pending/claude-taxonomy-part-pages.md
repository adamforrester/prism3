## (2026-10-24) — A part one component nests shares its page (#2989)

Owner decision Q656 A set one rule for where a component's parts are built. A part only one component nests goes on that component's page. The Subcomponents section keeps only parts several components nest. Two earlier one-off calls move under the rule. Breadcrumb Item and its separator join the Breadcrumbs page, which Breadcrumbs leads (this replaces #2666 call 15 A). Code cell joins the Code input page (this replaces Q329 A).

### The check

`assertPartPages` in `apps/plugin/src/file-taxonomy.ts` fails by name on any def that exactly one def nests and that sits on a different page from it. It reads "nested by" off the defs' own `nests` at any depth (anatomy parts and default slot items) through `consumersOf`, and never off the taxonomy (`docs/34`). Two defs have exactly one consumer and still keep their own pages, because they are components a designer places directly. Badge is nested by Tab.Item (S8 O1), and Button.Group by Dialog (#2661, Q363). Both are listed in `STANDALONE_NESTED`, each with its decision, and a listed def that no longer qualifies is reported as stale.

### The move on an existing file

`apps/plugin/src/page-moves.ts` is shared by Update and Set up file. It finds Prism3 sets still on a page an earlier taxonomy gave them (`FORMER_PAGES`) and moves each one to the page the taxonomy names now. A set's labels, backdrop and live usage panel move with it. The nodes are moved, never rebuilt, so ids, placed instances and hand edits are kept (#2956). The set lands clear of the destination page's existing nodes, and the Update's re-spacing tidies the row. A set on any other page, or one a designer built under the same name, stays where it is. **No page is deleted** (a standing owner rule): a page left empty is reported as "now empty, safe to delete". The Update lists the moves in its dry run, puts them in its preview hash and saves its named version first. Set up file saves its own version ("set up the file") before it moves anything.

### Not changed

The component executor did not change, so `EXECUTOR_REVISION` stays at 38: `lint-executor-revision.ts` reads the executor's files and none of them moved. A step's old usage panel that lands on the Breadcrumbs page is replaced by the Breadcrumbs panel the next time that panel is drawn (#2927's family rule). Until then the two panels sit side by side.
