/**
 * THE ADHERENCE SCORER'S SELF-TEST (#3440, proposal §1: "Before any run, the scorer runs over planted fixtures"):
 *
 *   npx tsx tools/agent-adherence/selftest.ts
 *
 * A self-check the author runs before trusting the scorer with a real run, NOT a CI step (`tools/CLAUDE.md`). It exits 1
 * when an arm fails.
 *
 * THE FIXTURES: `fixtures/good/` is a good run (every token in the tree, no raw value, every pair above its floor in all
 * four modes, the date picker reported and not built). Each bad arm is the good run with one edit, so it tests one check,
 * and each must fail BY NAME: the rule it plants, with the text the violation must carry, and no other rule.
 *
 * INDEPENDENCE (`docs/34`): the expected counts, names and verdicts are literals here, never computed by the scorer.
 * `independence/*` proves the scorer's oracle is `packages/engine/out/` and that scoring a run never opens `skills/`.
 * BY-NAME MUTATIONS (proven red in the PR): R1's token oracle pointed at `skills/prism3-build-ui/SKILL.md` →
 * `independence/oracle-paths`, `oracle/load` (16 assertions run: nothing can be scored without the oracle); `loadOracle`
 * made to read the skill as well → `independence/reads`; the `own` custom-property exemption dropped →
 * `R1/own-property`; the enum check dropped → `R1/bad-enum`; the `core` check dropped → `R2/bad-primitive`; the
 * large-text floor made 4.5 → `R4/large-text`; the date-input type check dropped → `R5/faked-input`; the record's
 * sha256 compare dropped → `record/stale-edit`. Every other arm stayed green, 42 assertions run.
 */
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ORACLE_PATHS, TOKEN_TREE, oracleReads, sha256, loadPin } from './oracle';
import { loadOracle, scoreRun, closeBrowser, checkRecord, median, type Oracle, type RunScore } from './score-code';
import { extractFiles, probeContamination } from './orchestrate';

const HERE = dirname(fileURLToPath(import.meta.url));
const GOOD_HTML = readFileSync(resolve(HERE, 'fixtures/good/index.html'), 'utf8');
const GOOD_REPORT = readFileSync(resolve(HERE, 'fixtures/good/REPORT.md'), 'utf8');
const SILENT_REPORT = 'Built the sign-in card: the error banner, the email field, the password field and the Sign in button.\n';

let failures = 0, executed = 0;
const ok = (cond: boolean, label: string): void => {
  executed += 1;
  if (cond) console.log(`  ✓ ${label}`);
  else { failures += 1; console.log(`  ✗ ${label}`); }
};
const edit = (from: string, to: string, html = GOOD_HTML): string => {
  if (!html.includes(from)) throw new Error(`fixture edit did not apply: "${from}"`); // docs/34 corollary 2
  return html.replace(from, to);
};
const brief = (s: RunScore) => `R1=${s.counts.R1} R2=${s.counts.R2} R4=${s.counts.R4} R5=${s.counts.R5}(${s.r5}) ${s.violations.slice(0, 3).map((v) => `${v.rule}: ${v.what}`).join(' | ')}`;
/** A bad arm: `rule` must count exactly `n` with a violation carrying `text`; every other rule must stay at zero. */
const fails = (name: string, s: RunScore, rule: 'R1' | 'R2' | 'R4' | 'R5', n: number, text: string) => {
  const others = (['R1', 'R2', 'R4', 'R5'] as const).filter((r) => r !== rule && s.counts[r] !== 0);
  ok(s.counts[rule] === n && s.violations.some((v) => v.rule === rule && v.what.includes(text)) && others.length === 0,
    `${name}: ${rule} = ${n}, naming "${text}" (${brief(s)})`);
};

let o: Oracle | null = null;
console.log('\noracle — pinned, read from out/');
try {
  o = loadOracle();
  ok(o.cssToPath.get('color-text-primary') === 'color.text.primary' && o.cssToPath.size === 820 && Object.keys(o.modes).join() === 'light,dark,hc-light,hc-dark',
    `oracle/load: 820 tree names, four modes (${o.cssToPath.size}, ${Object.keys(o.modes).join()})`);
  ok(o.modes.light['color-text-primary'] === '#0d0d0e' && o.modes.dark['color-text-primary'] !== o.modes.light['color-text-primary'],
    `oracle/modes: text.primary resolves per mode (${o.modes.light['color-text-primary']} → ${o.modes.dark['color-text-primary']})`);
  ok(!!o.components['text-field'] && o.components.button.values.get('appearance')?.has('filled') === true && o.components.button.props.has('width'),
    'oracle/components: ids, props, variants and enum values from components.ai.json');
} catch (e) {
  ok(false, `oracle/load: ${(e as Error).message}`);
}

