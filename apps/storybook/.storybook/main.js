/**
 * The arm 1 Storybook (#3408 S5, thin; Q-POC1 A): Storybook 10 on `@storybook/web-components-vite`.
 *
 * Stories live under `stories/<component>/`, one file per delivery form (`*.element.stories.js` for the custom
 * element, `*.html.stories.js` for plain HTML and CSS), so a component added later (text-field, password-field
 * after S3) is a new folder and nothing here changes. `addon-a11y` and `addon-vitest` come in S5 proper.
 */
import { createRequire } from 'node:module';
import { dirname } from 'node:path';

// npm hoists `storybook` to the repo root but keeps the framework under this workspace, so the core can't find it
// by name. Each package is passed by its resolved folder, Storybook's own pattern for a monorepo.
const require = createRequire(import.meta.url);
const at = (name) => dirname(require.resolve(`${name}/package.json`));

export default {
  stories: ['../stories/**/*.stories.js'],
  framework: { name: at('@storybook/web-components-vite'), options: {} },
  // Hover, pressed and focus-visible stories force their pseudo-class through this addon's `pseudo` parameter.
  addons: [at('storybook-addon-pseudo-states')],
  core: { disableTelemetry: true, disableWhatsNewNotifications: true },
};
