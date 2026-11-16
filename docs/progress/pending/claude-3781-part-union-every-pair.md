## (2026-11-16) — lint-part-union probes every (kind, field) pair, from a table held to the schema by tsc (#3781)

**What.** `lint-part-union.ts` proved the `PartDef` union refuses fields per kind with an authored sample: 56 illegal
probes of 407 forbidden pairs (77 fields × 7 kinds, less 132 admitted). A widening outside the sample passed it and
every other gate; #3781 measured `'wrap'` added to `NestKey`. The gate now probes every pair. `ADMITS`, authored in the
gate, says per FIELD which kinds may carry it; each (field, kind) pair is one probe file setting that field alone, which
must compile where `ADMITS` names the kind and fail by the field's name everywhere else. So a widening and a narrowing
of any kind's list both fail by kind and field.

**Why it stays independent (docs/34).** `ADMITS` is written field-major, the transpose of the schema's kind-major
`BoxKey`…`VectorKey`, and nothing reads those lists. One extra probe file types `ADMITS`'s keys as exactly the fields of
`PartFields` (less `kind`) and its kinds as exactly `PartKind`, so a field or kind added to the schema and missing here
fails tsc by name. Probe values are `Required<PartFields>[F]`, so a widened union cannot pass by refusing an ill-typed
value instead of the field: the field TYPES come from the bag; only who may carry each field is under test.

**Measured.** Against the validator, as #3781 suggested as an oracle: for each of the 407 forbidden pairs,
`validateComponentDef` refuses that field on a shipped part of that kind by name (407 of 407). With `'wrap'` added to
`NestKey`, main's gate printed `56/56 illegal fields refused`; this one fails with "the union ADMITS 'wrap' on a 'nest'
part". Mutations of the gate: dropping `grow` from `NestKey` fails "LEGAL nest part carrying 'grow' refused"; a new
`PartFields` field fails "ADMITS and the schema disagree — Property 'probeField' is missing"; generating only legal
probes fails "kind '…' has no ILLEGAL probe" for every kind. The gate runs in about 3 s (547 probe files, one tsc).

**Found on the way.** While measuring, malformed `gradient`, `directionWhen` and `builtSize` values on a non-box part
made `validateComponentDef` throw instead of refusing them — the untyped-def path #3778 asks about. Filed as #3811.
