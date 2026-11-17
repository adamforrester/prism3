/**
 * Token helpers the @prism3/css generators share (#3408 S2, S3): a token path's CSS custom property, a DTCG leaf, and
 * a label style's tracking. Moved here from `generate.ts` in S3, unchanged, so the button and the fields read the
 * tree the same way.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const tree = JSON.parse(readFileSync(resolve(HERE, '../engine/out/prism3.tokens.json'), 'utf8'));
export const TOKEN_ROOT = Object.keys(tree).filter((k) => !k.startsWith('$'))[0];

/** A token path's CSS custom property, as stock Style Dictionary names it: the tree's root first, each `.` a `-`. */
export const v = (token: string) => `var(--${TOKEN_ROOT}-${token.replace(/\./g, '-')})`;
export const leaf = (token: string): any => token.split('.').reduce((n: any, k) => n?.[k], tree[TOKEN_ROOT]);
export const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

// Tracking (Q143 A): the `font` shorthand can't carry it (#3507), so it's bound on its own, from the token the label
// style's own `letterSpacing` aliases. Since CONTRACT_VERSION 15.0.0 that token is a `number`, a fraction of the font
// size, so the CSS scales it by 1em; a dimension or a literal is refused rather than guessed at.
export const tracking = (style: string, l: any): string => {
  const ref = l.$value?.letterSpacing;
  const m = typeof ref === 'string' && ref.match(/^\{([^}]+)\}$/);
  if (!m) throw new Error(`${style}: letterSpacing ${JSON.stringify(ref)} is not a token reference`);
  const path = m[1].replace(new RegExp(`^${TOKEN_ROOT}\\.`), '');
  // A DTCG $type may sit on the leaf or be inherited from a group above it.
  let n: any = tree[TOKEN_ROOT], type: string | undefined = n?.$type;
  for (const k of path.split('.')) { n = n?.[k]; if (n?.$type) type = n.$type; }
  if (n?.$value === undefined) type = undefined;
  if (type !== 'number') throw new Error(`${style}: letterSpacing ${path} is a ${type ?? 'missing token'}, not a number`);
  return `calc(${v(path)} * 1em)`;
};

/** A typography token's three declarations: the `font` shorthand, and the decoration and tracking it drops (#3507). */
export const typeDecls = (style: string): [string, string][] => {
  const l = leaf(style);
  if (!l || l.$type !== 'typography') throw new Error(`${style} is not a typography token`);
  return [['font', v(style)], ['text-decoration-line', l.$value?.textDecoration ?? 'none'], ['letter-spacing', tracking(style, l)]];
};

export type Rule = { sel: string; decls: [string, string][]; note?: string };
export const fmt = (r: Rule, indent: string) =>
  `${r.note ? `${indent}/* ${r.note} */\n` : ''}${indent}${r.sel} {\n${r.decls.map(([p, x]) => `${indent}  ${p}: ${x};`).join('\n')}\n${indent}}`;
