/**
 * Hand-maintained redirect table: the forms people actually type, mapped to
 * the fiche that answers them.
 *
 * Kept pure and free of Astro so the table is testable on its own; the build
 * feeds it to Astro's static `redirects` (see `astro.config.mjs`), which emits
 * one document per entry. Slugs are not normalized at request time, so a
 * variant that differs from the derived slug only by an accent, a capital or a
 * plural needs a line here.
 */
export const redirects: Readonly<Record<string, string>> = {
  // The forme correcte of the `digital` fiche: people type the right word and
  // still want the rant about `numerique` (#11 authors that fiche).
  '/numerique': '/digital',
  // The forme correcte of the `publique` fiche.
  '/public': '/publique',
  // Typographic variant of `publique`: the word typed at the start of a
  // sentence, or pasted from one, keeps its capital.
  '/Publique': '/publique',
  // The spec's own URLs. `force à toi` and `en vrai` derive to `/forceatoi`
  // and `/envrai`; the hyphenated form is the one people paste from the spec.
  '/force-a-toi': '/forceatoi',
  '/en-vrai': '/envrai',
};
