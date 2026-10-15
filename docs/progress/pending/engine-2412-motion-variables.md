## (2026-10-14) — Motion as Figma TIMING and EASING variables (#2412, Q291)

**Status:** engine emission, write plan, the plugin's Apply Theme and paste paths, TokenPress, the exporter gate and
read-back parity. ENGINE minor (change note). CONTRACT unchanged: the DTCG does not move, only its Figma form.
Owner decisions Q291, all A, after spike #2403 found Figma's own motion variable types.

### What changed
- **Durations are TIMING, in seconds.** Same names (`motion/duration-ms/200` holds `0.2`): the name is the DTCG path,
  the value is the unit TIMING stores. The owner confirmed on a live file that the API stores seconds and the panel
  shows milliseconds, so the suite pins seconds by literal and a millisecond TIMING (1000× too slow) fails by name.
- **Curves, roles and springs are EASING.** Curves are `CUSTOM_CUBIC_BEZIER`, hidden; roles alias them, per mode
  where an easing-role lever moves one; springs are `CUSTOM_SPRING` with `bounce = 1 − damping ratio` only.
- **Transitions have no Figma form,** stated per family in `MOTION_FIGMA_COVERAGE`, which the suite holds to the
  DTCG's motion families so a new family without a line fails.
- **`motion` left the FLOAT plan.** It is `buildMotionVarPlan`, written by the mixed-type executor (`applyVarCollectionPlan`)
  and, on the paste paths, by its own `runMotion` step and `motion-vars` pass.
- **TokenPress** reads TIMING as a `duration` in ms (the Q146 output, unchanged for a consumer), a bezier as
  `cubicBezier`, a spring as `spring` `{ bounce }`, and types an EASING alias by what it resolves to.
- **`@figma/plugin-typings` ^1.141.0** (the first to declare TIMING/EASING). It also declares a color literal at an
  aliased opacity, so the read port's `ReadVarValue` gained that shape.

### The traps, for whoever touches this next
- **Figma refuses a `scopes` write on TIMING and EASING, and a refusal in pass A aborts the whole apply.** The
  executors skip it by type (`UNSCOPED_TYPES`), the emission states `ALL_SCOPES` (what the file holds, not `[]`), and
  `FileShim` throws on the write as Figma does. #2602's planned "no ALL_SCOPES anywhere" gate must exempt these two
  types by type.
- **`test-write-preflight.ts` has its own file shim, and its type check refused every TIMING write.** Nobody saw:
  the mixed-type executor records a host refusal instead of throwing (#680), and that suite never read the record.
  It now accepts TIMING and EASING values and asserts no refusals on every brand. Any suite driving
  `applyVarCollectionPlan` should read `refused`.
- **The engine's conforming projection omits `spring` (#642), so TokenPress's spring tokens are unpaired.** The
  exporter gate exempts exactly the springs the emission holds, as a bijection (the #1485 cut-variable pattern), and
  read-back parity holds their bounce and type to the canonical DTCG. The gate only checks paths; a spring exported
  under the wrong type is caught by read-back parity (RETYPED), not the gate.
- **`compare.ts` explained every prism3-only `motion.` path away** ("no motion collection is emitted at all"). Narrowed
  to `motion.transition.`, so a motion path that stops round-tripping now surfaces.

### A file themed at 0.235.0 (owner decision Q293, all A)
- **Apply replaces the old FLOAT motion.** Figma cannot retype a variable, so in Prism3's own stamped `motion`
  collection each planned name held as FLOAT where the plan writes TIMING is deleted and re-created as TIMING, and the
  result line says "Replaced N motion variables with the new timing type." (owner decision Q302). One predicate, `replacesOnRetype` in
  `write-figma.ts`, is read by both the pre-flight (which stops reporting those) and the executor (which replaces
  them). The same FLOATs in an unstamped collection, and a FLOAT where the plan writes EASING, still refuse.
  **The cost, so nobody rediscovers it:** the new variable has a new id. Nothing in a file can be bound to the old one
  (`scopes: []`, and Figma Motion binds no FLOAT); a library subscriber that bound a published `motion/duration/*`
  by hand loses that link.
- **The CLI paste pass refuses instead (review finding 1).** `motion-vars` had no type check: over a 0.235.0 FLOAT it
  wrote `0.2` into the FLOAT (read as 0.2ms), then threw on the first TIMING alias with 37 variables written. It now
  checks every row's type before any write, and on any mismatch writes nothing and names each one
  (`type:<name> is FLOAT, plan writes TIMING`). It does not apply Q293 1's replace: the pass neither reads nor writes
  the stamp, so it cannot tell Prism3's collection from a look-alike. test.ts executes the pass against `FileShim`
  seeded with that FLOAT and asserts the miss, the untouched 200 and the unrenamed mode, and runs a clean file too.
- **#2602's no-ALL_SCOPES sweep exempts TIMING and EASING by resolved type (review finding 2),** never by name, and
  holds those rows to exactly `['ALL_SCOPES']` on every typed path (emission, the plugin's motion plan, the committed
  trees), each required to carry both types. A FLOAT in `motion` at ALL_SCOPES still fails.
- **TokenPress's own `@figma/plugin-typings` floor is ^1.141.0 (review finding 3).** It had resolved only because
  the workspace hoists one copy.
- **Springs are published** (no role tier aliases one), and **TokenPress exports a spring as `$type: spring`
  `{ bounce }`**, both as built and confirmed.

### Mutations, each failing by name
Executor writes scopes on TIMING/EASING; emitter writes ms instead of seconds; bounce = damping; TokenPress types
TIMING as `number`; the transition coverage line removed; the shim stops refusing scopes; TokenPress retypes a spring;
the emission drops springs; the CLI paste pass writes scopes; the pre-flight drops the motion plan; and, for the retype,
the stamp condition dropped, the pre-flight made strict again, and the executor never replacing; the paste pass's type
check removed; and, in the #2602 sweep, a FLOAT in `motion` at ALL_SCOPES and a TIMING at `[]`. The PR body
lists the failing line for each.
