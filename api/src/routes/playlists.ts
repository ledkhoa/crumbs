import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AppEnv } from '../types/env';

const createPlaylistSchema = z.object({
  name: z.string().min(1, 'Playlist name is required'),
  description: z.string().optional(),
  emoji: z.string().optional().default('🍽️'),
});

export const playlistsRouter = new Hono<AppEnv>();

playlistsRouter.get('/', (c) => {
  return c.json({
    playlists: [
      {
        id: 'demo-1',
        name: 'Friday Date Nights',
        emoji: '🍷',
        itemCount: 4,
      },
      {
        id: 'demo-2',
        name: 'Late Night Slices',
        emoji: '🍕',
        itemCount: 7,
      },
    ],
  });
});

playlistsRouter.post('/', zValidator('json', createPlaylistSchema), (c) => {
  const data = c.req.valid('json');
  return c.json(
    {
      success: true,
      playlist: {
        id: `pl-${Date.now()}`,
        ...data,
        createdAt: new Date().toISOString(),
      },
    },
    201,
  );
});
