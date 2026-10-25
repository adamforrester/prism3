/**
 * Prism3 — THE AGENT REFERENCE (#2637, owner Q300 A). Writes `docs/public/reference/commands.json`, the
 * machine-readable list of everything an agent can call: the MCP tools of both servers, the agent-link
 * commands the running plugin answers, and the command-line entry points.
 *
 *   npx tsx packages/engine/emit-agent-reference.ts            # write the reference
 *   npx tsx packages/engine/emit-agent-reference.ts --check    # fail (exit 1) if it no longer matches the code
 *
 * READ FROM THE CODE, NEVER FROM PROSE. Each section comes from the module that defines the surface:
 *
 *   · MCP tools — `toolDefs()` in `mcp.ts` and `TOOLS` in `tools/figma-bridge/server.ts`, the same arrays
 *     `tools/list` answers with, so a name, description or schema here is the one a client receives. One
 *     exception: `theme_brand.brand` is a `$ref` to `theme-schema.json`, and the wire carries that schema
 *     compacted (`compactSchema` in `mcp.ts`: descriptions cut to their summaries), not the file itself.
 *   · agent-link commands — `AGENT_COMMANDS` and the `AgentArgs` type in `apps/plugin/src/agent-protocol.ts`
 *     (each command's args and its doc comment), the `bad-args` refusals in `parseCommand`, the error codes
 *     of `AgentErrorCode`, and the mailbox layout `MAILBOX`. The dev-only `run-code` comes from
 *     `dev-commands.ts`.
 *   · CLI entry points — each file's own header usage lines (`npx tsx …`) and the flags its code compares
 *     `argv` against.
 *
 * The one authored part is `WRITES` below: what each agent-link command writes to the file. The plugin
 * holds that knowledge in its handlers, not in data, so it is typed here, and a command with no entry (or an
 * entry for a command that is gone) refuses to generate. `CLI` is authored in the same way, with the same
 * both-directions check against every file that reads `process.argv` (`CLI_EXCLUDED` names the rest, each
 * with its reason).
 *
 * WHY ITS OWN GATE AND NOT A `regen.ts` STEP. `regen.ts` owns the ENGINE's emission: `out/**`, three
 * `schema/` files and the engine-root reports, each read by the payload, version and prose gates as
 * something a client receives in a token payload. This file is documentation served by the studio, it
 * carries no engine version, and folding it into that model would make `lint-emission-version.ts` demand
 * an engine bump for a reworded tool description. So it is checked here, the way `token-contract.ts`
 * checks its baseline: the committed file is the memory, and `--check` regenerates in memory and compares.
 *
 * INDEPENDENCE (docs/34). The expected value is the committed file; the actual is the code read now. The
 * generator never reads the committed file to decide what to write, so a tool added in `mcp.ts`, a command
 * renamed in `AGENT_COMMANDS` or a flag added to `fold.ts` fails `--check` by name until the reference is
 * regenerated and the change reviewed in the diff.
 *
 * STATED LIMITS. A CLI that reads no `process.argv` is not found by the completeness check (a flagless
 * script has nothing for this file to list beyond its usage line). An MCP tool's result is described by its
 * `outputSchema` where it declares one; for the two that do not, the reference says so rather than guessing.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { toolDefs, PROTOCOL_VERSIONS, SERVER_INFO } from './mcp';
import { TOOLS as BRIDGE_TOOLS, SERVER_INFO as BRIDGE_INFO } from '../../tools/figma-bridge/server';
import { AGENT_COMMANDS, AGENT_PROTOCOL_VERSION, MAILBOX } from '../../apps/plugin/src/agent-protocol';
import { RUN_CODE } from '../../apps/plugin/src/dev-commands';
import { BRIDGE_PORT } from '../../apps/plugin/src/agent-bridge-relay';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..');
export const REFERENCE = 'docs/public/reference/commands.json';

const rel = (abs: string): string => relative(repo, abs).split('\\').join('/');
const read = (p: string): string => readFileSync(join(repo, p), 'utf8');
const lines = (p: string): string[] => read(p).split('\n');
/** `file#anchor`: the file and the symbol a reader searches for. No line number: a line moves whenever anything
 *  above it does, so a `file:line` source would fail `--check` on a tree where no command changed. */
