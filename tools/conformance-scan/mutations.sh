#!/usr/bin/env bash
#
# THE SELF-CHECK'S OWN PROOF — one mutation per diff arm, each asserting a named failure.
#
#   bash tools/conformance-scan/mutations.sh
#
# `docs/34-gate-independence.md`: the check is not "does the suite go red", it is "mutate the subject
# and confirm YOUR check is among the failures, by name". `diff.ts --selftest` claims a broken arm shows
# up as a named MISSING row. This script is what makes that claim falsifiable — it breaks each arm in
# turn and asserts the exact line the run must print.
#
# ── TWO THINGS THE FIRST DRAFT OF THIS SCRIPT GOT WRONG, BOTH WORTH KEEPING WRITTEN DOWN ────────────
#
# 1. A MUTATION THAT REMOVES A NULL GUARD IS NOT A MUTATION OF THE FINDING. Three arms report their
#    finding inside the guard that also protects the code below it (`if (!got) { report; continue; }`).
#    Muting the CONDITION dropped the `continue` too, so the diff crashed on `undefined` and printed a
#    stack trace — which is a red run that proves nothing: it did not show the arm going quiet, it
#    showed the harness breaking. Every mutation here therefore suppresses the `findings.push`, never
#    the guard, so the diff keeps working and only the FINDING disappears — the shape a real regression
#    takes.
#
# 2. TWO SUB-BRANCHES ARE NOT PROVABLE BY NAME, AND THAT IS A PROPERTY OF THE DIFF RATHER THAN A GAP.
#    Category (a) has three branches — nothing bound, a raw literal, and a kind mismatch — and the third
#    is a deliberate catch-all. Mute either of the first two and the catch-all reports the same finding
#    at the same category and the same subject, with a less precise summary. So the `--selftest` row
#    SURVIVES and `--selftest` is right to pass: the report still names the coordinate. What degrades is
#    the diagnosis, and a diagnosis is not a row, so those two mutations assert against the rendered
#    REPORT instead. The boundary is worth stating plainly: `--selftest` proves that a defect is
#    reported under the right category and subject. It does not proof-read the summary. This script
#    covers the part it cannot.
#
# 3. TWO BRANCHES OF ARM (i) ARE NOT MUTATED HERE, AND FABRICATING A FIXTURE FOR THEM WOULD BE WORSE THAN
#    LEAVING THEM. Both fire when a style is MISSING a property the engine sets, or carries a font style
#    with no weight to read — and a Figma text style always has a family, a size, a line height and a
#    `fontName`, so no read of a real file produces either. Their real cause is a READER that stopped
#    normalizing a property, not a document that lost one. A fixture for them would therefore be a fixture
#    for a state Figma cannot return, and the arm would then be proven against a shape it will never meet.
#    Left unproven on purpose, and written down here rather than left to be rediscovered as an oversight.
#
# Every mutation is applied to the working tree and reverted with `git checkout -- <file>`, which reaches
# back to HEAD. So: COMMIT BEFORE RUNNING THIS. Work done in these files and not committed is destroyed
# by the first revert, silently, and no command finds it afterwards (CLAUDE.md, three incidents).
#
# Run from anywhere. Exits non-zero if any mutation went UNDETECTED, which is the only outcome that
# matters: an undetected mutation is an arm nothing can prove, and therefore an arm that can stop
# working while the report reads clean.
set -uo pipefail

cd "$(dirname "$0")/../.." || exit 1
D=tools/conformance-scan/diff.ts
S=tools/conformance-scan/state.ts
F=tools/conformance-scan/fixtures
PASS=0; FAIL=0

if ! git diff --quiet -- "$D" "$S"; then
  echo "REFUSING: $D or $S has uncommitted changes. Every revert here is \`git checkout --\`, which"
  echo "reaches back to HEAD and would destroy them. Commit first."
  exit 1
fi

SELFTEST="npx tsx $D --selftest"
REPORT="npx tsx $D $F/expected.json $F/actual-dirty.json"

