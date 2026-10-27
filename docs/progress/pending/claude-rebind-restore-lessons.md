## (2026-10-26) — prism3-rebind: snapshot and restore around a structural library publish

`skills/prism3-rebind` gains the procedure for the case where a library publish replaces a component's
layers, so every per-instance override on the replaced layers resets when the owner accepts it. It
lands in §11 (auditing and repairing a rebuild), plus two §4 trap rows.

- **§11.5, snapshot first:** key records by path inside the component, never by layer name (names
  repeat, and a name-keyed record overwrites itself; the first real snapshot lost values exactly this way
  and was retaken). Store values, not node IDs, for anything the publish replaces. Locate instances by
  container and slot index. Validate by re-reading random instances with independently written code.
- **§11.6, restore by diffing:** prove the in-memory snapshot is the one on disk (hash both), re-measure
  after the accept, then read → write only differences → read back, reporting each field as carried /
  restored / failed. In the run this came from, photos, markers and price texts *carried* (their layer
  paths survived); what needed writing were the values the new component *defaults differently* (status
  visibility, price type). Verify with a mapped-value fingerprint derived from the snapshot alone,
  against a fresh read, and mutate one instance to prove the check fails by name.
- **§11.7, "path gone" is a library regression:** a state overlay vanished from the published variant.
  No override was lost, so only the failed paths and a screenshot showed it. Report it, keep the values
  ready, never rebuild it as a lookalike. The library restored it, and a re-check then carried every field.
- **§4 rows:** there is no single-field override reset (`resetOverrides()` clears slot swaps too), so an
  override equal to the main's value is left as inert; and a multi-megabyte result goes to disk via the
  harness and is processed by script rather than read.

The toggle trick for an explicit override that survives an update was already in §4 (#2987), and §11.6
points to it rather than repeating it. Scrubbed: no client, file, brand, product or page names, node IDs
or keys.
