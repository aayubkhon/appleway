import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, type ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { initI18n } from '../libs/i18n';
import { QueryProvider } from '../libs/queries/query-provider';
import { darkColors } from '../libs/theme';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout(): ReactElement | null {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const prepare = async (): Promise<void> => {
      await initI18n();
      setIsReady(true);
      await SplashScreen.hideAsync();
    };

    void prepare();
  }, []);

  if (!isReady) {
    return null;
  }

  return (
    <QueryProvider>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: darkColors.background },
          }}
        />
      </SafeAreaProvider>
    </QueryProvider>
  );
}
