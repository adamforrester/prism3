## (2026-11-18) — Dialog's width-only `size` is no variant; Update file merges the old size members (#3392)

**What.** The owner answered #3392 with A (2026-11-18) for Dialog, superseding Q303/Q489 for the axis.
- `size` changed only a centered panel's built width (400 / 560 / 720), so it leaves `variants` and the Figma axes.
- Dialog is one set of 16 members (placement × footer, was 24), and a centered member is built at 560.
- The code prop `size` stays (small, medium, large; medium the default). Its description gives the three widths as
  recommendations and says the designer sets the width in a design file.
- The seven forwarding axes and the color-only axes are untouched, as decided.

**The Update file path.** Today an update REFUSES any set an axis removal collapses ("deleting them is never the
default"), and a declared `drop` keeps members deprecated. Neither fits a file holding the old members: the first
blocks it, and the second leaves 8 members on an axis the set no longer has. So `COMPONENT_RENAMES` gains a `merge`
kind, `{ def, kind: 'merge', axis, into }`, with one entry for Dialog (`size`, into `medium`):
- The dry run treats the `into` member as each coordinate's match, renamed off the axis in place, so its id, key and
  placed instances are kept.
- Each other member on the axis becomes a `merge` instead of a blocking collapse. The confirm line says
  "N to merge into another member, its instances moved" (DRAFT).
- The apply runs before the identity snapshot and the rename block. It swaps every placed instance of a merged member
  (`getInstancesAsync`) onto the surviving member, restores the width it had, then removes the member.
- On a published set, each merge is listed as breaking files that use the library: their instances of a removed member
  stop updating until swapped. That wording is DRAFT too.
- `lint-component-renames` accepts `merge` as accounting for a gone axis, and refuses one whose axis is still projected.
- `update-apply.ts` and `update-plan.ts` are not executor files, so `EXECUTOR_REVISION` is unchanged
  (`lint-executor-revision` clean).

**Versioning.** #1325's component-contract version is decided, but its mechanism has not landed
(`prism3-build-component` §8 says so, and `lint-skills` admits `COMPONENT_CONTRACT_VERSION` as not declared). So this is
an `engine: minor` change note, plus the component-surface and axes baselines accepted, and the PR flags it.

**Measured.** Plugin shim, `test-update-apply.ts` section `dialog size`:
- Setup: the old def is rebuilt by putting the axis back. Its projection matches origin/main's surface baseline exactly
  (24 members, sha 529ad20a… since #4057; it was 5a835955… after #4084 and 17ff3a9b… before).
- After the update the set holds 16 members, none on `size`, no two on one coordinate, none deprecated. The medium
  member keeps its node, id and key. Two placed small instances and one large one point at the medium member at 400
  and 720. The medium instance is not swapped, and every member reads current after.
- On main's `update-plan.ts` and `update-apply.ts`, 10 of its arms fail by name: the set is refused for the collapse.
- Mutations, each failing by name: the ledger entry dropped (the same 10 arms, plus `lint-component-renames` "axis
  'size' is gone"); the width restore dropped (`placed small`, `placed large`).
- `test.ts`: the Dialog shape arms now type the 16-member contract, with new `#3392` arms for the axes and the code
  prop. On main's `dialog.ts`, 11 fail by name.

**Owner decisions (2026-11-19, all as recommended).**
1. Dialog's `size` code prop is kept (400 / 560 / 720px).
2. An update may delete members, only on an axis the ledger declares as a `merge`.
3. The strings "N merged into another member" and "✓ N merged into another member" are approved.
