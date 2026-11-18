/**
 * Redirects — the table, and what the build makes of it.
 *
 * Seam S2 — the hand-maintained table itself. Seam S1 — every configured
 * redirect must exist in `dist/` as a static document naming its destination,
 * so that a wrong form typed in a message still lands on the right fiche.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { redirects } from '../src/lib/redirects.ts';
import { htmlText, pageExists, readPage } from './helpers.ts';

const ENTRIES = Object.entries(redirects);

/** Compare two site paths, tolerating a trailing slash. */
function samePath(a: string, b: string): boolean {
  return a.replace(/\/+$/, '') === b.replace(/\/+$/, '');
}

test('the table is well formed', () => {
  assert.ok(ENTRIES.length > 0, 'the table is not empty');
  const seen = new Set<string>();
  for (const [from, to] of ENTRIES) {
    assert.match(from, /^\/[^/]/, `${from} is an absolute site path`);
    assert.match(to, /^\/[^/]/, `${to} is an absolute site path`);
    assert.ok(!samePath(from, to), `${from} does not redirect to itself`);
    assert.ok(!seen.has(from.toLowerCase()), `${from} appears once`);
    seen.add(from.toLowerCase());
  }
});

test('a forme correcte points at the fiche about the forme fautive', () => {
  assert.equal(redirects['/numerique'], '/digital');
  assert.equal(redirects['/public'], '/publique');
});

test('the spec’s own URLs reach the fiches they name', () => {
  // Both are written in the spec as the *fautive* form, and their derivation
  // removes the hyphens: a link copied from the spec must not fall through to
  // the generated fiche.
  assert.equal(redirects['/force-a-toi'], '/forceatoi');
  assert.equal(redirects['/en-vrai'], '/envrai');
});

test('obvious variants of an existing fiche point at that fiche', () => {
  // `publique` is the only authored fiche today; every variant of it must
  // reach /publique and none of them may be a second page of its own.
  const variants = ENTRIES.filter(([, to]) => samePath(to, '/publique'));
  assert.ok(
    variants.some(([from]) => !samePath(from, '/public')),
    'at least one typographic variant besides the forme correcte',
  );
});

for (const [from, to] of ENTRIES) {
  test(`${from} redirects to ${to} in the build output`, () => {
    assert.ok(pageExists(from), `${from} is emitted as a document`);
    const html = readPage(from);

    const refresh = /<meta\b[^>]*?http-equiv\s*=\s*"refresh"[^>]*?content\s*=\s*"([^"]*)"/i.exec(html);
    assert.ok(refresh, `${from} carries a meta refresh`);
    const url = /url\s*=\s*(.+)$/i.exec(refresh[1] ?? '')?.[1]?.trim();
    assert.ok(url, `${from} names a destination`);
    assert.ok(samePath(url, to), `${from} refreshes to ${to}, not ${url}`);

    assert.ok(
      htmlText(html).includes(to) || html.includes(`href="${to}`),
      `${from} names ${to} in its body`,
    );
  });
}
