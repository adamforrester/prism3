## (2026-10-16) — Naming sweep PR 4: layers named per the naming table, renamed in place by Update (#2759, owner decision Q350)

**What moved.** Every layer name `lint-naming.ts` listed for PR 4, plus the main-text renames it cannot check:
- **Glyph layers end in `Glyph`:**
  - Checkbox.Control: `mark`, `dash`
  - Field message: the three status glyphs (`iconError` → `errorGlyph`, and so on)
  - Textarea: `grip`
  - Select: `chevron`
  - Image placeholder: `marker`
  - Spinner: `ring`
  - Tag: `check`
  - Accordion indicator: its four glyphs
- **A Row's control cell is `controlCell`.**
- **Main text is `label`** for FieldLabel, Field message, Badge and List item.
- **Two roots are renamed for their role:** Divider `divider` → `container`, and FieldLabel `label` → `container`. The second frees `label` for its text. `label` leaves the gate's root role list and the skill table, since main text owns it.

`lint-naming.ts` drops its 18 PR 4 entries. Only the per-item booleans that #2660 removes are left.

**Owner calls built on a recommendation** (raised on #2759):
- **Q-N3:** main text where `label` was taken. Dialog keeps `title`.
- **Q-N4:** each glyph's name.

**A side effect of Q-N3.** FieldLabel's text is now named `label`, the same name as the `label` instance a field nests it under. That is #1428's collision shape: a host part and a nested part with one name. The executor's `findOwnPart` already scopes every find-by-name past nested instances. `test-roundtrip.ts`'s #1428 block now gives its colliding nested parts a `label` as well, so that scoping is exercised against the new name.

**The mechanism.**
- **Ledger:** `COMPONENT_RENAMES` gains a `part` kind. A def's part entries form one map, not a chain, so FieldLabel's text can take the name its root gave up. Naming a part twice is refused.
- **Dry run:** `renamedSnap` reads each member's snapshot under the new layer names. A renamed layer reads as the same node, where it used to read as one removed and one added. The record is compared as read, so no layer reads as a hand edit.
- **Apply:** the layers are renamed first, before the identity is captured. The verify then holds each renamed layer to its old id.
- **Skipped members:** a member the update does not configure is not renamed, because its record would no longer match.
- **Untouched:** the root (the member itself) and an instance's contents (its main's).

Before this change, a renamed part was listed as a replacement, and every override on it was lost.

**Proof through the shim** (`test-update-apply.ts`, "part rename").
- **Setup:** a Tag built from plans that say `check`.
- **No ledger entry:** the dry run removes `check` and adds `checkGlyph`.
- **With the shipped ledger:** nothing is removed, added or replaced, and nothing reads as a hand edit.
- **After the apply:**
  - all 15 selected members hold `checkGlyph` under the id `check` had;
  - every member keeps its key and id;
  - a second dry run reads all 45 members current.

`test.ts` checks that every `part` entry renames a layer the def no longer has into one it has now. The registry is the oracle there.

**Gate lists moved with the names:** `lint-glyph-geometry`'s per-part lists and `lint-absolute-inset`'s corner list. The paint census changed for exactly the 12 defs with a renamed painted layer, each "the same count of assignments, pointing somewhere else". So the census moved names, not paint.

**Not folded in.** #2710's binding-key spellings and #2712's field order and stated-empty keys are different mechanical edits from a layer rename. Each stays for its own PR. #2710 asks to land after #2660.

**Not enforced, said so.** The renames lint's baseline records axes, values and properties, not layer names. So a future PR that drops a layer without a `part` entry is not caught by a gate. That would make the lint demand an entry for every removed layer, which is a process change for other lanes. Filed as #2776 rather than added here.

**Consumer-visible names (published library, #2839).** No component property, variant value or set name changes in this PR. The layer names inside members change, as the table above lists: Checkbox.Control `mark`/`dash` → `checkGlyph`/`dashGlyph`; Field message `iconError`/`iconWarning`/`iconSuccess`/`text` → `errorGlyph`/`warningGlyph`/`successGlyph`/`label`; Textarea `grip`, Select `chevron`, Image placeholder `marker`, Spinner `ring` and Tag `check` → `…Glyph`; Accordion indicator's four glyphs → `…Glyph`; Checkbox.Row and Radio.Row `controlBox`, Switch.Row `trackBox` → `controlCell`; FieldLabel `text` → `label`; Badge and List item `text` → `label`. The two root renames (FieldLabel, Divider) rename no layer, since a member is its own root. Update renames each layer in place, keeping its id, and #2839's classifier lists nothing as breaking. Anything that finds these layers by name, such as a consumer's plugin or a Code Connect mapping that reads a layer, needs the new names. Layer overrides in placed instances surviving the rename is argued from the kept ids, not observed in Figma.
