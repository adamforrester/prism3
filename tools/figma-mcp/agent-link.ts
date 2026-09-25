/**
 * agent-link — print the short `use_figma` script that sends a command to the RUNNING Prism3 plugin through
 * the file, or reads its result back. The plugin does the writing; this prints the trigger and the reader.
 *
 *   npx tsx tools/figma-mcp/agent-link.ts send <cmd> [<args.json> | '<json>'] [--brand <id|path>] [--id <id>]
 *   npx tsx tools/figma-mcp/agent-link.ts read <id> [--path result.data.apply.misses]
 *   npx tsx tools/figma-mcp/agent-link.ts link
 *
 * `send` prints the script on stdout and the command id on stderr (`id: …`) — keep the id, `read` needs it.
 * `--brand` fills `args.input` for `apply-theme` / `prune` from an example id (`aurora`, `harbor`,
 * `nb-redesign`, `wendys`) or a `.design.md` path, the same resolution `plan.ts` uses.
 *
 * Commands: status · apply-theme {input} · build-components {def?} · file-setup · prune {input, confirm} ·
 * readback. The runbook, and the one precondition that matters (the owner has switched the agent link on in
 * the plugin, in this file), is `tools/figma-mcp/README.md` §5.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { envelope, sendSnippet, readSnippet, linkSnippet } from '../../apps/plugin/agent-snippets';
import { AGENT_COMMANDS } from '../../apps/plugin/src/agent-protocol';
import { brandFromDesignMd } from '../../apps/plugin/mcp-paste';
import exampleBrands from '@prism3/engine/schema/example-brands.json';
import type { BrandInput } from '@prism3/engine/theme';

const HERE = dirname(fileURLToPath(import.meta.url));
const EXAMPLES = resolve(HERE, '../../packages/engine/examples');
const fail = (msg: string): never => { console.error(`agent-link.ts: ${msg}`); process.exit(2); };

const argv = process.argv.slice(2);
const opt = (name: string): string | undefined => { const i = argv.indexOf(`--${name}`); return i >= 0 ? argv[i + 1] : undefined; };
const positional = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1].startsWith('--')));
const [verb, ...rest] = positional;
if (!verb || argv.includes('--help')) { console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0]); process.exit(verb ? 0 : 2); }

const loadBrand = (s: string): BrandInput => {
  const asPath = resolve(process.cwd(), s);
  if (existsSync(asPath) && s.endsWith('.md')) return brandFromDesignMd(readFileSync(asPath, 'utf8'));
  const example = resolve(EXAMPLES, `${s}.design.md`);
  if (existsSync(example)) return brandFromDesignMd(readFileSync(example, 'utf8'));
  const json = (exampleBrands as Record<string, BrandInput>)[s];
  if (json) return json;
  const ids = readdirSync(EXAMPLES).filter((f) => f.endsWith('.design.md')).map((f) => f.replace('.design.md', ''));
  return fail(`no brand '${s}' — pass a .design.md path, or one of: ${[...ids, ...Object.keys(exampleBrands)].join(', ')}`);
};

const readArgs = (spec: string | undefined): Record<string, unknown> => {
  if (spec === undefined) return {};
  const text = existsSync(resolve(process.cwd(), spec)) ? readFileSync(resolve(process.cwd(), spec), 'utf8') : spec;
  try {
    const v = JSON.parse(text);
    if (!v || typeof v !== 'object' || Array.isArray(v)) fail('args must be a JSON object');
    return v as Record<string, unknown>;
  } catch (e) { return fail(`args are not JSON: ${(e as Error).message}`); }
};

if (verb === 'send') {
  const [cmd, argSpec] = rest;
  if (!cmd) fail(`send needs a command: ${AGENT_COMMANDS.join(', ')}`);
  // Not refused here when unknown: the plugin answers an unknown command with a failed result, and that
  // path is worth being able to exercise. Warned, so a typo is not a surprise.
  if (!(AGENT_COMMANDS as readonly string[]).includes(cmd)) console.error(`agent-link.ts: warning — '${cmd}' is not a command this build knows (${AGENT_COMMANDS.join(', ')}); the plugin will answer unknown-command`);
  const args = readArgs(argSpec);
  const brand = opt('brand');
  if (brand) args.input = loadBrand(brand);
  const c = envelope(cmd, args, opt('id'));
  console.error(`id: ${c.id}`);
  process.stdout.write(sendSnippet(c) + '\n');
} else if (verb === 'read') {
  const [id] = rest;
  if (!id) fail('read needs the command id `send` printed');
  const path = opt('path');
  process.stdout.write(readSnippet(id, path ? path.split('.').filter(Boolean) : []) + '\n');
} else if (verb === 'link') {
  process.stdout.write(linkSnippet() + '\n');
} else {
  fail(`unknown verb '${verb}' — send, read or link`);
}
