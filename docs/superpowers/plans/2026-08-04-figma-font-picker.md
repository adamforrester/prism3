# Figma Font Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Populate the typeface library's "Font family name" input with the real font list from Figma, via a native `<input list>` + `<datalist>`, while still accepting a free-typed name.

**Architecture:** The plugin main thread calls `figma.listAvailableFontsAsync()` on `ui-ready`, dedupes to sorted family names, and pushes them over the existing typed postMessage bridge as one new `font-list` message. The shared `web/src` UI caches the list module-level and re-renders; when the cache is non-empty it emits a `<datalist>` wired to the existing input. On web the branch is statically dead (build-time `PRISM3_HOST`), so nothing changes there.

**Tech Stack:** TypeScript (strict), vanilla DOM (no framework), esbuild, `tsx` for tests. Zero runtime dependencies.

## Global Constraints

- **Spec:** `docs/superpowers/specs/2026-08-04-figma-font-picker-design.md` — read it before starting.
- **One PR, one concern.** Do not refactor adjacent code or fix unrelated pre-existing issues.
- **The font list must never enter `BrandInput`, never persist, and never reach `out/*`.** It is an environment fact about one machine at one moment. Leaking it would make emitted artifacts machine-dependent.
- **Font names are external input.** Render them with `textContent` only — never `innerHTML`.
- **US English in all visible UI text and `web/src` comments** (`color`, `gray`, `-ize`). The gate scans the built bundle, so comments in `web/src` are in scope. Code identifiers are exempt.
- **Two-context split:** `plugin/src/list-fonts.ts` and `main.ts` compile with **no `dom` lib** — a `document`/`window` reference is a compile error. `web/src` compiles with **no plugin typings** — a `figma.*` reference is a compile error. Do not defeat either.
- **Zero `node:` builtins** in the web/plugin bundles.
- **No new dependencies.**
- **`tsconfig.main.json` has an explicit `include` array** — a new file that is not added to it is silently untypechecked. Task 2 handles this.
- **Verified API shape** (`@figma/plugin-typings` v1.131): `listAvailableFontsAsync(): Promise<Font[]>`, `interface Font { fontName: FontName }`, `FontName = { family: string; style: string }`.
- **Commit style:** end every commit message with `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`. Write the message to a temp file and use `git commit -F` — heredocs with apostrophes break in this shell.
- **`main` moves fast** (7 commits landed during the design session). Before pushing: `git fetch origin && git rebase origin/main`, then re-run the gates.

---

## File Structure

| File | Responsibility |
|---|---|
| `plugin/src/list-fonts.ts` **(new)** | The only logic worth testing: a narrow `FontsApi` port + dedupe-and-sort. ~25 lines. |
| `plugin/test-list-fonts.ts` **(new)** | Shim test driving the real `listFamilies` with no live Figma. |
| `plugin/src/messages.ts` | One new `MainToUi` variant. |
| `plugin/tsconfig.main.json` | Add `src/list-fonts.ts` to `include`. |
| `plugin/package.json` | Add the new test to the `test` script. |
| `plugin/src/main.ts` | `sendFonts()` on `ui-ready`, try/caught. |
| `web/src/write-adapter.ts` | Widen the `onHostMessage` union; forward in `figmaCommit`. |
| `web/src/main.ts` | Cache + `<datalist>` + conditional guidance copy. |

---

## Task 1: The font-list reader (pure logic + shim test)

Self-contained: no other task depends on it compiling, and it is the only unit with real logic.

**Files:**
- Create: `plugin/src/list-fonts.ts`
- Create: `plugin/test-list-fonts.ts`
- Modify: `plugin/tsconfig.main.json` (add to `include`)
- Modify: `plugin/package.json` (add to `test` script)

**Interfaces:**
- Consumes: nothing.
- Produces: `export interface FontsApi { listAvailableFontsAsync(): Promise<ReadonlyArray<{ fontName: { family: string; style: string } }>> }` and `export const listFamilies: (api: FontsApi) => Promise<string[]>`. Task 3 calls `listFamilies(figma)`.

