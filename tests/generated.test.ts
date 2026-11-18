/**
 * Generated fiches for unknown slugs — both seams.
 *
 * S2: the pure module that turns a pathname into a fiche and a GitHub URL.
 * S1: the one static document the host serves for every unknown path, and the
 * rewrite that points at it. Nothing here imports an `.astro` file or Astro.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

import {
  githubNewFileUrl,
  generatedView,
  parseGeneratedPath,
} from '../src/lib/generated.ts';
import { ROOT, htmlText, meta, pageExists, readPage, title } from './helpers.ts';

/** A non-breaking space, as French typography requires before `!`. */
const NBSP = '\u00a0';

/* ── seam S2: the pathname parser ───────────────────────────────────── */

const PATHS: Array<{
  pathname: string;
  expected: { formeFautive: string; registre: 'deadpan' | 'bordel' } | null;
}> = [
  { pathname: '/pouet', expected: { formeFautive: 'pouet', registre: 'deadpan' } },
  { pathname: '/pouet/bordel', expected: { formeFautive: 'pouet', registre: 'bordel' } },
  { pathname: '/pouet/', expected: { formeFautive: 'pouet', registre: 'deadpan' } },
  { pathname: '/pouet/bordel/', expected: { formeFautive: 'pouet', registre: 'bordel' } },
  { pathname: '/aujourd\u0027hui', expected: { formeFautive: "aujourd'hui", registre: 'deadpan' } },
  { pathname: '/%C3%A9t%C3%A9', expected: { formeFautive: 'été', registre: 'deadpan' } },
  {
    pathname: '/force-a-toi/bordel',
    expected: { formeFautive: 'force-a-toi', registre: 'bordel' },
  },
  { pathname: '/', expected: null },
  { pathname: '', expected: null },
  { pathname: '/-/random', expected: null },
  { pathname: '/-/', expected: null },
];

for (const { pathname, expected } of PATHS) {
  test(`parseGeneratedPath: ${JSON.stringify(pathname)}`, () => {
    assert.deepEqual(parseGeneratedPath(pathname), expected);
  });
}

test('parseGeneratedPath: the last segment is the forme fautive', () => {
  assert.deepEqual(parseGeneratedPath('/un/deux/trois'), {
    formeFautive: 'trois',
    registre: 'deadpan',
  });
});

test('parseGeneratedPath: a bare /bordel names the word bordel, it does not shout', () => {
  assert.deepEqual(parseGeneratedPath('/bordel'), {
    formeFautive: 'bordel',
    registre: 'deadpan',
  });
});

test('parseGeneratedPath: a malformed escape is not a fiche', () => {
  assert.equal(parseGeneratedPath('/%E0%A4%A'), null);
});

/* ── seam S2: what the page shows ───────────────────────────────────── */

test('generatedView: the deadpan registre names the word and admits the gap', () => {
  const fiche = parseGeneratedPath('/pouet');
  assert.ok(fiche);
  assert.deepEqual(generatedView(fiche), {
    title: 'pouet · onditpas.fr',
    label: 'On dit',
    correction: 'On ne sait pas encore.',
    shouting: false,
  });
});

test('generatedView: the shouting registre calls the no-forme-correcte template', () => {
  const fiche = parseGeneratedPath('/pouet/bordel');
  assert.ok(fiche);
  assert.deepEqual(generatedView(fiche), {
    title: `ON DIT PAS POUET, BORDEL${NBSP}! · onditpas.fr`,
    label: 'Bordel',
    correction: `ON DIT PAS POUET, BORDEL${NBSP}!`,
    shouting: true,
  });
});

test('generatedView: the shout keeps accents and apostrophes', () => {
  const fiche = parseGeneratedPath('/%C3%A9t%C3%A9/bordel');
  assert.ok(fiche);
  assert.equal(generatedView(fiche).correction, `ON DIT PAS ÉTÉ, BORDEL${NBSP}!`);
});

/* ── seam S2: the GitHub new-file URL ───────────────────────────────── */

const REPO = 'https://github.com/cbenz/onditpas.fr';
const NEW_FILE = `${REPO}/new/main`;

test('githubNewFileUrl: the slug is the file name, and the PR is quick', () => {
  assert.equal(
    githubNewFileUrl('pouet'),
    `${NEW_FILE}?filename=pouet.md&quick_pull=1`,
  );
});

test('githubNewFileUrl: hyphens and apostrophes survive, differently', () => {
  assert.equal(
    githubNewFileUrl('force-a-toi'),
    `${NEW_FILE}?filename=force-a-toi.md&quick_pull=1`,
  );
  assert.equal(
    githubNewFileUrl("aujourd'hui"),
    `${NEW_FILE}?filename=aujourd'hui.md&quick_pull=1`,
  );
});

test('githubNewFileUrl: a non-ASCII slug is percent-escaped', () => {
  assert.equal(
    githubNewFileUrl('été'),
    `${NEW_FILE}?filename=%C3%A9t%C3%A9.md&quick_pull=1`,
  );
});

