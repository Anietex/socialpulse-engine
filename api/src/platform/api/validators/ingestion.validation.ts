/**
 * Ingestion Validation Schemas
 */

import { z } from 'zod';

/**
 * Image schema - accepts both string URLs and objects with url + alt
 * This maintains backward compatibility with Chrome extension
 */
const imageSchema = z.union([
  z.string(), // Simple URL string
  z.object({
    url: z.string(),
    alt: z.string().optional(),
  }),
]);

/**
 * Ingest tweets validation schema
 * Backward compatible with Chrome extension format
 */
export const ingestTweetsSchema = z.object({
  body: z.object({
    tweets: z.array(
      z.object({
        injectedId: z.string().min(1, 'Injected ID is required'),
        text: z.string(),
        user: z.object({
          name: z.string().min(1, 'User name is required'),
          handle: z.string().min(1, 'User handle is required'),
          avatar: z.string().optional(),
        }),
        url: z.string().optional(), // Optional for backward compatibility
        media: z
          .object({
            images: z.array(imageSchema).optional(), // Accepts both formats
            videos: z.array(z.string()).optional(),
            gifs: z.array(z.string()).optional(),
          })
          .optional(),
        metrics: z
          .object({
            likes: z.number().optional(),
            replies: z.number().optional(),
            reposts: z.number().optional(),
            views: z.number().optional(),
          })
          .optional(),
        scrapedAt: z.string().optional(),
      })
    ),
    userId: z.string().optional(), // Optional for anonymous users
  }),
});

export type IngestTweetsDto = z.infer<typeof ingestTweetsSchema>['body'];