const anchor = (p: string, name: string): string => `${p}#${name}`;
/** `anchor`, once a line in `p` matches `re`, or a refusal: a source the reference cannot point at is a defect. */
const at = (p: string, re: RegExp, name: string): string => {
  if (!lines(p).some((l) => re.test(l))) throw new Error(`emit-agent-reference: no line in ${p} matches ${re}`);
  return anchor(p, name);
};
const esc = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/* ── MCP ─────────────────────────────────────────────────────────────────────────────────────────────── */

/** The BrandInput schema is 40 KB inlined; the reference points at it instead, by the path a reader can open.
 *  `theme_brand.brand` is the one place it appears, and the wire does not carry the file as it stands: `mcp.ts`
 *  sends `compactSchema(theme-schema)`, each description cut to its one-line summary and every other keyword
 *  unchanged. The description says so, in one sentence, because `compactSchema` runs over this object too and
 *  keeps only a description's first sentence. */
const BRAND_SCHEMA_REF = { $ref: 'packages/engine/schema/theme-schema.json', description: 'A BrandInput, the shape in packages/engine/schema/theme-schema.json, which tools/list sends compacted: each description cut to its one-line summary, every other keyword unchanged.' };

type Tool = { name: string; title?: string; description: string; inputSchema: unknown; outputSchema?: unknown };
const mcpTool = (file: string, t: Tool) => ({
  name: t.name,
  ...(t.title ? { title: t.title } : {}),
  description: t.description,
  inputSchema: t.inputSchema,
  output: t.outputSchema
    ? { structuredContent: t.outputSchema, text: 'the same object as JSON in content[0].text' }
    : { structuredContent: null, text: 'a JSON object in content[0].text; this tool declares no outputSchema' },
  source: at(file, new RegExp(`name: '${esc(t.name)}'`), `name: '${t.name}'`),
});

const mcp = () => [
  {
    server: SERVER_INFO.name,
    run: 'npx tsx packages/engine/mcp.ts',
    transport: 'stdio, newline-delimited JSON-RPC 2.0',
    protocolVersions: [...PROTOCOL_VERSIONS],
    source: at('packages/engine/mcp.ts', /^const isMain/, 'isMain'),
    tools: (toolDefs(BRAND_SCHEMA_REF) as Tool[]).map((t) => mcpTool('packages/engine/mcp.ts', t)),
  },
  {
    server: BRIDGE_INFO.name,
    run: 'npx tsx tools/figma-bridge/server.ts [--port 17331]',
    transport: `stdio, newline-delimited JSON-RPC 2.0; drives the running plugin over a WebSocket on 127.0.0.1:${BRIDGE_PORT}`,
    protocolVersions: [...PROTOCOL_VERSIONS],
    source: at('tools/figma-bridge/server.ts', /^const isMain/, 'isMain'),
    tools: (BRIDGE_TOOLS as Tool[]).map((t) => mcpTool('tools/figma-bridge/server.ts', t)),
  },
];

/* ── the agent link ──────────────────────────────────────────────────────────────────────────────────── */

const PROTOCOL = 'apps/plugin/src/agent-protocol.ts';
const DEV = 'apps/plugin/src/dev-commands.ts';

/** What each command writes to the Figma file. Authored, because the plugin's handlers hold it in code
 *  rather than data; checked both ways against `AGENT_COMMANDS` + `RUN_CODE` below. */
export const WRITES: Record<string, string> = {
  status: 'Nothing. Reads the link state, the plugin build and the file\'s themed state.',
  'apply-theme': 'Variables, collections, text styles and effect styles for the brand, as the panel\'s Apply does.',
  'build-components': 'Component sets on their component pages, creating a page when it is missing.',
  'file-setup': 'The page structure (cover, dividers, section pages) and the two template assets. Idempotent.',
  'style-guide': 'Style-guide tables on the canvas.',
  prune: 'With confirm: false, nothing (a preview of what would go). With confirm: true, deletes the variables and styles the brand no longer emits, recomputed from a fresh read.',
  readback: 'Nothing. Reads the file\'s themed state and a census of every component page.',
  'update-components': 'With confirm: false (or none), nothing: a check whose result carries a previewHash. With confirm: true and that previewHash, updates the sets in place; refused when the file no longer hashes the same.',
  'capture-baseline': 'Plugin data only: the as-built record on members built before it existed.',
  'adopt-members': 'Plugin data only: records and stamps members Prism3 did not build, so an update can bring them to the plan.',
  'draw-specs': 'Canvas frames only: a spec panel beside each family\'s usage panel, replacing its earlier unedited one and keeping an edited one aside as "(edited)". Never a component set, a variable or a style.',
  'run-code': 'Whatever the code writes. Dev builds only; a release build answers unknown-command.',
};

