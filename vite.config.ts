import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [sveltekit()],
  // Phaser is isolated behind the lazily loaded settlement/sea screens. Its
  // minified engine chunk is ~1.2 MB (~319 KB gzip), so keep the warning gate
  // above that deliberate vendor boundary while watching first-load chunks.
  build: { chunkSizeWarningLimit: 1250 },
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
        statements: 72,
        branches: 58,
        functions: 78,
        lines: 77
      }
    }
  }
});
