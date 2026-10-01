## (2026-10-01) — The chrome's Inter face covers the notes and verdicts it shows, and a build check names the next gap (#1924)

**STATUS: PR open from `lane/chrome-font-coverage`.** UI and build only. No engine change and no emitted artifact moves, so no ENGINE bump and `CONTRACT_VERSION` is unchanged. The fix is the one the issue preferred: widen the subset, not reword the note.

**The finding, measured.** The embedded "P3 Chrome UI" face was `@fontsource-variable/inter` 5.3.0's `inter-latin-wght-normal.woff2` exactly (sha256 `3100e775…6fbd4c62`, identical to the npm tarball's file). Its cmap holds 230 code points: Google Fonts' latin range. That range has ↑ and ↓ but no →, ✓, ✗ or ⚠. The full Inter that file was cut from is google/fonts `ofl/inter/Inter[opsz,wght].ttf`, "Version 4.001;git-66647c0bb" (the name tables match), sha256 `29160a80ff49ddcab2c97711247e08b1fab27a484a329ce8b813d820dc559031`.

**Glyph availability in the full Inter (its cmap, 2,849 code points):**

| Code point | In full Inter | In the old subset | Now |
|---|---|---|---|
| U+2192 → | yes | no | carried |
| U+2713 ✓ | yes | no | carried |
| U+2717 ✗ | yes | no | carried |
| U+26A0 ⚠ | yes | no | carried |
| U+22EF ⋯ | **no** | no | still a device face (held, below) |

JetBrains Mono (the "P3 Chrome Mono" face) is untouched. No chrome element wears `.p3-value` yet, so it draws nothing today. For the record, its full font has → and ⚠ but not ✓, ✗ or ⋯.

**The re-subset.** It was done with a one-off tool in a scratch venv, not a repo dependency. The recipe sits beside `CHROME_FONTS` in `apps/studio/chrome/tokens.mjs`, so the next re-subset finds it next to the file name:

```sh
python3 -m venv v && v/bin/pip install fonttools==4.66.1 brotli==1.2.0   # Python 3.11.15; nothing else
export SOURCE_DATE_EPOCH=1790812800
v/bin/fonttools varLib.instancer 'Inter[opsz,wght].ttf' opsz=14 -o inter-wght.ttf
v/bin/pyftsubset inter-wght.ttf --unicodes-file=codes.txt --name-IDs=0,1,2,3,4,5,6,14 \
  --layout-features=calt,ccmp,dnom,frac,locl,numr,pnum,tnum,kern,mark,mkmk \
  --flavor=woff2 --output-file=inter-latin-wght-normal.woff2
```

`codes.txt` is the old file's 230 code points plus the eight the new check named: U+2192, U+2197, U+21B3, U+2248, U+2264, U+26A0, U+2713 and U+2717. The subsetter also keeps U+2265 (≥), which its layout closure retains, so the result has 239. Output: **47,924 B**, sha256 `1e27343f046840d6b2eaaced05d8e70afd6fc4c265a9e6ebd51ff9390fbb8322`. Built twice from scratch, with byte-identical results.

Pinning `opsz` at 14 (its default) and keeping the old file's feature list (`calt ccmp dnom frac locl numr pnum tnum` / `kern mark mkmk`), name IDs (0–6, 14 and the fvar/STAT names) and hinting tables matches what fontsource shipped. Line metrics (hhea, OS/2 typo and win, units per em) are unchanged. Glyph names are dropped (post format 3), which no renderer reads. **Nothing that drew before moved.** Shaped with HarfBuzz at weights 100, 300, 400, 500, 600, 700 and 900, with no features, `tnum`, `frac` and `pnum`, over 303 strings of the old file's code points, all 8,484 runs give identical outlines, advances and offsets in the old and new files.

**Sizes.** Base: `origin/main` at `80647ae1`, built in this worktree; gzip is `gzip -c`.

| | Before | After | Change |
|---|---|---|---|
| `inter-latin-wght-normal.woff2` | 48,256 B | 47,924 B | −332 B |
| `apps/studio/dist/main.js` | 1,211,614 B (gz 411,483) | 1,211,170 B (gz 411,128) | −444 B |
| `apps/plugin/dist/ui.html` | 1,468,804 B (gz 456,967) | 1,468,360 B (gz 456,668) | −444 B |
| `apps/plugin/dist/main.js` | 1,021,611 B | 1,021,611 B | none |

