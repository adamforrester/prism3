## (2026-10-31) — Update check and apply: no Proxy over the Figma host (#3209)

On real Figma, built from `dcbeaf76`, every Update check threw `'get' on proxy: property 'getLocalTextStylesAsync' is a
read-only and non-configurable data property on the proxy target but the proxy did not return its actual value`, so
Update file applied Theme and left every ticked set Due.

- **Root cause.** #3177's read-once run wrapped the host in a `Proxy` (`withRoot`, and `readRun`'s root) whose `get`
  trap returned `v.bind(t)` for every method. The substitute was not the trigger: the bind was. On Figma the host's
  methods are own data properties, neither writable nor configurable, and a `Proxy` must return such a property's own
  value. The shim's host was a plain object, so every test passed.
- **Fix.** `src/host-facade.ts`: a plain object with a getter per host member (bound to the host) and the overrides as
  own values. A member the host does not list falls through to the facade's prototype, a `Proxy` over an empty object,
  which no invariant can bind. `withRoot`, `readRun`'s root and `componentFigma` (`mcp-steps.ts`, the agent paste path,
  same exposure) now use it. `doc-panel.ts`'s `printView` already proxies an empty object and is left alone.
- **Test.** `fixHostMethods` in `component-shim.ts` fixes a copy's methods as Figma does. `test-update-apply.ts`
  `fixed/…` runs a check and an apply over a fixed host and executor (on `main`: the exact error, by name);
  `test-mcp-paste.ts` `components/fixed` does the same for `componentFigma`. Mutations: `withRoot`, `readRun`'s root
  or `componentFigma` put back as a `Proxy` each fail by name.
- **Trap.** Opt-in: many suites patch a shim method after building it, so `fixHostMethods` runs on a suite's own copy.
  Whether Figma's node objects (the root) also fix their methods is not known; the test fixes the root too, the
  stricter assumption, and the facade holds either way. #3208 (the Apply Theme freeze) is a separate cause.
