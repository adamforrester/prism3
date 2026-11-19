/**
 * THE NO-CUSTOM-CODE RULE, AS STRUCTURE (#3879) — shared by `check-consumability.mjs` and `check-platforms.mjs`.
 *
 * The three Style Dictionary configs (`sd.consumer.mjs`, `sd.ship.mjs`, `sd.platforms.mjs`) promise a stock
 * Style Dictionary: built-in transform groups and formats, nothing a consumer would have to run. Each gate
 * enforced that with a list of banned names, and every extension point the list did not name walked through:
 * a `StyleDictionary.registerAction(...)` plus `actions: ['custom-step']` on a platform passed both gates, and
 * the JSON round trip in `check-platforms.mjs` could not see it, because the config names the hook by a string.
 *
 * So the rule is stated by what IS allowed, not by what is not:
 *   [RULE] no `register…(` call at all, on any receiver: every Style Dictionary extension point is registered
 *          that way (`registerAction`, `registerFilter`, `registerFileHeader`, and any added later);
 *   [RULE] no member of the `StyleDictionary` class is touched: `new StyleDictionary({...})` is the only use;
 *   [RULE] every object key in the config source is on `ALLOWED_KEYS`, the stock options these builds use.
 *          `actions`, `filter`, `hooks`, `preprocessors`, `parsers`, `transforms` and any option added later
 *          fail by name, including ones that refer to a hook by a string.
 *
 * INDEPENDENCE (docs/34): `ALLOWED_KEYS` is written here by hand, never read off the configs, and the
 * subjects are listed by hand in each gate (shape 13). A new stock option a config genuinely needs is added
 * here, in a diff a reviewer sees.
 *
 * ITS LIMIT: it reads source text. A computed key (`[name]: …`), a bracketed member
 * (`StyleDictionary['register' + 'Action']`) or code moved into another imported module is not seen.
 * Those are deliberate evasions, not the accidental drift this guards; review is their backstop.
 */
import { readFileSync } from 'node:fs';

/** Every object key the stock configs may use: Style Dictionary's own options, the platform names, and the
 * built-in formats' options. Plus `default`, the `{ default: StyleDictionary }` of a dynamic import, and
 * `recursive` and `force`, the `rmSync` options of `sd.ship.mjs`'s clean step. */
export const ALLOWED_KEYS = new Set([
  'source', 'usesDtcg', 'log', 'warnings', 'verbosity', 'platforms',
  'css', 'scss', 'js', 'ios', 'android', 'compose',
  'transformGroup', 'buildPath', 'files', 'destination', 'format',
  'options', 'outputReferences', 'selector', 'className', 'packageName',
  'default', 'recursive', 'force',
]);

/** The source with block comments and whole-line `//` comments removed, so prose cannot trip or hide a rule. */
export const codeOf = (file) => readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/** Every object key in the code: an identifier or a quoted string, after `{`, `,` or a line start, before a `:`. */
export const keysOf = (code) => [...new Set([...code.matchAll(/(?:^|[{,])\s*(?:([A-Za-z_$][\w$]*)|'([^']*)'|"([^"]*)")\s*:(?!:)/gm)]
  .map((m) => m[1] ?? m[2] ?? m[3]))];

/** What breaks the rule in one config's code: register calls, `StyleDictionary.` members, keys off the list. */
export const customCode = (code) => ({
  registers: [...new Set([...code.matchAll(/\b(register\w*)\s*\(/g)].map((m) => m[1]))],
  members: [...new Set([...code.matchAll(/\bStyleDictionary\s*\??\.\s*([\w$]+)/g)].map((m) => m[1]))],
  keys: keysOf(code).filter((k) => !ALLOWED_KEYS.has(k)),
});

/** The three structural [RULE] arms for one config, each failing with what it found. */
export const ruleArms = (label, file, ok) => {
  const code = codeOf(file);
  const { registers, members, keys } = customCode(code);
  ok(registers.length === 0,
    `[RULE] the ${label} registers nothing — no \`register…(\` call, so no action, filter, file header or other hook a consumer would have to run (#3879)${registers.length ? ` — found ${registers.join(', ')}` : ''}`);
  ok(members.length === 0,
    `[RULE] the ${label} uses \`StyleDictionary\` only as \`new StyleDictionary({...})\`, touching no class member (#3879)${members.length ? ` — found ${members.map((m) => `StyleDictionary.${m}`).join(', ')}` : ''}`);
  ok(keys.length === 0,
    `[RULE] every key in the ${label} is a stock option on the allowed list (#3879)${keys.length ? ` — not allowed: ${keys.join(', ')}` : ''}`);
  // The key scan must see the config at all: a regex that matched nothing would pass every config.
  const all = keysOf(code);
  const seen = ['transformGroup', 'buildPath', 'format'].filter((k) => all.includes(k));
  ok(seen.length === 3, `[RULE] the key scan reads the ${label}'s platform options (${seen.length}/3 of transformGroup, buildPath, format seen)`);
};
