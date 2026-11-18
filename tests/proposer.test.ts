/**
 * Seam S1 — the contribution control and the per-fiche edit link, as built.
 *
 * A visitor must be able to propose a fiche from any page, and to fix the one
 * they are reading. Both are links to GitHub, so both are observable in
 * `dist/` without opening a browser: the hrefs the pages carry, the dialog
 * markup a screen reader announces, and the URL the page knows how to build.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

import { BRANCH, FICHES_PATH, NEW_FILE_BASE, REPOSITORY } from '../src/lib/github.ts';
import { slugify } from '../src/lib/slug.ts';
import { fiches, hrefs, readPage, ROOT, scriptSource, title } from './helpers.ts';

/** The mur, plus the page of every authored fiche. */
const PAGES: ReadonlyArray<readonly [label: string, html: string]> = [
  ['the mur', readPage('/')],
  ...fiches().map((fiche) => [`the fiche ${fiche.forme_fautive}`, readPage(`/${slugify(fiche.forme_fautive)}/`)] as const),
];

/** Every script the page carries: inline blocks and bundled files, as sources. */
function scripts(html: string): string {
  const inline = [...html.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(
    (match) => match[1] ?? '',
  );
  const linked = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/gi)].map((match) =>
    scriptSource(match[1] ?? ''),
  );
  return [...inline, ...linked].join('\n');
}

test('every page carries the proposer control', () => {
  for (const [label, html] of PAGES) {
    assert.ok(hrefs(html).includes(NEW_FILE_BASE), `${label} links to GitHub’s new-file form`);
  }
});

test('the control is the dialog trigger, and it still works without JavaScript', () => {
  for (const [label, html] of PAGES) {
    const anchors = [...html.matchAll(/<a\b[^>]*>/gi)].map((match) => match[0]);
    const trigger = anchors.find(
      (anchor) =>
        /\bdata-proposer\b/.test(anchor) &&
        anchor.includes(`href="${NEW_FILE_BASE}"`),
    );
    assert.ok(trigger, `${label} has a proposer anchor pointing at the fallback`);
  }
});

test('the dialog is labelled and modal, as an assistive technology needs it', () => {
  const html = PAGES[0]?.[1] ?? '';
  const dialog = /<dialog\b[^>]*>/i.exec(html);
  assert.ok(dialog, 'the page carries a dialog element');
  assert.match(dialog[0], /\baria-labelledby="[^"]+"/i, 'the dialog is named');
  assert.match(dialog[0], /\baria-modal="true"/i, 'the dialog is modal');

  // The labels are tied to the inputs they describe, not floating above them.
  for (const field of [
    'proposer-forme-fautive',
    'proposer-forme-correcte',
    'proposer-source',
    'proposer-justification',
    'proposer-texte',
  ]) {
    assert.ok(html.includes(`id="${field}"`), `the ${field} input has an id`);
    assert.match(html, new RegExp(`<label\\b[^>]*\\bfor="${field}"`, 'i'), `${field} is labelled`);
  }
});

test('the page knows the URL of the pre-filled new-file form', () => {
  for (const [label, html] of PAGES) {
    const source = scripts(html);
    assert.match(source, /quick_pull/, `${label} asks GitHub for the pull request flow`);
    // The module composes the URL from its parts; the whole string is asserted
    // in tests/github.test.ts and on the executed link.
    for (const part of ['github.com/cbenz/onditpas.fr', 'content/fiches']) {
      assert.ok(source.includes(part), `${label} builds the URL of this repository’s ${part}`);
    }
  }
});

test('the dialog previews the fiche in the visual grammar of the fiche page', () => {
  const html = PAGES[0]?.[1] ?? '';
  const dialog = /<dialog\b[\s\S]*?<\/dialog>/i.exec(html);
  assert.ok(dialog, 'the page carries a dialog');
  const body = dialog[0];
  for (const part of ['headline', 'corr-label', 'def']) {
    assert.match(body, new RegExp(`class="[^"]*\\b${part}\\b`), `the preview reuses .${part}`);
  }
});

/**
 * The repository path an edit href points at, e.g. `src/content/fiches/wesh.md`.
 *
 * The path is read out of the built link, then resolved against the repository
 * as it is checked out; a link that names no file fails the test below.
 */
function editedPath(href: string): string {
  const prefix = `${REPOSITORY}/edit/${BRANCH}/`;
  assert.ok(href.startsWith(prefix), `${href} is GitHub’s edit form for this repository`);
  return decodeURIComponent(href.slice(prefix.length));
}

