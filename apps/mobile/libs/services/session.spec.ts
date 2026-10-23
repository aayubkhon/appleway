import type { AuthSession } from '@appleway/shared';

import {
  authorizedRequest,
  endSession,
  getAuthStatus,
  restoreSession,
  signOut,
  startSession,
} from './session';

const mockStore = new Map<string, string>();

jest.mock('expo-secure-store', () => ({
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 0,
  getItemAsync: (key: string) => Promise.resolve(mockStore.get(key) ?? null),
  setItemAsync: (key: string, value: string) => {
    mockStore.set(key, value);
    return Promise.resolve();
  },
  deleteItemAsync: (key: string) => {
    mockStore.delete(key);
    return Promise.resolve();
  },
}));

const USER_ID = '3f8b1c2e-6a9d-4e7f-8b1a-2c3d4e5f6a7b';

const session = (n: number): AuthSession => ({
  accessToken: `access-${n}`,
  accessTokenExpiresIn: 900,
  refreshToken: `refresh-${n}`,
  user: { id: USER_ID, phone: null, email: 'a@b.uz', timezone: 'Asia/Tashkent' },
});

const json = (status: number, body: unknown): Response =>
  ({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) }) as Response;

const fetchMock = jest.fn<Promise<Response>, [string, RequestInit]>();

const requestsTo = (suffix: string): RequestInit[] =>
  fetchMock.mock.calls.filter(([url]) => url.endsWith(suffix)).map(([, init]) => init);

beforeEach(async () => {
  mockStore.clear();
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
  await endSession();
});

describe('session', () => {
  it('signs out at launch when no refresh token is stored', async () => {
    await restoreSession();

    expect(getAuthStatus()).toBe('signedOut');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('restores a stored login by refreshing it', async () => {
    mockStore.set('appleway.refresh_token', 'refresh-1');
    fetchMock.mockResolvedValueOnce(json(200, session(2)));

    await restoreSession();

    expect(getAuthStatus()).toBe('signedIn');
    expect(mockStore.get('appleway.refresh_token')).toBe('refresh-2');
  });

  it('signs out at launch when the server rejects the stored token', async () => {
    mockStore.set('appleway.refresh_token', 'stale');
    fetchMock.mockResolvedValueOnce(json(401, { message: 'invalid refresh token' }));

    await restoreSession();

    expect(getAuthStatus()).toBe('signedOut');
    expect(mockStore.has('appleway.refresh_token')).toBe(false);
  });

  it('stays signed in when the server is unreachable at launch', async () => {
    mockStore.set('appleway.refresh_token', 'refresh-1');
    fetchMock.mockRejectedValueOnce(new TypeError('Network request failed'));

    await restoreSession();

    expect(getAuthStatus()).toBe('signedIn');
    expect(mockStore.get('appleway.refresh_token')).toBe('refresh-1');
  });

  it('attaches the access token to authorised requests', async () => {
    await startSession(session(1));
    fetchMock.mockResolvedValueOnce(json(200, { ok: true }));

    await authorizedRequest('/api/v1/auth/me');

    expect(requestsTo('/auth/me')[0]?.headers).toMatchObject({
      Authorization: 'Bearer access-1',
    });
  });

  it('refreshes once and retries when the access token is rejected', async () => {
    await startSession(session(1));
    fetchMock
      .mockResolvedValueOnce(json(401, {}))
      .mockResolvedValueOnce(json(200, session(2)))
      .mockResolvedValueOnce(json(200, { ok: true }));

    await expect(authorizedRequest('/api/v1/auth/me')).resolves.toEqual({ ok: true });

    expect(requestsTo('/auth/me')[1]?.headers).toMatchObject({
      Authorization: 'Bearer access-2',
    });
  });

  it('shares one refresh between concurrent requests', async () => {
    mockStore.set('appleway.refresh_token', 'refresh-1');
    fetchMock.mockImplementation((url) =>
      Promise.resolve(url.endsWith('/auth/refresh') ? json(200, session(2)) : json(200, {})),
    );

    await Promise.all([
      authorizedRequest('/api/v1/auth/me'),
      authorizedRequest('/api/v1/auth/me'),
      authorizedRequest('/api/v1/auth/me'),
    ]);

    expect(requestsTo('/auth/refresh')).toHaveLength(1);
  });

  it('ends the session when the refresh token is rejected', async () => {
    await startSession(session(1));
    fetchMock.mockResolvedValueOnce(json(401, {})).mockResolvedValueOnce(json(401, {}));

    await expect(authorizedRequest('/api/v1/auth/me')).rejects.toMatchObject({ status: 401 });

    expect(getAuthStatus()).toBe('signedOut');
  });

  it('signs out locally even when the logout call fails', async () => {
    await startSession(session(1));
    fetchMock.mockRejectedValueOnce(new TypeError('Network request failed'));

    await expect(signOut()).rejects.toThrow();

    expect(getAuthStatus()).toBe('signedOut');
    expect(mockStore.has('appleway.refresh_token')).toBe(false);
  });
});
