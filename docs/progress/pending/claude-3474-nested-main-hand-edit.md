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

The shim reproduces **one mechanism**: a change to a nested component's main flags every member that nests it. It flags
all 36 of Icon button's focus-visible members. The real distribution does not look like that, and this entry does not
claim to explain it:

- **Flush icon button flags 9 of its 12 focus-visible members** (60 members). Its Destructive and Neutral sets flag 12,
  their focus-visible count. A change to the shared ring main would flag all 12, so it is not the whole story for the
  plain set.
- **Icon button Destructive flags 48, but holds only 36 focus-visible members**, so at least 12 flagged members do not nest
  Focus Ring at all. Button's 36 of 96 does not follow from the shim either.
- **On the real file, every focus-visible ring in a set has the identical override shape** (read 2026-11-07, both
  surfaces): the corners, size, positioning, name and `boundVariables`. So the shape cannot tell Flush's 9 from its other
  3: the flagged subset must differ by value. One candidate is the two ring mains (default and inverse surface) having
  moved differently.
- **The Spinner lead is plausible but unconfirmed.** The extra 12 appear only on sets with a pending state, whose 36
  pending members each nest a Spinner instance that overrides only its name and reads its size through its main. A change
  to Spinner's main for one paint family would fit, and the rule here would cover it, but nobody has seen the flagged list.

Only the plugin's dry run (`update-components confirm:false`) produces the flagged member paths; a read of the file
cannot. That run is what would confirm or rule out this mechanism for #3474's counts.

### The rule

**A change that arrives only through a nested instance's main is not a hand edit on the host; what the host set on the
instance still is.** Each member's record holds, beside the node hashes, one hash per nested instance of what the host
itself set on it (`Baseline.own`): the instance's signature cut to the fields its own entry in `InstanceNode.overrides`
lists, plus its type, its main, its property references and its exposure. Where both records hold it, `baselineDiff`
compares it in place of the node's hash. `nodeSignature` is unchanged, so every node hash is too and `BASELINE_V` stays 3
(the header's `reactions` and `art` precedent).

- **Existing records read exactly as they did.** A record from before this holds no `own` part, so its instances are
  compared whole, and a main change still flags them. They clear as each set is next written (an update, or Overwrite,
  the workaround in use). Owner decision Q77 A (2026-11-07): records written before this PR stay as they are, and
  Option B (clearing them sooner) is not taken. No real hand edit is lost.
- **A swap is still the host's** (`main` is always in the own part). **A rename of the nested component still moves it**:
  v3 names the main by name, not by key.
- **A binding is resolved against the main.** Figma lists a binding the host set or cleared as one field,
  `boundVariables`, not by the bound field's name (read on the real file: every nested focus ring lists it, while its
  `boundVariables` also holds the stroke weights and strokes its main binds). So each field whose binding on the instance
  differs from the main's is the host's, and one the two share is the main's. A host rebind still reads as a hand edit; a
  rebind on the main does not. Where the main's bindings cannot be read, every binding is kept as the host's.
- **A kept hand edit keeps its own part as recorded** (`finishUpdated`), as it keeps its node hash, or the next dry run
  would stop reporting it. On a record from before this, which holds no own part, the update leaves the part out, so the
  ring is still compared whole. That is the executor's code, so `EXECUTOR_REVISION` 54 → 55, reaching no set (it draws
  nothing).

### Gates

`figmaInstances` (`component-shim.ts`) models a Figma instance through `wrapNode`, from the typings and the real-file
read, never from the record code: unset fields and bindings read through from the live main, and a binding the host sets
or clears is listed as `boundVariables`. A plain shim instance carries `overrides` reading `undefined`, a host that lists
none: without it the snapshot's read of `overrides` was a host API the shim lacked, and `lint-executor-reach.ts` read four
sets (code input and its cell, page navigation and its item) as redrawn by 55. Nothing is drawn from that read, so entry
55 names none, measured clean.

Arms: `test-update-components.ts` `#3474/…` and `test-update-apply.ts` `#3474 kept/…`. Mutations, each failing by name:
the own-part branch dropped → `#3474/main`; the own signature ignoring overrides → `#3474/host`, `#3474/host override`;
the snapshot not reading `overrides` → `#3474/main`; `finishUpdated`'s keep dropped → `#3474 kept/still reported`;
`finishUpdated`'s branch for a record with no own part removed → `#3474 kept/earlier record`; `boundVariables` dropped
unresolved → `#3474/host rebind`; every binding counted as the host's → `#3474/main`, `#3474/main rebind`; only the
instance's own binding keys walked, so a host clear of a main binding is dropped → `#3474/host clear`; the unreadable-main
fallback inverted → `#3474/host rebind, main unreadable`.
