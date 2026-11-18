/**
 * Seam S2 — the shouting registre, as a pure function.
 *
 * The generated title is the only thing that changes between the two registres,
 * so it is worth a table: both templates, the authored override, the typography
 * of French punctuation, and the fallbacks that keep an empty field from
 * silencing the page.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { bordelTitle, registreLabel } from '../src/lib/registre.ts';

/** A non-breaking space, as French typography requires before `!`. */
const NBSP = '\u00a0';

const CASES: Array<{
  name: string;
  input: { formeFautive: string; formeCorrecte?: string; bordel?: string };
  expected: string;
}> = [
  {
    name: 'forme correcte present: the substitution is shouted',
    input: { formeFautive: 'publique', formeCorrecte: 'public' },
    expected: `ON DIT PUBLIC, PAS PUBLIQUE, BORDEL${NBSP}!`,
  },
  {
    name: 'no forme correcte: the fiche shouts that there is nothing instead',
    input: { formeFautive: 'wesh' },
    expected: `ON DIT PAS WESH, BORDEL${NBSP}!`,
  },
  {
    name: 'an authored bordel overrides both templates',
    input: { formeFautive: 'publique', formeCorrecte: 'public', bordel: 'TA GUEULE, ON DIT PUBLIC.' },
    expected: 'TA GUEULE, ON DIT PUBLIC.',
  },
  {
    name: 'an authored bordel wins even without a forme correcte',
    input: { formeFautive: 'wesh', bordel: 'WESH, BORDEL.' },
    expected: 'WESH, BORDEL.',
  },
  {
    name: 'an authored bordel block scalar loses its surrounding whitespace',
    input: { formeFautive: 'publique', formeCorrecte: 'public', bordel: '\n  ON DIT PUBLIC.\n' },
    expected: 'ON DIT PUBLIC.',
  },
  {
    name: 'accents survive the shouting',
    input: { formeFautive: 'déso', formeCorrecte: 'désolé' },
    expected: `ON DIT DÉSOLÉ, PAS DÉSO, BORDEL${NBSP}!`,
  },
  {
    name: 'typographic apostrophes survive the shouting',
    input: { formeFautive: 'aujourd’hui', formeCorrecte: 'aujourd’hui' },
    expected: `ON DIT AUJOURD’HUI, PAS AUJOURD’HUI, BORDEL${NBSP}!`,
  },
  {
    name: 'hyphens are kept',
    input: { formeFautive: 'wi-fi', formeCorrecte: 'wifi' },
    expected: `ON DIT WIFI, PAS WI-FI, BORDEL${NBSP}!`,
  },
  {
    name: 'an empty authored bordel falls through to the template',
    input: { formeFautive: 'publique', formeCorrecte: 'public', bordel: '' },
    expected: `ON DIT PUBLIC, PAS PUBLIQUE, BORDEL${NBSP}!`,
  },
  {
    name: 'a blank authored bordel falls through to the template',
    input: { formeFautive: 'wesh', bordel: '   \n\t ' },
    expected: `ON DIT PAS WESH, BORDEL${NBSP}!`,
  },
  {
    name: 'an empty forme correcte is treated as absent',
    input: { formeFautive: 'wesh', formeCorrecte: '  ' },
    expected: `ON DIT PAS WESH, BORDEL${NBSP}!`,
  },
];

for (const { name, input, expected } of CASES) {
  test(`bordelTitle: ${name}`, () => {
    assert.equal(bordelTitle(input), expected);
  });
}

test('registreLabel: the correction line is labelled in the registre of the page', () => {
  assert.equal(registreLabel('deadpan'), 'On dit');
  assert.equal(registreLabel('bordel'), 'Bordel');
});

test('bordelTitle: French typography, no double spaces', () => {
  for (const { input } of CASES) {
    const output = bordelTitle(input);
    assert.ok(!/ {2,}/.test(output), `${JSON.stringify(output)} has a double space`);
    assert.ok(!/\u00a0\u00a0/.test(output), `${JSON.stringify(output)} has a double nbsp`);
    // No plain space before a French punctuation mark: `!`, `?`, `:`, `;`.
    assert.ok(!/ [!,?;:]/.test(output), `${JSON.stringify(output)} spaces punctuation`);
  }
});

test('bordelTitle: the shout ends on a non-breaking space before the bang', () => {
  assert.ok(bordelTitle({ formeFautive: 'wesh' }).endsWith(`BORDEL${NBSP}!`));
  assert.ok(bordelTitle({ formeFautive: 'publique', formeCorrecte: 'public' }).endsWith(
    `BORDEL${NBSP}!`,
  ));
});
