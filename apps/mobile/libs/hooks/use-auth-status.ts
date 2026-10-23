import { useSyncExternalStore } from 'react';

import { getAuthStatus, subscribeAuthStatus, type AuthStatus } from '../services/session';

/** Re-renders when the user signs in or out, from any screen or a failed refresh. */
export function useAuthStatus(): AuthStatus {
  return useSyncExternalStore(subscribeAuthStatus, getAuthStatus);
}
