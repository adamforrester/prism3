import { describe, it, expect } from '../../test-harness';
import { createAliasReference, sanitizeNamespace } from '../../src/utils/token-name-utils';

// Reproduces the exact shape of the user's namespaced export: tokens wrapped
// under an "nbds" root key, with aliases pointing at other tokens.
describe('namespaced export: aliases resolve end-to-end', () => {
  const NS = 'nbds';

  // Build a file the way the exporter does: convert tokens (emitting aliases),
  // then wrap the whole tree under the namespace.
  function buildFile(vars: Array<{ name: string; alias?: string }>) {
    const tokens: any = {};
    for (const v of vars) {
      const path = v.name.split('/');
      let cur = tokens;
      for (let i = 0; i < path.length - 1; i++) {
        cur[path[i]] = cur[path[i]] || {};
        cur = cur[path[i]];
      }
      cur[path[path.length - 1]] = {
        $type: 'color',
        $value: v.alias ? createAliasReference(v.alias, 'preserve', NS) : '#fff',
      };
    }
    return { [NS]: tokens };
  }

  function resolve(tree: any, ref: string): boolean {
    const path = ref.replace(/^\{|\}$/g, '').split('.');
    let cur = tree;
    for (const seg of path) {
      if (!cur || typeof cur !== 'object' || !Object.prototype.hasOwnProperty.call(cur, seg)) {
        return false;
      }
      cur = cur[seg];
    }
    return !!(cur && typeof cur === 'object' && '$value' in cur);
  }

  function allRefs(o: any, acc: string[] = []): string[] {
    if (!o || typeof o !== 'object') return acc;
    for (const k of Object.keys(o)) {
      if (k === '$value' && typeof o[k] === 'string' && /^\{.+\}$/.test(o[k])) acc.push(o[k]);
      else if (!k.startsWith('$')) allRefs(o[k], acc);
    }
    return acc;
  }

  it('every alias in a namespaced file resolves to a real token', () => {
    const file = buildFile([
      { name: 'palette/neutral/950' },
      { name: 'font/weight/400' },
      { name: 'color/onSuccessContainer', alias: 'palette/neutral/950' },
      { name: 'color/bg', alias: 'palette/neutral/950' },
      { name: 'typography/body/weight', alias: 'font/weight/400' },
    ]);

    const refs = allRefs(file);
    expect(refs.length).toBe(3);
    const broken = refs.filter(r => !resolve(file, r));
    expect(broken).toEqual([]);
  });

  it('camelCase survives inside a namespaced alias', () => {
    const file = buildFile([
      { name: 'palette/onSurfaceVariant' },
      { name: 'color/fg', alias: 'palette/onSurfaceVariant' },
    ]);
    expect(allRefs(file)).toEqual(['{nbds.palette.onSurfaceVariant}']);
    expect(resolve(file, '{nbds.palette.onSurfaceVariant}')).toBe(true);
  });

  it('un-namespaced exports still resolve (no regression)', () => {
    const tokens: any = {
      palette: { blue: { $type: 'color', $value: '#00f' } },
      color: { bg: { $type: 'color', $value: createAliasReference('palette/blue', 'preserve') } },
    };
    expect(allRefs(tokens)).toEqual(['{palette.blue}']);
    expect(resolve(tokens, '{palette.blue}')).toBe(true);
  });

  // The namespace comes from a free-text UI input. Because it is simultaneously
  // a root key and a leading alias segment, a character that is structural in
  // DTCG desyncs the two sides and Style Dictionary reports an unresolvable
  // reference. Both sides now run the raw value through sanitizeNamespace.
  describe('hostile namespace values stay resolvable', () => {
    const cases: Array<[string, string]> = [
      ['a.b', 'a-b'], // "." is the DTCG path separator
      ['nbds/core', 'nbds-core'], // "/" is this module's group separator
      ['{x}', 'x'], // braces are the alias delimiters
      ['$brand', 'brand'], // leading "$" is reserved for spec properties
      ['My Brand', 'My-Brand'], // spaces collapse, casing is left alone
      ['--nbds--', 'nbds'], // leading/trailing separators trimmed
    ];

    it.each(cases)('sanitizes %j to %j', (raw, expected) => {
      expect(sanitizeNamespace(raw)).toBe(expected);
    });

    it.each(cases)('aliases resolve through a %j wrapper', raw => {
      // Build the file with the SAME sanitized key the exporter's wrapper uses.
      const ns = sanitizeNamespace(raw);
      const file: any = {
        [ns]: {
          palette: { blue: { $type: 'color', $value: '#00f' } },
          color: {
            bg: { $type: 'color', $value: createAliasReference('palette/blue', 'preserve', raw) },
          },
        },
      };

      const refs = allRefs(file);
      expect(refs.length).toBe(1);
      expect(refs.filter(r => !resolve(file, r))).toEqual([]);
    });

    it('returns empty when nothing legal survives, disabling the wrapper', () => {
      // An all-punctuation namespace must not produce an unaddressable "" root
      // key; falling back to no namespace is the safe outcome.
      expect(sanitizeNamespace('...')).toBe('');
      expect(sanitizeNamespace('$$$')).toBe('');
      expect(createAliasReference('palette/blue', 'preserve', '...')).toBe('{palette.blue}');
    });

    it('is idempotent, so re-sanitizing an already-clean value is safe', () => {
      for (const [raw] of cases) {
        const once = sanitizeNamespace(raw);
        expect(sanitizeNamespace(once)).toBe(once);
      }
    });
  });
});
