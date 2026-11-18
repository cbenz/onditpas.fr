/**
 * Seam S2 — the proposal, as a pure value.
 *
 * A contribution produces a Markdown file and the GitHub new-file URL that
 * carries it. Both are computed here, away from the page, so that the rules the
 * content schema enforces can be asserted directly instead of through one
 * fixture fiche per branch.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildProposal,
  buildFiche,
  editUrl,
  InvalidProposal,
  NEW_FILE_BASE,
} from '../src/lib/proposal.ts';

const NEW_FILE = 'https://github.com/cbenz/onditpas.fr/new/main/src/content/fiches';

/** The query of a pre-filled new-file form, without the encoding. */
function query(url: string): URLSearchParams {
  return new URL(url).searchParams;
}

/** A proposal with a correct form and a source: the nominal branch. */
const CORRECT = {
  formeFautive: 'publique',
  formeCorrecte: 'public',
  sources: ['https://www.larousse.fr/dictionnaires/francais/public/65173'],
  body: 'Le public, c’est l’ensemble des gens.',
};

test('a proposal becomes the Markdown file the site reads back', () => {
  const proposal = buildProposal(CORRECT);
  assert.equal(proposal.filename, 'publique.md');
  assert.equal(
    proposal.markdown,
    [
      '---',
      'forme_fautive: "publique"',
      'forme_correcte: "public"',
      'sources:',
      '  - "https://www.larousse.fr/dictionnaires/francais/public/65173"',
      '---',
      '',
      'Le public, c’est l’ensemble des gens.',
      '',
    ].join('\n'),
  );
});

test('the filename is the slug of the forme fautive, with .md appended', () => {
  const cases: ReadonlyArray<readonly [string, string]> = [
    ['publique', 'publique.md'],
    ['déso', 'deso.md'],
    ["aujourd'hui", 'aujourdhui.md'],
    ['en vrai', 'envrai.md'],
    ['wi-fi', 'wi-fi.md'],
  ];
  for (const [formeFautive, filename] of cases) {
    const { filename: actual } = buildProposal({ ...CORRECT, formeFautive, sources: CORRECT.sources });
    assert.equal(actual, filename, `the file for ${JSON.stringify(formeFautive)} is ${filename}`);
  }
});

test('the file quotes the frontmatter, so an apostrophe or a colon cannot break it', () => {
  const markdown = buildFiche({
    ...CORRECT,
    formeFautive: "aujourd'hui",
    formeCorrecte: 'aujourd’hui : le jour même',
  });
  assert.match(markdown, /^forme_fautive: "aujourd'hui"$/m);
  assert.match(markdown, /^forme_correcte: "aujourd’hui : le jour même"$/m);
});

test('submitting opens GitHub’s new-file form, pre-filled, ready for a one-click pull request', () => {
  const proposal = buildProposal({ ...CORRECT, formeFautive: 'déso' });
  assert.equal(`${new URL(proposal.url).origin}${new URL(proposal.url).pathname}`, NEW_FILE);

  const params = query(proposal.url);
  assert.equal(params.get('filename'), 'deso.md', 'the filename is the slug');
  assert.equal(params.get('value'), proposal.markdown, 'the value is the whole file');
  assert.equal(params.get('quick_pull'), '1', 'GitHub opens the comparison, not the editor');
  assert.ok(params.get('message'), 'the commit message is pre-filled');
  assert.ok(params.get('description'), 'the pull request description is pre-filled');
});

test('the URL is encoded parameter by parameter, so accents and spaces survive', () => {
  const proposal = buildProposal({ ...CORRECT, formeFautive: 'en vrai', body: 'En vrai, déso.' });

  // encodeURIComponent leaves no raw space and no `+`: the value is a URL, not a form body.
  assert.ok(!proposal.url.includes(' '), 'no raw space in the URL');
  assert.ok(!proposal.url.includes('+'), 'spaces are %20, not +');
  assert.ok(proposal.url.includes('%C3%A9'), 'an accent is percent-encoded');
  assert.ok(proposal.url.includes('%20'), 'a space is percent-encoded');
  assert.equal(proposal.filename, 'envrai.md');
  assert.equal(query(proposal.url).get('value'), proposal.markdown, 'the value round-trips');
});

