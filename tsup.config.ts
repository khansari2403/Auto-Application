import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['electron-main.ts', 'preload.ts'],
  format: ['cjs'],
  platform: 'node',
  target: 'node16',
  outDir: 'dist-electron',
  external: [
    'electron',
    'imap',
    'mailparser',
    'better-sqlite3',
    'puppeteer'
  ],
  clean: true,
  watch: true,
  dts: false,
  sourcemap: true,
  minify: false,
});