# $1 file  $2 label  $3 literal to replace  $4 replacement  $5 command  $6 `have`|`gone`  $7 the line
#
# `have` — the mutated run MUST print $7 (a named MISSING row, or a named baseline/guard failure).
# `gone` — the mutated run must NO LONGER print $7, and the UNMUTATED run must, which is checked first.
#          Without that pre-check a `gone` assertion passes for a string that was never there, which is
#          a mutation test that proves nothing — the blank-named-grep shape (#986).
mutate() {
  local file="$1" label="$2" from="$3" to="$4" cmd="$5" mode="$6" want="$7" out
  if [ "$mode" = gone ] && ! $cmd 2>&1 | grep -Fq "$want"; then
    echo "  BROKEN  $label — the unmutated run never prints $want, so its absence proves nothing"
    FAIL=$((FAIL+1)); return
  fi
  FROM="$from" TO="$to" python3 - "$file" <<'PY' || { echo "  SKIP  $label — the code it targets moved"; FAIL=$((FAIL+1)); return; }
import os, sys
p = sys.argv[1]
s = open(p).read()
frm, to = os.environ['FROM'], os.environ['TO']
if s.count(frm) != 1:
    sys.stderr.write(f"  anchor occurs {s.count(frm)}x, need exactly 1: {frm!r}\n")
    sys.exit(1)
open(p, 'w').write(s.replace(frm, to, 1))
PY
  out=$($cmd 2>&1)
  git checkout -- "$file"
  if { [ "$mode" = have ] && grep -Fq "$want" <<<"$out"; } ||
     { [ "$mode" = gone ] && ! grep -Fq "$want" <<<"$out"; }; then
    echo "  DETECTED    $label"
    PASS=$((PASS+1))
  else
    echo "  UNDETECTED  $label"
    echo "              expected the mutated run to ${mode/have/print}${mode/gone/STOP printing}: $want"
    sed 's/^/                /' <<<"$out"
    FAIL=$((FAIL+1))
  fi
}

# TWO MUTATION SHAPES, and using the wrong one for a branch is how the first two drafts of this script
# produced red runs that proved nothing (header note 1):
#
#   `mute` — prefix `if (false)` to a `findings.push(`. The anchor MUST begin at `findings.push`, never at
#            the guard above it: prefixing `if (!got) { push; continue; }` swallows the `continue` too, and
#            the diff then crashes on `undefined` instead of going quiet.
#   `nocond` — rewrite a CONDITION to `false && …`. The only shape that works on an `else if`, because
#            `if (false) else if` is a syntax error, not a mutation.
mute() { mutate "$D" "$1" "$2" "if (false) $2" "$SELFTEST" have "MISSING  $3"; }
nocond() { mutate "$D" "$1" "if ($2)" "if (false && $2)" "$SELFTEST" have "MISSING  $3"; }
# `unreport` asserts a rendered-report DIAGNOSIS disappears — for the sub-branches a catch-all covers.
unreport() { mutate "$D" "$1" "$2" "if (false) $2" "$REPORT" gone "$3"; }

echo "MUTATING THE DIFF ARMS — each must produce a named MISSING row in --selftest"
echo

nocond "(a) presence: the style-vs-variable branch" \
  "gotKind !== wantKind" \
  "binding-presence: widget · size=md, state=rest · /label · textStyle"

nocond "(b) target: the wrong-variable branch" \
  "gotTarget !== wantTarget" \
  "binding-target: widget · size=md, state=rest · /label · fills"

# The per-side stroke weights DISAGREEING. `actualFor` hands that back as a `problem` rather than as a
# bind, and this is the one mutation that proves the arm reports it instead of judging the first fragment
# it found — which would pass, because the first side is bound to the right variable.
nocond "(b) target: the per-side stroke disagreement" \
  "problem" \
  "binding-target: widget · size=md, state=hover · / · strokeWeight"

