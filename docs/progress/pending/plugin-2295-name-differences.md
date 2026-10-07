## (2026-10-07) — Update dry run: the aspect lock read as Figma's Vector, and every difference named (#2295)

The first `capture-baseline` on the NB master skipped all three image-placeholder members with "differs from the plan in 1 place(s)". The owner knows of no edit, and the live read found every visible property matching the plan.

- **The cause: a read-back that disagreed with the host's type.** Figma types `targetAspectRatio` as `Vector | null`, an `{x, y}` pair whose ratio is `x / y`. The NB master's 4:3 frame reads `{x: 1.3333334, y: 1}`. `anatomy-readback.ts` compared it as a number, so on the real host every locked frame failed, 1:1 included. Both offline shims, the plugin's and the engine's `test.ts`, modeled a number. The read-back agreed with them, so no gate could see it: the `docs/34` permissive-stub shape. Both shims now model the Vector, `x` normalized at float32 with `y: 1`, as the host reads. The check reads the ratio and refuses a bare number, since no host returns one. Engine `patch` note: no artifact moves.
- **Every difference is now named.** The dry run's verdict lists each field a set differs from its plan in: the part, the property, the plan's value and the file's. `changes` is grouped, so one engine change over 432 members is one line, capped at 8 per set. The capture names each member it leaves out for differing, with what differs. A count alone could not tell a hand edit from an engine change, which is what #2265 exists to separate. Had these lines existed, this issue would have named `targetAspectRatio` on the first run.

### Traps for whoever re-verifies

- The NB master's three image-placeholder members still carry no as-built record. Run `capture-baseline` there again after this merges; they should record.
- `differ/image-placeholder` reproduces #2295 in the shim only because the shim now models the Vector. Before this, a fresh build read clean there and broken on the host, which is the whole defect.
- A `bound` difference shows every binding the plan declares on that node against the file's differing one, because `diffAnatomy` reports a node's bindings as one field. A "plan says" with several bindings in it is that, not several differences.