/** The `/** … *\/` comment that ends on the line before `i`, joined to one line. */
const docAbove = (src: string[], i: number): string => {
  if (!/\*\/\s*$/.test(src[i - 1] ?? '')) return '';
  let s = i - 1;
  while (s > 0 && !/\/\*\*/.test(src[s])) s--;
  return src.slice(s, i).join(' ').replace(/\/\*\*|\*\//g, '').replace(/^\s*\*\s?/gm, '').replace(/\s*\*\s+/g, ' ').replace(/\s+/g, ' ').trim();
};

/** One `AgentArgs` member: its args type as written and its doc comment. */
const argsOf = (cmd: string): { args: string; description: string; source: string } => {
  const src = lines(PROTOCOL);
  const start = src.findIndex((l) => /^export type AgentArgs = \{/.test(l));
  const end = src.findIndex((l, i) => i > start && /^\};/.test(l));
  const re = new RegExp(`^\\s*(?:'${esc(cmd)}'|${esc(cmd)}): (.+);\\s*$`);
  for (let i = start + 1; i < end; i++) {
    const m = re.exec(src[i]);
    if (m) return { args: m[1], description: docAbove(src, i), source: anchor(PROTOCOL, `AgentArgs.${cmd}`) };
  }
  throw new Error(`emit-agent-reference: AgentArgs has no member for '${cmd}' in ${PROTOCOL}`);
};

const STRING = /'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`/;
const unquote = (s: string): string => s.slice(1, -1).replace(/\\(.)/g, '$1');

/** The `bad-args` refusals `parseCommand` gives one command: each literal message, or the expression that builds it. */
const refusalsOf = (cmd: string): Array<{ message: string; source: string } | { computed: string; source: string }> => {
  const src = lines(PROTOCOL);
  const begin = src.findIndex((l) => /^export const parseCommand/.test(l));
  const caseAt = src.findIndex((l, i) => i > begin && l.includes(`case '${cmd}':`));
  if (caseAt < 0) return [];
  const out: Array<{ message: string; source: string } | { computed: string; source: string }> = [];
  for (let i = caseAt + 1; i < src.length && !/^\s*case '/.test(src[i]) && !/^};/.test(src[i]); i++) {
    const re = /fail\('bad-args', /g;
    for (let m = re.exec(src[i]); m; m = re.exec(src[i])) {
      const rest = src[i].slice(m.index + m[0].length);
      const lit = STRING.exec(rest);
      if (lit && lit.index === 0) out.push({ message: unquote(lit[0]), source: anchor(PROTOCOL, `parseCommand.${cmd}`) });
      else out.push({ computed: rest.slice(0, rest.search(/[),]/)), source: anchor(PROTOCOL, `parseCommand.${cmd}`) });
    }
  }
  return out;
};

/** Every `AgentErrorCode` with its doc comment: the refusals any command can get. */
const errorCodes = () => {
  const src = lines(PROTOCOL);
  const start = src.findIndex((l) => /^export type AgentErrorCode =/.test(l));
  const out: Array<{ code: string; meaning: string; source: string }> = [];
  for (let i = start + 1; i < src.length; i++) {
    const m = /^\s*\| '([a-z-]+)'(;?)/.exec(src[i]);
    if (!m) continue;
    out.push({ code: m[1], meaning: docAbove(src, i), source: anchor(PROTOCOL, `AgentErrorCode.${m[1]}`) });
    if (m[2]) break;
  }
  return out;
};

const runCodeRefusals = () => lines(DEV).flatMap((l) => {
  const m = /return (['`])(run-code[^'`]*)\1;/.exec(l);
  return m ? [{ message: m[2], source: anchor(DEV, 'runCode') }] : [];
});

const agentLink = () => {
  const cmds = [...AGENT_COMMANDS, RUN_CODE] as string[];
  const unwritten = cmds.filter((c) => !(c in WRITES));
  const stale = Object.keys(WRITES).filter((c) => !cmds.includes(c));
  if (unwritten.length || stale.length) {
    throw new Error(`emit-agent-reference: WRITES is out of step with AGENT_COMMANDS — ${unwritten.length ? `no entry for ${unwritten.join(', ')}` : ''}${unwritten.length && stale.length ? '; ' : ''}${stale.length ? `an entry for a command that is gone: ${stale.join(', ')}` : ''}. Say what each command writes.`);
  }
  return {
    protocolVersion: AGENT_PROTOCOL_VERSION,
    source: at(PROTOCOL, /^export const AGENT_COMMANDS/, 'AGENT_COMMANDS'),
    precondition: 'The owner has switched the agent link on in the plugin, in the file the agent is working in.',
    command: { shape: '{ v, id, cmd, args, issuedAt }', id: '1 to 64 characters of A-Z, a-z, 0-9, dot, underscore or hyphen', source: at(PROTOCOL, /^export type AgentCommand = /, 'AgentCommand') },
    result: { shape: '{ v, id, cmd, ok, startedAt, finishedAt, engineVersion, transport, result: { verdict, data, logs } | error: { code, message }, progress? }', source: at(PROTOCOL, /^export type AgentResult = /, 'AgentResult') },
    transports: {
      mailbox: {
        about: 'The file\'s root shared plugin data, for an agent whose only Figma access is a use_figma call. The agent writes the inbox; the plugin writes everything else.',
        namespace: MAILBOX.ns,
        keys: { inbox: MAILBOX.inbox, claimed: MAILBOX.claimed, results: MAILBOX.results, link: MAILBOX.link, result: `${MAILBOX.resultPrefix}<id>`, resultChunk: `${MAILBOX.resultPrefix}<id>:<n>` },
        pollMs: MAILBOX.pollMs,
        keep: MAILBOX.keep,
        chunkBytes: MAILBOX.chunkBytes,
        source: at(PROTOCOL, /^export const MAILBOX = /, 'MAILBOX'),
      },
      bridge: {
        about: 'A local WebSocket the plugin panel connects to, driven through the figma-bridge MCP server\'s figma_run tool.',
        port: BRIDGE_PORT,
        source: at('apps/plugin/src/agent-bridge-relay.ts', /^export const BRIDGE_PORT/, 'BRIDGE_PORT'),
      },
    },
    errors: errorCodes(),
    commands: [
      ...AGENT_COMMANDS.map((c) => ({ name: c, ...argsOf(c), writes: WRITES[c], refuses: refusalsOf(c), devOnly: false })),
      {
        name: RUN_CODE,
        args: '{ code: string; timeoutMs?: number }',
        description: docAbove(lines(PROTOCOL), lines(PROTOCOL).findIndex((l) => l.includes(`'${RUN_CODE}': RunCodeArgs`))),
        source: at(DEV, /export type RunCodeArgs/, 'RunCodeArgs'),
        writes: WRITES[RUN_CODE],
        refuses: runCodeRefusals(),
        devOnly: true,
      },
    ],
  };
};

/* ── the command line ────────────────────────────────────────────────────────────────────────────────── */

/** The entry points a user or an agent runs. Each one's usage and flags are read from its own file. */
export const CLI = [
  'packages/engine/cli.ts',
  'packages/engine/mcp.ts',
  'packages/engine/regen.ts',
  'packages/engine/token-contract.ts',
  'packages/engine/materialise-to-figma.ts',
  'fold.ts',
  'packages/engine/release-notes.ts',
  'packages/engine/visualize.ts',
  'verify.ts',
  'tools/figma-bridge/server.ts',
  'tools/figma-mcp/agent-link.ts',
  'tools/figma-mcp/plan.ts',
  'tools/figma-mcp/report.ts',
  'packages/engine/emit-agent-reference.ts',
  'packages/engine/emit-figma-conventions.ts',
];

/** Files that read `process.argv` and are deliberately not listed, each with why. */
export const CLI_EXCLUDED: Record<string, string> = {
  'packages/engine/test.ts': 'a gate; the gates are listed by `npx tsx verify.ts --list`',
  'packages/engine/emit-dtcg.ts': 'a regen step; run regen.ts',
  'packages/engine/emit-figma.ts': 'a regen step; run regen.ts',
  'packages/engine/emit-brandinput.ts': 'a regen step; run regen.ts',
  'packages/engine/emit-component-docs.ts': 'a regen step; run regen.ts',
  'packages/engine/emit-analysis-reports.ts': 'a regen step; run regen.ts',
  'packages/engine/kb-briefs-refresh.ts': 'a maintainer refresh of schema/kb-briefs.json that reads a knowledge-base checkout outside this repository (#2488); nothing an agent can run here',
};
/** Gates are excluded by name pattern: there are dozens, and `verify.ts --list` is their reference. */
const GATE = /^packages\/engine\/lint-[a-z0-9-]+\.ts$/;

/** Where entry points can live. A file under one of these that reads `process.argv` must be listed or excluded. */
const CLI_DIRS = ['', 'packages/engine', 'tools/figma-bridge', 'tools/figma-mcp'];

const readsArgv = (p: string): boolean => /process\.argv/.test(read(p));

const cliCompleteness = (): string[] => {
  const found = CLI_DIRS.flatMap((d) => readdirSync(join(repo, d)).filter((f) => f.endsWith('.ts')).map((f) => (d ? `${d}/${f}` : f)))
    .filter((p) => readsArgv(p));
  const problems: string[] = [];
  for (const p of found) if (!CLI.includes(p) && !(p in CLI_EXCLUDED) && !GATE.test(p)) problems.push(`${p} reads process.argv and is neither in CLI nor in CLI_EXCLUDED`);
  for (const p of [...CLI, ...Object.keys(CLI_EXCLUDED)]) if (!existsSync(join(repo, p))) problems.push(`${p} is listed but does not exist`);
  for (const p of CLI) if (!readsArgv(p) && !/npx tsx /.test(read(p))) problems.push(`${p} is in CLI but has neither a usage line nor an argv read`);
  return problems;
};

/** The header comment: everything before the first `*\/` or the first non-comment line. */
const header = (src: string[]): Array<{ text: string; line: number }> => {
  const out: Array<{ text: string; line: number }> = [];
  for (let i = 0; i < src.length; i++) {
    const l = src[i];
    if (i === 0 && !/^\s*(\/\*\*?|\/\/)/.test(l)) break;
    out.push({ text: l.replace(/^\s*(\/\*\*?|\*\/?|\/\/)\s?/, ''), line: i + 1 });
    if (/\*\//.test(l) || (!/^\s*(\/\*|\*|\/\/)/.test(l))) break;
  }
  return out;
};

/** A flag the code compares `argv` against (`a === '--out'`, `argv.includes('--check')`, `argv.indexOf('--pass')`),
 *  or reads through the `opt('<name>')` helper the figma-mcp tools share. */
const FLAG_IN_CODE = /(?:===\s*|includes\(|indexOf\()'(-{1,2}[a-zA-Z][\w-]*)'/g;
const FLAG_BY_OPT = /\bopt\('([a-zA-Z][\w-]*)'\)/g;
const FLAG_IN_USAGE = /(?:^|[\s[|])(--[a-zA-Z][\w-]*)/g;
/** A header line that documents one flag: `  --flag   what it does`. */
const FLAG_DOC = /^\s*(--[a-zA-Z][\w-]*)\s/;

const cliEntry = (p: string) => {
  const src = lines(p);
  const head = header(src);
  // The summary is the header's first sentence: its opening paragraph, cut at the first full stop.
  const para: string[] = [];
  for (const h of head) { if (!h.text.trim()) { if (para.length) break; continue; } if (/npx tsx /.test(h.text)) break; para.push(h.text.trim()); }
  const opening = para.join(' ');
  const cut = opening.search(/\.(\s|$)/);
  const summary = cut >= 0 ? opening.slice(0, cut + 1) : opening;
  const usage = head.flatMap((h) => {
    // A usage line opens with the command (`  npx tsx regen.ts --check   # …`), or is a `Run:` line quoting it.
    // A mention inside a sentence is not one, so neither form matches prose that merely names a command.
    const m = /^\s*(npx tsx \S.*)$/.exec(h.text) ?? /^\s*Run: `(npx tsx [^`]+)`/.exec(h.text);
    return m ? [{ text: m[1].trim(), source: anchor(p, 'header') }] : [];
  });
  const flags = new Map<string, string>();
  src.forEach((l) => {
    if (/^\s*(\*|\/\/|\/\*)/.test(l)) return; // a comment, which reads no argv
    for (const m of l.matchAll(FLAG_IN_CODE)) if (!flags.has(m[1])) flags.set(m[1], anchor(p, 'argv'));
    for (const m of l.matchAll(FLAG_BY_OPT)) if (!flags.has(`--${m[1]}`)) flags.set(`--${m[1]}`, anchor(p, `opt('${m[1]}')`));
  });
  for (const u of usage) for (const m of u.text.split('#')[0].matchAll(FLAG_IN_USAGE)) if (!flags.has(m[1])) flags.set(m[1], u.source);
  for (const h of head) { const m = FLAG_DOC.exec(h.text); if (m && !flags.has(m[1])) flags.set(m[1], anchor(p, 'header')); }
  return {
    file: p,
    summary,
    usage,
    flags: [...flags].sort(([a], [b]) => a.localeCompare(b)).map(([flag, source]) => ({ flag, source })),
  };
};

/* ── assembly, write and check ───────────────────────────────────────────────────────────────────────── */

export const buildReference = () => {
  const problems = cliCompleteness();
  if (problems.length) throw new Error(`emit-agent-reference: the CLI list is out of step with the code —\n  ${problems.join('\n  ')}`);
  return {
    about: 'Every command an agent can call in Prism3: the MCP tools, the agent-link commands the Figma plugin answers, and the command-line entry points. Generated from the code; do not edit by hand.',
    generatedBy: 'npx tsx packages/engine/emit-agent-reference.ts',
    checkedBy: 'npx tsx packages/engine/emit-agent-reference.ts --check',
    mcp: mcp(),
    agentLink: agentLink(),
    cli: CLI.map(cliEntry),
  };
};

export const serialize = (ref: unknown): string => JSON.stringify(ref, null, 2) + '\n';

/** The names a reader can lose: one per tool, command, CLI file and flag. A diff on these is reported by name. */
const names = (ref: any): Map<string, string> => {
  const m = new Map<string, string>();
  for (const s of ref?.mcp ?? []) for (const t of s.tools ?? []) m.set(`mcp tool ${s.server}/${t.name}`, JSON.stringify(t));
  for (const c of ref?.agentLink?.commands ?? []) m.set(`agent-link command ${c.name}`, JSON.stringify(c));
  for (const e of ref?.agentLink?.errors ?? []) m.set(`agent-link error ${e.code}`, JSON.stringify(e));
  for (const c of ref?.cli ?? []) {
    m.set(`cli ${c.file}`, JSON.stringify({ ...c, flags: undefined }));
    for (const f of c.flags ?? []) m.set(`cli ${c.file} ${f.flag}`, JSON.stringify(f));
  }
  return m;
};

/**
 * NO LEGACY NAMESPACE IN AN EXAMPLE (owner Q313.2 A, #2644). A refusal quoted from the plugin once taught an agent
 * to name a table `Primary — <legacy root>`: a client's namespace from before the engine generated one, served to
 * every agent as if it were the way to spell a Prism3 table. The default brand's root is `prism`; a reference that
 * reaches for another brand's root to illustrate a generic argument is wrong for every reader but one.
 *
 * The list is typed here, not read from the engine's brands: a list derived from what the engine emits today would
 * shrink the moment a brand input was retired, and stop catching the very name it exists to catch (docs/34).
 * Matched as a whole word in any case, so `pds3` (a scale name) and `prism` do not hit.
 */
export const LEGACY_NAMESPACES = ['nbds', 'pds'] as const;
const LEGACY_RE = new RegExp(`(?<![\\w-])(${LEGACY_NAMESPACES.join('|')})(?![\\w-])`, 'i');

/** Each named entry (or the whole text, when no entry holds it) that spells a legacy namespace, by name. */
export const legacyNamespaceHits = (ref: unknown, text: string): string[] => {
  const out: string[] = [];
  for (const [k, v] of names(ref)) { const m = LEGACY_RE.exec(v); if (m) out.push(`legacy namespace '${m[1]}' in ${k}`); }
  if (!out.length) { const m = LEGACY_RE.exec(text); if (m) out.push(`legacy namespace '${m[1]}' outside any named entry`); }
  return out;
};

/**
 * THE MATCHER'S OWN SELF-CHECK, run before the real scan (the `lint-skills.ts` pattern; docs/34). `--check` alone
 * cannot catch a legacy root that returns through a source edit plus a regen: both sides of its comparison move
 * together. So `legacyNamespaceHits` is the only thing that would, and a one-character change to its matcher would
 * go silent. Each probe below is a refusal-shaped string that must hit (every listed name, in lower and upper case,
 * and as the `<root>.<sub>` form) or must not (`pds3`, a scale name; `prism`, the default root). The probes are built
 * on a reference-shaped object, so a hit must also come back NAMED by its entry, not only found in the text.
 */
export const legacyNamespaceSelfCheck = (): string[] => {
  const broken: string[] = [];
  if (!LEGACY_NAMESPACES.length) broken.push('LEGACY_NAMESPACES is empty');
  const probe = (message: string) => {
    const ref = { agentLink: { commands: [{ name: 'probe', message }] } };
    return legacyNamespaceHits(ref, JSON.stringify(ref));
  };
  for (const ns of LEGACY_NAMESPACES) {
    for (const spelled of [ns, ns.toUpperCase(), `${ns}.color`, `${ns.toUpperCase()}.${ns}`]) {
      const hits = probe(`style-guide: args.tables entries are '<collection> — <root>' titles, e.g. ['Primary — ${spelled}']`);
      if (!hits.some((h) => h.includes('agent-link command probe') && h.toLowerCase().includes(`'${ns}'`)))
        broken.push(`'${spelled}' in a refusal is not reported by name (got ${hits.join(' | ') || 'nothing'})`);
    }
  }
  for (const clean of ['pds3', 'prism', 'prism.color', 'Primary — prism'])
    if (probe(`e.g. ['${clean}']`).length) broken.push(`'${clean}' is reported as a legacy namespace, and must not be`);
  return broken;
};

export const diffByName = (committed: unknown, fresh: unknown): string[] => {
  const a = names(committed);
  const b = names(fresh);
  const out: string[] = [];
  for (const [k, v] of b) if (!a.has(k)) out.push(`in the code, missing from the reference: ${k}`); else if (a.get(k) !== v) out.push(`changed in the code: ${k}`);
  for (const k of a.keys()) if (!b.has(k)) out.push(`in the reference, gone from the code: ${k}`);
  return out;
};

const isMain = process.argv[1] ? resolve(process.argv[1]) === fileURLToPath(import.meta.url) : false;
if (isMain) {
  const target = join(repo, REFERENCE);
  let fresh: string;
  try { fresh = serialize(buildReference()); } catch (e) { console.error(`❌ ${(e as Error).message}`); process.exit(1); }
  const broken = legacyNamespaceSelfCheck();
  if (broken.length) {
    console.error(`❌ the legacy-namespace check is broken — it cannot see what it claims to:`);
    for (const b of broken) console.error(`    ${b}`);
    process.exit(1);
  }
  const legacy = legacyNamespaceHits(JSON.parse(fresh), fresh);
  if (legacy.length) {
    console.error(`❌ the agent reference would ship a legacy brand namespace as an example — change it at the source:`);
    for (const h of legacy) console.error(`    ${h}`);
    process.exit(1);
  }
  if (process.argv.includes('--check')) {
    const committed = existsSync(target) ? readFileSync(target, 'utf8') : '';
    if (committed === fresh) {
      const ref = JSON.parse(fresh);
      const tools = ref.mcp.reduce((n: number, s: { tools: unknown[] }) => n + s.tools.length, 0);
      console.log(`✓ ${REFERENCE} matches the code — ${tools} MCP tools over ${ref.mcp.length} servers, ${ref.agentLink.commands.length} agent-link commands, ${ref.cli.length} CLI entry points`);
      process.exit(0);
    }
    let byName: string[] = [];
    try { byName = diffByName(committed ? JSON.parse(committed) : {}, JSON.parse(fresh)); } catch { byName = ['the committed file is not valid JSON']; }
    console.error(`❌ ${REFERENCE} does not match the code:`);
    for (const d of byName.length ? byName : ['the bytes differ outside any named entry (top-level fields or ordering)']) console.error(`    ${d}`);
    console.error(`\n  Regenerate with \`npx tsx packages/engine/emit-agent-reference.ts\`, then review the diff.`);
    process.exit(1);
  }
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, fresh);
  console.log(`wrote ${rel(target)}`);
}
