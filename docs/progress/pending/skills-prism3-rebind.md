## (2026-10-08) — skills/prism3-rebind and docs/46: moving an existing Figma file onto Prism3, and the never-detach decision

**STATUS: branch `skills/prism3-rebind`.** A fourth shipped skill plus a short decision doc. Skill-only and docs-only, the #1328 precedent: no engine code, no committed artifact moves, no projected component surface moves, so no ENGINE bump is owed and there's no change note. `CONTRACT_VERSION` unchanged. Replaces the draft holding place #2259 (owner Q93 A), and nothing comes from that branch: it carried client identifiers, and this PR carries none.

### What it is

A design-rebuild test moved a client's existing product screens onto Prism3 in Figma, one representative screen per pattern, through the desktop bridge. It ended with 0 legacy bindings on every rebuilt screen and a backup page proven unchanged, and it filed 11 issues (#2292, #2315, #2318, #2319, #2340, #2342–#2347). This PR keeps the reusable part, with the client left out:

- **`skills/prism3-rebind/SKILL.md`**, addressed to an agent rebinding a file:
  - the never-detach rule;
  - the read-only mapping pass first;
  - fonts, dependents and fingerprints before the first write;
  - check the brand settings before calling something a gap (`buttonMinWidthMultiplier`, `buttonLabelWeight`, `radiusScale`, `radiusHairline` turned three apparent gaps into settings);
  - running one representative screen from a fresh copy, with frame-level breakpoint modes;
  - ten plugin-API traps, six mapping traps, the improvement / gap / brand sort, the rogue-binding audit, and what to hand back.
- **`docs/46-never-detach.md`:** `Decided (2026-10-06): never detach a Prism3 component to match a design; place it attached and file the differences`, with its reasoning, scope and the three-way sort. It's indexed in `docs/42` and `decisions-index.json` (appended with `lint-decisions-index --accept`).
- README and CLAUDE.md skills rows name the fourth skill.

### The two traps the orchestrator asked to be sure of

- **`swapComponent()` keeps the old instance's overrides.** 14 swapped placeholder icons still carried the legacy library's fill style on their inner vector, and an audit that skips instance internals never saw them. The skill's audit now looks inside Prism3 instances, and the trap table says to `resetOverrides()` after a swap where the design didn't rely on the overrides.
- **Fingerprint visible content only, per node.** A whole-screen hash of a protected backup flagged a change. A node-by-node diff against the file's version history found exactly one moved node: a hidden text layer inside a hidden legacy instance, which Figma had re-laid out. Nothing visible had changed. The skill says to skip hidden subtrees and keep a per-node table, so a mismatch names its node.

### Verified

`lint-skills` scans 4 skills, clean. Mutation: a planted dead token path in the new skill fails it by name (`[dead token path] … does not resolve`), and restored is clean. The first run caught a real defect: a backticked Figma node-type word read as an undeclared identifier, now plain prose. `lint-decisions-index` is clean only once the doc is tracked (the corpus is git-tracked files). Before `git add`, the gate counted 39 headings and silently missed the new one, which is worth knowing when writing a decision doc. A diff scan for client names, file keys and node IDs: none.

**Full `npm run verify`:** 70 of 71 PASS on the first run. `lint-voice` failed on three uses of "just" in the new skill, banned by `docs/voice-standard.md` §2. That's the voice gate doing its job on a new shipped surface; it scans `skills/**`. All three were reworded, and `lint-voice`, `lint-us-english` and `lint-skills` rerun clean. Those are the only gates that read skill prose.
