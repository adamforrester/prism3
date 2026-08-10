import { defineConfig } from 'vite';
import { resolve } from 'path';
import { readFileSync } from 'fs';

// Stamp the runtime build with package.json version so $extensions.generator.version
// in exported DTCG files reflects the real plugin version.
const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'));

export default defineConfig({
  define: {
    __PLUGIN_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    rollupOptions: {
      input: {
        code: resolve(__dirname, 'src/code.ts'),
        // Note: UI is in src/ui.html with inline JavaScript
      },
      output: [
        {
          entryFileNames: '[name].js',
          chunkFileNames: '[name].js',
          assetFileNames: '[name].[ext]',
          // Enable tree-shaking
          manualChunks: undefined,
          // Inject setImmediate polyfill at the start of the bundle (before any code runs)
          intro:
            'var setImmediate = setImmediate || function(fn) { var args = Array.prototype.slice.call(arguments, 1); return setTimeout(function() { fn.apply(null, args); }, 0); };',
        },
      ],
      // Tree-shaking optimization. tryCatchDeoptimization removed in Vite 8 /
      // rolldown 1.x — the flag's behavior is now the default.
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
      },
    },
    target: 'es2018',
    outDir: 'dist',
    emptyOutDir: true,
    // Minification disabled - esbuild doesn't strictly respect ES2018
    // TODO: Explore terser for ES2018-compliant minification
    minify: false,
    sourcemap: false,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.{ts,js}'],
    exclude: ['tests/sd/**/*', 'tests/sd-per-mode/**/*'], // Exclude SD verification harnesses (own deps + outputs)
  },
});
