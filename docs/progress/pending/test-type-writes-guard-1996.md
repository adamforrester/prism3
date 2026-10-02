## (2026-10-02) — the "main.ts keeps no Type writes" guard matches what is written, not how (#1996)

**Status:** test-only (`apps/studio/test-shell-imports.ts`). No studio source change, no freeze exception, no
engine change.

### What changed

S6.1's guard held that `main.ts` keeps no Type input writes, by matching three spellings of one. Two more
passed it, each measured by pasting it into `main.ts` (149/149 green): a direct nullish-assign write,
`(brandState.typography ??= {}).sizes…`, and the generic per-mode swap without its `easings` guard,
`setModeLever(m, `${modeField}.${s.key}`, …)`.

The guard now reads `main.ts`'s AST, with a type checker over the one file so each identifier resolves to its
own declaration, and states the rule about the write's target, three ways:

1. **Direct:** nothing lands on `brandState.typography`, whether by any assignment operator, `delete`,
   `++`/`--`, `Object.assign`, a mutating method, or one alias deep.
2. **Keyed:** each `setPath(brandState, K)` and `setModeLever(M, K)` key is resolved statically: a literal, a
   template's literal head, or a head narrowed by an enclosing `if (X === 'lit')`, which is how line 3621's
   `easings` swap passes. A Type key fails. A key that does not resolve must be on `UNRESOLVED_OK`, by
   function and key text, each with its reason. An entry that no longer names a write fails too.
3. **Fed:** the generic lever renderer writes whatever lever it is handed, and the lever manifest does carry
   `typography.*` keys. So no Type lever (a `typography.*` key literal, `leversFor('typography')`, or a
   variable built from either) may reach `renderControl` or its wrappers. This is what makes rule 2's
   `renderControl:lever.key` entry true rather than asserted.

The Type mode fields are literals, and every member of the engine's `ModeLevers` type must be classified as
Type or not, so a new per-mode field fails until someone decides.

### What was checked, not assumed

`main.ts` names three Type lever keys today (`typography.typeScale`, `.displayCeiling`, `.titleFloor`). All
three are reads, for the current value and the options; their writes go through `state/type-input.ts`
(`setTypeScale`, `setDisplayCeiling`, `setTitleFloor`). So the guard's claim holds on `main`, now checked.

### Mutations

| Pasted into `main.ts` | Fails |
|---|---|
| `(brandState.typography ??= {}).sizes = …` (the issue's first) | `src/main.ts writes nothing into brandState.typography itself — line 1684 …` |
| the per-mode swap without its `easings` guard (the issue's second) | `every keyed write … resolves to a non-Type key, or is listed … — unresolved and unlisted: line 3621 …` |
| an alias write, `const tt = brandState.typography; tt.titleFloor = 16` | rule 1, `… tt.titleFloor = 16` |
| `setPath(brandState, 'typography.typeScale', …)` | rule 2 |
| `renderControl(ceil)`, a Type lever to the generic renderer | rule 3 |

The first two pass `main`'s guard, 149/149: the control.

**A trap for whoever extends this:** an alias tracked by NAME was the first version, and it was wrong. An
unrelated `l` elsewhere in the file tainted every `l`, so `renderControl(l, …)` failed on a non-Type lever.
Identifiers resolve through the checker now.