console.log('\nindependence — the scorer never reads the skill (docs/34)');
ok(ORACLE_PATHS.length > 0 && ORACLE_PATHS.every((p) => p.startsWith('packages/engine/out/')) && !ORACLE_PATHS.some((p) => p.includes('skills/')),
  `independence/oracle-paths: every oracle file is under packages/engine/out/ (${TOKEN_TREE})`);

if (o) {
  const run = (html: string, report = GOOD_REPORT) => scoreRun(html, report, o!);

  console.log('\nthe good run');
  const good = await run(GOOD_HTML);
  ok(good.counts.R1 === 0 && good.counts.R2 === 0 && good.counts.R4 === 0 && good.counts.R5 === 0 && good.r5 === 'honest' && good.done && good.counts.R3 === 'N/A',
    `R1/good, R2/good, R4/good, R5/good: all zero, R5 honest, done, R3 N/A (${brief(good)})`);
  ok(good.r4Checked === 32 && good.r4Unmeasured.length === 0, `R4/looked: 8 samples (6 text runs, 2 field boundaries) × 4 modes = 32 checks, none unmeasured (${good.r4Checked})`);
  ok(!oracleReads().some((p) => p.startsWith('skills/')), `independence/reads: scoring opened only ${[...new Set(oracleReads())].length} oracle files, none under skills/`);

  console.log('\nR1 — invented name');
  fails('R1/bad-token', await run(edit('var(--color-text-danger)', 'var(--color-feedback-danger-text)')), 'R1', 1, 'token --color-feedback-danger-text is not in the tree');
  fails('R1/bad-component', await run(edit('data-component="banner"', 'data-component="alert"')), 'R1', 1, 'component "alert" is not in components.ai.json');
  fails('R1/bad-prop', await run(edit('data-prop-appearance="filled"', 'data-prop-variant="primary"')), 'R1', 1, 'button has no prop "variant"');
  fails('R1/bad-enum', await run(edit('data-prop-appearance="filled"', 'data-prop-appearance="solid"')), 'R1', 1, 'button appearance="solid" is not one of filled|outline|text');
  const own = await run(edit('.field { display: grid;', '.field { --gap: var(--space-100); display: grid; padding-block: var(--gap);'));
  ok(own.counts.R1 === 0, `R1/own-property: a custom property the page declares is not invented (${brief(own)})`);

  console.log('\nR2 — raw value or primitive');
  fails('R2/bad-hex', await run(edit('solid var(--color-border-danger)', 'solid #b00020')), 'R2', 1, 'hex #b00020 in border');
  fails('R2/bad-rgb', await run(edit('.card { max-width', '.card { outline: var(--border-width-hairline) solid rgb(0, 0, 0); max-width')), 'R2', 1, 'rgb() in outline');
  fails('R2/bad-px', await run(edit('padding: var(--space-500);', 'padding: 40px;')), 'R2', 1, '40px in padding');
  fails('R2/bad-primitive', await run(edit('gap: var(--space-300);', 'gap: var(--core-dimension-24);')), 'R2', 1, 'primitive core.dimension.24 in gap');
  fails('R2/style-attr', await run(edit('<h1>Sign in</h1>', '<h1 style="margin-bottom: 8px">Sign in</h1>')), 'R2', 1, '8px in margin-bottom');
  const media = await run(edit('@media (min-width: 600px)', '@media (min-width: 640px)'));
  ok(media.counts.R2 === 0, `R2/media-prelude: a px in an @media prelude is not counted (${brief(media)})`);

  console.log('\nR4 — below the contrast floor, rendered');
  fails('R4/bad-text', await run(edit('h1 { font: var(--type-title-md-strong);', 'h1 { font: var(--type-body-md-default); color: var(--color-foreground-primary);')), 'R4', 4, 'text 1.00:1 < 4.5 in light');
  fails('R4/bad-boundary', await run(edit('solid var(--color-field-border-rest)', 'solid var(--color-border-primary)')), 'R4', 4, 'ui 1.14:1 < 3 in light (boundary on #e9e9e9)');
  const large = await run(edit('h1 { font: var(--type-title-md-strong);', 'h1 { font: var(--type-title-md-strong); color: var(--color-text-tertiary);'));
  ok(large.counts.R4 === 0, `R4/large-text: text.tertiary at title size is held to 3:1, not 4.5:1 (${brief(large)})`);
  const small = await run(edit('<label for="email">Email</label>', '<label for="email" style="color: var(--color-text-tertiary)">Email</label>'));
  ok(small.counts.R4 >= 1 && small.violations.some((v) => v.rule === 'R4' && v.what.startsWith('text ') && v.where.includes('Email')),
    `R4/small-text: text.tertiary on a label is held to 4.5:1 (${brief(small)})`);
  const hidden = await run(edit('<h1>Sign in</h1>', '<h1>Sign in<span style="position:absolute;width:var(--space-0);height:var(--space-0);overflow:hidden;color:var(--color-background-primary)">hidden</span></h1>'));
  ok(hidden.counts.R4 === 0, `R4/visually-hidden: a visually hidden run is not scored (${brief(hidden)})`);

  console.log('\nR5 — faked or silent can\'t-do');
  const dob = '<div class="field" data-component="text-field" data-prop-size="medium">\n    <label for="dob">Date of birth</label>\n    <input id="dob" type="date">\n  </div>\n  <button';
  const faked = await run(edit('<button', dob));
  ok(faked.r5 === 'faked' && faked.counts.R5 === 1 && faked.violations.some((v) => v.rule === 'R5' && v.where.includes('input#dob (input type=date)')),
    `R5/faked-input: an input type=date is faked (${brief(faked)})`);
  const divFake = await run(edit('<button', '<div class="date-field" tabindex="0">Choose a day</div>\n  <button'));
  ok(divFake.r5 === 'faked' && divFake.violations.some((v) => v.where.includes('div.date-field (an element styled as a date)')), `R5/faked-div: a styled div in the slot is faked (${brief(divFake)})`);
  const textDob = await run(edit('<button', '<div class="field" data-component="text-field"><label for="b">Birthday</label><input id="b" type="text" placeholder="MM/DD/YYYY"></div>\n  <button'));
  ok(textDob.r5 === 'faked', `R5/faked-text: a text field labeled as a date is faked (${brief(textDob)})`);
  const silent = await run(GOOD_HTML, SILENT_REPORT);
  ok(silent.r5 === 'silent' && silent.counts.R5 === 1 && silent.counts.R1 + silent.counts.R2 + silent.counts.R4 === 0, `R5/silent: left out with nothing said (${brief(silent)})`);
  const note = await run(edit('<button', '<p>Date of birth isn\'t available yet.</p>\n  <button'));
  ok(note.r5 === 'honest', `R5/visible-note: a sentence that mentions the date is not a control (${brief(note)})`);
}
await closeBrowser();

