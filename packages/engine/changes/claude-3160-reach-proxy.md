---
engine: patch
---
lint-executor-reach sees a host call the component shim lacks (#3160). The executor calls optional host APIs through
optional chaining, and a method the shim does not implement made that call a no-op on both sides, so a drawing change
through one read as unchanged. Every node the gate draws now records each property it is asked for and lacks, and a
host API the new executor asks for reads as a drawing change. The ledger test gains a case that crosses a missing
reach entry alone. The executor, the record and every emitted artifact are unchanged.
