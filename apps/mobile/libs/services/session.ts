import { authSessionSchema, type AuthSession } from '@appleway/shared';

import { deleteRefreshToken, readRefreshToken, writeRefreshToken } from '../storage/secure-store';
import { API_PREFIX, ApiError, apiRequest, type ApiRequestInit } from './api-client';

export type AuthStatus = 'restoring' | 'signedOut' | 'signedIn';

/** Refresh a little early so a request never leaves with a token about to die. */
const EXPIRY_MARGIN_MS = 30_000;

interface SessionState {
  status: AuthStatus;
  accessToken: string | null;
  accessTokenExpiresAt: number;
}

let state: SessionState = { status: 'restoring', accessToken: null, accessTokenExpiresAt: 0 };
const listeners = new Set<() => void>();
let refreshInFlight: Promise<string> | null = null;

function setState(next: SessionState): void {
  state = next;
  listeners.forEach((listener) => listener());
}

/** For useSyncExternalStore. */
export function subscribeAuthStatus(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getAuthStatus(): AuthStatus {
  return state.status;
}

/** Keeps a session the api just issued: refresh token on disk, access token in memory. */
export async function startSession(session: AuthSession): Promise<void> {
  await writeRefreshToken(session.refreshToken);
  setState({
    status: 'signedIn',
    accessToken: session.accessToken,
    accessTokenExpiresAt: Date.now() + session.accessTokenExpiresIn * 1000,
  });
}

/** Forgets the session on this device. The server side is ended by `signOut`. */
export async function endSession(): Promise<void> {
  refreshInFlight = null;
  await deleteRefreshToken();
  setState({ status: 'signedOut', accessToken: null, accessTokenExpiresAt: 0 });
}

/**
 * Called once at launch. A stored refresh token means the user stays signed
 * in; if the server cannot be reached the app still opens signed in and the
 * first authorised request refreshes the token.
 */
export async function restoreSession(): Promise<void> {
  // An unreadable keychain entry cannot be used; asking the user to sign in
  // again is the only recovery.
  const refreshToken = await readRefreshToken().catch(() => null);

  if (refreshToken === null) {
    setState({ status: 'signedOut', accessToken: null, accessTokenExpiresAt: 0 });
    return;
  }

  try {
    await refreshAccessToken();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      // refreshAccessToken already ended the session.
      return;
    }
    // Offline or server trouble at launch: keep the stored login and let the
    // first authorised request refresh again.
    setState({ status: 'signedIn', accessToken: null, accessTokenExpiresAt: 0 });
  }
}

/** Ends the login on the server, then on the device even if the server call fails. */
export async function signOut(): Promise<void> {
  const refreshToken = await readRefreshToken();

  try {
    if (refreshToken !== null) {
      await apiRequest(`${API_PREFIX}/auth/logout`, { method: 'POST', json: { refreshToken } });
    }
  } finally {
    await endSession();
  }
}

/**
 * One refresh at a time: the api treats a second use of the same refresh token
 * as theft and revokes the login, so concurrent callers share this promise.
 */
function refreshAccessToken(): Promise<string> {
  refreshInFlight ??= performRefresh().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

async function performRefresh(): Promise<string> {
  const refreshToken = await readRefreshToken();

  if (refreshToken === null) {
    await endSession();
    throw new ApiError('No stored session', 401);
  }

  try {
    const session = authSessionSchema.parse(
      await apiRequest(`${API_PREFIX}/auth/refresh`, { method: 'POST', json: { refreshToken } }),
    );
    await startSession(session);
    return session.accessToken;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      await endSession();
    }
    throw error;
  }
}

async function validAccessToken(): Promise<string> {
  const { accessToken, accessTokenExpiresAt } = state;

  if (accessToken !== null && accessTokenExpiresAt - EXPIRY_MARGIN_MS > Date.now()) {
    return accessToken;
  }

  return refreshAccessToken();
}

/**
 * apiRequest with the access token attached. A 401 gets one refresh and one
 * retry; if that fails too, the session is over and the error is rethrown.
 */
export async function authorizedRequest(path: string, init: ApiRequestInit = {}): Promise<unknown> {
  const send = (token: string): Promise<unknown> =>
    apiRequest(path, { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}` } });

  try {
    return await send(await validAccessToken());
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return send(await refreshAccessToken());
    }
    throw error;
  }
}