/** The edit link a page carries, once. */
function editLink(html: string, label: string): string {
  const edits = hrefs(html).filter((href) => href.startsWith(`${REPOSITORY}/edit/`));
  assert.equal(edits.length, 1, `${label} carries exactly one edit link`);
  return edits[0] ?? '';
}

test('each fiche links to the GitHub edit form of a file that exists', () => {
  // The slug is not the file name: `au-jour-daujourdhui.md` answers
  // /aujourdaujourdhui. So the assertion is against the real files on disk.
  for (const fiche of fiches()) {
    const html = readPage(`/${slugify(fiche.forme_fautive)}/`);
    const path = editedPath(editLink(html, fiche.file));

    assert.equal(path, `${FICHES_PATH}/${fiche.file}`, `${fiche.file} edits its own file`);
    assert.ok(existsSync(join(ROOT, path)), `${path} is a file of the repository`);
    assert.match(html, /class="[^"]*\bmodifier\b/, `${fiche.file} names the link`);
  }
});

test('the edit link is not hardcoded to one fiche', () => {
  // The build derives it per page; a single path in the template would make
  // every page point at the same file.
  const edited = new Set(
    fiches().map((fiche) => editedPath(editLink(readPage(`/${slugify(fiche.forme_fautive)}/`), fiche.file))),
  );
  assert.equal(edited.size, fiches().length, 'every fiche edits a different file');
  for (const path of edited) {
    assert.ok(existsSync(join(ROOT, path)), `${path} is a file of the repository`);
  }
});

test('the shouting page offers the same edit affordance', () => {
  // /{slug}/bordel is the same fiche, so it must let the visitor fix it too.
  for (const fiche of fiches()) {
    const slug = slugify(fiche.forme_fautive);
    const shout = readPage(`/${slug}/bordel/`);
    const path = editedPath(editLink(shout, `${slug}/bordel`));

    assert.equal(path, `${FICHES_PATH}/${fiche.file}`, `${slug}/bordel edits the same file`);
    assert.ok(existsSync(join(ROOT, path)), `${path} is a file of the repository`);
    assert.match(shout, /class="[^"]*\bmodifier\b/, `${slug}/bordel names the link`);
  }
});

test('a generated fiche offers the dialog, prefilled from its own headline', () => {
  const html = readPage('/fiche-inconnue/');

  assert.ok(hrefs(html).includes(NEW_FILE_BASE), 'the control is on the page');
  assert.match(
    html,
    /\bdata-proposer-prefill-from="#forme-fautive"/,
    'the form takes the forme fautive from the word the visitor typed',
  );
  // The headline is where the word lives, filled client-side from the path.
  assert.match(html, /<h1\b[^>]*\bid="forme-fautive"/, 'the headline carries the word');
});

test('no page repeats an id', () => {
  // The dialog rides on every page; its field ids must not collide with the
  // page's own (the generated fiche has a #forme-fautive headline).
  const pages: ReadonlyArray<readonly [label: string, html: string]> = [
    ...PAGES,
    ...fiches().map(
      (fiche) =>
        [`the shout ${fiche.forme_fautive}`, readPage(`/${slugify(fiche.forme_fautive)}/bordel/`)] as const,
    ),
    ['the generated fiche', readPage('/fiche-inconnue/')],
  ];

  for (const [label, html] of pages) {
    const ids = [...html.matchAll(/\bid="([^"]+)"/gi)].map((match) => match[1] ?? '');
    const repeated = ids.filter((id, index) => ids.indexOf(id) !== index);
    assert.deepEqual(repeated, [], `${label} repeats no id`);
  }
});

test('the repository is fit to receive a proposal', () => {
  const license = readFileSync(join(ROOT, 'LICENSE'), 'utf8');
  assert.match(license, /MIT License/, 'the code is MIT');
  assert.match(license, /all rights reserved/i, 'the fiches are not');

  const contributing = readFileSync(join(ROOT, 'CONTRIBUTING.md'), 'utf8');
  assert.match(contributing, /publish it and to\s+exploit it commercially/i, 'the grant is stated');
  assert.match(contributing, /npm test/, 'the build check is documented');
  assert.match(contributing, /justification/, 'the schema rule is documented');

  assert.ok(existsSync(join(ROOT, '.github', 'pull_request_template.md')), 'a PR template exists');
});

test('the mur and the fiches are unchanged as documents', () => {
  // A guard: the control is additive, so a fiche keeps its own title.
  assert.match(title(PAGES[1]?.[1] ?? ''), /onditpas\.fr/);
});
