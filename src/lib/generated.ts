/**
 * Generated fiches: the fiche of a slug nobody wrote.
 *
 * Any URL answers. The host rewrites every unknown path to one static document
 * (`/fiche-inconnue`), and that document fills in the words from the pathname
 * the visitor typed. Everything that can be decided without a browser — which
 * word, which registre, which title, which GitHub URL — lives here, so the
 * client script is a thin application of this module and the tests call the
 * decisions directly (seam S2).
 *
 * Pure: no Astro, no DOM, no I/O.
 */
import { bordelTitle } from './registre.ts';

/** The public repository the fiches are contributed to. */
export const REPOSITORY = 'https://github.com/cbenz/onditpas.fr';

/** The branch a proposal forks from. */
const BRANCH = 'main';

/** The tone a fiche is written in; mirrors `src/components/Fiche.astro`. */
export type Registre = 'deadpan' | 'bordel';

/** The fiche a pathname asks for. */
export interface GeneratedFiche {
  /** The form the visitor typed, percent-escapes decoded. */
  formeFautive: string;
  registre: Registre;
}

/** `/-/` is reserved for utility routes (`/-/random`), never a fiche. */
const RESERVED = /^\/-($|\/)/;

/**
 * Turn a pathname into the fiche it asks for.
 *
 * The last path segment is the forme fautive. A trailing `/bordel` on a
 * multi-segment path switches to the shouting registre; a bare `/bordel` is the
 * fiche about the word itself, because a one-segment path names one word.
 * Empty paths, the root and the reserved `/-/` prefix are not fiches.
 */
export function parseGeneratedPath(pathname: string): GeneratedFiche | null {
  const path = pathname.split(/[?#]/, 1)[0] ?? '';
  if (RESERVED.test(path)) return null;

  const segments = path.split('/').filter((segment) => segment !== '');
  if (segments.length === 0) return null;

  const shouting = segments.length > 1 && segments[segments.length - 1] === 'bordel';
  const last = shouting ? segments[segments.length - 2] : segments[segments.length - 1];
  if (last === undefined) return null;

  let formeFautive: string;
  try {
    formeFautive = decodeURIComponent(last).trim();
  } catch {
    // A malformed percent-escape is not a word we can show.
    return null;
  }
  if (formeFautive === '') return null;

  return { formeFautive, registre: shouting ? 'bordel' : 'deadpan' };
}

/** What the generated document shows for a fiche. */
export interface GeneratedView {
  /** Document title, with the site suffix. */
  title: string;
  /** Label above the correction line: `On dit` or `Bordel`. */
  label: string;
  /** The correction line: an admission, or the shout. */
  correction: string;
  /** Whether the page wears the shouting registre. */
  shouting: boolean;
}

/**
 * The words the generated document shows.
 *
 * A generated fiche has no forme correcte: nobody wrote one yet. The deadpan
 * version says so; the shouting version calls the no-forme-correcte template of
 * `src/lib/registre.ts` rather than restating it.
 */
export function generatedView(fiche: GeneratedFiche): GeneratedView {
  const shouting = fiche.registre === 'bordel';
  const shout = shouting ? bordelTitle({ formeFautive: fiche.formeFautive }) : null;
  const correction = shout ?? 'On ne sait pas encore.';

  return {
    title: `${shout ?? fiche.formeFautive} · onditpas.fr`,
    label: shouting ? 'Bordel' : 'On dit',
    correction,
    shouting,
  };
}

/**
 * The GitHub new-file form for a slug, prefilled.
 *
 * GitHub forks the repository for a visitor without write access, so the
 * proposal needs no account system on our side.
 */
export function githubNewFileUrl(slug: string): string {
  const filename = encodeURIComponent(`${slug}.md`);
  return `${REPOSITORY}/new/${BRANCH}?filename=${filename}&quick_pull=1`;
}
