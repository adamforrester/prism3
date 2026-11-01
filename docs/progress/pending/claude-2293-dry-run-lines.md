## (2026-11-01) — The Update dry run's lines are drawn in the Activity drawer, gated in a browser (#2293)

**What.** A `test:verdict` arm in `apps/plugin/test-build-verdict.mjs`, `#2293`, posts a known Update dry-run result
(`component-update-result`, #2265) with seven authored `lines`: each set's line, its named differences, a closing
line and `This was a check only. Nothing in the file changed.` In light and dark at 1280 and 380, it asserts each line
is drawn whole and in order. "Whole" means its own element, text equal to the literal, a box of real size inside the
drawer's body, nothing cut off at its edge, and no side scroll. The #2177 arms cover Apply, a component build and the
style guide. This kind goes through its own routing (`write-adapter.ts`, the `host-session.ts` op map), and before this
arm nothing drew it in a browser. The shim tests check the message, not the panel.

**Independence.** The posted lines and the expected side are one literal written in the dry run's shape. The arm never
calls `previewVerdict` and never reads `activity.ts`. ACTUAL is the built panel's DOM. The theme comes from a Figma
stub in this suite's server (`?figma=light|dark`: the class on `<html>` and two variables, typed here as
`test-chrome.mjs` types them), and the arm reads the theme the panel took off `<html data-theme>`. With no query, the
bundle is served as built, so every other arm is unchanged.

**Mutations.** Each was committed `wip:` first, run against a rebuilt bundle, and the source restored from `HEAD`.
- Drop one line in the drawer's renderer (`linesOf` in `activity.ts`): `#2293 <theme> <w>: the dry run's 7 lines are
  drawn, whole and in order` fails in all four cells, with the #2177 and #2281 arms.
- Drop one line in this kind's routing alone (`write-adapter.ts`, `component-update-result`): the same four `#2293`
  cells are the only failures (420 of 424). The #2177 arms for the other kinds stay green, which is the gap the issue
  named.
