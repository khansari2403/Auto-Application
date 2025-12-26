import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['electron-main.ts', 'preload.ts'],
  format: ['cjs'],
  platform: 'node',
  outDir: 'dist-electron',
  external: ['electron'],
  shims: true,
});