test('an apostrophe in the forme fautive survives the trip through GitHub', () => {
  const proposal = buildProposal({ ...CORRECT, formeFautive: "aujourd'hui" });
  assert.equal(proposal.filename, 'aujourdhui.md');
  assert.equal(query(proposal.url).get('value'), proposal.markdown);
  assert.match(query(proposal.url).get('value') ?? '', /forme_fautive: "aujourd'hui"/);
});

test('a correct form without a source is refused before the file exists', () => {
  assert.throws(
    () => buildProposal({ formeFautive: 'publique', formeCorrecte: 'public', body: 'Un texte.' }),
    /source/i,
  );
});

test('a fiche with nothing to say instead must say why', () => {
  assert.throws(() => buildProposal({ formeFautive: 'wesh', body: 'Un texte.' }), /rien à dire|justification/i);
});

test('the justification is written to `justification`, never to `sources`', () => {
  const proposal = buildProposal({
    formeFautive: 'wesh',
    justification: 'Il n’y a rien à dire à la place.',
    body: 'Wesh n’est pas du français.',
  });
  assert.match(proposal.markdown, /^justification: "Il n’y a rien à dire à la place\."$/m);
  assert.ok(!proposal.markdown.includes('sources:'), 'no sources key');
  assert.ok(!proposal.markdown.includes('forme_correcte:'), 'no correct form');
  assert.equal(query(proposal.url).get('filename'), 'wesh.md');
});

test('a fiche needs a forme fautive and a text', () => {
  assert.throws(() => buildProposal({ ...CORRECT, formeFautive: '  ' }), /forme fautive/i);
  assert.throws(() => buildProposal({ ...CORRECT, body: '' }), /texte/i);
});

test('a source that is not a URL is refused, as the schema would', () => {
  assert.throws(
    () => buildProposal({ ...CORRECT, sources: ['voir le dictionnaire'] }),
    /URL/i,
  );
});

test('the schema’s URL rule holds even when there is no correct form', () => {
  // `sources` is optional there, but a source that is given is still a URL.
  assert.throws(
    () =>
      buildProposal({
        formeFautive: 'wesh',
        justification: 'Il n’y a rien à dire à la place.',
        sources: ['voir le dictionnaire'],
        body: 'Wesh n’est pas du français.',
      }),
    /URL/i,
  );
});

test('a rejection names the field to focus in the form', () => {
  const fieldOf = (input: Parameters<typeof buildProposal>[0]) => {
    try {
      buildProposal(input);
      return null;
    } catch (thrown) {
      assert.ok(thrown instanceof InvalidProposal, 'a proposal rejection is an InvalidProposal');
      return thrown.field;
    }
  };

  assert.equal(fieldOf({ ...CORRECT, formeFautive: '' }), 'formeFautive');
  assert.equal(fieldOf({ ...CORRECT, body: ' ' }), 'body');
  assert.equal(fieldOf({ ...CORRECT, sources: [] }), 'sources');
  assert.equal(fieldOf({ formeFautive: 'wesh', body: 'Un texte.' }), 'justification');
  assert.equal(fieldOf(CORRECT), null, 'a valid proposal names no field');
});

test('the new-file form is this repository’s fiches directory, on main', () => {
  assert.equal(NEW_FILE_BASE, NEW_FILE);
  assert.ok(buildProposal(CORRECT).url.startsWith(`${NEW_FILE}?`), 'the proposal opens there');
});

test('the edit link points at the file of the fiche on GitHub', () => {
  assert.equal(
    editUrl('publique'),
    'https://github.com/cbenz/onditpas.fr/edit/main/src/content/fiches/publique.md',
  );
});
