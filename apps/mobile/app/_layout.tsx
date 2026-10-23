import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useAuthStatus } from '../libs/hooks/use-auth-status';
import { initI18n } from '../libs/i18n';
import { QueryProvider } from '../libs/queries/query-provider';
import { restoreSession } from '../libs/services/session';
import { darkColors } from '../libs/theme';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout(): ReactElement | null {
  const [isReady, setIsReady] = useState(false);
  const authStatus = useAuthStatus();

  useEffect(() => {
    const prepare = async (): Promise<void> => {
      await Promise.all([initI18n(), restoreSession()]);
      setIsReady(true);
      await SplashScreen.hideAsync();
    };

    void prepare();
  }, []);

  // The splash screen stays up until we know which side of the guard to show.
  if (!isReady || authStatus === 'restoring') {
    return null;
  }

  return (
    <QueryProvider>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <RootStack isSignedIn={authStatus === 'signedIn'} />
      </SafeAreaProvider>
    </QueryProvider>
  );
}

interface RootStackProps {
  isSignedIn: boolean;
}

/**
 * Auth gating lives here and nowhere else. When the guard flips, expo-router
 * drops the now-forbidden history and lands on the first allowed screen.
 */
function RootStack({ isSignedIn }: RootStackProps): ReactElement {
  const { t } = useTranslation();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: darkColors.background },
      }}
    >
      <Stack.Protected guard={isSignedIn}>
        <Stack.Screen name="index" />
      </Stack.Protected>

      <Stack.Protected guard={!isSignedIn}>
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="sign-up" />
      </Stack.Protected>

      <Stack.Screen
        name="connection"
        options={{
          headerShown: true,
          title: t('connection.title'),
          headerStyle: { backgroundColor: darkColors.surface },
          headerTintColor: darkColors.textPrimary,
        }}
      />
    </Stack>
  );
}
