/**
 * Seam S1 — French typography, as the built pages carry it.
 *
 * French puts a non-breaking space before `:`, `;`, `!` and `?`. A plain space
 * lets the line break between the word and its punctuation, which is the one
 * typographic mistake a reader notices without being able to name it. The
 * duplicate sentence that used to disagree with itself is the reason this is
 * asserted on the output and not in one template.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { slugify } from '../src/lib/slug.ts';
import { fiches, readPage } from './helpers.ts';

/** Every page a visitor can land on, as built. */
function pages(): Array<readonly [label: string, html: string]> {
  const built: Array<readonly [string, string]> = [['the mur', readPage('/')]];
  for (const fiche of fiches()) {
    const slug = slugify(fiche.forme_fautive);
    built.push([`the fiche ${slug}`, readPage(`/${slug}/`)]);
    built.push([`the shout ${slug}`, readPage(`/${slug}/bordel/`)]);
  }
  built.push(['the generated fiche', readPage('/fiche-inconnue/')]);
  built.push(['the random route', readPage('/-/random/')]);
  return built;
}

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: '\u00a0',
  laquo: '«',
  raquo: '»',
};

/**
 * The text of a page, markup removed and entities decoded, whitespace kept.
 *
 * `htmlText()` from the helpers collapses whitespace, which would turn a
 * correct non-breaking space into the plain space this test looks for; so the
 * collapse is skipped here on purpose.
 */
function prose(html: string): string {
  const text = html
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]*>/g, ' ');
  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (entity, code: string) => {
    if (code.startsWith('#')) {
      const point =
        code[1]?.toLowerCase() === 'x'
          ? Number.parseInt(code.slice(2), 16)
          : Number.parseInt(code.slice(1), 10);
      return Number.isNaN(point) ? entity : String.fromCodePoint(point);
    }
    return ENTITIES[code.toLowerCase()] ?? entity;
  });
}

test('French prose never puts a plain space before : ; ! or ?', () => {
  for (const [label, html] of pages()) {
    const text = prose(html);
    const mistakes = [...text.matchAll(/.{0,40} [!?:;].{0,40}/g)].map((match) => match[0].trim());
    assert.deepEqual(mistakes, [], `${label} spaces French punctuation`);
  }
});

test('the duplicate sentence is shared, not copy-pasted', () => {
  // « Rien : il n’y a pas d’autre façon de le dire. » is written once for the
  // fiche and once for the proposal preview. Both must agree.
  const fiche = fiches().find((candidate) => candidate.forme_correcte === undefined);
  assert.ok(fiche, 'an authored fiche has nothing to substitute');
  const text = prose(readPage(`/${slugify(fiche.forme_fautive)}/`));
  assert.match(text, /Rien\u00a0: il n’y a pas d’autre façon de le dire\./);
});
