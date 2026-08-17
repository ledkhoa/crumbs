import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '../types/env';
import { getAuth } from '../auth';

/**
 * Middleware that verifies the active BetterAuth session and attaches user and session to context.
 * Rejects unauthenticated requests with 401 Unauthorized.
 */
export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const auth = getAuth({
    databaseUrl: c.env.DATABASE_URL || '',
    secret: c.env.BETTER_AUTH_SECRET,
    baseURL: c.env.BETTER_AUTH_URL,
  });

  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session) {
    return c.json(
      {
        success: false,
        error: 'Unauthorized: Valid session required',
      },
      401,
    );
  }

  c.set('user', {
    ...session.user,
    image: session.user.image ?? null,
  });
  c.set('session', {
    ...session.session,
    ipAddress: session.session.ipAddress ?? null,
    userAgent: session.session.userAgent ?? null,
  });
  await next();
});
