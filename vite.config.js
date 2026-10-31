import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `npm run build:single` bundles everything into one HTML file (handy for demos).
export default defineConfig(({ mode }) => ({
  base: './', // relative asset paths, so the build works from any folder or subpath
  plugins: mode === 'single' ? [react(), viteSingleFile()] : [react()],
  build: mode === 'single' ? { outDir: 'dist-single' } : {},
}));