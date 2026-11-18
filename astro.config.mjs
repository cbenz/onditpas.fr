import { defineConfig } from 'astro/config';

import { redirects } from './src/lib/redirects.ts';

export default defineConfig({
  site: 'https://onditpas.fr',
  output: 'static',
  build: { format: 'directory' },
  // One static document per hand-maintained variant; see src/lib/redirects.ts.
  redirects: { ...redirects },
});
