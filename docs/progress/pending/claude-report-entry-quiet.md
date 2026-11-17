## (2026-11-17) — Report a problem in the plugin's Activity drawer is a small icon button

**The ask.** The owner, after using the rebuilt plugin: "I'd like the 'report a problem' CTA to have less prominence. If
it's a small bug icon button in the corner or another treatment. 'Report a Problem' just jumps out at you and it's not
something I want to highlight."

**Where it appears.** Two doors open the one dialog (`shell/report.ts`). In the plugin, a full-width outlined "Report a
problem" button sat at the foot of the open Activity drawer (#2069). On the web, which has no drawer, an icon tile sits
in the rail's foot beside Help (#3524). The web's tile was already icon-only, so only the plugin's door changes.

**The change.** The drawer's button is now a ghost icon button (`p3-btn-ghost p3-btn-icon`) at the end of the drawer's
last line, its bottom corner: 32 square wide, 28 at the narrow tier. It draws the glyph the web rail draws for it, Tabler's
`message-report`, a speech bubble with an exclamation mark, and is named and titled "Report a problem", the way Close
Activity is. It stays a button in the drawer's Tab order, and it is in view whenever the drawer is open, which it does
by itself when an operation fails.

**The icon.** Neither set has a bug. The engine's 48-file component set (`packages/engine/icons/`) has no bug and
nothing for "report"; the chrome draws from its own vendored Tabler set (#3083), where `message-report` was already
vendored for the web. Tabler's `bug` would need re-vendoring (`chrome/vendor-icons.mjs` and the digest). That is
flagged for the owner, not done.

**Held by.** `test:chrome` section 2069, `quiet entry`, at figma light 1280 and figma dark 380. It checks the button's
name and title, that it has no visible words, its glyph, that it is 32 square (28 at 380), and that it is last in the
drawer at its end. It fails on main by name. A second arm presses Tab from the page until the button holds focus: a
`focus()` call cannot prove keyboard reach, because it succeeds on a `tabindex="-1"` button. With `rep.tabIndex = -1`,
that arm fails by name at both sizes.
