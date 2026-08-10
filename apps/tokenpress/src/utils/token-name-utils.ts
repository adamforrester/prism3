/**
 * Shared token-name sanitization — the single source of truth for turning a
 * Figma variable/style name (e.g. "color/onSuccessContainer") into a DTCG
 * token path.
 *
 * Every production name-emitting path delegates here so they cannot drift:
 * TokenExporter, BaseConverter (Color/Dimension), TypographyConverter, and
 * DotNotationExporter. Filename sanitizers are deliberately NOT part of this
 * module — filenames stay lowercase regardless of the token-name setting.
 *
 * DTCG naming rules we must honour (per the current draft):
 *   - a name MUST be a valid JSON string; mixed case is explicitly allowed and
 *     "token names are case-sensitive"
 *   - a name MUST NOT begin with "$" (reserved for spec properties)
 *   - "{", "}" and "." MUST NOT appear anywhere in a name, since they are the
 *     alias-reference delimiters and the path separator
 *
 * So `preserve` is fully spec-conformant: lowercasing was never required. The
 * legacy `lower` mode is retained for back-compat with pre-3.0 exports.
 * See VMLYR/token-forge#60.
 */

import { TokenNameCase } from '../types/plugin';

/**
 * Characters that must never survive into a token name. Curly braces and the
 * period are structural in DTCG alias syntax; the rest are stripped because
 * they are unsafe in the downstream identifiers tools generate from paths.
 */
const UNSAFE_CHARS = /[^a-zA-Z0-9]+/g;
const UNSAFE_CHARS_LOWER = /[^a-z0-9]+/g;

/**
 * Splits camelCase / PascalCase humps into separate words so a true kebab-case
 * conversion can join them with hyphens. Handles acronym boundaries too:
 * "onSuccessContainer" -> "on Success Container", "parseHTMLValue" ->
 * "parse HTML Value", "spacing2XL" -> "spacing 2 XL".
 */
function splitHumps(part: string): string {
  return (
    part
      // lower/digit followed by upper: "onSuccess" -> "on Success"
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      // acronym followed by capitalised word: "HTMLValue" -> "HTML Value"
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
      // letter followed by digit: "spacing2" -> "spacing 2"
      .replace(/([a-zA-Z])([0-9])/g, '$1 $2')
  );
}

/**
 * Sanitizes a single path segment under the given casing mode.
 */
