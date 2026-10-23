import { StyleSheet } from 'react-native';

import { darkColors, spacing, typography } from '../../theme';

/** Shared by the sign-in and sign-up screens, which differ only in copy. */
export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: darkColors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
    gap: spacing.xl,
  },
  header: {
    gap: spacing.xs,
  },
  appName: {
    ...typography.label,
    color: darkColors.accent,
  },
  title: {
    ...typography.title,
    color: darkColors.textPrimary,
  },
  subtitle: {
    ...typography.body,
    color: darkColors.textSecondary,
  },
  footer: {
    gap: spacing.xs,
  },
});
