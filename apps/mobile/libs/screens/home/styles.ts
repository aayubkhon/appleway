import { StyleSheet } from 'react-native';

import { darkColors, radius, spacing, typography } from '../../theme';

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: darkColors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  title: {
    ...typography.title,
    color: darkColors.textPrimary,
  },
  card: {
    backgroundColor: darkColors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: darkColors.border,
    padding: spacing.xl,
    gap: spacing.xs,
  },
  label: {
    ...typography.caption,
    color: darkColors.textMuted,
  },
  value: {
    ...typography.body,
    color: darkColors.textPrimary,
    marginBottom: spacing.sm,
  },
  error: {
    ...typography.body,
    color: darkColors.overdue,
    marginBottom: spacing.sm,
  },
});
