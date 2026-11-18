/**
 * How a source URL is shown to a reader.
 *
 * The source line has to stay one line, so the reader is shown the host and the
 * full URL travels in the link's `title`. Anything that is not a URL is shown
 * as it was written rather than blanked out.
 *
 * Pure: no Astro, no DOM, no I/O.
 */
export function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}
