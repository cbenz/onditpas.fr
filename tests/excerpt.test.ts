/**
 * Seam S2 — the meta description, derived from a Markdown body.
 *
 * A fiche's `<meta name="description">` is the body with its markup removed and
 * its length capped, because a crawler shows a line and not a page. Cheap to
 * call directly, so the rules are asserted here instead of through two pages.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { excerpt } from '../src/lib/excerpt.ts';

test('the excerpt is the text, with its markup removed', () => {
  assert.equal(
    excerpt('Le **public**, c’est [l’ensemble](https://example.org) des gens.'),
    'Le public, c’est l’ensemble des gens.',
  );
});

test('an image leaves no alt text behind', () => {
  assert.equal(excerpt('![un schéma](https://example.org/a.png) Le reste.'), 'Le reste.');
});

test('a line break becomes one space', () => {
  assert.equal(excerpt('Une ligne\n\net une autre.'), 'Une ligne et une autre.');
});

test('a long body is cut, with an ellipsis, and never past the limit', () => {
  const text = excerpt('mot '.repeat(80), 40);
  assert.equal(text.length, 40);
  assert.ok(text.endsWith('…'), 'the cut is marked');
  assert.ok(!text.endsWith(' …'), 'the ellipsis is not preceded by a space');
});

test('a body shorter than the limit is returned whole', () => {
  assert.equal(excerpt('Court.', 155), 'Court.');
});
