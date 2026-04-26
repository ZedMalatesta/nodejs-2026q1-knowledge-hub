import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  plugins: [
    swc.vite({
      module: { type: 'es6' },
      jsc: {
        keepClassNames: true,
        parser: {
          syntax: 'typescript',
          decorators: true,
        },
        transform: {
          decoratorMetadata: true,
        },
      },
    }),
  ],
  resolve: {
    alias: {
      src: path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: false,
    setupFiles: ['./src/__tests__/unit/setup.ts'],
    include: ['src/__tests__/unit/**/*.spec.ts', 'src/**/*.unit.spec.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.spec.ts',
        'src/**/*.module.ts',
        'src/main.ts',
        'src/**/*.controller.ts',
        'src/app.service.ts',
        'src/prisma/prisma.service.ts',
        'src/auth/decorators/**',
        'src/**/*.entity.ts',
        'src/const/**',
        'src/logger/**',
        'src/interceptors/**',
        'src/filters/**',
      ],
      thresholds: {
        lines: 90,
        branches: 85,
      },
    },
  },
});