mute "(c) value-match push" \
  "findings.push(
          f('value-match'," \
  "value-match: fix/core/palette/neutral/900 [Default]"

mute "(d) mode-coverage: the missing-mode push" \
  "findings.push(
          f('mode-coverage', 'high', \`\${name} [\${mode}]\`, 'the variable has no value" \
  "mode-coverage: fix/color/icon/primary [dark]"

mute "(e) scope-type: the resolvedType push" \
  "findings.push(
        f('scope-type', 'high', name, 'wrong resolvedType" \
  "scope-type: fix/opacity/veil"

mute "(e) scope-type: the scopes push" \
  "findings.push(
        f('scope-type', 'low', name, 'scopes differ" \
  "scope-type: fix/size/md/height"

mute "(f) structure: the absent-variable push" \
  "findings.push(
        f('structure', 'high', name, 'the engine emits this variable" \
  "structure: fix/color/text/secondary"

mute "(f) structure: the orphaned-collection push" \
  "findings.push(
        f('structure', 'medium', \`collection '\${collection}'\`," \
  "structure: collection 'legacy'"

mute "(f) structure: the absent-component push" \
  "findings.push(
        f('structure', 'high', \`component '\${id}'\`, 'the engine builds this component" \
  "structure: component 'gadget'"

mute "(i) style-definition: the absent-style push" \
  "findings.push(
        f('style-definition', 'high', showStyleKey(key),
          'the engine emits this style" \
  "style-definition: grid style 'Grid / xs'"

mute "(i) style-definition: the wrong-variable push" \
  "findings.push(
            f('style-definition', 'high', showStyleKey(key),
              \`the style's \${field} is bound to the wrong variable\`" \
  "style-definition: text style 'label/sm/default'"

# The kind-mismatch branch fires on TWO subjects in the fixture — a detached font style and a flattened
# gradient stop — and only the gradient's row disappears when it is muted, because the detached one is also
# the wrong weight and keeps its row alive. Asserting the row that CAN move is the honest assertion; the
# other half of this branch is asserted on the report further down.
mute "(i) style-definition: the flattened-variable push" \
  "findings.push(
          f('style-definition', 'high', showStyleKey(key),
            flattened" \
  "style-definition: paint style 'gradient/brand'"

# A value that differs from the emitted one, whichever of the two routes reports it. The fixture's px-for-
# percent line height is the ONLY finding on its style, so silencing the comparison moves the row — but it
# has to be silenced at the guard: muting the unit push alone drops the finding into the generic drift push
# below it, at the same category and the same subject, and the row survives. The unit branch is asserted on
# its own further down, where a diagnosis is what is being proven.
nocond "(i) style-definition: the value comparison" \
  "wp.kind === 'value' && gp.kind === 'value' && wp.value !== gp.value" \
  "style-definition: text style 'body/md/default'"

mute "(i) style-definition: the generic drift push" \
  "findings.push(
            f('style-definition', severityOfStyleField(field), showStyleKey(key),
              \`the style's \${field} has drifted" \
  "style-definition: effect style 'shadow/sm'"

mute "(i) style-definition: the extra-style push" \
  "findings.push(
        f('style-definition', 'low', showStyleKey(key),
          'the file has a style the engine does not emit" \
  "style-definition: text style 'designer/scratch'"

mute "(g) contrast: the AA-failure push" \
  "findings.push(
        f('contrast', 'high'," \
  "contrast: light · text.primary on background.primary"

mute "(h) staleness push" \
  "findings.push(
      f('staleness', 'medium', 'engine version'," \
  "staleness: engine version"

echo
echo "MUTATING WHAT --selftest CANNOT SEE — the diagnosis a category (a) catch-all would replace"
echo

# Both of these keep the --selftest row: the kind-mismatch branch below them reports the same finding at
# the same category and subject, with a less precise summary. See note 2 in the header. So the assertion
# is that the RENDERED REPORT stops carrying the specific diagnosis.
mutate "$D" "(a) presence: the nothing-bound diagnosis" \
  "if (gotKind === 'absent')" "if (false && gotKind === 'absent')" \
  "$REPORT" gone "nothing bound where the engine binds a variable"

mutate "$D" "(a) presence: the raw-literal diagnosis" \
  "if (gotKind === 'literal')" "if (false && gotKind === 'literal')" \
  "$REPORT" gone "a raw literal where the engine binds a variable"

# Same shape, and the one that matters most in practice: 1,392 of aurora's bindings are `textStyle`, and
# a file where every one has DETACHED reports at the same category and subject as one where the style was
# never applied. Only the summary separates them, and only the summary says which fix is the right one.
mutate "$D" "(a) presence: the detached-text-style diagnosis" \
  "gotKind === 'absent' && detachedFontFields(key, want, actual).length === STYLE_FONT_FIELDS.length" \
  "false" \
  "$REPORT" gone "the text style is DETACHED"

echo
echo "MUTATING WHAT THE BASELINE AND THE GUARDS PROVE"
echo

# The descendantFills lenience is what the clean fixture's `/glyph/Vector fills` exercises. Breaking it
# must turn the BASELINE red — a faithful file reporting drift. It is the one arm whose failure mode is
# a FALSE POSITIVE rather than a silence, so it is proven by the baseline and not by a missing row.
mutate "$D" "the descendantFills lenience" \
  "  if (property !== 'descendantFills') return { bind: { absent: true }, via: null };" \
  "  return { bind: { absent: true }, via: null };" \
  "$SELFTEST" have "FAIL  baseline: a faithful actual produced"

# The strokeWeight collapse, proven the same way and for the same reason: a real read never contains
# `strokeWeight`, so breaking the collapse reports every uniform-weight claim in the file as unbound —
# 2,096 of them in aurora, none real. A false positive at that volume buries the report, so the assertion
# is that the faithful baseline stops being clean.
mutate "$D" "the strokeWeight per-side collapse" \
  "    if (found.length === SIDE_WEIGHTS.length && targets.length === 1)" \
  "    if (false)" \
  "$SELFTEST" have "FAIL  baseline: a faithful actual produced"

# The other half of both reconciliations: the fields they consume must not ALSO be reported as bindings
# the engine does not plan. `/label` in the clean fixture carries its style's three font fields, as a
# styled node does, so dropping the suppression turns the faithful baseline red.
mutate "$D" "the reconciled-field extras suppression" \
  "    if ((STYLE_FONT_FIELDS as readonly string[]).includes(p) && planned('textStyle')) continue;" \
  "" \
  "$SELFTEST" have "FAIL  baseline: a faithful actual produced"

# Bindings inherited through an INSTANCE. The clean fixture's `/focusRing` is one, so dropping the
# suppression turns the baseline red — and in a real read it is 2,705 findings that say nothing.
mutate "$D" "the inherited-instance suppression" \
  "    if (underInstance(key, instances)) { inherited++; continue; }" \
  "" \
  "$SELFTEST" have "FAIL  baseline: a faithful actual produced"

# …and the note that keeps that suppression from being a silence. The count is the only evidence a
# reader gets that 2,705 coordinates were judged rather than missed, so it is asserted on the REPORT.
mutate "$D" "the inherited-instance note" \
  "  if (inherited > 0)" "  if (false)" \
  "$REPORT" gone "are not reported: an instance surfaces"

# GAP B, all three halves. What a file consumes from a published library is absent from every local read,
# so each suppression's failure mode is a FALSE POSITIVE on a faithful file — the descendantFills shape
# again, and proven the same way. The clean fixture consumes one collection, one variable and one style from
# a library, so dropping any one of the three turns the baseline red.
mutate "$D" "(f)+(c,d,e) the library-consumed VARIABLE suppression" \
  "      if (library.has(name)) { fromLibrary++; continue; }" \
  "" \
  "$SELFTEST" have "FAIL  baseline: a faithful actual produced"

mutate "$D" "(f) the library-consumed COLLECTION suppression" \
  "      if (library.has(collection)) { fromLibrary++; continue; }" \
  "" \
  "$SELFTEST" have "FAIL  baseline: a faithful actual produced"

mutate "$D" "(i) the library-consumed STYLE suppression" \
  "      if (library.has(key)) { fromLibrary++; continue; }" \
  "" \
  "$SELFTEST" have "FAIL  baseline: a faithful actual produced"

# …and the three counts that keep those suppressions from being silences. Each is the only evidence a reader
# gets that a name was judged rather than missed, so each is asserted on the REPORT.
mutate "$D" "the library-consumed VARIABLE note" \
  "notes.push(
      \`\${fromLibrary} variable(s)" \
  "if (false) notes.push(
      \`\${fromLibrary} variable(s)" \
  "$REPORT" gone "their values are the library's"

mutate "$D" "the library-consumed COLLECTION note" \
  "notes.push(
      \`\${fromLibrary} collection(s)" \
  "if (false) notes.push(
      \`\${fromLibrary} collection(s)" \
  "$REPORT" gone "nor are their modes, which a local read cannot enumerate"

mutate "$D" "the library-consumed STYLE note" \
  "notes.push(
      \`\${fromLibrary} style(s)" \
  "if (false) notes.push(
      \`\${fromLibrary} style(s)" \
  "$REPORT" gone "their interiors live in the library file"

# The fontWeight reconciliation, whole. Figma stores no fontWeight on a text style, so emptying the
# reconciled set sends every emitted fontWeight down the missing-property branch — four false findings on a
# faithful file here, 38 in aurora. Proven by the baseline, like every other lenience.
mutate "$D" "(i) the fontWeight reconciliation" \
  "const RECONCILED_STYLE_FIELDS = new Set(['fontWeight']);" \
  "const RECONCILED_STYLE_FIELDS = new Set(['nothing-is-reconciled']);" \
  "$SELFTEST" have "FAIL  baseline: a faithful actual produced"

# The half of that reconciliation `--selftest` cannot see. Where the font style is a LITERAL the weight is
# read out of its NAME, and the fixture's detached `caption/md/default` is also a raw value where a variable
# was planned — so the row survives and only the weight diagnosis disappears.
unreport "(i) the weight-from-font-style-name comparison" \
  "findings.push(
            f('style-definition', 'high', showStyleKey(key),
              'the weight named by the file\'s font style" \
  "is not the weight the engine sets"

# The one unit difference arm (i) does NOT normalize away, and the mutation that proves it is a branch of its
# own rather than a spelling the diff shrugs at. Mute it and the same px-for-percent line height is still
# reported — as generic drift, at the same category and subject, with the reason gone. The reason is the
# finding here: a reader told 21px and 150% differ learns nothing, and one told the percentage is
# mode-invariant on purpose knows which of the two to change.
unreport "(i) the lineHeight unit difference is its own diagnosis" \
  "findings.push(
            f('style-definition', 'high', showStyleKey(key),
              \`the \${field} is \${gu} where the engine bakes" \
  "is mode-invariant on purpose (#1356)"

# The weight table is deliberately not exhaustive, and an unknown name must go UNEVALUATED rather than pass.
# Removing the entry the fixture depends on is what proves that: the run must say so in words.
mutate "$D" "(i) an unknown font-style name is unevaluated, not a pass" \
  "  bold: 700," "" \
  "$REPORT" have "names no weight this harness knows"

# …and the count that makes the riding-on-a-variable half of the reconciliation visible.
mutate "$D" "the fontWeight-rides-on-a-variable note" \
  "notes.push(
      \`\${ridingOnVariable} text style(s)" \
  "if (false) notes.push(
      \`\${ridingOnVariable} text style(s)" \
  "$REPORT" gone "had their fontWeight checked through a variable-bound fontStyle"

# The side guard is what stops a transposed argument pair diffing cleanly in the mirror direction.
mutate "$S" "the expected/actual side guard" \
  "  if (s.side !== side)" "  if (false)" \
  "$SELFTEST" have "FAIL  side guard: an expected state was accepted as an actual one"

# Step 3's coverage assertion, mutated in the FIXTURE rather than the diff: deleting a manifest row must
# fail as missing COVERAGE for that category, not pass as a smaller set. This is the one that stops the
# self-check from being weakenable by editing the answer key.
# A read that does not enumerate styles at all — the state a reader written before Gap B produces, and the
# one shape where arm (i) must say it is BLIND rather than report every emitted style as absent. Mutated in
# the FIXTURE, because the claim is about a state the harness will really be handed.
mutate "$F/actual-dirty.json" "arm (i)'s blind spot is named, not every style reported missing" \
  '  "styles": {' '  "stylesTHE-READ-DID-NOT-ENUMERATE-THESE": {' \
  "$REPORT" have "could not run: the read did not enumerate style definitions"

mutate "$F/manifest.json" "the manifest's last coverage row, (h) staleness" \
  ',
    "staleness: engine version"' '' \
  "$SELFTEST" have "no injected defect for 1 category(ies), so they are unproven: staleness"

echo
echo "-------------------------------------------------------------------------------"
echo "$PASS detected, $FAIL undetected"
if ! git diff --quiet -- "$D" "$S" "$F/manifest.json" "$F/actual-dirty.json"; then
  echo "WARNING: a revert did not take — check \`git status\` before trusting anything above."
  exit 1
fi
[ "$FAIL" -eq 0 ] || { echo "An UNDETECTED mutation is an arm nothing can prove."; exit 1; }
echo "Every arm fails by name when broken."
