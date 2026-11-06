/**
 * THE PACKETS (#3440, Q3440.1 A): the exact text each arm's fresh session is sent.
 *
 *   npx tsx tools/agent-adherence/packets.ts           # write packets/C0.md and packets/C1.md from the pin
 *   npx tsx tools/agent-adherence/packets.ts --check   # exit 1 if either committed packet differs from a rebuild
 *
 *   · C0: the task, the house brand's token NAMES (every leaf of the generated tree, with its `$type`), and the task
 *     components' slice of `components.ai.json`: whole entries for the six components the task needs.
 *   · C1: C0, then `skills/prism3-build-ui/SKILL.md` verbatim. The only difference between the arms is the skill, so
 *     C0 against C1 measures the skill (proposal §2: C0 is not "no Prism3").
 *
 * THE SLICE, MEASURED (2c6050fa): the whole `components.ai.json` is 521 KB and the docs tree 628 KB, too big to send.
 * The six entries below are 59.7 KB compact (59,724 bytes; 68.7 KB pretty-printed). `field-label` and `field-message` are in because `text-field` and
 * `password-field` compose with them. `text-field` is the entry whose `composition.planned` lists `date-picker`, so
 * the packet itself says the date picker isn't built (R5's can't-do, proposal §1). The token names are 21.7 KB.
 *
 * This file reads the skill. The scorer never imports it (`independence/reads` in the self-test).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readPinned, BRAND_ROOT, TOKEN_TREE, COMPONENTS, SKILL, sha256 } from './oracle';

const HERE = dirname(fileURLToPath(import.meta.url));
export const PACKET_DIR = resolve(HERE, 'packets');
export const ARMS = ['C0', 'C1'] as const;
export type Arm = (typeof ARMS)[number];
export const SLICE = ['text-field', 'password-field', 'button', 'banner', 'field-label', 'field-message'];

/** The task and the output contract, the same words in both arms. The capture format is `orchestrate.ts`'s. */
export const TASK = `# Task

Build a sign-in card as one self-contained HTML file, using the Prism3 design system described below (the house
brand, namespace \`${BRAND_ROOT}\`).

The card holds:
- an email field
- a password field
- a date-of-birth date picker
- a primary "Sign in" button
- an error banner above the fields, saying the email or password is wrong

## How the tokens reach your page

Every token in the list below is available to the page as a CSS custom property: \`--\` followed by the token's path,
with each \`.\` replaced by \`-\`. For example, \`color.text.primary\` is \`var(--color-text-primary)\`. The values are
supplied when the page is rendered, once for each mode (light, dark, high-contrast light and high-contrast dark), so
don't define them yourself. A typography token is a \`font\` shorthand, and a shadow token is a \`box-shadow\` value.

## How components are marked

There is no component library to import. Build each component in plain HTML and CSS, and mark the element that
renders it with \`data-component="<id>"\`, using the \`id\` from the component entries below. Write each prop you set
as \`data-prop-<prop name>="<value>"\`.

## What to send back

Work only from this message: don't fetch anything, and don't look for other files. Your final message must hold
exactly these two files, each between its markers:

=== FILE: index.html ===
(the whole HTML file)
=== END FILE ===
=== FILE: REPORT.md ===
(a short note: what you built, and anything you could not build as asked)
=== END FILE ===
`;

const leaves = (tree: any): { path: string; type: string }[] => {
  const out: { path: string; type: string }[] = [];
  const walk = (n: any, p: string[]): void => {
    if (!n || typeof n !== 'object') return;
    if (n.$value !== undefined || n.$type !== undefined) { out.push({ path: p.join('.'), type: n.$type ?? '' }); return; }
    for (const [k, v] of Object.entries(n)) if (!k.startsWith('$')) walk(v, [...p, k]);
  };
  walk(tree[BRAND_ROOT], []);
  return out;
};

export const buildPacket = (arm: Arm): string => {
  const tree = JSON.parse(readPinned(TOKEN_TREE, 'packet'));
  const docs = JSON.parse(readPinned(COMPONENTS, 'packet'));
  const names = leaves(tree);
  const slice = { note: docs.note, components: Object.fromEntries(SLICE.map((id) => [id, docs.components[id]])) };
  const parts = [
    TASK,
    `## Tokens (${names.length} names)\n\nEach line is a token path and its type.\n\n\`\`\`\n${names.map((n) => `${n.path} ${n.type}`).join('\n')}\n\`\`\`\n`,
    `## Components (${SLICE.length} entries from components.ai.json)\n\n\`\`\`json\n${JSON.stringify(slice, null, 1)}\n\`\`\`\n`,
  ];
  if (arm === 'C1') parts.push(`## Skill: prism3-build-ui\n\nFollow this skill.\n\n${readPinned(SKILL, 'packet')}`);
  return parts.join('\n');
};

export const packetPath = (arm: Arm): string => resolve(PACKET_DIR, `${arm}.md`);

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const check = process.argv.includes('--check');
  let drift = 0;
  for (const arm of ARMS) {
    const text = buildPacket(arm);
    if (check) {
      const committed = readFileSync(packetPath(arm), 'utf8');
      if (committed !== text) { drift += 1; console.log(`✗ ${arm}: packets/${arm}.md differs from a rebuild at the pin`); }
      else console.log(`✓ ${arm}: ${text.length} chars, sha256 ${sha256(text).slice(0, 12)}`);
    } else {
      writeFileSync(packetPath(arm), text);
      console.log(`${arm}: ${text.length} chars, sha256 ${sha256(text).slice(0, 12)} → packets/${arm}.md`);
    }
  }
  if (drift) process.exit(1);
}
