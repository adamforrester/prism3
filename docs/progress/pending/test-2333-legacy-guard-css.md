## (2026-10-09) — The removed-legacy guard reads chrome.css selectors and the browser suites' hooks, each surface held by name (#2333)

#2329 (H12) added `test-removed-legacy.ts` to keep what it deleted out of the source, and it read only `.ts` files. The review lane found the gap: `[data-p3="legacy-frame"]` added back to `chrome.css` passed the guard, and `lint:live-css` doesn't read `chrome.css`. Now it does, with three surfaces in the guard:

- **`.ts` under `apps/studio/src` and `apps/plugin/src`.** As before: identifiers and string literals, through the TypeScript scanner. It now also reads a `data-p3="<role>"` inside a string, like the selector `agent-link-ui.ts` queries by.
- **Every `.css` file in `apps/studio/src`** (`chrome.css`, `styles.css`), selectors only. A small tokenizer of its own collects each rule's prelude and skips comments, strings and declaration blocks, so the history comments in `chrome.css` aren't references. A selector fails on a removed hook, on a removed class from a new literal list (`p3-legacy`, the Pages menu's `brandmenu`/`navmenu`/`nav-item`/`bm-*`/`stage-t`/`rail-note`, the mode strip's `modebar`/`modectx`/`mctx-*`, `applystat`, `barmenu-wrap`), or on `[data-layout="legacy"]`.
- **Every `test-*.mjs` in `apps/studio` and `apps/plugin`.** The same TypeScript scan in JS mode, so a hook a suite locates, clicks (`hooks.click(page.locator('[data-p3="…"]'))`) or selects by family prefix fails, and one named in a comment doesn't.

**Represented, not counted.** Step 4 lists each surface literally, apart from the walks that decide what gets read: studio `.ts`, plugin `.ts`, `chrome.css`, `styles.css`, studio suites and plugin suites. Each one must have been read and must have held at least one hook. `styles.css` has no `data-p3` selector, so its row asks for one class selector instead. A further check fails if a walk reads a surface that step 4 doesn't list. Each detector first runs on a planted fixture that holds every name. The CSS fixture also holds the names in a comment, in a quoted declaration with a `}` and `{` inside, in an unquoted `url()` ahead of a nested rule, and in an `@supports` prelude, and none of those may be reported.

### Mutations, each from a `wip:` commit, restored with `git checkout --`

- (a) #2329's surviving mutation, `[data-p3="legacy-frame"] { display: none; }` appended to `chrome.css` → `✗ no selector in apps/studio/src/chrome.css, apps/studio/src/styles.css names a removed hook, class or attribute value — apps/studio/src/chrome.css:1430 [data-p3="legacy-frame"]`. The guard as it stands on `main` passes the same tree 5/5.
- (b) `test-smoke.mjs:2227`'s `hooks.click(page.locator('[data-p3="export-open"]'))` respelled to `pages-menu` → `✗ no browser suite (9 read) names a removed hook or name — apps/studio/test-smoke.mjs:2227 data-p3="pages-menu"`. `main`'s guard: 5/5.
- (c) `chrome.css` filtered out of the CSS walk, with (a) still planted → `✗ apps/studio/src/chrome.css was scanned and held at least one hook — NOT SCANNED`, alone. The scope check is the only one that catches it.
- Also run: the plugin suites dropped from the suite walk → `✗ apps/plugin/test-*.mjs was scanned and held at least one hook — NOT SCANNED`. The tokenizer's comment skip, string skip, `;` reset and at-rule skip were each disabled in a scratch copy, and each one failed the fixture's "not selectors" check, or the `chrome.css` row, by name. The `;` and string arms survived until the fixture got its `url()` and `'} … {'` lines.

### Traps for whoever re-verifies

- **`chrome.css` holds one hook selector today**, `.p3-sg-row[data-p3="sg-group"]`. If a real edit removes it, step 4's `chrome.css` row fails as unrepresented. Move that row to `class` and say why in it; never drop the row.
- A CSS mutation restored with `git checkout --` leaves `chrome.css` newer than the built bundle. Rebuild before any browser suite.