function sanitizeSegment(part: string, nameCase: TokenNameCase): string {
  if (nameCase === 'preserve') {
    // Keep the author's casing; only collapse unsafe characters to hyphens.
    return part.replace(UNSAFE_CHARS, '-').replace(/^-+|-+$/g, '');
  }

  if (nameCase === 'kebab') {
    // True kebab-case: split humps FIRST so word boundaries survive, then
    // lowercase. This is what the legacy code's comment always claimed to do.
    return splitHumps(part)
      .toLowerCase()
      .replace(UNSAFE_CHARS_LOWER, '-')
      .replace(/^-+|-+$/g, '');
  }

  // 'lower' — legacy pre-3.0 behaviour. Lowercases before replacing, which
  // flattens camelCase humps entirely ("onSuccessContainer" ->
  // "onsuccesscontainer"). Retained verbatim for back-compat.
  return part
    .toLowerCase()
    .replace(UNSAFE_CHARS_LOWER, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Sanitizes a Figma token name into a DTCG token path, preserving the "/"
 * group separators.
 *
 * @param name Raw Figma variable or style name (e.g. "color/onSuccessContainer")
 * @param nameCase Casing mode; defaults to 'preserve' (DTCG-conformant)
 * @returns Sanitized slash-delimited token path
 */
export function sanitizeTokenName(name: string, nameCase?: TokenNameCase): string {
  const mode: TokenNameCase = nameCase || 'preserve';

  const sanitized = name
    .split('/')
    .map(part => sanitizeSegment(part, mode))
    // Drop empty segments so "color//primary" or a trailing "/" cannot emit a
    // "" group key, which would be an unaddressable token path.
    .filter(part => part.length > 0)
    .join('/');

  // A leading "$" is reserved by DTCG for spec properties. Segment
  // sanitization already strips "$" (it is not alphanumeric), but guard
  // explicitly so the invariant is stated where a reader will look for it.
  return sanitized.replace(/^\$+/, '');
}

/**
 * Sanitizes the user-supplied export namespace into a single DTCG-legal name
 * segment.
 *
 * The namespace becomes a root key in every emitted file AND a leading segment
 * in every alias reference, so it has to satisfy the same structural rules as a
 * token name. It arrives from a free-text UI input, so nothing upstream
 * guarantees that. Three inputs broke the export before this guard:
 *
 *   - "a.b"       -> "." is the DTCG path separator, so the alias
 *                    "{a.b.palette.blue}" addressed a two-level path while the
 *                    wrapper created one literal "a.b" key. Style Dictionary
 *                    reports an unresolvable reference.
 *   - "nbds/core" -> same failure via "/", which this module treats as a group
 *                    separator when building the alias.
 *   - "{x}", "$brand" -> braces are the alias delimiters and a leading "$" is
 *                    reserved for spec properties.
 *
 * Both the wrapper and the alias must use this one sanitized value or they
 * desync again — that mismatch is the whole bug class this module exists to
 * close.
 *
 * Casing is deliberately NOT normalised to the token-name mode: the namespace
 * is a literal the user typed rather than a Figma name, so silently recasing it
 * would be surprising. "/" collapses to "-" rather than nesting, because the
 * wrapper emits exactly one root key.
 *
 * @param namespace Raw namespace option from the UI; falsy means none
 * @returns A single sanitized segment, or '' if nothing legal survives
 */
export function sanitizeNamespace(namespace?: string): string {
  if (!namespace) {
    return '';
  }

  return namespace
    .replace(UNSAFE_CHARS, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/^\$+/, '');
}

/**
 * Prefixes a sanitized token path with the export namespace, unless it is
 * already prefixed.
 *
 * The exporter applies the namespace as a root wrapper *after* conversion
 * (`applyNamespaceIfNeeded`), so every emitted token ends up one level deeper
 * than its own name suggests. Alias references are built from the raw variable
 * name during conversion and therefore have to account for that wrapper
 * themselves, or they point one level above the token they target.
 *
 * The namespace passed here must already be sanitized via `sanitizeNamespace`,
 * and the exporter's wrapper must use that same sanitized value as its root key.
 * If the two sides disagree on the namespace, they desync exactly as they did
 * before this function existed.
 *
 * The "already prefixed" guard handles files whose Figma variables are named
 * with the namespace baked in (e.g. "nbds/palette/blue"). Those keep their own
 * root key and the wrapper is skipped, so the path is already correct.
 *
 * This guard is per PATH, while the wrapper's bail-out is per FILE, so the two
 * could disagree — in a file mixing prefixed and unprefixed names the wrapper is
 * skipped for everyone, but an unprefixed token would still get a namespaced
 * alias pointing at a level that does not exist. The exporter closes that by
 * deciding once per file, before conversion, and passing '' here when the
 * wrapper will be skipped (see `TokenExporter.beginFile`). Callers that pass the
 * raw option value instead of that precomputed decision will reintroduce the
 * disagreement.
 *
 * @param tokenPath Sanitized slash-delimited token path
 * @param namespace Raw namespace option; falsy means no namespace in play
 * @returns Namespaced token path
 */
function applyNamespaceToPath(tokenPath: string, namespace?: string): string {
  const ns = sanitizeNamespace(namespace);

  if (!ns || !tokenPath) {
    return tokenPath;
  }

  if (tokenPath === ns || tokenPath.indexOf(ns + '/') === 0) {
    return tokenPath;
  }

  return ns + '/' + tokenPath;
}

/**
 * Builds a DTCG alias reference from a Figma token name.
 *
 * @param name Raw Figma variable name
 * @param nameCase Casing mode; defaults to 'preserve'
 * @param namespace Export namespace, so the reference resolves through the
 *   root wrapper the exporter adds. Omit when no namespace is configured.
 * @returns DTCG alias string (e.g. "{color.onSuccessContainer}")
 */
export function createAliasReference(
  name: string,
  nameCase?: TokenNameCase,
  namespace?: string
): string {
  const tokenPath = applyNamespaceToPath(sanitizeTokenName(name, nameCase), namespace);
  return `{${tokenPath.replace(/\//g, '.')}}`;
}

/**
 * Sanitizes a name for use in a filename. Always lowercase and hyphenated,
 * independent of the token-name casing mode — case-insensitive filesystems
 * (macOS, Windows) would collide on case-only differences, and build tooling
 * conventionally expects lowercase token filenames.
 *
 * @param name Raw collection or mode name
 * @returns Lowercase hyphenated filename-safe string
 */
export function sanitizeFileName(name: string): string {
  return name
    .toLowerCase()
    .replace(UNSAFE_CHARS_LOWER, '-')
    .replace(/^-+|-+$/g, '');
}
