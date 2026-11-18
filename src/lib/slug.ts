/**
 * Derive the slug of a fiche from its forme fautive.
 *
 * Lowercased, accents stripped, spaces and apostrophes removed, hyphens kept
 * where the word has one (`aujourd'hui` → `aujourdhui`, `wi-fi` → `wi-fi`).
 *
 * Accents are stripped by an explicit Unicode normalization rather than by a
 * locale-sensitive comparison, so the derivation gives the same answer in every
 * build and on every host. Variants that normalization cannot reach (a capital,
 * a plural, the forme correcte itself) belong in the redirect table.
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
