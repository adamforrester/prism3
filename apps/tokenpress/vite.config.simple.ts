import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/code.ts',
      name: 'TokenPress',
      fileName: 'code',
      formats: ['iife'],
    },
    rollupOptions: {
      external: ['figma'],
      output: {
        globals: {
          figma: 'figma',
        },
      },
    },
    outDir: 'dist',
    emptyOutDir: false,
  },
});