The face shrinks while gaining nine code points. Google's API build keeps bytes that pyftsubset drops (glyph names and its own packing), and those outweigh the nine new glyphs, about 1.2 KB of them.

**The gate: a `[glyphs]` arm in the existing chrome-CSS build check**, not a new CI step. It runs wherever `chromeCss()` runs (the studio, plugin and site builds and `check:ignore`), so `ci.yml`, `verify.ts`, the CLAUDE.md §4 list, CONTRIBUTING §3 and the PR template do not move. It lives in `apps/studio/chrome/glyphs.mjs`.
- **Oracle: the committed woff2's own cmap,** read in Node with no dependency. `woff2Cmap` walks the WOFF2 table directory, inflates the brotli stream with Node's `zlib` and reads cmap formats 4 and 12. No sidecar list exists to drift. Its read agrees exactly with fonttools on four files: the old and new Inter, JetBrains Mono and fontsource's Greek subset.
- **Subject: the text the chrome can be handed.** It reads the engine's decision notes (`$extensions.prism3.decisions` in every non-overlay `packages/engine/out/*.tokens.json`) and every string literal in `apps/plugin/src/**` and `apps/studio/src/**`, through the TypeScript parser, so comments are not read. The verdicts are composed across the plugin's main thread (`apply-summary.ts`, `main.ts`, `style-guide.ts`, `prune-figma.ts`, …), so the scope is the directory, not a list of today's posters.
- **Represented:** every brand that emits anything into `out/` (its `.ai.json`, overlays or trees) must have both its full and its base tree, each with notes, and exactly `BRAND_COUNT` (5) brands must emit. A brand whose trees go missing is named. One that vanishes whole changes the count. `MUST_READ` (`apply-summary.ts`, the plugin's `main.ts`, `write-adapter.ts`, `shell/preview.ts`) each yield a literal.
- **The extractor is checked on a fixture (`LITERALS_SELF_TEST`):** a plain string, a template's head, middle and tail, a whole template, and two comments it must not read. Without it, only `FACE_LACKS` pinned what `literalsOf` reaches, and #1936 will shrink that list. A cmap that parses to no code points fails with one message.
- **One file is out of scope, by literal: the legacy studio `apps/studio/src/main.ts`.** It draws the legacy pages in their own face, and S13 removes it. Of the chrome copy it still paints, `test:chrome` measures the Apply label and the write-status pills as drawn. **The Prune item's running labels ("⋯ Checking…", "⋯ Removing…") are measured by nothing:** `test:chrome` clicks Prune and posts `prune-result` without measuring the menu, so changing both labels to `⊞ …` still passes 5940/5940 (found in review; the coordinator is filing it, since `test-chrome.mjs` is the UI lane's). Read in full, `main.ts` would name ↔ ↺ ○ ● (in the full Inter, but not in the embedded subset) and ⊞ ▦ ▴ ▾ ✕ ⋯ (in no Inter at all). An exclusion whose file is gone fails.
- **`FACE_LACKS`: only code points Inter itself does not carry, each scoped to its files.** U+FE0F is listed in the plugin's `main.ts` and `agent-link-ui.ts` (see held), U+241F in `style-guide.ts` (a cache-key separator) and U+2500 in `build-telemetry.ts` (the console readout). An entry fails as stale once the face carries its code point or a listed file stops using it.
- Reading the sources takes about 0.4 s per build. The studio build now reads `apps/plugin/src` for this check only. Nothing it reads reaches the output, so `vercel-ignore.sh` stays right to leave `apps/plugin/**` off its triggers.

**`FACE_GAPS` in `test-chrome.mjs`** loses →, ✓, ✗ and ⚠. Only ⋯ is left, with the same scope as before: the verdict copy and the running Apply label. `test:chrome`: 5940/5940.

**Mutations.** Each ran after a `wip:` commit, with the diff checked non-empty, and was restored from `HEAD`:

| Mutation | Result |
|---|---|
| `←` added to prism3's decision 14 in `out/prism3.tokens.json` | studio build fails: `[glyphs] U+2190 (←) is not in the embedded face … at packages/engine/out/prism3.tokens.json decision 14` |
| `'✓ applied'` → `'← applied'` in `apply-summary.ts` | studio build **and** plugin build fail: `[glyphs] U+2190 (←) … at apps/plugin/src/apply-summary.ts:37` |
| `⋯` prefixed to the Back label in `shell/frame.ts` | `[glyphs] U+22EF (⋯) … at apps/studio/src/shell/frame.ts:429` |
| `←` in a comment in `apply-summary.ts` | build passes (comments are not read) |
| the old fontsource woff2 restored | 8 named failures: U+2192, U+2197, U+21B3, U+2248, U+2264, U+26A0, U+2713, U+2717 |
| `⚠️` (with VS16) in `apply-summary.ts`, a third file | `[glyphs] U+FE0F (VS16, emoji presentation) … at apps/plugin/src/apply-summary.ts:30` |
| VS16 dropped from `agent-link-ui.ts` | `[glyphs] FACE_LACKS lists U+FE0F … for apps/plugin/src/agent-link-ui.ts, which no longer uses it` |
| prism3's `decisions` emptied | `[glyphs] packages/engine/out/prism3.tokens.json carries no decision notes` |
| `NOT_CHROME` key renamed to a missing file | `[glyphs] NOT_CHROME lists apps/studio/src/main-old.ts, which no longer exists`, and the legacy file's glyphs are named one by one |
| review F3: prism3's two trees deleted | `[glyphs] brand prism3: packages/engine/out/prism3.tokens.json is missing, so its decision notes were not read`, and the same for `prism3.base.tokens.json` |
| review F3: five trees deleted (aurora's and harbor's two, prism3's base), which passed under the old floor of 5 | five named failures, one per tree, each `brand <b>: … is missing` |
| review F3: every `harbor.*.json` deleted | `[glyphs] 4 brands emit into packages/engine/out (…), BRAND_COUNT says 5` |
| review F5: `literalsOf` drops template heads, middles and tails | `[glyphs] literalsOf self-test: read ["plain","whole"] from the fixture, want ["plain","head "," middle "," tail","whole"]` (also a stale `FACE_LACKS` entry, but the self-test does not rely on it) |
| review F5: `literalsOf` reads only the first literal | `[glyphs] literalsOf self-test: read ["plain"] from the fixture, want […]` (also four stale `FACE_LACKS` entries) |
| review F7: the cmap reader recognizes no subtable format | one message: `[glyphs] the cmap of apps/studio/chrome/fonts/inter-latin-wght-normal.woff2 maps no code points, so nothing can be checked against it` |
| `✓` prefixed to the Back label (S1.4's mutation) | build passes, `test:chrome` 5940/5940: the face draws ✓ now, as expected |
| `←` prefixed to `Apply to Figma` in the legacy `main.ts` (outside the build check's scope) | `test:chrome` 5874/5940: 66 failures, every one `every chrome text element draws in the embedded Inter — <button … data-p3="apply-to-figma" … drew DejaVu Sans (device), Inter` |

**Traps for whoever re-verifies this.**
- **Do not re-subset with uharfbuzz in the venv.** fonttools then packs GPOS with HarfBuzz's repacker, and the instanced TTF comes out 1,568 B smaller with a different woff2. It is valid, but it is not this file.
- **Without `SOURCE_DATE_EPOCH`, `head.modified` takes the clock,** and the woff2 moves by tens of bytes from run to run.
- **Code points in `codes.txt` are not the whole cmap.** The subsetter keeps any code point whose glyph its layout closure retains (≥ here).
- **cmap coverage is not "drew in Inter" for VS16.** Inter carries ⚠, but `⚠️` asks for emoji presentation and draws from an emoji face. That is why the check flags U+FE0F rather than passing it.

**Held for the owner, not decided here.**
- **⋯ (U+22EF).** Inter does not have it, so no re-subset can add it. It leads the pending copy: "⋯ Applying…" on the Apply label and in the pills, and "⋯ Checking…" and "⋯ Removing…" on the Prune item. The options: keep it in a device face (today, scoped in `FACE_GAPS`); use a character Inter has, such as … (U+2026), which moves the visible copy; or embed a fallback face for it, which adds a face and a license notice. Each changes how it looks or what ships, so each is a design call.
- **⚠️ with VS16 in write summaries and the Agent status line**, filed as #1936. It draws as a color emoji next to the monochrome Inter ⚠ in the headlines. The choice is text or emoji presentation. Until it is made, `FACE_LACKS` scopes U+FE0F to the two files that write it.