- [ ] **Step 1: Write the failing test**

Create `plugin/test-list-fonts.ts`. Mirror the assertion style of `plugin/test-write-styles.ts` (a local `ok()` that counts failures and exits non-zero).

```ts
/**
 * Plugin FONT-LIST reader test — drives the real `listFamilies` against an in-memory `FontsApi`
 * shim, so the dedupe/sort is verified with no live Figma.
 *
 *   npx tsx plugin/test-list-fonts.ts
 *
 * Figma returns one entry per (family, style) pair — `{Inter, Regular}`, `{Inter, Bold}`, … — while
 * the typeface input authors a FAMILY. Collapsing those is the behavior being bought, so it is the
 * first assertion. The rest pin the contract the UI depends on: deterministic order (the list feeds a
 * rendered datalist), an empty list is `[]` rather than a throw, and a rejecting API stays rejecting
 * so the caller's try/catch is the thing that decides the failure mode.
 */
import { listFamilies } from './src/list-fonts';
import type { FontsApi } from './src/list-fonts';

let failed = 0;
const ok = (cond: boolean, label: string): void => {
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};

const shim = (pairs: Array<[string, string]>): FontsApi => ({
  async listAvailableFontsAsync() {
    return pairs.map(([family, style]) => ({ fontName: { family, style } }));
  },
});

console.log('plugin FONT-LIST reader:');

// Many styles per family collapse to one entry — the reason this function exists.
const families = await listFamilies(shim([
  ['Inter', 'Regular'], ['Inter', 'Bold'], ['Inter', 'Thin Italic'],
  ['Roboto Mono', 'Regular'], ['Roboto Mono', 'Bold'],
]));
ok(families.length === 2, `duplicate families collapse (5 pairs -> ${families.length} families)`);
ok(families.join('|') === 'Inter|Roboto Mono', `deduped to the family names (${families.join('|')})`);

// Deterministic order: the list renders into a datalist, so a stable sort is part of the contract.
const unsorted = await listFamilies(shim([['Zapfino', 'Regular'], ['Arial', 'Regular'], ['Menlo', 'Regular']]));
ok(unsorted.join('|') === 'Arial|Menlo|Zapfino', `sorted (${unsorted.join('|')})`);

// A font-free environment is a real state, and it must not throw — the UI reads empty as "no datalist".
const empty = await listFamilies(shim([]));
ok(Array.isArray(empty) && empty.length === 0, 'an empty font list yields [] (not a throw)');

// A rejecting API must stay rejecting: the caller's try/catch is what chooses the failure mode, and
// swallowing it here would report "no fonts" for what is actually a broken call.
let threw = false;
try {
  await listFamilies({ async listAvailableFontsAsync() { throw new Error('figma unavailable'); } });
} catch { threw = true; }
ok(threw, 'a rejecting API surfaces as a rejection the caller can catch');

console.log(failed === 0 ? '\nplugin FONT-LIST reader: ALL PASS' : `\nplugin FONT-LIST reader: ${failed} FAILED`);
if (failed > 0) process.exit(1);
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx tsx plugin/test-list-fonts.ts`
Expected: FAIL — cannot find module `./src/list-fonts`.

- [ ] **Step 3: Write the minimal implementation**

Create `plugin/src/list-fonts.ts`. Note the port is structural, so the global `figma` satisfies it without a cast — the same pattern `write-styles.ts` uses for `StylesApi`.

