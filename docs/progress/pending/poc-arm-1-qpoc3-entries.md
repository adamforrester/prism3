## (2026-11-18) — `@prism3/web-components`: one entry per element, and the root registers nothing (Q-POC3 B, #3408)

**What changed.** On the code POC's integration branch `poc/arm-1`, `import '@prism3/web-components'` registers no
element. `<p3-button>`, `<p3-text-field>` and `<p3-password-field>` register from `@prism3/web-components/button`,
`/text-field` and `/password-field`. The old `./p3-*.js` subpaths are gone. The Storybook preview and the README use
the entries. Engine output doesn't move, so there is no change note.

- **`check-entries.ts`** (in `test:browser`) bundles each entry alone through the exports map and records
  `customElements.define` in Chromium. The root must register nothing and each entry exactly its own element, and a
  consumer must resolve each entry to its file. Four mutants fail by name.
