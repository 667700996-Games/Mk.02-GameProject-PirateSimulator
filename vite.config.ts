import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      reporter: ['text', 'html'],
      include: [
        'src/lib/domain/**/*.ts',
        'src/lib/persistence/**/*.ts',
        'src/lib/settlement/**/*.ts'
      ],
      exclude: ['src/**/*.test.ts', 'src/lib/settlement/catalog.ts'],
      thresholds: {
        statements: 55,
        branches: 42,
        functions: 58,
        lines: 58
      }
    }
  }
});
