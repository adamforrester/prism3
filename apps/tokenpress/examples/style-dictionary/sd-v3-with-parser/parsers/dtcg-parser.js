/**
 * Minimal DTCG → Style Dictionary 3 parser shim.
 *
 * Token Press emits standards-conformant DTCG tokens (`$value`, `$type`,
 * `$description`, `$extensions`). Style Dictionary 3 doesn't recognize
 * those keys — without this parser it treats `.$value` as a literal path
 * segment and you get CSS vars like `--color-primary-default-value`.
 *
 * What this does: walks the loaded JSON tree and rewrites every leaf
 * that has a `$value` key into the SD-3-native shape (`value`, `type`,
 * `comment`). `$extensions` is dropped — SD 3 has no equivalent slot.
 *
 * For richer parsers (alias forms, DTCG composite types like typography
 * and shadow), see the `style-dictionary-utils` package on npm.
 *
 * Usage: SD 3's CLI can't register parsers from a JSON config alone, so
 * the example wires this up via build.js with StyleDictionary.registerParser.
 * See build.js for the integration.
 */

function transform(node) {
  if (node === null || typeof node !== 'object') return node;
  if (Array.isArray(node)) return node.map(transform);

  // Leaf: has a $value, this IS a token. Rewrite into SD-3 shape.
  if (Object.prototype.hasOwnProperty.call(node, '$value')) {
    const out = { value: transform(node.$value) };
    if (node.$type) out.type = node.$type;
    if (node.$description) out.comment = node.$description;
    // $extensions intentionally dropped — no SD 3 equivalent.
    return out;
  }

  // Branch: walk children, dropping any $-prefixed metadata keys at this
  // level (e.g. file-level `$extensions`).
  const out = {};
  for (const key in node) {
    if (key.startsWith('$')) continue;
    out[key] = transform(node[key]);
  }
  return out;
}

module.exports = {
  parse: ({ contents }) => transform(JSON.parse(contents)),
};
