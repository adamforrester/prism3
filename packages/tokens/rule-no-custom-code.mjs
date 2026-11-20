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
 * SHORTHAND KEYS (#4201 item 3). A key written as `{ transformGroup: 'css', actions }` names `actions` with no `:`
 * after it, and the key scan used to require one, so the original incident's hook passed in idiomatic shorthand.
 * `shorthandKeysOf` reads a bare identifier directly inside an object literal's braces, followed by `,` or `}`, as a
 * key. Braces that open an import, an export list or a destructuring declaration are not object literals and are
 * skipped, as is the text of every string and template literal (a template's `${…}` is code and is read).
 * A planted self-check holds both scans to typed cases before any config is read.
 *
 * ITS LIMIT: it reads source text. A computed key (`[name]: …`), a bracketed member
 * (`StyleDictionary['register' + 'Action']`) or code moved into another imported module is not seen.
 * Those are deliberate evasions, not the accidental drift this guards; review is their backstop.
 */
import { readFileSync } from 'node:fs';

/** Every object key the stock configs may use: Style Dictionary's own options, the platform names, and the
 * built-in formats' options (`showFileHeader`, #4140: the system-preference rule appended to `dark.css` carries no
 * second banner). Plus `default`, the `{ default: StyleDictionary }` of a dynamic import, and
 * `recursive` and `force`, the `rmSync` options of `sd.ship.mjs`'s clean step. */
export const ALLOWED_KEYS = new Set([
  'source', 'usesDtcg', 'log', 'warnings', 'verbosity', 'platforms',
  'css', 'scss', 'js', 'ios', 'android', 'compose',
  'transformGroup', 'buildPath', 'files', 'destination', 'format',
  'options', 'outputReferences', 'selector', 'showFileHeader', 'className', 'packageName',
  'default', 'recursive', 'force',
]);

/** The source with block comments and whole-line `//` comments removed, so prose cannot trip or hide a rule. */
export const codeOf = (file) => readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/** Every object key in the code: an identifier or a quoted string, after `{`, `,` or a line start, before a `:`. */
export const keysOf = (code) => [...new Set([...code.matchAll(/(?:^|[{,])\s*(?:([A-Za-z_$][\w$]*)|'([^']*)'|"([^"]*)")\s*:(?!:)/gm)]
  .map((m) => m[1] ?? m[2] ?? m[3]))];

/** Every SHORTHAND object key in the code (#4201): a bare identifier right after an object literal's `{` or `,`,
 *  followed by `,` or `}`. Walks the code with a stack of openers, so an array (`[a, b]`), a call's arguments, a
 *  string or a template's text is never read as an object; braces after `import`, `export`, `const`, `let` or `var`
 *  open a binding list, not an object, and are skipped. */
export const shorthandKeysOf = (code) => {
  const keys = new Set();
  const stack = [];
  const top = () => stack[stack.length - 1];
  const readKey = (from) => {
    const m = /^\s*([A-Za-z_$][\w$]*)\s*([,}])/.exec(code.slice(from));
    if (m) keys.add(m[1]);
  };
  for (let i = 0; i < code.length; i++) {
    const c = code[i];
    if (top() === '`') {
      if (c === '\\') i++;
      else if (c === '`') stack.pop();
      else if (c === '$' && code[i + 1] === '{') { stack.push('${'); i++; }
      continue;
    }
    if (c === "'" || c === '"') {
      for (i++; i < code.length && code[i] !== c; i++) if (code[i] === '\\') i++;
      continue;
    }
    if (c === '`') { stack.push('`'); continue; }
    if (c === '/' && code[i + 1] === '/') { while (i < code.length && code[i] !== '\n') i++; continue; }
    if (c === '{') {
      const binding = /\b(?:import|export|const|let|var)\s*$/.test(code.slice(Math.max(0, i - 12), i)) || /\bimport\s+[\w$]+\s*,\s*$/.test(code.slice(Math.max(0, i - 80), i));
      stack.push(binding ? 'b' : '{');
      if (!binding) readKey(i + 1);
      continue;
    }
    if (c === '(' || c === '[') { stack.push(c); continue; }
    if (c === '}' || c === ')' || c === ']') { stack.pop(); continue; }
    if (c === ',' && top() === '{') readKey(i + 1);
  }
  return [...keys];
};

/** What breaks the rule in one config's code: register calls, `StyleDictionary.` members, keys off the list. */
export const customCode = (code) => ({
  registers: [...new Set([...code.matchAll(/\b(register\w*)\s*\(/g)].map((m) => m[1]))],
  members: [...new Set([...code.matchAll(/\bStyleDictionary\s*\??\.\s*([\w$]+)/g)].map((m) => m[1]))],
  keys: [...new Set([...keysOf(code), ...shorthandKeysOf(code)])].filter((k) => !ALLOWED_KEYS.has(k)),
});

/** The key scans on planted source, typed here (#4201): every planted key found, nothing else. */
const PLANTED = [
  // The incident's hook in shorthand, and an extension point beside a stock option.
  ["const actions = ['custom-step'];\nnew StyleDictionary({ platforms: { css: { transformGroup: 'css', actions, } } });", ['actions']],
  ['new StyleDictionary({ usesDtcg: true, preprocessors });', ['preprocessors']],
  ['new StyleDictionary({\n  hooks\n});', ['hooks']],
  // A colon key still read, and nothing read from an import, a destructuring, an array, a call or a template.
  ["import { resolve, dirname } from 'node:path';\nconst { default: SD } = await import('x');\nconst sd = new SD({ source: [a, b, c], platforms: { css: { buildPath: `${dir}/${brand}/`, files: [f(a, b)] } } });", []],
  ["const sd = new SD({ filter: (t) => t, source, log: { warnings: 'disabled' } });", ['filter']],
];
let selfChecked = false;
const selfCheck = (ok) => {
  if (selfChecked) return;
  selfChecked = true;
  for (const [code, want] of PLANTED) {
    const got = customCode(code).keys.sort();
    ok(got.join(',') === [...want].sort().join(','),
      `[RULE] the key scan reads planted source as typed (#4201): ${JSON.stringify(code.slice(0, 60))}… → [${got.join(', ')}], expected [${want.join(', ')}]`);
  }
};

/** The three structural [RULE] arms for one config, each failing with what it found. */
export const ruleArms = (label, file, ok) => {
  selfCheck(ok);
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
