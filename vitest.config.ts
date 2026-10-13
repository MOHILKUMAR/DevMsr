import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // Astro's virtual module; component tests mock it with vi.mock.
    alias: { 'astro:actions': fileURLToPath(new URL('./tests/unit/stubs/astro-actions.ts', import.meta.url)) },
  },
  test: {
    include: ['tests/unit/**/*.test.ts', 'tests/unit/**/*.test.tsx', 'tests/db/**/*.test.ts'],
    environment: 'node',
    testTimeout: 60_000,
    hookTimeout: 120_000,
  },
});
