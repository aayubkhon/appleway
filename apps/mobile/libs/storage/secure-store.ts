import * as SecureStore from 'expo-secure-store';

const REFRESH_TOKEN_KEY = 'appleway.refresh_token';

/**
 * The refresh token is the only secret the app keeps between launches. The
 * access token lives in memory only. AFTER_FIRST_UNLOCK lets a refresh happen
 * when the app wakes in the background, without leaving the device on backup.
 */
const options: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

export function readRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY, options);
}

export function writeRefreshToken(token: string): Promise<void> {
  return SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token, options);
}

export function deleteRefreshToken(): Promise<void> {
  return SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY, options);
}