```ts
/**
 * Read the fonts this Figma can actually load (docs/22; the #113 Figma arm).
 *
 * The typeface library authors a font family as a free string, and a name Figma cannot load costs a
 * silent subset of the Text Styles at write time (`applyTextStylePlan` skips-with-warning by design).
 * The main thread knows the real list; this is the reader that hands it up to the shared UI.
 *
 * Compiled under `tsconfig.main.json` (plugin-typings, `lib` WITHOUT `dom`), so this file cannot
 * touch the DOM. Behind a narrow structural port for the same reason as `StylesApi`: it makes the
 * dedupe/sort shim-testable without a live Figma.
 */

/** The one Figma call this needs. Structural, so the global `figma` satisfies it — no cast. */
export interface FontsApi {
  listAvailableFontsAsync(): Promise<ReadonlyArray<{ fontName: { family: string; style: string } }>>;
}

/**
 * The available font FAMILIES, deduped and sorted.
 *
 * Figma returns one entry per (family, style) pair, so a few hundred families arrive as several
 * thousand entries. The input this feeds authors a family, so styles are dropped here rather than in
 * the UI — it keeps the message payload honest about what it can drive. Per-style/weight validation
 * is a separate concern (see the spec's out-of-scope list).
 *
 * Errors are NOT caught here: the caller decides the failure mode (the main thread posts nothing, so
 * the UI keeps its free-text behavior). Swallowing a rejection into `[]` would report "no fonts" for
 * what is actually a broken call.
 */
export const listFamilies = async (api: FontsApi): Promise<string[]> => {
  const fonts = await api.listAvailableFontsAsync();
  const families = new Set<string>();
  for (const f of fonts) families.add(f.fontName.family);
  return [...families].sort((a, b) => a.localeCompare(b));
};
```

- [ ] **Step 4: Add the new file to the main-thread typecheck**

`tsconfig.main.json` has an explicit `include` array, so a file omitted from it is **silently untypechecked** — the no-DOM guarantee would not apply to it. Add `"src/list-fonts.ts"` to the array:

```json
  "include": ["src/main.ts", "src/bridge-main.ts", "src/messages.ts", "src/write-figma.ts", "src/read-figma.ts", "src/list-fonts.ts", "src/figma-env.d.ts"]
```

- [ ] **Step 5: Add the test to the plugin test script**

In `plugin/package.json`, append to the `test` script so it runs with the rest:

```
"test": "npx tsx test-write.ts && npx tsx test-readback.ts && npx tsx test-persist.ts && npx tsx test-write-float.ts && npx tsx test-write-styles.ts && npx tsx test-write-typography.ts && npx tsx test-list-fonts.ts"
```

- [ ] **Step 6: Run the test and the typecheck to verify both pass**

Run: `npx tsx plugin/test-list-fonts.ts`
Expected: PASS — 5 assertions, `ALL PASS`.

Run: `npm run typecheck -w @prism3/plugin`
Expected: clean, no output. (If it complains about `document`/`window` in `list-fonts.ts`, the no-DOM rule caught a real violation — fix the code, not the config.)

Run: `npm test -w @prism3/plugin`
Expected: all six suites pass, the new one last.

- [ ] **Step 7: Commit**

```bash
git add plugin/src/list-fonts.ts plugin/test-list-fonts.ts plugin/tsconfig.main.json plugin/package.json
git commit -F /tmp/msg-task1.txt
```

Message: `plugin: read the available font families from Figma` + a line noting the port exists to make dedupe/sort shim-testable, and the `include` addition (a file absent from it is silently untypechecked). End with the `Co-Authored-By` line.

---

## Task 2: The bridge message (main thread → UI)

**Files:**
- Modify: `plugin/src/messages.ts` (the `MainToUi` union, after the `restore-input` variant)
- Modify: `plugin/src/main.ts` (imports near line 18–27; a new `sendFonts` beside `restoreToUi` ~line 142; the `ui-ready` case ~line 149)

**Interfaces:**
- Consumes: `listFamilies`, `FontsApi` from Task 1.
- Produces: the wire message `{ type: 'font-list'; families: string[] }`. Task 3 reads it in the iframe.

- [ ] **Step 1: Add the message variant**

In `plugin/src/messages.ts`, append to the `MainToUi` union (keep the existing doc-comment density — every variant there carries one):

