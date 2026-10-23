import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../components/ui/button';
import { useMe, useSignOut } from '../../queries/use-auth';
import { darkColors } from '../../theme';
import { styles } from './styles';

/**
 * Signed-in landing screen for the auth phase: proves the session works end to
 * end. The debt ledger replaces its body in the ledger phase.
 */
export function HomeScreen(): ReactElement {
  const { t } = useTranslation();
  const me = useMe();
  const signOut = useSignOut();

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <Text style={styles.title} accessibilityRole="header">
          {t('home.welcome')}
        </Text>

        <View style={styles.card}>
          {me.isPending ? (
            <ActivityIndicator color={darkColors.textSecondary} />
          ) : me.isError ? (
            <>
              <Text style={styles.error}>{t('home.profileError')}</Text>
              <Button
                variant="secondary"
                label={t('common.retry')}
                onPress={() => void me.refetch()}
              />
            </>
          ) : (
            <>
              <Text style={styles.label}>{t('home.signedInAs')}</Text>
              <Text style={styles.value}>{me.data.email ?? me.data.phone}</Text>
              <Text style={styles.label}>{t('home.timezone')}</Text>
              <Text style={styles.value}>{me.data.timezone}</Text>
            </>
          )}
        </View>

        <Button
          variant="secondary"
          label={t('home.signOut')}
          onPress={() => signOut.mutate()}
          loading={signOut.isPending}
        />
      </View>
    </SafeAreaView>
  );
}
