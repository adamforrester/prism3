/**
 * Every story loads the shipped CSS the way a client does: the token CSS from `@prism3/tokens`, then each
 * component's stylesheet (and the password field's script) from `@prism3/css`, then the elements from
 * `@prism3/web-components`. A component added later adds its stylesheet import here.
 */
import { html } from 'lit';
import { setCustomElementsManifest } from '@storybook/web-components-vite';
import manifest from '@prism3/web-components/custom-elements.json';
import '@prism3/tokens/prism3.css';
import '@prism3/css/button.css';
import '@prism3/css/field-label.css';
import '@prism3/css/field-message.css';
import '@prism3/css/text-field.css';
import '@prism3/css/password-field.css';
// The HTML password field's Show/Hide behavior, the script a client page loads; it stands aside inside an upgraded
// <p3-password-field>.
import '@prism3/css/password-field.js';
// The package's root entry registers <p3-button> only, so each field element is imported by its own module.
import '@prism3/web-components';
import '@prism3/web-components/p3-text-field.js';
import '@prism3/web-components/p3-password-field.js';

// The element stories' controls and docs come from the analyzer's manifest, not from a list written here.
setCustomElementsManifest(manifest);

/** The ground a story sits on: the theme from the toolbar, and the inverse band for a story whose surface is inverse. */
const frame = (story, { globals, parameters }) => {
  const inverse = parameters.surface === 'inverse';
  const style = inverse
    ? 'background: var(--pds3-color-inverse-background-primary); color: var(--pds3-color-inverse-text-primary); padding: var(--pds3-space-400);'
    : 'background: var(--pds3-color-background-primary); color: var(--pds3-color-text-primary); padding: var(--pds3-space-400);';
  return html`<div data-theme=${globals.theme} data-story-frame style=${style}>${story()}</div>`;
};

export default {
  globalTypes: {
    theme: {
      description: 'Theme',
      toolbar: { title: 'Theme', items: ['light', 'dark'], dynamicTitle: true },
    },
  },
  initialGlobals: { theme: 'light' },
  decorators: [frame],
  parameters: { layout: 'fullscreen' },
};