```ts
  /** The font families this Figma can load (the #113 Figma arm). Pushed once on `ui-ready` — the
   *  list is static for the session, so there is no request/response pair. The shared UI uses it to
   *  populate a `<datalist>` on the typeface input; it is a HINT, not a constraint (a free-typed name
   *  is still accepted, because a brand input is a portable spec and may legitimately name a face
   *  this machine lacks). Never persisted and never part of `BrandInput` — it is an environment fact,
   *  not brand data. Absent on failure: the UI then keeps its plain free-text behavior. */
  | { type: 'font-list'; families: string[] };
```

- [ ] **Step 2: Wire the sender in the main thread**

In `plugin/src/main.ts`, add the import alongside the other `./` imports:

```ts
import { listFamilies } from './list-fonts';
```

Add `sendFonts` after `restoreToUi` (which ends ~line 145):

```ts
/**
 * Push the fonts this Figma can load up to the shared UI (the #113 Figma arm). Runs on `ui-ready`
 * beside the read-back and the knob restore.
 *
 * Failure posts NOTHING, deliberately: the UI's fallback is its own free-text input, which works. An
 * error message would report a degradation the designer cannot act on, and a partial list would be
 * worse than none — it would make a real font look unavailable.
 */
const sendFonts = async (): Promise<void> => {
  try {
    const families = await listFamilies(figma);
    if (families.length) postToUi({ type: 'font-list', families });
  } catch {
    /* no font list — the UI keeps its free-text input (which is the pre-#113 behavior) */
  }
};
```

Then call it from the `ui-ready` case, beside the two existing calls:

```ts
    case 'ui-ready':
      // UI's listener is attached — run the boot read-back (seed summary) + rehydrate the knobs.
      void seedFromFile();
      restoreToUi();
      void sendFonts();
      return;
```

- [ ] **Step 3: Run the typecheck to verify it compiles**

Run: `npm run typecheck -w @prism3/plugin`
Expected: clean. The `figma` global satisfies `FontsApi` structurally — if it does not, the port's shape is wrong; fix `list-fonts.ts` to match the real typings rather than casting at the call site.

- [ ] **Step 4: Verify the plugin still builds**

Run: `npm run build -w @prism3/plugin`
Expected: `dist/main.js` + `dist/ui.html` written, no errors.

- [ ] **Step 5: Commit**

```bash
git add plugin/src/messages.ts plugin/src/main.ts
git commit -F /tmp/msg-task2.txt
```

Message: `plugin: push the available font list to the UI on boot` + why it rides on `ui-ready` (static for the session, so no request/response) and why failure posts nothing. End with `Co-Authored-By`.

---

## Task 3: The UI seam (forward the message into the shared UI)

