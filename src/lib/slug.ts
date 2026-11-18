/**
 * Derive the slug of a fiche from its forme fautive.
 *
 * Lowercased, accents stripped, spaces and apostrophes removed, hyphens kept
 * where the word has one (`aujourd'hui` → `aujourdhui`, `wi-fi` → `wi-fi`).
 * The redirect and case tables are a later concern: see ticket #4.
 */
const COMBINING_MARKS = /\p{M}/gu;

export function slugify(formeFautive: string): string {
  return formeFautive
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .toLowerCase()
    .replace(/[’'‘`´]/g, '')
    .replace(/\s+/g, '');
}
