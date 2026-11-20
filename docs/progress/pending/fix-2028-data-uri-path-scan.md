## (2026-11-20) — The plugin build's absolute-path scan skips base64 font data (#2028)

### What changed
`apps/plugin/build.mjs` refuses a bundle that carries an absolute filesystem path (#1117). Since #1905 the bundles
embed the chrome's fonts as base64 `data:` URIs, and base64's alphabet includes `/`, so a font's encoding can spell
`/tmp/x`, `/var/x` or `/root` by chance. Today's two faces don't; a font swap could, and the build would then fail
with a path message pointing at font data. The scan now blanks base64 `data:` payloads before it looks. It still
scans everything else, plain-text `data:` URIs included, because a path written into one would ship readable.

The scan moved into `apps/plugin/absolute-path.mjs` so a test can drive it without a build; `build.mjs` keeps the
error message and calls `findAbsolutePaths`.

### Verification
`apps/plugin/test-absolute-path.ts` (14 assertions, floor 14 in `suites.json`). Each payload fixture is checked to
decode as base64, so it is something a real font could produce. The pre-#2028 scan (`findAbsolutePaths` reading
`text`, not the blanked text) fails four arms by name, among them "#2028 font payload spelling /tmp/x". Blanking
every `data:` URI fails "#2028 plain-text data: URI is still scanned". The real `dist/` and release builds pass.
