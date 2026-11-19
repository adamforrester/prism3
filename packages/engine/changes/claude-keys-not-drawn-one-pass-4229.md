---
engine: patch
---
The token-usage report finds the keys no plan draws in one projection per component, not one per key (#4229). Every key that shares its token is pointed at its own probe name in a single projection, and a key is drawn when some member binds its probe. A component whose projection reads a shared key as a value (Banner) keeps the per-key path. `emit-analysis-reports.ts` drops from about 13.5 s to about 1.5 s on this machine, and every report is byte-identical.
