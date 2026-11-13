/**
 * THE AGENT SIDE OF THE FILE MAILBOX — the short `use_figma` scripts an agent pastes to send a command to the
 * running plugin and read its result back (`tools/figma-mcp/agent-link.ts` prints them; the runbook is
 * `tools/figma-mcp/README.md`).
 *
 * Each script is a few hundred characters of plain Plugin-API JavaScript plus the command's own args — no
 * bundle, no engine code. It only reads and writes the `prism3agent` shared-plugin-data keys on
 * `figma.root`, and it writes exactly ONE of them (`inbox`, on send); every other key belongs to the plugin
 * (`MAILBOX` in `src/agent-protocol.ts` lists who writes what).
 *
 * GENERATED FROM THE PROTOCOL'S CONSTANTS, never hand-typed, so a key name has one spelling. And the text
 * that is printed is the text that is tested: `test-agent-link.ts` runs these exact strings, the way
 * `use_figma` runs them (the body of an async function whose one binding is `figma`), against the same
 * root the plugin's poller reads.
 */
import { AGENT_PROTOCOL_VERSION, MAILBOX } from './src/agent-protocol';
import type { AgentCommand } from './src/agent-protocol';

const J = JSON.stringify;

/** A fresh command id: time-ordered, key-safe. */
export const newCommandId = (now = new Date(), rand = Math.random): string =>
  `a${now.getTime().toString(36)}-${Math.floor(rand() * 36 ** 4).toString(36).padStart(4, '0')}`;

/** The command envelope for `cmd` with `args`. */
export const envelope = (cmd: string, args: unknown, id = newCommandId(), now = new Date()): AgentCommand =>
  ({ v: AGENT_PROTOCOL_VERSION, id, cmd, args: args ?? {}, issuedAt: now.toISOString() });

/** Shared prelude: the namespace, the root, and a JSON reader that never throws. */
const PRELUDE =
  `const NS=${J(MAILBOX.ns)},R=figma.root,raw=k=>R.getSharedPluginData(NS,k),` +
  `get=k=>{try{return JSON.parse(raw(k)||"null")}catch(e){return null}};`;

/** The UTF-8 size the host counts against its per-entry ceiling. */
const BYTES = `const bytes=s=>encodeURIComponent(s).replace(/%[0-9A-F]{2}/g,"_").length;`;

/**
 * SEND: append `c` to the inbox. Entries the plugin has already claimed are dropped from the inbox on the
 * way (the plugin keeps its own claim record, so a dropped entry is never re-run), which keeps the inbox
 * down to what is still waiting. Refuses rather than writes past the per-entry ceiling.
 */
export const sendSnippet = (c: AgentCommand): string =>
  PRELUDE + BYTES +
  `const c=${J(c)};` +
  `const taken=new Set(Array.isArray(get(${J(MAILBOX.claimed)}))?get(${J(MAILBOX.claimed)}):[]);` +
  `const q=(Array.isArray(get(${J(MAILBOX.inbox)}))?get(${J(MAILBOX.inbox)}):[]).filter(e=>e&&!taken.has(e.id)&&e.id!==c.id);` +
  `q.push(c);const s=JSON.stringify(q);` +
  `if(bytes(s)>${MAILBOX.chunkBytes})return{sent:null,error:"inbox full ("+bytes(s)+" bytes, "+q.length+" waiting) — read or wait for the queued commands first"};` +
  `R.setSharedPluginData(NS,${J(MAILBOX.inbox)},s);` +
  `return{sent:c.id,cmd:c.cmd,waiting:q.length,link:get(${J(MAILBOX.link)})};`;

/**
 * READ: the result for `id`, reassembled when chunked. While there is none yet it says where the command
 * is — still queued, claimed and running, or not in the inbox at all — plus the plugin's link record, so
 * "no result yet" and "nobody is listening" read differently. `path` picks one subtree of the result
 * (`result.data.apply.misses`) for results too large to return whole.
 */
export const readSnippet = (id: string, path: string[] = []): string =>
  PRELUDE +
  `const id=${J(id)},path=${J(path)},P=${J(MAILBOX.resultPrefix)};` +
  `const v=raw(P+id);` +
  `if(!v){const q=get(${J(MAILBOX.inbox)}),t=get(${J(MAILBOX.claimed)});` +
  `return{id,pending:true,queued:Array.isArray(q)&&q.some(e=>e&&e.id===id),claimed:Array.isArray(t)&&t.includes(id),link:get(${J(MAILBOX.link)})}}` +
  `let m=JSON.parse(v);` +
  `if(m&&m.chunked){let s="";for(let n=0;n<m.parts;n++){const p=raw(P+id+":"+n);if(!p)return{id,pending:true,chunks:n+"/"+m.parts+" visible"};s+=p}m=JSON.parse(s)}` +
  `for(const k of path)m=m==null?m:m[k];return m;`;

/** LINK: whether the plugin is listening, what it ran last, and what is waiting — without sending. */
export const linkSnippet = (): string =>
  PRELUDE +
  `const q=get(${J(MAILBOX.inbox)});` +
  `return{link:get(${J(MAILBOX.link)}),waiting:Array.isArray(q)?q.map(e=>e&&e.id+" "+e.cmd):q,results:get(${J(MAILBOX.results)})};`;
