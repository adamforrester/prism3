/**
 * THE CONSUMER BUILD — Style Dictionary configured the way a stranger would configure it.
 *
 * Its entire job is to answer one question: **would someone else's build work?** That makes its value
 * conditional on staying naive. The rule, stated here because the pressure to break it will be
 * constant and will always feel reasonable:
 *
 *   ┌──────────────────────────────────────────────────────────────────────────────────────┐
 *   │  NO CUSTOM CODE. No preprocessors, no custom transforms, no custom formats.          │
 *   │  Standard Style Dictionary CONFIG OPTIONS are permitted. Anything requiring us to     │
 *   │  ship code a consumer must also run is a FAILURE, not a fix.                         │
 *   └──────────────────────────────────────────────────────────────────────────────────────┘
 *
 * That line comes from Token Press's own design goal — *make the export clean enough that a user
 * needs no pile of SD transforms to use it* — and it draws itself in the right place. `outputReferences`
 * is a config flag, so it passes. A preprocessor that teaches Style Dictionary to read
 * `$extensions.prism3.modes` is code every consumer would inherit forever, so it fails.
 *
 * **The moment someone adds a preprocessor here to make the build pass, this file stops being
 * evidence and becomes decoration.** If it fails, the emitter is wrong — see #609.
 *
 * `outputReferences: true` is set deliberately and is NOT a workaround: without it Style Dictionary
 * resolves every alias to a literal, erasing the semantic→primitive relationship that is the point of
 * the token architecture. It is a consumer preference, one line of config, and any real consumer
 * would set it.
 */
import StyleDictionary from 'style-dictionary';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const OUT_DIR = resolve(here, 'build/consumer');
/** Where the engine's emitted trees live — the gate discovers brands from this directory (#635). */
export const OUT_ROOT = resolve(here, '../engine/out');
export const SOURCE = (brand) => resolve(OUT_ROOT, `${brand}.tokens.json`);

/**
 * How an overlay's artifact is named and how a consumer scopes it — the consumer's side of the
 * convention `overlayTag` implements in the engine, re-stated here rather than imported.
 *
 * Same reason as `DTCG_TYPES` in `check-consumability.mjs`: a stranger has the emitted files and the
 * axis names, not our source. Importing the engine's function would make "the file a consumer would
 * look for is the file we wrote" true by construction, which is the one thing this package exists to
 * check independently. The theme axis is unprefixed for back-compatibility with its three original
 * artifacts; every later axis is prefixed so `dark` and `surface-inverse` cannot be confused.
 */
export const overlayTag = (axis, key) => (axis === 'theme' ? key : `${axis}-${key}`);
/** The attribute a consumer puts the axis on. One axis, one attribute — which is what lets two of them
 *  be applied to the same element at once (see `buildComposed`). */
export const axisSelector = (axis, key) => `[data-${axis}="${key}"]`;

/** Build one brand through a stock Style Dictionary. Returns the emitted CSS as a string. */
/** The PROJECTED build (#609): base + one overlay, composed by Style Dictionary's own multi-source
 *  merge. Still stock — two `source` entries and `log.warnings` are config, not code.
 *  `warnings: 'disabled'` silences SD's per-token collision notice, which is SD correctly reporting
 *  that the overlay overrode the base; it is the mechanism working, and 133 lines of it per mode is
 *  noise that would get someone to "fix" the wrong thing.
 *
 *  `axis` defaults to `theme`, so the three original call sites read unchanged; `surface` (#1129) is the
 *  second, and its overlay is sourced and scoped by the two helpers above. */
export const buildProjected = async (brand, key, axis = 'theme') => {
  const tag = key === 'base' ? 'base' : overlayTag(axis, key);
  const sd = new StyleDictionary({
    source: [
      resolve(OUT_ROOT, `${brand}.base.tokens.json`),
      ...(key === 'base' ? [] : [resolve(OUT_ROOT, `${brand}.${tag}.overlay.tokens.json`)]),
    ],
    usesDtcg: true,
    log: { warnings: 'disabled' },
    platforms: {
      css: {
        transformGroup: 'css',
        buildPath: `${OUT_DIR}/${brand}-projected/`,
        files: [{ destination: `${tag}.css`, format: 'css/variables', options: { outputReferences: true, selector: key === 'base' ? ':root' : axisSelector(axis, key) } }],
      },
    },
  });
  await sd.buildAllPlatforms();
  return resolve(OUT_DIR, `${brand}-projected`, `${tag}.css`);
};

/**
 * TWO axes at once: `base + <theme overlay> + <surface overlay>`, under a compound selector.
 *
 * This is the acceptance test for #1129's central claim — that a scoped override is what a DTCG consumer
 * needs, and that two independent axes therefore need two overlays rather than a crossed artifact per
 * combination. It is the same `source` array with one more entry, so it is still config and still stock;
 * the *tool* was never the question. What it demonstrates is a property of the EMISSION: the surface
 * overlay overrides pointer-tier leaves with an appearance-tier NAME, not a colour, so its value is
 * whatever the theme layer beneath it resolved that name to. A surface overlay carrying resolved colours
 * would produce a dark-page inverse band still painted in light-mode colours here, and nothing about the
 * one-axis builds would show it (#1027).
 */
export const buildComposed = async (brand, layers) => {
  const tags = layers.map(({ axis, key }) => overlayTag(axis, key));
  const sd = new StyleDictionary({
    source: [
      resolve(OUT_ROOT, `${brand}.base.tokens.json`),
      ...tags.map((tag) => resolve(OUT_ROOT, `${brand}.${tag}.overlay.tokens.json`)),
    ],
    usesDtcg: true,
    log: { warnings: 'disabled' },
    platforms: {
      css: {
        transformGroup: 'css',
        buildPath: `${OUT_DIR}/${brand}-projected/`,
        files: [{ destination: `${tags.join('+')}.css`, format: 'css/variables', options: { outputReferences: true, selector: layers.map(({ axis, key }) => axisSelector(axis, key)).join('') } }],
      },
    },
  });
  await sd.buildAllPlatforms();
  return resolve(OUT_DIR, `${brand}-projected`, `${tags.join('+')}.css`);
};

export const buildConsumer = async (brand) => {
  const sd = new StyleDictionary({
    source: [SOURCE(brand)],
    // The DTCG switch is not "custom code" — it is how SD 4/5 are told the input is DTCG, and it is
    // why Token Press's SD-compat preset (which exists to serve SD 3.x, where DTCG could not be
    // parsed at all) is largely unnecessary for us. See docs/12 §10g.
    usesDtcg: true,
    platforms: {
      css: {
        transformGroup: 'css',
        buildPath: `${OUT_DIR}/${brand}/`,
        files: [{ destination: 'vars.css', format: 'css/variables', options: { outputReferences: true } }],
      },
    },
  });
  await sd.buildAllPlatforms();
  return resolve(OUT_DIR, brand, 'vars.css');
};
