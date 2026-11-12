import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Permite rodar em subpastas como https://usuario.github.io/repositorio/
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // @ts-expect-error vitest types
  test: {
    globals: true,
    environment: 'node',
  },
});
