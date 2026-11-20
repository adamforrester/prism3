## (2026-11-19) — The deployed Studio sends a Content-Security-Policy, nosniff and frame protection (#4132)

**STATUS: branch `fix/studio-security-headers`.** Deploy config and one new browser test. No engine change, no committed artifact moves, no ENGINE bump. `CONTRACT_VERSION` unchanged.

`vercel.json` is the deploy's whole server config, and its one header was `Cache-Control`. So the public page sent no CSP, no `X-Content-Type-Options` and no frame protection. #4132's audit found no live XSS: every brand string reaches the DOM through `textContent`. This is defense in depth, so a later slip such as an `innerHTML` with a brand string becomes a blocked script instead of a running one.

### What every path now gets
- `X-Content-Type-Options: nosniff`, so the `/docs/` text files are never sniffed as script.
- `X-Frame-Options: DENY`, plus `frame-ancestors 'none'` in both policies. Nothing frames the site: the plugin inlines its own UI, and the docs and Studio carry no `<iframe>`.

### The Studio's policy, enforced and not report-only
The paths outside `/docs` get `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' https://fonts.googleapis.com; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`. Each allowance is something the bundle does:
- `'unsafe-inline'` styles: `installStyles` and the web-font loader each add a `<style>` element, and the Google Fonts CSS is dynamic, so a hash cannot cover it.
- `data:` fonts: the chrome's two embedded faces.
- `connect-src` Google Fonts: the loader `fetch`es the CSS.
- `blob:` images: downloads.

Scripts are `'self'` alone, which covers `main.js` and the specs chunk's `import()`.

#4132 suggested starting report-only. The browser test below is what lets this ship enforced: it proves the bundle runs under the policy.

### The docs' policy
`/docs` and below get `object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'`. There is no script or style restriction, because `docs/public/index.html` and the guide pages carry inline scripts and styles. The two policies are split by source (`/((?!docs(?:/|$)).*)` and `/docs(/.*)?`), not layered, so no path gets two CSP values.

### The test, `apps/studio/test-site-headers.mjs` (`npm run -w @prism3/studio test:site-headers`)
It runs the real `build-site.mjs` and serves `public/` with the headers `vercel.json` gives each path. Each `source` is read as an anchored regex, and a named `:param` is refused rather than guessed. Then:
1. Every path is held to typed literals: `nosniff`, `DENY`, `frame-ancestors 'none'`, `object-src 'none'`, a `base-uri`, and for Studio paths `script-src 'self'` alone. No header may get two values from two entries, so Vercel's merge order cannot matter.
2. In Chromium, which enforces the policy, the test first proves the policy is in force: a probe inline script is refused, so a CSP that never reached the page can't pass. Then the Studio boots, opens an example from the start screen, the Type page fetches and installs a Google Fonts face (a fixture answers both hosts after the CSP lets the request out), and Export downloads the component specs through the chunk. It ends with no `securitypolicyviolation` and no console error.
3. `/docs/` and a guide page load with no violation.

On main, 53 of 73 checks fail. With the change, 85/85 pass. Mutations, each failing by name:
- `'unsafe-inline'` dropped from `style-src` fails `/: the Studio reports no CSP violation`.
- `https://fonts.gstatic.com` dropped from `font-src` fails the same check, plus `/: the web face file is fetched from fonts.gstatic.com (0 request(s))`.
- The `nosniff` entry removed fails `/dist/main.js: sends X-Content-Type-Options: nosniff`.
- The docs' `frame-ancestors 'none'` removed fails `/docs/: the CSP has frame-ancestors 'none'`.

**How it reaches CI without a `ci.yml` edit.** `ci.yml` is the owner's, and `lint-doc-gates.ts` (#3727) fails a test file that no CI-run script runs. So `test:smoke` now runs `test-smoke.mjs && test-site-headers.mjs`, the same chaining `lint:live-css` uses. CI runs that script in the `studio` job after the Chromium install, and `npm run verify`'s `smoke` gate runs it too. `test:site-headers` runs the test alone. A step of its own in `ci.yml` is the owner's call.
