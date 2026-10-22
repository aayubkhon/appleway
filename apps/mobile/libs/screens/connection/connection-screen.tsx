import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { env } from '../../config/env';
import { useHealth } from '../../queries/use-health';
import { darkColors } from '../../theme';
import { styles } from './styles';

/**
 * Scaffold screen for the test phase: it proves the phone can reach the api and
 * that the api can reach Postgres. The ledger replaces it in the UI phase.
 */
export function ConnectionScreen(): ReactElement {
  const { t } = useTranslation();
  const { data, isPending, isError, refetch, isRefetching } = useHealth();

  const isOnline = !isPending && !isError && data?.status === 'ok';

  const dotStyle = isPending
    ? styles.statusDotChecking
    : isOnline
      ? styles.statusDotOnline
      : styles.statusDotOffline;

  const statusLabel = isPending
    ? t('connection.checking')
    : isOnline
      ? t('connection.online')
      : t('connection.offline');

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <Text style={styles.appName}>{t('common.appName')}</Text>

        <View style={styles.card}>
          <Text style={styles.heading}>{t('connection.title')}</Text>

          <View style={styles.statusRow}>
            <View style={[styles.statusDot, dotStyle]} />
            <Text style={styles.statusText}>{statusLabel}</Text>
            {isRefetching ? <ActivityIndicator color={darkColors.textSecondary} /> : null}
          </View>

          {data ? (
            <Text style={styles.detail}>
              {t('connection.database')}:{' '}
              {data.database === 'up' ? t('connection.databaseUp') : t('connection.databaseDown')}
            </Text>
          ) : null}

          <Text style={styles.detail}>
            {t('connection.apiUrl')}: {env.apiUrl}
          </Text>

          <Pressable
            style={({ pressed }) => [styles.retryButton, pressed && styles.retryButtonPressed]}
            onPress={() => void refetch()}
            accessibilityRole="button"
            accessibilityLabel={t('common.retry')}
            disabled={isRefetching}
          >
            <Text style={styles.retryLabel}>{t('common.retry')}</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
