## (2026-11-10) — Tab, Tabs and Banner name motion tokens, not milliseconds (#3487)

**Status:** three component defs' prose. ENGINE minor (change note). CONTRACT unchanged: no token path moves. No
executor change.

### What changed

- `tabs.ts` and `tab.ts` `motion.enter`: "about 150–200ms" becomes "on motion.transition.default", the token the
  `prism3-motion` tabs recipe names for the underline. `tab.ts`'s code-only underline description says the same.
- `banner.ts` `motion.exit` and its code-only motion description drop "about 150 to 200ms"; both already named
  `motion.transition.exit`.

### Why

Durations scale with the brand's tempo, so a number is right for one brand only, and an agent reading the component
catalog copies it (`prism3-motion` R1). Owner decision Q-M6 A on #3413 filed this.

### Left out, for their own issue

The same defect sits in `switch-control.ts`, `switch-row.ts` and `segmented-control.ts` ("~150–200ms", "about
150–200ms"), filed as #3529. `spinner.ts` puts a number in parentheses beside each token it names (the issue left it to
the fixer's judgment): the token is named, and the spin periods do not scale with tempo, so it stays. `toast.ts`'s "8px
slide" waits on gap G2 (#3482), a token name the owner picks.
