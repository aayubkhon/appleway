import { focusManager, onlineManager, QueryClientProvider } from '@tanstack/react-query';
import * as Network from 'expo-network';
import { useEffect, useRef, type ReactNode } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { createQueryClient } from './query-client';

/**
 * React Native has no browser online/focus events, so TanStack Query is fed
 * from expo-network and AppState here, once, at the root.
 */
onlineManager.setEventListener((setOnline) => {
  const subscription = Network.addNetworkStateListener((state) => {
    setOnline(Boolean(state.isInternetReachable ?? state.isConnected));
  });

  return () => subscription.remove();
});

interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps): ReactNode {
  const queryClient = useRef(createQueryClient()).current;

  useEffect(() => {
    const onAppStateChange = (status: AppStateStatus): void => {
      focusManager.setFocused(status === 'active');
    };

    const subscription = AppState.addEventListener('change', onAppStateChange);

    return () => subscription.remove();
  }, []);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
