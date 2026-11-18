## (2026-11-18) — The ecosystem diagram catches up with main and the code POC

**Status:** docs only. `docs/public/ecosystem/ecosystem.json` changes. No engine file, emission, token name or
component surface moves, so no engine change note is owed and `CONTRACT_VERSION` stays. `lint-ecosystem.ts` passes.

### What changed

The owner asked whether the diagram was up to date. Its last data change was on 2026-11-15. This audit checked every
node, edge, feature and status against `origin/main` at `4cda6917` and against `origin/poc/arm-1`.

- **The code library.** `css` stays **partial**, but its prose was stale: since #3408 S1, `sd.ship.mjs` builds token
  CSS that a product installs from the package tarball, and `check:package` installs that tarball and checks it.
  Nothing is on a registry yet. `coded-components` and `storybook` stay **planned**: the Lit 3 elements and the
  Storybook exist only on `poc/arm-1`, and "Shipped" means on main. Their prose now names the proof of concept. The
  `planned` status reads "not on main" instead of "not built", because that is now the true line.
- **A planned node**, `shadcn-theme`: the shadcn/ui and Tailwind v4 theme exports (#2997, Q-SC1 A, theme only), fed by
  a planned edge from DTCG.
- **New feature rows.** Undo load (#1037), shared by web and Figma. Keep hand edits through an update (#2956, #2673),
  Figma only. It takes `hand-edits-request` over from `update-due-sets`, so each message is still claimed once.
- **Rows corrected.** Load a brand from an existing Figma file now cites the file facts scan and the seed (#2075). Its
  agent lane is **partial**, through the `prism3-theme` skill's report procedure. Its Figma lane stays **planned**
  until #2075 part 3 decides where the panel offers it. Read a design.md brief adds the brand menu's Import (#3910).
  Build component sets names the usage panel's anatomy markers, parts list and "Last changed in" block (#3773, #2927,
  #2889). Update built sets names the agent's hand-edit choices.
- **Planned prose on shipped nodes:** the component contract and RTL mirror field (#1325, #3986) on the component
  definitions, the contract on each set (#3980), and the motion animation styles (#2857).

### Left out on purpose

- **"Updates off" (#3948)** merged with its own `updates-off` feature row, so this PR adds none.
- **Report a problem** stays in the gate's `PLUMBING` list. #2069 classed it as panel chrome, and changing that is the
  owner's call.
- **The real-host round-trip tool (#1218)** landed on main (#3973) as a tool you run from a Mac, not a CI gate, and
  it has not yet run against real Figma. The diagram leaves it out until it has.
- **TokenPress gradients (#731) and the motion skill** were already covered: TokenPress's node says "variables and
  styles", and `load-skills` already lists `prism3-motion`.
