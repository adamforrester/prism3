/**
 * `@prism3/engine/harness` — node-only helpers for the surfaces' tests and gates (#3698). These modules read the
 * disk or run git, so no bundled file may import this entry (`lint-engine-facade.ts`, the BUNDLED arm). The entry
 * map and the rule are in `index.ts`.
 */
export { exampleBrands } from './emit-brandinput';
export { nbTheme } from './nb-fixture';
export { passPayloads, variablePlans } from './materialise-to-figma';
export { default as NB_MEASURED_JSON } from './schema/nb-measured.json';
export { SERVER_INFO } from './mcp';
export { HANDSHAKE_PROBES } from './mcp-handshake-probes';
export { validate } from './json-schema-lite';
export { comparisonBase } from './comparison-base';
