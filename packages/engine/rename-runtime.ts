/**
 * The rename pass AS SOURCE, for a paste payload to run in the file (#1024).
 *
 * The plugin executor calls `openMigration` / `renameCollections` / `renameVariables` (`rename-map.ts`)
 * directly. The CLI paste path (`materialise-to-figma.ts`) cannot import — its payload is a string pasted
 * into `figma_execute` — so this assembles the same functions' source, plus the two things they are
 * handed, into one prelude the payload calls:
 *
 *   - `plannerSources()` — every planner and apply function, from `rename-map.ts`;
 *   - `rootOf` — the brand-root reader both callers pass `renameVariables` its `root` with;
 *   - `coreGroupOf` — the `core`-group reader both callers scope a `core` write to its owned slice with;
 *   - `RULES` — the live materialization rules (`materializationRulesSrc()`).
 *
 * A hand-copied string would be a second definition and would drift exactly as the two write paths did
 * before #1024; `Function.prototype.toString` ships the one definition there is.
 *
 * A separate module rather than a function in `rename-map.ts` because it is the one place that needs both
 * `rename-map.ts` and `materialization-renames.ts` in scope, and those two are kept apart on purpose
 * (`docs/34` shape 11; `rename-map.ts` `MaterializationStep`). This module only concatenates strings.
 *
 * `__name` is defined because `tsx` keeps function names by wrapping a nested named function in a call
 * to a helper it injects at module scope (`__name(fn, "closesLoop")`); the payload has no such helper,
 * and the wrapper only sets `.name`, so an identity function is a faithful stand-in.
 *
 * DO NOT RUN THIS UNDER A MINIFIER. The shipped functions call each other BY NAME, and the payload defines them
 * under the names written in `plannerSources`. A minifier renames the call sites inside each body and not those
 * definitions, and the payload then throws in the file. `tsx` and an esbuild build that keeps names (the
 * `__name` above) are both safe; nothing bundles `materialise-to-figma.ts` today.
 */
import { plannerSources } from './rename-map';
import { rootOf, coreGroupOfSrc } from './figma-names';
import { materializationRulesSrc } from './materialization-renames';

export const renameRuntimeSrc = (): string => [
  'const __name=(f)=>f;',
  plannerSources(),
  'const rootOf=' + rootOf.toString() + ';',
  'const coreGroupOf=' + coreGroupOfSrc() + ';',
  'const RULES=' + materializationRulesSrc() + ';',
].join('\n');
