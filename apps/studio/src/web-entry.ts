/**
 * THE WEB STUDIO'S ENTRY (#3429). The web builds bundle this file as `dist/main.js`; the plugin bundles `entry.ts`
 * through its own iframe entry, as before.
 *
 * It provides the web's component specs loader FIRST, the way the plugin's iframe entry provides its exporter before
 * the studio evaluates, then boots the studio. Import order is evaluation order.
 */
import './web-component-specs';
import './entry';
