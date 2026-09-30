/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/',
  build: {
    target: 'es2020',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    reportCompressedSize: true,
  },
  server: { host: true },
  test: {
    include: ['tests/**/*.test.ts'],
    // Tuning sweeps live in tests/tmp (git-ignored); run them with TUNE=1.
    exclude: process.env.TUNE
      ? ['node_modules/**']
      : ['node_modules/**', 'tests/tmp/**', 'tests/e2e/**'],
    environment: 'node',
    testTimeout: 60_000,
  },
});
