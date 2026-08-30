import { hc } from 'hono/client';
import type { AppType } from '@api/app';
import Constants from 'expo-constants';
import { useSessionStore } from '@/store/session';

export const getApiBaseUrl = (): string => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // Detect Metro bundler IP when running on physical devices or simulators
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    return `http://${ip}:8787`;
  }

  return 'http://localhost:8787';
};

/**
 * End-to-end type-safe Hono RPC client for Crumbs API.
 *
 * Dynamically provides the Authorization Bearer token from Zustand session state.
 */
export interface ApiClientHeaders {
  Origin: string;
  Authorization?: string;
  [header: string]: string | undefined;
}

function getClientHeaders(): ApiClientHeaders {
  const token = useSessionStore.getState().token;
  if (token) {
    return {
      Origin: getApiBaseUrl(),
      Authorization: `Bearer ${token}`,
    };
  }
  return {
    Origin: getApiBaseUrl(),
  };
}

export const apiClient = hc<AppType>(getApiBaseUrl(), {
  // SAFETY: Hono Client requires Record<string, string> callback contract matching ApiClientHeaders
  headers: getClientHeaders as () => Record<string, string>,
});

export interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
}

/**
 * Universal raw fetch helper for external routes (e.g. BetterAuth endpoints).
 */
export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { requiresAuth = true, headers, ...rest } = options;
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${path}`;

  const requestHeaders = new Headers(headers);
  if (!requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json');
  }
  if (!requestHeaders.has('Origin')) {
    requestHeaders.set('Origin', baseUrl);
  }

  if (requiresAuth) {
    const token = useSessionStore.getState().token;
    if (token) {
      requestHeaders.set('Authorization', `Bearer ${token}`);
    }
  }

  const res = await fetch(url, {
    headers: requestHeaders,
    ...rest,
  });

  // SAFETY: Server error response returns a JSON object with optional message or error fields
  const data = (await res.json()) as { message?: string; error?: string };

  if (!res.ok) {
    throw new Error(data.message || data.error || `HTTP error ${res.status}`);
  }

  // SAFETY: Server contract guarantees JSON matches requested type T on 2xx status code
  return data as T;
}
