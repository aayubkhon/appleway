import { ApiError, NetworkError } from './api-client';

/** i18n keys under auth.errors. */
export type AuthErrorKey =
  | 'auth.errors.invalidCredentials'
  | 'auth.errors.accountExists'
  | 'auth.errors.tooManyAttempts'
  | 'auth.errors.network'
  | 'auth.errors.unknown';

/** Maps a failed sign-in or sign-up to a message the user can act on. */
export function authErrorKey(error: unknown): AuthErrorKey {
  if (error instanceof NetworkError) {
    return 'auth.errors.network';
  }
  if (error instanceof ApiError) {
    switch (error.status) {
      case 401:
        return 'auth.errors.invalidCredentials';
      case 409:
        return 'auth.errors.accountExists';
      case 429:
        return 'auth.errors.tooManyAttempts';
    }
  }
  return 'auth.errors.unknown';
}
