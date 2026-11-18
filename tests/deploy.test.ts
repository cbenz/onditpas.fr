/**
 * Seam S1 — the host configuration.
 *
 * The site is static: the host only has to run the build this repository runs
 * and serve the directory it produces. These tests read the committed
 * `vercel.json` and `.nvmrc` and compare them with `package.json` and with what
 * the build actually emitted, so a drift between the config and the build
 * fails here instead of on the first deployment.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

import { DIST, ROOT, pageExists } from './helpers.ts';

const vercel = JSON.parse(readFileSync(join(ROOT, 'vercel.json'), 'utf8')) as Record<
  string,
  unknown
>;
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as {
  engines?: { node?: string };
  scripts?: Record<string, string>;
};

test('the host builds the site with the build script the repository runs', () => {
  assert.equal(vercel.framework, 'astro');
  assert.equal(vercel.buildCommand, 'npm run build');
  assert.equal(pkg.scripts?.build, 'astro build', 'package.json build is the Astro build');
});

test('the host serves the directory the build produces', () => {
  assert.equal(vercel.outputDirectory, 'dist');
  assert.equal(join(ROOT, vercel.outputDirectory as string), DIST, 'that is the built output');
  assert.ok(existsSync(DIST), 'the build emitted that directory');
  assert.ok(pageExists('/publique/'), 'it holds the built pages, under their slug path');
});

test('the host serves extensionless URLs', () => {
  assert.equal(vercel.cleanUrls, true);
});

test('the host configuration is valid JSON with a schema for editors', () => {
  assert.match(String(vercel.$schema), /^https:\/\/openapi\.vercel\.sh\/vercel\.json$/);
});

test('.nvmrc pins a Node version the engines constraint allows', () => {
  const nvmrc = readFileSync(join(ROOT, '.nvmrc'), 'utf8').trim().replace(/^v/, '');
  assert.match(nvmrc, /^\d+(\.\d+){0,2}$/, '.nvmrc holds a Node version, not a comment');

  const engines = /(\d+)/.exec(pkg.engines?.node ?? '');
  assert.ok(engines, 'package.json declares a Node floor');
  assert.ok(
    Number(nvmrc.split('.')[0]) >= Number(engines[1]),
    `.nvmrc (${nvmrc}) satisfies engines.node (${pkg.engines?.node})`,
  );
});