/* ── seam S1: the document the host serves ──────────────────────────── */

const PAGE = '/fiche-inconnue/';
const html = readPage(PAGE);
const text = htmlText(html);

test('the generated fiche document is in the build output', () => {
  assert.ok(pageExists(PAGE), `${PAGE} is emitted by the build`);
  assert.ok(html.includes('<html'), 'it is an HTML document');
  assert.match(html, /<html\b[^>]*\blang="fr"/i);
  assert.ok(title(html).length > 0, 'it has a title');
});

test('the generated fiche document is noindex, nofollow', () => {
  const robots = meta(html, 'robots') ?? '';
  assert.match(robots, /noindex/, 'the document is not indexed');
  assert.match(robots, /nofollow/, 'its links are not followed');
});

test('the generated fiche document declares no canonical', () => {
  assert.ok(
    !/<link\b[^>]*\brel="canonical"/i.test(html),
    'one document for every unknown slug must not claim an address',
  );
});

test('the generated fiche document says the fiche is not written yet', () => {
  assert.match(text, /pas encore été écrite/);
  assert.match(text, /cette forme/, 'without JavaScript it still names something');
});

test('the generated fiche document offers two controls to write it', () => {
  assert.match(html, /<a\b[^>]*\bid="ecrire"/, 'a link to the GitHub new-file form');
  assert.match(html, /<button\b[^>]*\bid="ecrire-bouton"/, 'a second control on the same target');
});

test('the generated fiche document carries the fiche layout', () => {
  assert.match(html, /<h1\b[^>]*\bid="forme-fautive"/, 'the headline is a slot to fill');
  assert.match(html, /class="[^"]*\brow\b/, 'the correction row is present');
  assert.match(html, /class="[^"]*\bdef\b/, 'the definition block is present');
});

/* ── seam S1: the client-side fill ──────────────────────────────────── */

/** Every script a page carries: inlined `<script>` bodies and linked files. */
function scripts(document: string): string {
  const inline = [...document.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)]
    .map((match) => match[1] ?? '')
    .join('\n');
  const linked = [...document.matchAll(/<script\b[^>]*?\bsrc="([^"]+)"/gi)]
    .map((match) => readPage(match[1] ?? ''))
    .join('\n');
  return `${inline}\n${linked}`;
}

const client = scripts(html);

test('the page script reads the pathname', () => {
  assert.match(client, /\.pathname/, 'the word comes from the URL the visitor typed');
});

test('the page script builds the GitHub new-file URL for the slug', () => {
  assert.ok(client.includes('github.com/cbenz/onditpas.fr'), 'the repository is named');
  assert.match(client, /filename/, 'the file name is prefilled');
  assert.match(client, /\.md/, 'the file is a Markdown fiche');
  assert.match(client, /quick_pull=1/, 'GitHub opens the pull request form');
});

test('the page script shouts through the registre template', () => {
  assert.match(client, /BORDEL/, 'the shout template is the one src/lib/registre.ts defines');
  assert.match(client, /is-bordel/, 'the shouting page wears the accent class');
});

/* ── seam S1: the fill, executed ────────────────────────────────────── */

interface StubElement {
  id: string;
  textContent: string;
  href?: string;
  classes: Set<string>;
  classList: { toggle(name: string, force?: boolean): void };
  addEventListener(type: string, handler: () => void): void;
  click(): void;
}

/** The elements the page script looks up, with the ids the document carries. */
const STUB_IDS = [
  'generated',
  'forme-fautive',
  'forme-fautive-def',
  'correction-label',
  'correction',
  'ecrire',
  'ecrire-bouton',
] as const;

/** The inline script, when Astro inlined a self-contained bundle (no imports). */
const inline = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)]
  .map((match) => match[1] ?? '')
  .join('\n');
const selfContained = inline.length > 0 && !/\b(?:import|export)\s/.test(inline);

/**
 * Run the built inline script against a stub document and return what it changed.
 *
 * This is the closest a static test gets to opening an unknown slug in a
 * browser: the script is the one the build shipped, and the pathname is the one
 * the host rewrites to this document.
 */
function run(pathname: string): {
  pageTitle: string;
  elements: Map<string, StubElement>;
  opened: string[];
} {
  class HTMLAnchorElement {}
  const elements = new Map<string, StubElement>();

  for (const id of STUB_IDS) {
    const classes = new Set<string>();
    const handlers: Array<() => void> = [];
    const element = Object.assign(id === 'ecrire' ? new HTMLAnchorElement() : {}, {
      id,
      textContent: '',
      classes,
      classList: {
        toggle(name: string, force?: boolean) {
          if (force ?? !classes.has(name)) classes.add(name);
          else classes.delete(name);
        },
      },
      addEventListener(_type: string, handler: () => void) {
        handlers.push(handler);
      },
      click() {
        for (const handler of handlers) handler();
      },
    }) as StubElement;
    elements.set(id, element);
  }

  const fakeDocument = {
    title: '',
    getElementById: (id: string) => elements.get(id) ?? null,
  };
  const opened: string[] = [];
  const fakeWindow = {
    open: (url: string) => {
      opened.push(url);
      return null;
    },
  };

  const execute = new Function(
    'document',
    'location',
    'window',
    'HTMLAnchorElement',
    inline,
  );
  execute(fakeDocument, { pathname }, fakeWindow, HTMLAnchorElement);

  return { pageTitle: fakeDocument.title, elements, opened };
}

