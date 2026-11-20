# Render QA: the shadcn/ui and Tailwind v4 themes on real components (#4382)

A measurement harness, not a CI gate. It puts the generated themes on stock components in Chromium, checks what
renders against the DTCG handoff, and writes screenshots for a person to look at.

```bash
npm ci                                   # once, at the repo root
npm run -w @prism3/tokens qa:render      # every hosted brand, both surfaces, light and dark
npm run -w @prism3/tokens qa:render -- --brand harbor --surface tailwind
```

It writes to `packages/tokens/qa/out/` (git-ignored):

- `screens/<surface>-<brand>-<mode>.png`: each full page, at deviceScaleFactor 1.
- `screens/shadcn-<brand>-<mode>-focus.png`: the top of the page with the default Button keyboard-focused.
- `report.md`: mismatches, contrast and focus-ring observations, and fonts.
- `<brand>/`: the compiled pages and CSS, which you can open in any browser.

It exits 1 when a rendered value differs from the handoff. Contrast and font observations never fail the run.

| File | What it is |
|---|---|
| `shadcn-components.html` | Stock shadcn/ui new-york-v4 markup and classes: Button (every variant), Input, Card, Dialog, Select, Tabs, Badge, Alert, Table, Checkbox, Switch. |
| `tailwind-utilities.html` | Plain Tailwind v4 utilities: color, `rounded-*`, `shadow-*`, `font-*`, spacing. |
| `render-qa.mjs` | Builds the pages with the pinned Tailwind CLI, measures them with Playwright, and writes the report. Its header says why the oracle is independent of the CSS it checks (docs/34). |

Only the hosted brands are rendered: the house brand and the engine's made-up example brands (#4373).
