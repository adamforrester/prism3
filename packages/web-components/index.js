/**
 * @prism3/web-components — the package root (#3408, owner decision Q-POC3 B). It registers no custom element and
 * exports nothing. Each element registers from its own entry, so a page defines only what it imports:
 *
 *   import '@prism3/web-components/button';          // <p3-button>
 *   import '@prism3/web-components/text-field';      // <p3-text-field>
 *   import '@prism3/web-components/password-field';  // <p3-password-field>
 *
 * `check-entries.ts` fails by name if this file, or an entry, registers anything else.
 */
export {};