**Files:**
- Modify: `web/src/write-adapter.ts` (the `onHostMessage` signature ~lines 106–112; `figmaCommit`'s listener ~lines 133–147)

**Interfaces:**
- Consumes: the `font-list` wire message from Task 2.
- Produces: `{ kind: 'font-list'; families: string[] }` on the `onHostMessage` callback union. Task 4 handles it.

- [ ] **Step 1: Widen the callback union**

In `web/src/write-adapter.ts`, add to the `onHostMessage` union in the `HostCommit` interface:

```ts
  /** Register a callback for host→UI notifications: the #109 read-back seed summary, the #131
   *  knob-rehydration (the persisted `BrandInput`, typed `unknown` here to keep this DOM layer free
   *  of the engine type import), and the available font families (the #113 Figma arm — a plain
   *  `string[]`, so it needs no such care). */
  onHostMessage(
    cb: (
      msg:
        | { kind: 'seed-info'; ok: boolean; summary: string }
        | { kind: 'restore-input'; input: unknown }
        | { kind: 'font-list'; families: string[] },
    ) => void,
  ): void;
```

- [ ] **Step 2: Forward it in the Figma listener**

In `figmaCommit`'s `onHostMessage`, extend the message narrowing. Note the existing `m` type annotation must gain `families`:

```ts
  onHostMessage(cb) {
    window.addEventListener('message', (e: MessageEvent) => {
      const m = (e.data && e.data.pluginMessage) as
        | { type?: string; ok?: boolean; summary?: string; input?: unknown; families?: unknown }
        | undefined;
      if (!m) return;
      if (m.type === 'seed-info' || m.type === 'apply-result') {
        cb({ kind: 'seed-info', ok: !!m.ok, summary: String(m.summary ?? '') });
      } else if (m.type === 'restore-input' && m.input) {
        cb({ kind: 'restore-input', input: m.input });
      } else if (m.type === 'font-list' && Array.isArray(m.families)) {
        // Filter to strings at the boundary: this arrives over postMessage, so the shape is asserted
        // rather than guaranteed, and a non-string would reach `textContent` downstream.
        cb({ kind: 'font-list', families: (m.families as unknown[]).filter((f): f is string => typeof f === 'string') });
      }
    });
```

`webCommit` needs no change — its `onHostMessage` is already an inert no-op.

- [ ] **Step 3: Typecheck both surfaces**

Run: `npm run typecheck -w @prism3/web`
Expected: clean.

Run: `npm run typecheck -w @prism3/plugin`
Expected: clean (this config typechecks `web/src/write-adapter.ts` under the no-plugin-typings lens).

- [ ] **Step 4: Commit**

```bash
git add web/src/write-adapter.ts
git commit -F /tmp/msg-task3.txt
```

Message: `web: forward the host font list through the commit seam` + note the boundary string-filter (postMessage shape is asserted, not guaranteed). End with `Co-Authored-By`.

---

## Task 4: The datalist + the guidance copy

The user-visible task. Ends with a live drive, which is the only step that exercises the real Figma API.

**Files:**
- Modify: `web/src/main.ts` — the host-message handler (~lines 315–327), the add-face row (~lines 3505–3536), the spelling note (~lines 3539–3541), the local-fonts warning (~lines 3697–3698), and the CSS block (`.tf-add` at ~line 7107)

**Line numbers drift.** `web/src/main.ts` is the busiest file in the repo and other agents are in it. Anchor on the surrounding *code*, not the number: `const addRow = el('div', 'tf-add')`, `const spell = el('p', 'tf-note')`, `const local = el('p', 'tf-note warn')`, `commit.onHostMessage((m) => {`, `function renderWorkspace(): void`. All five were re-verified against `origin/main` at `84eccdf`.

**Interfaces:**
- Consumes: `{ kind: 'font-list'; families: string[] }` from Task 3.
- Produces: nothing — this is the leaf.

- [ ] **Step 1: Add the module-level cache and handle the message**

Near `let seedInfo` (~line 309), add the cache with a comment that states the load-bearing constraint:

```ts
// The font families the host can load (#113 Figma arm; empty on web and until the host answers).
// Deliberately NOT part of `brandState`: it is an environment fact about one machine at one moment,
// not brand data — persisting it or letting it reach `BrandInput` would make emitted artifacts
// machine-dependent. Read only to populate the typeface input's `<datalist>`.
let hostFonts: string[] = [];
```

In the `commit.onHostMessage` callback, add the branch before the `seedInfo` fallthrough:

```ts
  if (m.kind === 'font-list') {
    hostFonts = m.families;
    // A plain re-render — the same path a tab click takes. The list can arrive before or after the
    // typeface page first renders, so caching plus a re-render makes the order irrelevant.
    renderWorkspace();
    return;
  }
```

- [ ] **Step 2: Wire the datalist to the existing input**

In the add-face row (after `addIn.setAttribute('aria-label', …)`, ~line 3508), append:

```ts
  // #113 (Figma arm) — when the host knows its real font list, the field becomes type-ahead over it
  // while still accepting anything typed. `<datalist>` is deliberate over a custom combobox: it is
  // the browser's own control, so the keyboard and screen-reader behavior are correct without a
  // hand-rolled `role="combobox"` + `aria-activedescendant` surface. The cost is that the dropdown is
  // browser chrome and cannot be themed to match the dashboard — accepted knowingly.
  // A HINT, not a constraint: an unlisted name still commits, because a brand input is a portable
  // specification and may legitimately name a face this machine lacks.
  let addList: HTMLElement | null = null;
  if (hostFonts.length) {
    addList = el('datalist');
    addList.id = 'tf-font-list';
    // textContent, never innerHTML — these names are external input.
    for (const f of hostFonts) {
      const o = el('option') as HTMLOptionElement;
      o.value = f;
      addList.append(o);
    }
    addIn.setAttribute('list', addList.id);
  }
```

Then include it in the row append (~line 3535), replacing `addRow.append(addIn, addBtn);`:

```ts
  addRow.append(addIn, addBtn);
  if (addList) addRow.append(addList);
```

A `<datalist>` renders nothing itself, so its position in the row does not affect layout.

- [ ] **Step 3: Make the guidance copy conditional**

The existing note (~line 3539) sends the user to Font Book to hand-copy a name. With a real list present that is **wrong advice**, so it must not be shown unchanged. Replace the single assignment with a branch:

```ts
  const spell = el('p', 'tf-note');
  spell.innerHTML = hostFonts.length
    ? '<b>Pick from the list, or type any name.</b> The field suggests the ' + hostFonts.length + ' font families this Figma can load, so a face you choose from it will apply cleanly. Typing a name that is not listed still works — a brand can specify a font this machine does not have — but it will be skipped when text styles are written here.'
    : '<b>Exact spelling matters.</b> The name passes through to CSS and Figma untouched — there is no validation or auto-correct, so a near-miss silently falls back. Find the exact name in <b>macOS</b> Font Book, <b>Windows</b> Settings → Personalization → Fonts, or the foundry / Google Fonts specimen page.';
```

`innerHTML` here is hand-authored prose, which is safe and consistent with the existing line; the interpolated value is a `number`. **No font name goes through this path.**

- [ ] **Step 4: Scope the local-fonts warning to the web host**

The `tf-note warn` note (~line 3697) says *"the dashboard loads no webfonts"* — a statement about the web host that reads as false inside Figma, where the list is authoritative. Make it conditional:

```ts
  const local = el('p', 'tf-note warn');
  local.innerHTML = hostFonts.length
    ? '<b>Specimens below use fonts installed on this device.</b> The list above comes from Figma and is what applies when you write text styles — the two can differ, so a face Figma offers may still preview as the fallback here. Your emitted tokens are unaffected; they carry the name you typed.'
    : '<b>Preview reflects only fonts installed on this device.</b> The dashboard loads no webfonts, so a correctly-spelled family you don’t have installed still previews as the fallback. The <b>Typefaces</b> table on <b>Primitives</b> flags which faces resolve here. Your emitted tokens are unaffected; they carry the name you typed.';
```

That distinction is real and worth stating: the canvas probe measures the iframe's fonts, while the datalist reports Figma's set.

- [ ] **Step 5: Typecheck and build the web surface**

Run: `npm run typecheck -w @prism3/web`
Expected: clean.

Run: `npm run build -w @prism3/web`
Expected: `dist/main.js` written.

- [ ] **Step 6: Confirm no Figma bridge plumbing reaches the web bundle**

What "dead-code-eliminated" does and does not cover here was measured on the pre-change bundle, because it is easy to assert too much:

`figmaCommit`'s **body** is eliminated on web — `apply-theme`, `ui-ready`, `resize-ui`, `pluginMessage` and `addEventListener("message"` all appear **0** times in `web/dist/main.js`, and `var figmaCommit` is never defined. What survives is the caller, `var hostCommit = () => false ? figmaCommit() : webCommit();` — esbuild substitutes the define but leaves the ternary unfolded.

The **handler callback is a different thing** and it does ship on web. `commit.onHostMessage((m) => { if (m.kind === "restore-input") … })` is present in today's web bundle; it is ordinary `main.ts` code, not host-conditional code, and it is merely never invoked because `webCommit.onHostMessage` is an empty no-op. So **`"font-list"` WILL appear in `web/dist/main.js` after Step 1, exactly as `"restore-input"` does now. That is correct and expected — do not "fix" it.**

Verify the real guarantee — that no bridge plumbing crossed over:

```bash
for s in pluginMessage 'apply-theme' 'ui-ready' 'listAvailableFontsAsync'; do
  printf '%-24s %s\n' "$s" "$(grep -o -F "$s" web/dist/main.js | wc -l | tr -d ' ')"
done
```

Expected: `0` for every one. **If any is non-zero**, Figma-only code reached the web bundle — a real finding; report it rather than working around it.

Then confirm the handler is unreachable rather than absent: `webCommit`'s `onHostMessage` must still be an empty method (`grep -A6 'var webCommit' web/dist/main.js`). If it ever gains a body, the branch becomes live on web and that is the finding.

- [ ] **Step 7: Run the US-English gate**

Run: `npx tsx Prism3/engine/lint-us-english.ts`
Expected: clean. It scans the **built bundle**, so the new copy is in scope. Note `Personalization` (existing, correct US spelling) and check nothing new slipped in.

- [ ] **Step 8: Run the full gate sequence**

```bash
npx tsx Prism3/engine/regen.ts --check
npx tsx Prism3/engine/test.ts
npx tsx Prism3/engine/mcp-test.ts
npx tsx Prism3/engine/token-contract.ts --check
npx tsx Prism3/engine/nb-regression.ts
npm run typecheck -w @prism3/plugin && npm test -w @prism3/plugin
```

Expected: `--check` in sync; unit tests all pass; MCP suite all pass; token contract unbroken; NB regression PASS; plugin typecheck clean and all six suites pass.

These engine gates should be untouched by this change — it adds no engine code. If any moves, something leaked out of the UI layer; stop and diagnose rather than regenerating.

- [ ] **Step 9: Live-drive in Figma (the step no shim can replace)**

Every gate so far is a shim or a string assertion. None has called `figma.listAvailableFontsAsync()`. This is the same gap that produced the `FONT_FAMILY`-scope bug on the sibling MCP branch: a correct plan with an untested payload.

```bash
npm run fresh -w @prism3/plugin
```

Then in Figma: **Plugins → Development → Import plugin from manifest…** → `plugin/manifest.json` (or reload if already imported — Figma re-reads `dist/ui.html` each launch).

Verify, and report each explicitly:
1. Foundations → Primitives → the typeface library's "Font family name" field offers real font suggestions.
2. Typing filters the list (e.g. `Ro` narrows toward Roboto).
3. The copy above the field is the list-aware variant, and it names a plausible font count.
4. A font picked from the list commits and appears in the library table.
5. Applying the theme writes its Text Styles **unskipped** — the summary reports no "font unavailable" skips for that face.
6. A deliberately misspelled name still commits (the escape hatch), and is reported as skipped on apply.

If the figma-console MCP is unavailable, say so and ask the owner to drive it — do **not** mark this step done on the strength of the shim tests.

- [ ] **Step 10: Commit**

```bash
git add web/src/main.ts
git commit -F /tmp/msg-task4.txt
```

Message: `web: offer the host font list on the typeface field` + that the two guidance notes are now host-conditional because the Font Book advice is wrong when a real list exists, and that the datalist is a hint rather than a constraint. End with `Co-Authored-By`.

---

## Task 5: Documentation and the PR

**Files:**
- Modify: `Prism3/docs/00-progress.md` (new entry at the top — newest first)
- Modify: `plugin/README.md` (a scope section, following the existing `## Scope (#N — …)` pattern)

**Interfaces:** none.

- [ ] **Step 1: Write the progress entry**

CLAUDE.md requires this **in the feature PR**, not as a follow-up. Add a dated entry at the top of `Prism3/docs/00-progress.md`, matching the house style (a diagnosis, the decisions and their costs, and the trap for whoever re-verifies). Cover:

- **The diagnosis that made it small:** an availability signal already existed (`fontAvailable`'s canvas probe, the "On this device" column). What was missing was *discovery*, not verification — and in the plugin the probe measures the **iframe's** fonts rather than Figma's set, so it was answering a different question from the one that decides whether the write succeeds.
- **Why it matters:** `applyTextStylePlan` skips-with-warning by design, so a typo writes all 50 font variables and silently drops a subset of the 38 Text Styles. Partial success, reported after the fact.
- **The decision and its cost:** `<datalist>` over a custom combobox — the browser's own keyboard/screen-reader behavior instead of a hand-rolled `role="combobox"`, paid for with a dropdown that cannot be themed. Owner accepted this explicitly.
- **The escape hatch, and why:** an unlisted name still commits, because `BrandInput` is a portable specification — hard-blocking would let one laptop's font situation constrain a brand.
- **The trap:** `tsconfig.main.json` has an explicit `include`, so a new plugin file omitted from it is silently untypechecked and the no-DOM guarantee quietly does not apply.
- **The stated limit:** the shim proves dedupe/sort only; the live drive is what proves the API shape.
- **Verification line** in the house format: `regen --check` · unit count · MCP count · token contract · NB regression · typechecks/builds · US-English · live-drive result.

- [ ] **Step 2: Add the plugin README scope section**

Follow the existing `## Scope (#N — …)` sections with ✅/⏭ bullets. Record: the reader + port, the `ui-ready` push, the datalist-as-hint decision, the un-themeable-chrome cost, and that per-style/weight validation is deferred.

- [ ] **Step 3: Rebase and re-run the gates**

`main` moves fast; rebase before pushing and re-verify.

```bash
git fetch origin && git rebase origin/main
npx tsx Prism3/engine/regen.ts --check && npx tsx Prism3/engine/test.ts && npx tsx Prism3/engine/token-contract.ts --check
npm run typecheck -w @prism3/web && npm run build -w @prism3/web
npm run typecheck -w @prism3/plugin && npm test -w @prism3/plugin
npx tsx Prism3/engine/lint-us-english.ts
```

If the rebase conflicts in `web/src/main.ts` (the busiest file in the repo, and other agents are in it), resolve by keeping both changes — this one is additive.

- [ ] **Step 4: Commit and open the PR**

```bash
git add Prism3/docs/00-progress.md plugin/README.md
git commit -F /tmp/msg-task5.txt
git push -u origin feat/plugin-font-picker
gh pr create --title "Offer the real Figma font list on the typeface field" --body-file /tmp/pr-body.md
```

Use `--body-file`, not a heredoc (apostrophes break the shell). The body should state the problem, the decision and its accepted cost, the escape-hatch rationale, the verification results, and the live-drive outcome. Link #113 as the Figma arm — **do not close it**; its web and MCP arms remain open.

---

## Self-Review

**Spec coverage.** §3 architecture → Tasks 1–3. §4 components → all five files mapped, one task each. §5 error handling → the try/catch in Task 2 Step 2, the string-filter in Task 3 Step 2, empty-list in Task 1's test, non-validation-on-commit preserved by using `<datalist>` (Task 4 Step 2). §6 testing → Task 1's shim test, the typecheck steps, Task 4 Steps 5–9. §7 out-of-scope → not implemented; recorded in Task 5's README bullet. The "never enters `BrandInput`" constraint appears in Global Constraints and again as the Task 4 Step 1 comment.

**Placeholder scan.** No TBD/TODO. Every code step carries the actual code. The two prose steps (Task 5) enumerate the required content rather than saying "write docs." The commit messages are described by content rather than pasted verbatim, which is intentional — the exact wording depends on the live-drive result.

**Type consistency.** `FontsApi` and `listFamilies` are defined in Task 1 and consumed with the same names in Task 2. The wire message is `{ type: 'font-list'; families: string[] }` in Tasks 2 and 3. The callback variant is `{ kind: 'font-list'; families: string[] }` in Tasks 3 and 4 (`type` on the wire, `kind` on the callback — matching the existing convention in `write-adapter.ts`). The cache is `hostFonts` in every Task 4 step.

**One deliberate gap:** Task 4 Step 9 can be blocked by the figma-console MCP being unavailable. The step says to report and ask rather than skip — the plan does not pretend that step is optional.
