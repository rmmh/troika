import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: ['node_modules', 'test/ui'],
    setupFiles: ['./test/yieldToRunner.ts'],
    // Native simulations enforce their own cycle bounds; allow wall-clock
    // headroom when several CPU-heavy firmware scenarios run concurrently.
    testTimeout: 15_000,
  },
});
