import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * One Markdown file per fiche, validated at build time so that a malformed
 * contribution fails CI instead of shipping.
 */
const fiches = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/fiches' }),
  schema: z
    .object({
      forme_fautive: z.string().min(1),
      forme_correcte: z.string().min(1).optional(),
      justification: z.string().min(1).optional(),
      sources: z.array(z.string().url()).default([]),
      bordel: z.string().min(1).optional(),
    })
    // A fiche with no forme correcte must say why instead of substituting.
    .refine((fiche) => fiche.forme_correcte !== undefined || fiche.justification !== undefined, {
      message: '`justification` is required when `forme_correcte` is absent',
      path: ['justification'],
    })
    // A fiche that substitutes something must be able to back the claim.
    .refine((fiche) => fiche.forme_correcte === undefined || fiche.sources.length > 0, {
      message: '`sources` needs at least one URL when `forme_correcte` is present',
      path: ['sources'],
    }),
});

export const collections = { fiches };
