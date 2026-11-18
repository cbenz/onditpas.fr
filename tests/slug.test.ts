/**
 * Slug derivation, seen from both sides.
 *
 * Seam S2 — the table of cases on the pure module. Seam S1 — the route the
 * build gives each authored fiche, which must be that same derivation.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { slugify } from '../src/lib/slug.ts';
import { fiches, pageExists } from './helpers.ts';

/** Forme fautive → slug, one row per rule the spec states. */
const CASES: ReadonlyArray<readonly [formeFautive: string, slug: string]> = [
  // Straight apostrophe: removed, the word is glued back together.
  ["aujourd'hui", 'aujourdhui'],
  // Accent: stripped.
  ['déso', 'deso'],
  // Space: removed, not turned into a hyphen.
  ['en vrai', 'envrai'],
  // Hyphen: kept, the word has one.
  ['wi-fi', 'wi-fi'],
  // Already bare: unchanged.
  ['publique', 'publique'],
  ['aujourdhui', 'aujourdhui'],
  // Several spaces and a curly apostrophe, as pasted from a phone.
  ['aujourd’  hui', 'aujourdhui'],
  ['en  vrai', 'envrai'],
  // Accented capital: lowercased and stripped in the same pass.
  ['ÉDITION', 'edition'],
  ['Déso', 'deso'],
];

for (const [formeFautive, expected] of CASES) {
  test(`slugify(${JSON.stringify(formeFautive)}) is ${JSON.stringify(expected)}`, () => {
    assert.equal(slugify(formeFautive), expected);
  });
}

test('accent stripping does not depend on the host locale', () => {
  // Every French accented capital decomposes under NFD and loses its mark.
  assert.equal(slugify('ÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŸ'), 'aaaceeeeiioouuuy');
  // A string already decomposed by the caller is stripped too.
  assert.equal(slugify('de\u0301so'), 'deso');
  assert.equal(slugify('DE\u0301SO'), 'deso');
});

test('deriving twice changes nothing', () => {
  for (const [formeFautive, expected] of CASES) {
    assert.equal(slugify(expected), expected, `${formeFautive} is a fixed point`);
  }
});

test('every authored fiche is reachable at the slug of its forme fautive', () => {
  const authored = fiches();
  assert.ok(authored.length > 0, 'there is at least one fiche');
  for (const fiche of authored) {
    const slug = slugify(fiche.forme_fautive);
    assert.ok(pageExists(`/${slug}/`), `${fiche.file} builds at /${slug}/`);
  }
});
