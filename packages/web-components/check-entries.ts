/**
 * THE ENTRY CHECK (#3408, owner decision Q-POC3 B): what each of `@prism3/web-components`'s entries registers.
 * `import '@prism3/web-components'` registers nothing; `/button`, `/text-field` and `/password-field` each register
 * exactly their own element. Fails by name.
 *
 *   npx tsx packages/web-components/check-entries.ts
 *
 * 1. THE EXPORTS MAP. `package.json`'s script entries are exactly `EXPECTED`'s keys, written here by hand from the
 *    owner decision, not read from the package; `main` and `module` name the root's file.
 * 2. A CONSUMER RESOLVES THEM. From `apps/storybook`, a real consumer in this workspace, Node resolves each entry to
 *    the file the map names, so the map is what a client gets, not just what this file reads.
 * 3. WHAT EACH ENTRY REGISTERS. Each entry is bundled alone through the map (esbuild, as a client's bundler would) and
 *    loaded into a fresh Chromium page whose `customElements.define` is recorded. The calls must be exactly
 *    `EXPECTED`'s tags, and afterwards `customElements.get` must answer for those of the three elements only.
 *
 * SELF-TEST: four mutants must each fail by name: the root importing the button, the text field's entry also
 * registering the button, the button's entry pointing at the text field, and an old `./p3-button.js` entry kept.
 */
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { readFileSync, realpathSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../..');
const PKG = '@prism3/web-components';

/** The owner decision, by hand: each script entry and the custom elements importing it must register, in order. */
const EXPECTED: Record<string, string[]> = {
  '.': [],
  './button': ['p3-button'],
  './text-field': ['p3-text-field'],
  './password-field': ['p3-password-field'],
};
const TAGS = ['p3-button', 'p3-text-field', 'p3-password-field'];
/** Entries that are data, not scripts: they register nothing and aren't imported for effect. */
const DATA = ['./custom-elements.json', './package.json'];

type Sources = { pkg: any; files: Record<string, string> };
const REAL: Sources = { pkg: JSON.parse(readFileSync(resolve(HERE, 'package.json'), 'utf8')), files: {} };

const say = (key: string) => (key === '.' ? `root (${PKG})` : key);
const tags = (list: string[]) => (list.length ? list.map((t) => `<${t}>`).join(', ') : 'nothing');

/** One entry, bundled alone through the (possibly mutated) map; a mutant's file contents replace the disk's. */
const bundleEntry = async (src: Sources, key: string): Promise<string> => {
  const file = resolve(HERE, src.pkg.exports[key]);
  const r = await build({
    stdin: { contents: `import ${JSON.stringify(file)};`, resolveDir: HERE, sourcefile: `entry ${key}`, loader: 'js' },
    bundle: true, write: false, format: 'iife', target: 'es2022', logLevel: 'silent',
    plugins: [{
      name: 'mutant-files',
      setup(b) {
        b.onLoad({ filter: /\.js$/ }, (args) => {
          if (dirname(args.path) !== HERE) return undefined;
          const over = src.files[basename(args.path)];
          return over === undefined ? undefined : { contents: over, loader: 'js' };
        });
      },
    }],
  });
  return r.outputFiles[0].text;
};

export const run = async (browser: any, src: Sources, consumer = true): Promise<{ failures: string[]; passed: number }> => {
  const failures: string[] = [];
  let passed = 0;
  const ok = (cond: boolean, what: string) => { if (cond) passed++; else failures.push(what); };
  const exportsMap: Record<string, string> = src.pkg.exports ?? {};
  const scriptKeys = Object.keys(exportsMap).filter((k) => !DATA.includes(k));

  // 1. the exports map
  for (const k of Object.keys(EXPECTED)) ok(k in exportsMap, `exports: no "${k}" entry`);
  for (const k of scriptKeys) ok(k in EXPECTED, `exports: "${k}" is not an expected entry (only ${Object.keys(EXPECTED).join(', ')})`);
  ok(src.pkg.main === exportsMap['.'] && src.pkg.module === exportsMap['.'], `exports: main ${src.pkg.main} and module ${src.pkg.module} do not both name the root's file ${exportsMap['.']}`);
  for (const k of scriptKeys) ok((src.pkg.files ?? []).includes(exportsMap[k].replace(/^\.\//, '')), `exports: "${k}"'s file ${exportsMap[k]} is not in package.json's files, so it would not ship`);

  // 2. a consumer resolves them (the disk's map only: a mutant changes what is bundled, not what Node reads)
  if (consumer) {
    const req = createRequire(resolve(REPO, 'apps/storybook/package.json'));
    for (const k of Object.keys(EXPECTED)) {
      const spec = k === '.' ? PKG : `${PKG}/${k.slice(2)}`;
      let got = '';
      try { got = realpathSync(req.resolve(spec)); } catch (e) { got = `unresolved (${(e as Error).message.split('\n')[0]})`; }
      const want = exportsMap[k] ? resolve(HERE, exportsMap[k]) : '(no entry)';
      ok(got === want, `resolve: "${spec}" from apps/storybook resolves to ${got}, the map names ${want}`);
    }
  }

  // 3. what each entry registers
  for (const k of Object.keys(EXPECTED)) {
    if (!(k in exportsMap)) continue;
    let code: string;
    try { code = await bundleEntry(src, k); } catch (e) { failures.push(`${say(k)}: does not bundle: ${(e as Error).message.split('\n')[0]}`); continue; }
    const page = await browser.newPage();
    const errors: string[] = [];
    page.on('pageerror', (e: Error) => errors.push(e.message));
    try {
      await page.setContent('<!doctype html><html lang="en"><head><meta charset="utf-8"></head><body></body></html>');
      // Installed before the entry's script runs (setContent runs no init scripts, so it's evaluated here).
      await page.evaluate(`(() => {
        window.__defined = [];
        const define = customElements.define.bind(customElements);
        customElements.define = (name, ...rest) => { window.__defined.push(name); return define(name, ...rest); };
      })()`);
      await page.addScriptTag({ content: code });
      const r = await page.evaluate(`({ defined: window.__defined, live: ${JSON.stringify(TAGS)}.filter((t) => !!customElements.get(t)) })`);
      const want = EXPECTED[k];
      ok(!errors.length, `${say(k)}: page error on import: ${errors.join(' / ')}`);
      ok(r.defined.join() === want.join(), `${say(k)}: registered ${tags(r.defined)}, expected ${want.length ? `exactly ${tags(want)}` : 'nothing'}`);
      ok(r.live.join() === want.join(), `${say(k)}: afterwards customElements.get answers for ${tags(r.live)}, expected ${want.length ? `only ${tags(want)}` : 'none of the three'}`);
    } finally { await page.close(); }
  }
  return { failures, passed };
};

// ------------------------------------------------------------------------------------------------ self-test
const swap = (text: string, from: string, to: string, what: string): string => {
  const next = text.replace(from, to);
  if (next === text) throw new Error(`self-test "${what}" changed nothing: its anchor is gone, so rewrite it`);
  return next;
};
const disk = (f: string) => readFileSync(resolve(HERE, f), 'utf8');
// Built when each runs, after the real run, so a hand mutation that moves an anchor still gets the real run's verdict.
const MUTANTS: { name: string; src: () => Sources; mustName: RegExp }[] = [
  { name: 'the root importing the button', src: () => ({ ...REAL, files: { 'index.js': swap(disk('index.js'), 'export {};', "import './p3-button.js';\nexport {};", 'root') } }),
    mustName: /^root \(@prism3\/web-components\): registered <p3-button>, expected nothing/ },
  { name: 'the text field\'s entry also registering the button', src: () => ({ ...REAL, files: { 'p3-text-field.js': swap(disk('p3-text-field.js'), "import { LitElement", "import './p3-button.js';\nimport { LitElement", 'text-field') } }),
    mustName: /^\.\/text-field: registered <p3-button>, <p3-text-field>, expected exactly <p3-text-field>/ },
  { name: 'the button\'s entry pointing at the text field', src: () => ({ ...REAL, pkg: { ...REAL.pkg, exports: { ...REAL.pkg.exports, './button': './p3-text-field.js' } } }),
    mustName: /^\.\/button: registered <p3-text-field>, expected exactly <p3-button>/ },
  { name: 'an old ./p3-button.js entry kept', src: () => ({ ...REAL, pkg: { ...REAL.pkg, exports: { ...REAL.pkg.exports, './p3-button.js': './p3-button.js' } } }),
    mustName: /^exports: "\.\/p3-button\.js" is not an expected entry/ },
];

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { chromium } = createRequire(import.meta.url)('playwright');
  const browser = await chromium.launch();
  let fail = 0;
  try {
    const real = await run(browser, REAL);
    if (real.failures.length) {
      fail++;
      console.error(`FAIL entries: ${real.failures.length} failure(s), ${real.passed} passed`);
      for (const x of real.failures) console.error(`  - ${x}`);
    } else console.log(`OK entries: ${real.passed} checks: the root registers nothing, and /button, /text-field and /password-field each register exactly their own element, resolved as a consumer resolves them`);
    for (const m of MUTANTS) {
      let src: Sources;
      try { src = m.src(); } catch (e) { fail++; console.error(`FAIL self-test: "${m.name}": ${(e as Error).message}`); continue; }
      const r = await run(browser, src, false);
      if (r.failures.some((x) => m.mustName.test(x))) console.log(`OK self-test: "${m.name}" fails by name`);
      else { fail++; console.error(`FAIL self-test: "${m.name}" was not reported by name (${r.failures.slice(0, 4).join('; ') || 'nothing'})`); }
    }
  } finally { await browser.close(); }
  process.exit(fail ? 1 : 0);
}
