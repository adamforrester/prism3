/**
 * Build driver for Style Dictionary 3 with the DTCG parser registered.
 * Run via `node build.js <mode>` or use the npm scripts in package.json.
 *
 * SD 3's CLI can't register parsers from a JSON config alone, so we use
 * the programmatic API: register the parser, then build from sd.<mode>.json.
 */

const path = require('path');
const StyleDictionary = require('style-dictionary');
const dtcgParser = require('./parsers/dtcg-parser');

const mode = process.argv[2];
if (!mode) {
  console.error('Usage: node build.js <mode>');
  console.error('  e.g. node build.js dark');
  process.exit(1);
}

const configPath = path.join(__dirname, `sd.${mode}.json`);

StyleDictionary.registerParser({
  pattern: /\.json$/,
  parse: dtcgParser.parse,
});

const sd = StyleDictionary.extend(configPath);
sd.buildAllPlatforms();
