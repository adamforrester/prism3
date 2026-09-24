/**
 * MAINTAINER PROSE STAYS OUT OF THE PLUGIN BUNDLE (#1623 sign-off, C1/X-4).
 *
 * A component def carries two maintainer-only channels beside its shipped metadata: `notes` (field
 * research, contested calls, history) and `anatomy.codeOnly` (what Figma cannot carry, and why). The
 * owner ruled both maintainer-only. They stay beside the def in source, where they are about the thing
 * they describe, and this esbuild plugin removes them on the way into `dist/`:
 *
 *   • `notes: { … }` — the property is dropped.
 *   • `codeOnly: [ … ]` — each entry is cut to its SUBJECT, the leading term before the first
 *     ` — ` / `: ` / ` (` / `, ` / `. `. The list is kept, not dropped: the projector copies it onto
 *     every plan (`plan.codeOnly`, whose length the paste script reports), and `figmaPropertyErrors`
 *     reads an entry's LEADING term as the admission for an axis or state Figma does not carry. A
 *     subject keeps both. Cutting at a delimiter can only make an admission easier to find, never
 *     harder, and the source def — not this bundle — is what `test.ts` validates.
 *   • Comments in the def files are dropped too (printer `removeComments`). esbuild keeps comments
 *     that sit inside an expression, and every def is one expression, so without this the def files'
 *     maintainer commentary reached `dist/` verbatim.
 *
 * Scope is `packages/engine/components/*.ts` minus `index.ts` (the registry, which holds no prose).
 * The check that this worked is NOT here: `lint-bundle-prose.ts` reads the built bundle and the real
 * defs independently, so a transform that silently did nothing fails there by name.
 */
import ts from 'typescript';
import { readFile } from 'node:fs/promises';

// esbuild filters are Go regular expressions (no lookahead), so `index.ts` is excluded in the callback.
const DEF_FILE = /[\\/]packages[\\/]engine[\\/]components[\\/][^\\/]+\.ts$/;
const REGISTRY = /[\\/]index\.ts$/;
const DELIMS = [' — ', ': ', ' (', ', ', '. '];

/** The leading term of a `codeOnly` entry — everything before the first delimiter. */
export const codeOnlySubject = (entry) => {
  const t = entry.trim();
  const cut = Math.min(...DELIMS.map((d) => t.indexOf(d)).filter((i) => i > 0), t.length);
  return t.slice(0, cut);
};

const nameOf = (p) => (p.name && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) ? p.name.text : undefined);

/** A string-valued expression folded to its text, or `undefined` when it is not a constant string. */
const constString = (e) => {
  if (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) return e.text;
  if (ts.isParenthesizedExpression(e)) return constString(e.expression);
  if (ts.isBinaryExpression(e) && e.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    const l = constString(e.left); const r = constString(e.right);
    return l !== undefined && r !== undefined ? l + r : undefined;
  }
  return undefined;
};

export const stripMaintainerProse = (source, fileName) => {
  const sf = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  let notes = 0; let entries = 0;
  const transformer = (ctx) => {
    const visit = (node) => {
      if (ts.isObjectLiteralExpression(node)) {
        const props = [];
        for (const p of node.properties) {
          const n = ts.isPropertyAssignment(p) ? nameOf(p) : undefined;
          if (n === 'notes') { notes++; continue; }
          if (n === 'codeOnly' && ts.isArrayLiteralExpression(p.initializer)) {
            const subjects = p.initializer.elements.map((el) => {
              const text = constString(el);
              if (text === undefined) throw new Error(`${fileName}: a codeOnly entry is not a constant string, so it cannot be cut to its subject — write it as a string literal`);
              entries++;
              return ts.factory.createStringLiteral(codeOnlySubject(text));
            });
            props.push(ts.factory.updatePropertyAssignment(p, p.name, ts.factory.createArrayLiteralExpression(subjects, true)));
            continue;
          }
          props.push(ts.visitNode(p, visit));
        }
        return ts.factory.updateObjectLiteralExpression(node, props);
      }
      return ts.visitEachChild(node, visit, ctx);
    };
    return (root) => ts.visitNode(root, visit);
  };
  const out = ts.transform(sf, [transformer]);
  const printed = ts.createPrinter({ removeComments: true }).printFile(out.transformed[0]);
  out.dispose();
  return { code: printed, notes, entries };
};

/** The esbuild plugin both plugin bundles use. */
export const maintainerProsePlugin = {
  name: 'strip-maintainer-prose',
  setup(b) {
    b.onLoad({ filter: DEF_FILE }, async (args) => {
      if (REGISTRY.test(args.path)) return undefined;
      const src = await readFile(args.path, 'utf8');
      return { contents: stripMaintainerProse(src, args.path).code, loader: 'ts' };
    });
  },
};
