/**
 * Seam S2 — how a source URL is shown.
 *
 * A source line has to stay one line, so the reader is shown the host and the
 * full URL travels in the link's `title`. Anything that is not a URL is shown
 * as it was written rather than blanked out.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { hostOf } from '../src/lib/host.ts';

test('the host of a URL is what the line shows', () => {
  assert.equal(hostOf('https://www.larousse.fr/dictionnaires/francais/public/65173'), 'www.larousse.fr');
  assert.equal(hostOf('https://fr.wiktionary.org/wiki/d%C3%A9so'), 'fr.wiktionary.org');
});

test('something that is not a URL is shown as written', () => {
  assert.equal(hostOf('voir le dictionnaire'), 'voir le dictionnaire');
  assert.equal(hostOf(''), '');
});
