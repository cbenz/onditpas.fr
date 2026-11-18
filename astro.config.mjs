import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://onditpas.fr',
  output: 'static',
  build: { format: 'directory' },
});
