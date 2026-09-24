/**
 * A small JSON Schema (draft 2020-12) validator — the subset `schema/ai-metadata.schema.json` uses, and
 * nothing more. Dependency-free on purpose (CLAUDE.md principle 2): the engine owns its validators.
 *
 * FAILS CLOSED ON AN UNKNOWN KEYWORD. A validator that silently ignores a keyword it does not implement
 * reports every document as valid against that keyword — the schema would state a constraint nothing
 * checks, which is the gate-that-cannot-fail shape `docs/34` warns about. So a schema reaching for a
 * keyword this file does not implement throws, naming it, and the fix is to implement the keyword here.
 *
 * Supported: `$ref` (local `#/$defs/...` only), `type` (one or a list), `const`, `enum`, `properties`,
 * `required`, `additionalProperties` (boolean or schema), `patternProperties`, `items`, `minItems`,
 * `uniqueItems`, `minLength`, `pattern`, `minimum`, `anyOf`. Annotations (`$schema`, `$id`, `title`,
 * `description`, `$comment`, `$defs`) are read or skipped as annotations.
 *
 *   validate(schema, document) → string[]   // one message per violation, JSON-pointer located; [] = valid
 */

type Schema = Record<string, any> | boolean;

const ANNOTATIONS = new Set(['$schema', '$id', 'title', 'description', '$comment', '$defs']);
const KEYWORDS = new Set(['$ref', 'type', 'const', 'enum', 'properties', 'required', 'additionalProperties', 'patternProperties', 'items', 'minItems', 'uniqueItems', 'minLength', 'pattern', 'minimum', 'anyOf']);

const typeOf = (v: unknown): string =>
  v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v === 'number' ? (Number.isInteger(v) ? 'integer' : 'number') : typeof v;
const isType = (v: unknown, t: string): boolean => {
  const actual = typeOf(v);
  return actual === t || (t === 'number' && actual === 'integer');
};
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

export const validate = (root: Record<string, any>, doc: unknown): string[] => {
  const errors: string[] = [];
  const resolveRef = (ref: string): Schema => {
    const m = ref.match(/^#\/\$defs\/([A-Za-z0-9_-]+)$/);
    if (!m || root.$defs?.[m[1]] === undefined) throw new Error(`json-schema-lite: unsupported or unresolved $ref ${ref}`);
    return root.$defs[m[1]];
  };
  const check = (schema: Schema, v: unknown, at: string): boolean => {
    if (schema === true) return true;
    if (schema === false) { errors.push(`${at || '/'}: no value is allowed here`); return false; }
    for (const k of Object.keys(schema)) if (!ANNOTATIONS.has(k) && !KEYWORDS.has(k)) throw new Error(`json-schema-lite: keyword "${k}" at schema for ${at || '/'} is not implemented — implement it rather than ignore it`);
    const before = errors.length;
    const fail = (msg: string) => errors.push(`${at || '/'}: ${msg}`);
    if (schema.$ref !== undefined) check(resolveRef(schema.$ref), v, at);
    if (schema.type !== undefined) {
      const ts: string[] = Array.isArray(schema.type) ? schema.type : [schema.type];
      if (!ts.some((t) => isType(v, t))) { fail(`expected ${ts.join(' or ')}, got ${typeOf(v)}`); return false; }
    }
    if ('const' in schema && !same(v, schema.const)) fail(`expected ${JSON.stringify(schema.const)}`);
    if (schema.enum !== undefined && !schema.enum.some((e: unknown) => same(e, v))) fail(`${JSON.stringify(v)} is not one of ${JSON.stringify(schema.enum)}`);
    if (typeof v === 'string') {
      if (schema.minLength !== undefined && [...v].length < schema.minLength) fail(`shorter than ${schema.minLength}`);
      if (schema.pattern !== undefined && !new RegExp(schema.pattern, 'u').test(v)) fail(`${JSON.stringify(v)} does not match ${schema.pattern}`);
    }
    if (typeof v === 'number' && schema.minimum !== undefined && v < schema.minimum) fail(`${v} is below ${schema.minimum}`);
    if (Array.isArray(v)) {
      if (schema.minItems !== undefined && v.length < schema.minItems) fail(`fewer than ${schema.minItems} items`);
      if (schema.uniqueItems && new Set(v.map((x) => JSON.stringify(x))).size !== v.length) fail('items are not unique');
      if (schema.items !== undefined) v.forEach((x, i) => check(schema.items, x, `${at}/${i}`));
    }
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const obj = v as Record<string, unknown>;
      for (const r of schema.required ?? []) if (!(r in obj)) fail(`missing required property "${r}"`);
      for (const [k, x] of Object.entries(obj)) {
        const ptr = `${at}/${k.replace(/~/g, '~0').replace(/\//g, '~1')}`;
        let matched = false;
        if (schema.properties && k in schema.properties) { matched = true; check(schema.properties[k], x, ptr); }
        for (const [re, sub] of Object.entries<Schema>(schema.patternProperties ?? {})) if (new RegExp(re, 'u').test(k)) { matched = true; check(sub, x, ptr); }
        if (!matched && schema.additionalProperties !== undefined) {
          if (schema.additionalProperties === false) fail(`property "${k}" is not allowed`);
          else check(schema.additionalProperties, x, ptr);
        }
      }
    }
    if (schema.anyOf !== undefined) {
      const saved = errors.length;
      const ok = schema.anyOf.some((sub: Schema) => { const n = errors.length; check(sub, v, at); const pass = errors.length === n; errors.length = n; return pass; });
      errors.length = saved;
      if (!ok) fail('matches none of the anyOf alternatives');
    }
    return errors.length === before;
  };
  check(root, doc, '');
  return errors;
};
