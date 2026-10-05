import { defineConfig } from 'vitest/config';
import { WxtVitest } from 'wxt/testing/vitest-plugin';

export default defineConfig({
  // Gives the tests WXT's aliases and an in-memory `browser`.
  plugins: [WxtVitest()],
  test: {
    environment: 'happy-dom',
    setupFiles: ['test/setup.ts'],
    restoreMocks: true,
  },
});
