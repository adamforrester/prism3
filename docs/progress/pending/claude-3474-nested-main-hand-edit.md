## (2026-11-06) — Update file: a change that reaches a member only through a nested instance's main is not a hand edit (#3474)

The owner's rule on #3474: a hand-edit flag must mean a person edited that member. The update check flagged the button
family's focus-visible members on the reference brand's master as "edited by hand" with nobody having touched them.

### Diagnosis, on the shim

Focus Ring, then Icon button nesting it, built into one file; the main then changed without touching the host:

- **A property added to Focus Ring's set** moves `props` in the host ring's signature. **A Focus Ring member renamed**
  moves `main`. Either flags exactly the 36 focus-visible members, at `focusRing`. A shim instance inherits nothing else
  from its main, so this is all the plain shim can show.
- **On Figma an instance reads every field it does not override from its main**: its stroke and stroke weight (and their
  bindings), paints, effects, opacity, visibility, property values. `nodeSignature` hashed all of them on the ring
  instance, so any change to Focus Ring's main moved every host's record. The host's own overrides (absolute, inset, the
  four corners, the cleared size bindings) are the only part that is the host's.
- **The other cause tried, an executor or plan change to how the ring's overrides are written, has no path today.** The
  only writer of those overrides is the executor, and the in-place update records each member after it writes
  (`finishUpdated`). A record taken before an executor change is replaced by the update that applies the change.

### The counts are not explained

Icon button's 36 and Flush icon button's 12 are exactly their focus-visible members, which fits. Button's 36 of 96
focus-visible members, and 12 more members on each Destructive set, do not follow from the shim: the shim cannot say
which fields the real file's instances override and which they read from the main. 36 is Button's inset=default
focus-visible members on ONE surface (3 appearance × 3 size × 4 slot), and 48 is that plus the surface's 12 flush
members, but Icon button's 36 span both surfaces, so a change to one ring member does not explain all three. A read-only
`update-components confirm:false` through the agent link (or a Mac job) gives each flagged member's path. To find the
field, the read also needs, for one flagged and one unflagged focus-visible member of the same set: the ring instance's
`nodeSignature` input (snapshot), its `overrides`, and the Focus Ring main's `boundVariables` and `strokes`.

### The rule

**A change that arrives only through a nested instance's main is not a hand edit on the host; what the host set on the
instance still is.** Each member's record holds, beside the node hashes, one hash per nested instance of what the host
itself set on it (`Baseline.own`): the instance's signature cut to the fields its own entry in `InstanceNode.overrides`
lists, plus its type, its main, its property references and its exposure. Where both records hold it, `baselineDiff`
compares it in place of the node's hash. `nodeSignature` is unchanged, so every node hash is too and `BASELINE_V` stays 3
(the header's `reactions` and `art` precedent).

- **Existing records read exactly as they did.** A record from before this holds no `own` part, so its instances are
  compared whole, and a main change still flags them. They clear as each set is next written (an update, or Overwrite,
  the workaround in use). Whether to clear them sooner is held for the owner (see the PR).
- **A swap is still the host's** (`main` is always in the own part). **A rename of the nested component still moves it**:
  v3 names the main by name, not by key.
- **A kept hand edit keeps its own part as recorded** (`finishUpdated`), as it keeps its node hash, or the next dry run
  would stop reporting it. That is the executor's code, so `EXECUTOR_REVISION` 54 → 55, reaching no set (it draws
  nothing).

### Gates

`figmaInstances` (`component-shim.ts`) models a Figma instance through `wrapNode`, from the typings, never from the record
code. A plain shim instance now carries `overrides` reading `undefined`, a host that lists none: without it the snapshot's
read of `overrides` was a host API the shim lacked, and `lint-executor-reach.ts` read four sets (code input and its cell,
page navigation and its item) as redrawn by 55. Nothing is drawn from that read, so entry 55 names none, measured clean. `test-update-components.ts` `#3474/…` and `test-update-apply.ts` `#3474 kept/…`. Mutations, each failing by name:
the own-part branch dropped → `#3474/main`; the own signature ignoring overrides → `#3474/host`, `#3474/host override`;
the snapshot not reading `overrides` → `#3474/main`; `finishUpdated`'s keep dropped → `#3474 kept/still reported`.
