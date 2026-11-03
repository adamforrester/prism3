## (2026-11-02) — Tabs: the selected indicator overlaps the baseline (#3344)

The owner asked for Tabs to draw as Prism 2 did: the selected tab's 2px indicator overlaps the list's 1px baseline, with their bottom edges aligned and the indicator painted over the line. Engine `{{ENGINE_VERSION}}`.

### Diagnosis

Both lines were already foot pins (#2928): the indicator across each tab's bottom edge, the baseline across the list's. What stacked them was the list's 1px `blockEnd` inset, which #2928 kept so the baseline would sit where it used to when it took a cell. The baseline was also the list's last child, so it painted over the tabs.

### What changed

- `tabs.ts`: the root drops its bottom inset, so the tabs reach the list's bottom edge and both bars end on the same line. The root's children become `['baseline', 'items']`, so the baseline draws first and every tab's bar paints over it. The list is 1px shorter.
- The baseline stays one part of the list, not a rule moved into each tab. That keeps the anatomy as it was: it still spans the whole list, including the empty sides of the centered bar. A tab placed on its own carries no line it doesn't need, and nothing is renamed.
- No executor code moves. Both executors already place a foot pin by name whatever its position among the children, so `EXECUTOR_REVISION` stays where it is. Update file redraws Tabs because the plan moved.
- The spec sheet now lists `container/baseline` before `container/items`, because Figma's draw order is child order.

### Tests

`apps/plugin/test-tabs-indicator.ts` builds `tabs` and its `tab-item` through the real executor into the shim, with its layout model on and the two thicknesses at 1px and 2px. It checks every member (3 sizes × 2 alignments) with literal expectations:
- `#3344 tabs indicator bottom`: every tab's indicator bottom equals the baseline's bottom.
- `#3344 tabs paint order`: the baseline draws before the tabs.

Mutation: with the stacked layout put back, both arms fail by name (18 of 18 off: bar bottom 8, baseline bottom 9). Each half of the mutation fails only its own arm.

### Held / gaps

- **No web arm.** No web, React or Storybook projection draws Tabs yet; code delivery is still pending (#2454). The studio's component preview draws Buttons only. So the code side is the contract in the Tabs `codeOnly` entry for the selected underline, which now states the bottom alignment and the paint order. The web arm the issue asks for lands with that code layer.
- RTL is code only: the list mirrors, and the overlap doesn't depend on direction. Density doesn't move either thickness.
