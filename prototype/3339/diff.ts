import { contrast, hexToRgb } from '/home/user/prism3/packages/engine/color';
const b = require(process.argv[2]), a = require(process.argv[3]);
const hex = (h: string) => hexToRgb(h.slice(0,7));
const rows: string[] = []; let moved = 0, agOnly = 0;
for (const id of Object.keys(b)) for (const m of Object.keys(b[id])) {
  const B = b[id][m], A = a[id][m];
  for (const k of Object.keys(B)) { if (k.startsWith('__')) continue;
    const x = B[k], y = A[k];
    if (x.against !== y.against && x.path === y.path) { agOnly++; continue; }
    if (x.path === y.path) continue; moved++;
    const sec = B[k.startsWith('inverse.') ? 'inverse.background.secondary' : 'background.secondary'].hex;
    const ter = B[k.startsWith('inverse.') ? 'inverse.background.tertiary' : 'background.tertiary'].hex;
    const short = (p: string) => p.split('.').slice(-2).join('.');
    rows.push(`| ${id} | ${m} | \`${k}\` | ${short(x.path)} \`${x.hex}\` ${x.ratio} on ${x.against} | ${short(y.path)} \`${y.hex}\` ${y.ratio} on ${y.against} | ${contrast(hex(y.hex), hex(sec)).toFixed(2)} / ${contrast(hex(y.hex), hex(ter)).toFixed(2)} |`);
  }
  if (JSON.stringify(B.__warn) !== JSON.stringify(A.__warn)) rows.push(`WARN ${id} ${m} ${JSON.stringify(B.__warn)} -> ${JSON.stringify(A.__warn)}`);
}
console.log(rows.join('\n')); console.log('moved', moved, 'against-only', agOnly);
