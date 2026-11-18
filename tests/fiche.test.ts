/**
 * Seam S1 — the walking skeleton.
 *
 * Asserts what a visitor and a crawler observe on the one authored fiche:
 * the route the build produces, the text it carries, and the face it is set in.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { fiches, htmlText, hrefs, meta, pageExists, readPage, title } from './helpers.ts';

const PAGE = '/publique/';
const SOURCE = 'https://www.larousse.fr/dictionnaires/francais/public/65173';

const html = readPage(PAGE);

test('the authored fiche renders at the slug of its forme fautive', () => {
  assert.ok(html.includes('<html'), 'the page is an HTML document');
  assert.ok(fiches().some((fiche) => fiche.forme_fautive === 'publique'));
  assert.match(title(html), /publique/);
});

test('the forme fautive is the page headline', () => {
  const headline = /<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
  assert.ok(headline, 'the page has an h1');
  assert.equal(htmlText(headline[1] ?? ''), 'publique');
});

test('the correct form is displayed next to it', () => {
  const text = htmlText(html);
  assert.match(text, /on dit/i);
  assert.match(text, /\bpublic\b/);
});

test('the fiche carries its definition', () => {
  const text = htmlText(html);
  assert.match(text, /l’ensemble des gens/);
  assert.match(text, /féminin de l’adjectif/);
});

test('the source is cited and linked', () => {
  assert.ok(hrefs(html).includes(SOURCE), 'the source URL is an href');
  assert.match(htmlText(html), /Source\s*:/);
});

test('the page has a title and a description derived from the fiche', () => {
  const pageTitle = title(html);
  assert.match(pageTitle, /publique/);
  assert.match(pageTitle, /public/);
  assert.ok(pageTitle.includes('onditpas.fr'));

  const description = meta(html, 'description');
  assert.ok(description, 'the page has a meta description');
  assert.match(description, /public/i);
});

test('the page is declared in French', () => {
  assert.match(html, /<html\b[^>]*\blang="fr"/i);
});

test('the display face is served from the site, not a third-party CDN', () => {
  // The build may inline small stylesheets; read every stylesheet the page carries.
  const inline = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1] ?? '');
  const linked = [...html.matchAll(/<link\b[^>]*?href="([^"]+\.css)"/gi)].map((m) =>
    readPage(m[1] ?? ''),
  );
  const css = [...inline, ...linked].join('\n');
  assert.ok(css.length > 0, 'the page carries a stylesheet');

  assert.match(css, /url\(["']?\/fonts\/anton-latin\.woff2/, 'Anton is self-hosted');
  assert.ok(pageExists('/fonts/anton-latin.woff2'), 'the face is emitted in the build');
  for (const host of ['fonts.googleapis.com', 'fonts.gstatic.com', 'use.typekit.net']) {
    assert.ok(!html.includes(host) && !css.includes(host), `no third-party face from ${host}`);
  }
});

test('the page links back to the mur de mots', () => {
  assert.ok(hrefs(html).includes('/'), 'the wordmark or the mur link points home');
});
