import { env } from '../config/env';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

const REQUEST_TIMEOUT_MS = 10_000;

/**
 * The single place network requests leave the app. Callers receive parsed JSON
 * and typed errors; response shapes are validated by the calling service.
 */
export async function apiRequest(path: string, init: RequestInit = {}): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${env.apiUrl}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { Accept: 'application/json', ...init.headers },
    });

    const body: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      throw new ApiError(`Request to ${path} failed`, response.status);
    }

    return body;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new NetworkError(error instanceof Error ? error.message : 'Network request failed');
  } finally {
    clearTimeout(timeout);
  }
}
