import { StyleSheet } from 'react-native';

import { darkColors, minTouchTarget, radius, spacing, typography } from '../../theme';

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
  card: {
    backgroundColor: darkColors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: darkColors.border,
    padding: spacing.xl,
    gap: spacing.md,
  },
  appName: {
    ...typography.title,
    color: darkColors.textPrimary,
  },
  heading: {
    ...typography.label,
    color: darkColors.textSecondary,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusDot: {
    width: spacing.md,
    height: spacing.md,
    borderRadius: radius.pill,
  },
  statusDotOnline: {
    backgroundColor: darkColors.paid,
  },
  statusDotOffline: {
    backgroundColor: darkColors.overdue,
  },
  statusDotChecking: {
    backgroundColor: darkColors.dueToday,
  },
  statusText: {
    ...typography.body,
    color: darkColors.textPrimary,
  },
  detail: {
    ...typography.caption,
    color: darkColors.textMuted,
  },
  retryButton: {
    minHeight: minTouchTarget,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radius.md,
    backgroundColor: darkColors.surfaceRaised,
    paddingHorizontal: spacing.lg,
  },
  retryButtonPressed: {
    opacity: 0.6,
  },
  retryLabel: {
    ...typography.label,
    color: darkColors.textPrimary,
  },
});