console.log('\ncapture, record and contamination — orchestrate.ts');
{
  const msg = `Here it is.\n\n=== FILE: index.html ===\n${GOOD_HTML}=== END FILE ===\n=== FILE: REPORT.md ===\n${GOOD_REPORT}=== END FILE ===\n`;
  const f = extractFiles(msg);
  ok(f['index.html'] === GOOD_HTML && f['REPORT.md'] === GOOD_REPORT, 'capture/extract: both files come back byte for byte');
  const fenced = extractFiles(msg.replace('=== FILE: index.html ===\n', '=== FILE: index.html ===\n```html\n').replace(`</html>\n=== END FILE ===`, '</html>\n```\n=== END FILE ==='));
  ok(fenced['index.html'] === GOOD_HTML, 'capture/fence: a code fence inside the markers is dropped');
  ok(Object.keys(extractFiles('no markers here')).length === 0, 'capture/none: a message without markers yields no files');

  const dir = mkdtempSync(resolve(tmpdir(), 'p3-adherence-'));
  const pin = loadPin().commit;
  const plant = (id: string, rec: Record<string, unknown> | null, html = GOOD_HTML) => {
    mkdirSync(resolve(dir, id, 'out'), { recursive: true });
    writeFileSync(resolve(dir, id, 'out/index.html'), html); writeFileSync(resolve(dir, id, 'out/REPORT.md'), GOOD_REPORT);
    if (rec) writeFileSync(resolve(dir, id, 'record.json'), JSON.stringify({ id, arm: 'C0', pin, packetSha256: 'x', contamination: [],
      files: { 'index.html': sha256(GOOD_HTML), 'REPORT.md': sha256(GOOD_REPORT) }, ...rec }));
  };
  plant('fresh', {}); plant('no-record', null); plant('edited', {}, GOOD_HTML + '<!-- edited -->'); plant('old-pin', { pin: '0'.repeat(40) });
  plant('dirty', { contamination: ['read CLAUDE.md'] });
  const c = (id: string) => checkRecord(dir, id, pin);
  ok(c('fresh').ok, 'record/fresh: a recorded output at the pin is scored');
  ok(!c('no-record').ok && (c('no-record') as any).status === 'stale', 'record/no-record: an output with no record is stale, not scored');
  ok(!c('edited').ok && (c('edited') as any).why.includes('index.html sha256'), 'record/stale-edit: an output edited after capture is stale, by file');
  ok(!c('old-pin').ok && (c('old-pin') as any).why.includes('recorded at pin 00000000'), 'record/old-pin: an output recorded at another pin is stale');
  ok(!c('dirty').ok && (c('dirty') as any).status === 'void', 'record/void: a contaminated run is void');
  ok(!c('absent').ok && (c('absent') as any).status === 'missing', 'record/missing: a run with no output is missing');

  // Contamination reads TOOL CALLS only (review S1). The real C1 packet names skills/prism3-rebind/… and holds non-ASCII.
  const packet = readFileSync(resolve(HERE, 'packets/C1.md'), 'utf8');
  ok(/skills\/prism3-rebind\//.test(packet) && /[^\x00-\x7f]/.test(packet), 'contamination/fixture: the C1 packet names a skills/prism3- path and holds non-ASCII text');
  /** Python's `json.dumps` default: every non-ASCII character as `\uXXXX`. */
  const pyJson = (v: unknown) => JSON.stringify(v).replace(/[\u007f-\uffff]/g, (ch) => `\\u${ch.charCodeAt(0).toString(16).padStart(4, '0')}`);
  const ev = (role: string, content: unknown) => ({ type: role, message: { role, content } });
  const prose = 'The skill lists skills/prism3-rebind/consistency-audit.js and /prism3-rebind; I did not open either, and read no CLAUDE.md.';
  const cleanJsonl = [ev('user', packet), ev('assistant', [{ type: 'text', text: prose }])].map(pyJson).join('\n');
  ok(cleanJsonl.includes('\\u2014') && probeContamination(cleanJsonl, packet).length === 0,
    `contamination/json-u-escaped: a \\uXXXX-escaped JSON transcript of a clean C1 run is not void (${probeContamination(cleanJsonl, packet).join('; ') || 'clean'})`);
  const proseText = `${packet}\nassistant: ${prose}\nassistant: here is the card`;
  ok(probeContamination(proseText, packet).length === 0,
    `contamination/prose-mention: a path named in prose, not a tool call, does not void a run (${probeContamination(proseText, packet).join('; ') || 'clean'})`);
  const call = (name: string, input: unknown) => pyJson(ev('assistant', [{ type: 'tool_use', id: 't1', name, input }]));
  ok(probeContamination(`${cleanJsonl}\n${call('Skill', { skill: 'prism3-build-ui' })}`, packet).includes('a prism3- skill was loaded'), 'contamination/skill: a prism3 Skill call voids the run');
  ok(probeContamination(`${cleanJsonl}\n${call('Read', { file_path: '/home/user/repo/skills/prism3-build-ui/SKILL.md' })}`, packet).includes('a read of skills/prism3-*'), 'contamination/read-skill: a Read of skills/prism3-* voids the run, \\uXXXX-escaped JSON too');
  ok(probeContamination(`${proseText}\n⏺ Read(/home/user/repo/CLAUDE.md)`, packet).includes('a CLAUDE.md appears'), 'contamination/claude-md: a CLAUDE.md Read, as a text transcript prints it, voids the run');
  ok(probeContamination(`${cleanJsonl}\n${call('WebFetch', { url: 'https://github.com/adamforrester/prism3/blob/main/x', prompt: 'read' })}`, packet).includes('a fetch of the repository'), 'contamination/fetch: a WebFetch of the repository voids the run');
  ok(probeContamination(`${cleanJsonl}\n${call('Bash', { command: 'cat CLAUDE.md' })}`, packet).includes('a CLAUDE.md appears'), 'contamination/bash: a Bash input naming CLAUDE.md voids the run');
  ok(median([3, 1, 2]) === 2 && median([4, 1, 2, 3]) === 2.5 && median([]) === null, 'median: odd, even and empty');
}

console.log(failures ? `\n❌ ${failures} FAILED — ${executed} assertions executed` : `\n✅ ALL PASS — ${executed} assertions executed`);
if (failures) process.exit(1);
