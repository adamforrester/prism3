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
export const SOURCE = (brand) => resolve(here, `../../Prism3/engine/out/${brand}.tokens.json`);

/** Build one brand through a stock Style Dictionary. Returns the emitted CSS as a string. */
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
