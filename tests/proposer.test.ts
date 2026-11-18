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

import { slugify } from '../src/lib/slug.ts';
import { NEW_FILE_BASE, editUrl } from '../src/lib/proposal.ts';
import { fiches, hrefs, readPage, ROOT, title } from './helpers.ts';

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
    readPage(match[1] ?? ''),
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
  for (const field of ['forme-fautive', 'forme-correcte', 'source', 'justification', 'texte']) {
    assert.ok(html.includes(`id="${field}"`), `the ${field} input has an id`);
    assert.match(html, new RegExp(`<label\\b[^>]*\\bfor="${field}"`, 'i'), `${field} is labelled`);
  }
});

test('the page knows the URL of the pre-filled new-file form', () => {
  for (const [label, html] of PAGES) {
    const source = scripts(html);
    assert.match(source, /quick_pull/, `${label} asks GitHub for the pull request flow`);
    assert.ok(
      source.includes('github.com/cbenz/onditpas.fr/new/main/src/content/fiches'),
      `${label} builds the URL of this repository’s fiches directory`,
    );
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

test('each fiche links to the GitHub edit form for its own file', () => {
  for (const fiche of fiches()) {
    const html = readPage(`/${slugify(fiche.forme_fautive)}/`);
    const expected = editUrl(slugify(fiche.forme_fautive));
    assert.ok(hrefs(html).includes(expected), `${fiche.file} carries ${expected}`);
    assert.match(html, /class="[^"]*\bmodifier\b/, `${fiche.file} names the link`);
  }
});

test('the edit link is not hardcoded to one fiche', () => {
  // The build derives it per page; a single slug in the template would make
  // every page point at the same file.
  const expected = new Set(fiches().map((fiche) => editUrl(slugify(fiche.forme_fautive))));
  for (const fiche of fiches()) {
    const html = readPage(`/${slugify(fiche.forme_fautive)}/`);
    const edits = hrefs(html).filter((href) => href.includes('/edit/main/'));
    assert.equal(edits.length, 1, `${fiche.file} carries exactly one edit link`);
    assert.ok(expected.has(edits[0] ?? ''), `${fiche.file} edits its own file`);
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
