// @custom-elements-manifest/analyzer's settings (#3408 S4). `packagejson: false` because the analyzer otherwise
// rewrites package.json's `customElements` field to wherever it wrote, which `check-manifest.ts`'s temp-dir run
// would point outside the package. package.json names `./custom-elements.json` by hand.
export default {
  globs: ['p3-button.js'],
  litelement: true,
  packagejson: false,
};
