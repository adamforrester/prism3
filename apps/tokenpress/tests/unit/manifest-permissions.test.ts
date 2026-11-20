/**
 * prism3 #4121 — TokenPress asks Figma for no permission it does not use.
 *
 * The manifest asked for `currentuser`, which hands the plugin the signed-in user's name, id and photo, and
 * shows on the Community listing. The one read was a null check in `checkFilePermissions()` that guarded
 * nothing: no one opens a file in the editor signed out. Least privilege for a published plugin is to not
 * hold identity data it never uses.
 *
 * The two halves are held together. Without the permission, Figma throws on any read of `figma.currentUser`,
 * so dropping it from the manifest while a read survives in `src/` breaks the export at its first step. The
 * oracle is the permission name and the property name, typed here; neither is read from the manifest or the
 * source under test. The scan's own self-check comes first, so a scan that stopped matching cannot report a
 * clean source.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, test, expect } from '../../test-harness';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const PERMISSION = 'currentuser';
const READ = /\bcurrentUser\b/;

/** The code of a TypeScript file, comments removed, so a comment that names the property is not a read. */
const code = (text: string): string => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

const sources = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return sources(p);
    return /\.(ts|html)$/.test(name) ? [p] : [];
  });

describe('manifest permissions (#4121)', () => {
  test('the scan finds a read of figma.currentUser in code, and not in a comment', () => {
    expect(READ.test(code('const u = figma.currentUser;'))).toBe(true);
    expect(READ.test(code('// figma.currentUser is not read\n/* nor currentUser here */'))).toBe(false);
  });

  test('manifest.json does not ask for the currentuser permission', () => {
    const manifest = JSON.parse(readFileSync(join(ROOT, 'manifest.json'), 'utf8')) as { permissions?: unknown };
    const permissions = manifest.permissions === undefined ? [] : manifest.permissions;
    expect(Array.isArray(permissions)).toBe(true);
    expect((permissions as string[]).map((p) => String(p).toLowerCase())).not.toContain(PERMISSION);
  });

  test('no source file reads figma.currentUser, which throws without the permission', () => {
    const files = sources(join(ROOT, 'src'));
    expect(files.length).toBeGreaterThan(0);
    const readers = files.filter((f) => READ.test(code(readFileSync(f, 'utf8')))).map((f) => relative(ROOT, f));
    expect(readers).toEqual([]);
  });
});
