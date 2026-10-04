## (2026-10-04) — The product is "Prism3 Studio": the studio's top bar, the start screen and the plugin's name

**STATUS: branch `ui/studio-mark`.** UI only: no engine change, no emitted artifact moves, no ENGINE bump, `CONTRACT_VERSION` unchanged.

### What changed (owner decisions, 2026-10-04)

- **The studio's top bar starts with the product mark**: the existing logo (`styles.css`'s `.logo`, the conic-gradient square) and "Prism3 Studio", ahead of the brand switcher. Built in the new chrome (`shell/frame.ts`, `chrome.css`), not the legacy `renderBar`. It goes nowhere, so it is not a control: a `role="img"` with the accessible name "Prism3 Studio", the logo `aria-hidden`. The name is set in `--p3-text` on `--p3-bar-bg`, a pair `chrome/spec.mjs` already declares at 4.5:1, so `lint:contrast` needed no new row.
- **Narrow**: at the chrome's narrow tier (`data-w="narrow"`, frame width ≤ 560) the bar keeps the logo and drops the name; the accessible name still carries it. The start screen drops its wordmark at 380px; the chrome has no 380 tier and may not hold a raw length for a media query, and at 380 the bar is already wrapping its icon buttons, so the name goes with the bar's other words at the narrow tier.
- **The plugin's bar draws no mark**: Figma's own title bar names the plugin, and its width is tight. **Pending owner confirmation.**
- **The plugin is named "Prism3 Studio"** in `apps/plugin/manifest.json`; `id` unchanged (`prism3-theming-plugin`), since Figma keys an installed plugin and its stored data by it. The plugin UI's `<title>` and the studio page's `<title>` (was "Prism3 — web dashboard") say "Prism3 Studio" too.
- **The start screen's mark** reads logo + "Prism3 Studio" (was "Prism3" + a "Theme studio" descriptor). The descriptor's `.studio` rule and its 560px rule went with it; nothing else on the start screen moved.

### Why the logo is lent, not drawn by `chrome.css`

`chrome.css` may hold no raw color (the build's `[raw]` check), and the logo is a fixed five-stop conic gradient with no token behind it: its hues are an example brand's, and `[brand]` refuses a chrome color that resolves through a brand palette anyway. The shell's `h()` refuses a class outside `p3-`, so the shell cannot wear `.logo` itself. So `main.ts` lends the frame a `logo` renderer, the same way it lends Inspect and Brand their legacy views, and there is still one definition of the logo for the start screen and the bar.

### Left alone, deliberately

Plugin strings that say "Prism3" mean the engine or its output, not the plugin's name, and changing them would be new copy: "not created by Prism3" (preflight), "No existing Prism3 theme in this file", "run Prism3 commands" (Agent link), "⚠ Prism3 partial build" (a Figma node name), "no Prism3 stamp". Token namespaces, package names and engine names are untouched.

### Gates and their independence

- `test-chrome.mjs` §1, every host × theme × width: the studio's bar draws the mark once, first in the bar and ahead of the brand switcher, reading "Prism3 Studio" as text and as its accessible name, not a control, the logo drawn; the name shown wide (and measured at 4.5:1 on the bar) and dropped narrow. The plugin's bar draws none (`hooks.absent`, with the plugin's top bar as proof it looked). Every expected value is a literal in the test.
- `apps/plugin/test-manifest.ts` (new, in the plugin's `npm test`): `name` is "Prism3 Studio" and `id` is "prism3-theming-plugin", both literals, the manifest parsed from disk.
- Mutations, each after a `wip:` commit, each failing by name: the mark not appended (`product mark … draws the product mark once`), the mark placed after the bar's legacy controls (`… the mark is first in the top bar`), the name back to "Prism3" (`… reads "Prism3 Studio"`), the mark drawn in the plugin too (`… the plugin's top bar draws no product mark`), the name in `--p3-text-2` (`… is measured on the top bar at 4.5:1`, dark), the narrow rule dropped (`… the name is dropped at narrow widths`), the manifest name back to "Prism3" (`the plugin is named "Prism3 Studio"`) and the id changed (`the plugin keeps its id`).
