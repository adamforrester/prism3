## (2026-11-17) — A relocation sharing its target with a dedupe migrates (#1142)

**What.** `planVariableRenames` groups rename rows by target, and with two or more live sources it reported
`ambiguous-source` for all of them. #1140 put two different operations on one target: the relocation
`border/inverse/primary` → `inverse/border/primary`, and the dedupe of `border/inverse/default` onto that twin. The
dedupe's ambiguity was charged to the relocation too, so in a designer's file the relocation kept every binding while the
write created an empty `inverse/border/primary` beside it. Now, in such a group, if exactly one live row keeps the target's
leaf (last segment), that row migrates and the rest report `target-occupied`. Zero or several leaf matches stay
`ambiguous-source`. The leaf is derived from the names, so no list of dedupes has to be kept in sync (`docs/34`), and it
is the one segment eras and the brand root never touch, so it reads the same on a composed row from any era's file.

**Owner decision pending.** The issue leaves the shape of the fix to the owner. Options:
1. **Leaf rule in `planVariableRenames`** (built, recommended): derived, no new field, and both write paths get it,
   because the function ships as source in the paste payload. The cost is that "keeps the leaf" stands in for "is a
   relocation". A wrong pick needs a relocation that renames its leaf and a dedupe that happens to share it; even then the
   other row is still reported, and nothing is lost that today's refusal keeps.
2. **An authored dedupe marker** on `Deprecation`, carried to `VarRename` and through the paste payload's row tuples:
   exact, but a second record to keep in sync with the table, and the paste serializer has to carry it.
3. **Keep the refusal**, and only correct the `version.ts` comment that calls it right.

**Reach on the shipped map.** 34 fan-in groups. 30 keep the leaf in two rows (one role spelled in two eras, e.g.
`…/on-inverse/border/rest` and `…/inverse/border/rest`) and stay ambiguous. 4 now migrate one source:
`inverse/border/primary` (the issue), and `inverse/border/focus`, `inverse/text/primary` and `inverse/icon/primary`, where
the co-claimant is a 4.0.0/5.0.0 leaf that was later promoted to a group or renamed (`border/focus-inverse`, `text/on-inverse`).
In those three, a file holding both now moves the current spelling and reports the leftover as `target-occupied`.

**Measured.** `test.ts` gains three #1142 arms: a relocation plus a dedupe (migrated + target-occupied), two leaf matches
(still ambiguous), and the issue's own path replayed on the shipped map and rules (a #1013-to-#1140 file's two names).
`apps/plugin/test-write.ts`'s fan-in arms now expect the 4 relocation groups, written out literally, to migrate. On
main, the engine fails 2 arms and the plugin test 4. Mutating `kept.length === 1` to `>= 1` fails the two-leaf arm and
the plugin's ambiguity arm by name.
