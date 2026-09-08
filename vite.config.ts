/// <reference types="vitest" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    test: {
      globals: true,
      // Use vitest project configs for multi-environment support
      projects: [
        {
          // Frontend tests — jsdom environment
          test: {
            name: 'frontend',
            environment: 'jsdom',
            include: ['src/**/*.test.{ts,tsx}', 'src/**/__tests__/**/*.test.{ts,tsx}'],
            setupFiles: [],
          },
        },
        {
          // Server tests — node environment
          test: {
            name: 'server',
            environment: 'node',
            include: ['server/**/*.test.ts', 'server/**/__tests__/**/*.test.ts'],
            setupFiles: [],
          },
        },
      ],
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      // Proxy API and auth routes to the Express backend in development
      proxy: {
        '/auth': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
  };
});
