/**
 * Shared helpers for the build-output tests (seam S1).
 *
 * Every test reads what the build produced in `dist/` and the fiches as they
 * are authored in `src/content/fiches/`. Nothing here imports Astro or an
 * `.astro` file: the tests observe the site, not the templates.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Repository root, resolved from this file's location. */
export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
/** Build output. */
export const DIST = join(ROOT, 'dist');
/** Authored fiches. */
export const FICHES_DIR = join(ROOT, 'src', 'content', 'fiches');

/**
 * Resolve a path to a file in `dist/`.
 *
 * Accepts a site path (`/publique`, `/publique/`, `/sitemap.xml`) or a
 * `dist/`-relative path (`publique/index.html`). A site path without an
 * extension maps to its directory index, because the build uses directory
 * format.
 */
export function distPath(path: string): string {
  const clean = path.replace(/^(\.\/)?(dist\/)?/, '').replace(/^\/+/, '');
  if (clean === '') return join(DIST, 'index.html');
  if (clean.endsWith('/')) return join(DIST, clean, 'index.html');
  if (/\.[a-z0-9]+$/i.test(clean)) return join(DIST, clean);
  return join(DIST, clean, 'index.html');
}

/** `true` when the build produced that page. */
export function pageExists(path: string): boolean {
  return existsSync(distPath(path));
}

/** Read a page (or any built file) as a string; throws when it is missing. */
export function readPage(path: string): string {
  return readFileSync(distPath(path), 'utf8');
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

function decodeEntities(text: string): string {
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

/** Strip markup from an HTML document or fragment and return its text. */
export function htmlText(html: string): string {
  const text = html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]*>/g, ' ');
  return decodeEntities(text).replace(/\s+/g, ' ').trim();
}

/** Every `href` found in the document, in document order, entities decoded. */
export function hrefs(html: string): string[] {
  const found: string[] = [];
  for (const match of html.matchAll(/<a\b[^>]*?\bhref\s*=\s*"([^"]*)"/gi)) {
    found.push(decodeEntities(match[1] ?? ''));
  }
  return found;
}

/** Content of the `<title>` element, trimmed. */
export function title(html: string): string {
  const match = /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  return match ? htmlText(match[1] ?? '') : '';
}

/** Content of a `<meta name="…">` element, or `undefined`. */
export function meta(html: string, name: string): string | undefined {
  const before = new RegExp(
    `<meta\\b[^>]*?\\bname\\s*=\\s*"${name}"[^>]*?\\bcontent\\s*=\\s*"([^"]*)"`,
    'i',
  );
  const after = new RegExp(
    `<meta\\b[^>]*?\\bcontent\\s*=\\s*"([^"]*)"[^>]*?\\bname\\s*=\\s*"${name}"`,
    'i',
  );
  const match = before.exec(html) ?? after.exec(html);
  return match ? decodeEntities(match[1] ?? '') : undefined;
}

/** An authored fiche, with the frontmatter exactly as it is written. */
export interface AuthoredFiche {
  /** File name inside `src/content/fiches/`, e.g. `publique.md`. */
  file: string;
  forme_fautive: string;
  forme_correcte?: string;
  justification?: string;
  sources: string[];
  bordel?: string;
  /** Markdown body, trimmed. */
  body: string;
}

type Frontmatter = Record<string, string | string[]>;

function unquote(value: string): string {
  const trimmed = value.trim();
  const quoted = /^(['"])([\s\S]*)\1$/.exec(trimmed);
  if (!quoted) return trimmed;
  return (quoted[2] ?? '')
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\\\/g, '\\');
}

/**
 * Parse the YAML subset the content schema allows: `key: value`, `key:` with
 * `- item` entries, and `key: |` block scalars. Reading the frontmatter here
 * keeps the tests free of a YAML dependency.
 */
function parseFrontmatter(source: string, file: string): { data: Frontmatter; body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(source.trimStart());
  if (!match) throw new Error(`${file}: no frontmatter block`);
  const [, header = '', body = ''] = match;

  const data: Frontmatter = {};
  let block: { key: string; lines: string[]; indent: number | null } | null = null;
  let listKey: string | null = null;

  const flushBlock = () => {
    if (!block) return;
    data[block.key] = block.lines.join('\n').trim();
    block = null;
  };

  for (const line of header.split(/\r?\n/)) {
    if (block) {
      const indent = line.length - line.trimStart().length;
      if (line.trim() === '') {
        block.lines.push('');
        continue;
      }
      block.indent ??= indent;
      if (indent >= block.indent) {
        block.lines.push(line.slice(block.indent));
        continue;
      }
      flushBlock();
    }

    if (line.trim() === '' || line.trimStart().startsWith('#')) continue;

    const item = /^\s*-\s+(.*)$/.exec(line);
    if (item) {
      if (listKey === null) throw new Error(`${file}: list item without a key: ${line}`);
      (data[listKey] as string[]).push(unquote(item[1] ?? ''));
      continue;
    }

    const pair = /^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/.exec(line);
    if (!pair) throw new Error(`${file}: unparseable frontmatter line: ${line}`);
    const [, key = '', raw = ''] = pair;
    listKey = null;

    if (raw === '|' || raw === '>') {
      block = { key, lines: [], indent: null };
      continue;
    }
    if (raw === '') {
      data[key] = [];
      listKey = key;
      continue;
    }
    data[key] = unquote(raw);
  }
  flushBlock();

  return { data, body: body.trim() };
}

/** Every authored fiche, sorted by file name. */
export function fiches(): AuthoredFiche[] {
  return readdirSync(FICHES_DIR)
    .filter((file) => file.endsWith('.md'))
    .sort()
    .map((file) => {
      const { data, body } = parseFrontmatter(
        readFileSync(join(FICHES_DIR, file), 'utf8'),
        file,
      );
      const fiche: AuthoredFiche = {
        file,
        forme_fautive: String(data.forme_fautive ?? ''),
        sources: Array.isArray(data.sources) ? data.sources : [],
        body,
      };
      for (const key of ['forme_correcte', 'justification', 'bordel'] as const) {
        const value = data[key];
        if (typeof value === 'string' && value.length > 0) fiche[key] = value;
      }
      return fiche;
    });
}