test(
  'the built script fills the document from an unknown slug',
  { skip: selfContained ? false : 'the build ships the script as a separate module file' },
  () => {
    const { pageTitle, elements } = run('/pouet');

    assert.equal(elements.get('forme-fautive')?.textContent, 'pouet', 'the word you typed');
    assert.equal(elements.get('forme-fautive-def')?.textContent, 'pouet');
    assert.equal(elements.get('correction-label')?.textContent, 'On dit');
    assert.equal(elements.get('correction')?.textContent, 'On ne sait pas encore.');
    assert.equal(pageTitle, 'pouet · onditpas.fr');
    assert.equal(
      elements.get('ecrire')?.href,
      `${NEW_FILE}?filename=pouet.md&quick_pull=1`,
      'the link is filled with the slug',
    );
    assert.ok(!elements.get('generated')?.classes.has('is-bordel'), 'the page does not shout');
  },
);

test(
  'the built script shouts on an unknown slug /bordel',
  { skip: selfContained ? false : 'the build ships the script as a separate module file' },
  () => {
    const { pageTitle, elements, opened } = run('/pouet/bordel');

    assert.equal(elements.get('forme-fautive')?.textContent, 'pouet');
    assert.equal(elements.get('correction-label')?.textContent, 'Bordel');
    assert.equal(elements.get('correction')?.textContent, `ON DIT PAS POUET, BORDEL${NBSP}!`);
    assert.equal(pageTitle, `ON DIT PAS POUET, BORDEL${NBSP}! · onditpas.fr`);
    assert.ok(elements.get('generated')?.classes.has('is-bordel'), 'the page shouts');

    const url = `${NEW_FILE}?filename=pouet.md&quick_pull=1`;
    assert.equal(elements.get('ecrire')?.href, url);
    elements.get('ecrire-bouton')?.click();
    assert.deepEqual(opened, [url], 'the second control opens the same target');
  },
);

/* ── seam S1: the host rewrite ──────────────────────────────────────── */

interface Rewrite {
  source: string;
  destination: string;
  permanent?: boolean;
}

const vercel = JSON.parse(readFileSync(join(ROOT, 'vercel.json'), 'utf8')) as {
  rewrites?: Rewrite[];
  [key: string]: unknown;
};
const rewrites = vercel.rewrites ?? [];
const capture = rewrites.find((rewrite) => rewrite.destination === '/fiche-inconnue');

test('the host rewrites unknown paths to the generated fiche document', () => {
  assert.ok(capture, 'vercel.json declares a rewrite to /fiche-inconnue');
  assert.ok(capture.source.length > 0, 'the rewrite has a source');
});

test('the rewrite target is a document the build produced', () => {
  assert.ok(capture);
  assert.ok(pageExists(capture.destination), `${capture.destination} is in dist/`);
  assert.ok(readPage(capture.destination).includes('<html'), 'it is an HTML document');
  assert.equal(capture.permanent, undefined, 'a rewrite answers 200, it is not a redirect');
});

/**
 * Does the rewrite capture a path?
 *
 * The committed `source` uses one custom-regex group and no named parameter, so
 * reading it as an anchored JavaScript regular expression is what path-to-regexp
 * does with it. Checking the match — rather than the string — keeps the rule
 * honest: a rewrite that swallows `/-/random` fails here.
 */
function captures(path: string): boolean {
  assert.ok(capture);
  return new RegExp(`^${capture.source}$`).test(path);
}

const CAPTURED = ['/pouet', '/pouet/bordel', '/aujourdhui', '/force-a-toi/bordel', '/wesh'];
const PASSED_THROUGH = [
  '/',
  '/-/random',
  '/-/',
  '/_astro/index.B5x1yz.js',
  '/sitemap.xml',
  '/robots.txt',
  '/fonts/anton-latin.woff2',
];

test('the rewrite captures an unknown slug and its shouting variant', () => {
  for (const path of CAPTURED) assert.ok(captures(path), `${path} reaches the document`);
});

test('the rewrite leaves utility routes, built assets and files alone', () => {
  for (const path of PASSED_THROUGH) {
    assert.ok(!captures(path), `${path} is not swallowed by the catch-all`);
  }
});

test('the rewrite does not disturb the rest of the host configuration', () => {
  assert.equal(vercel.framework, 'astro');
  assert.equal(vercel.buildCommand, 'npm run build');
  assert.equal(vercel.outputDirectory, 'dist');
  assert.equal(vercel.cleanUrls, true);
});
