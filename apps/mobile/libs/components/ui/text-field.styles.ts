import { StyleSheet } from 'react-native';

import { darkColors, minTouchTarget, radius, spacing, typography } from '../../theme';

export const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  label: {
    ...typography.label,
    color: darkColors.textSecondary,
  },
  inputRow: {
    minHeight: minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: darkColors.border,
    backgroundColor: darkColors.surfaceRaised,
    paddingHorizontal: spacing.md,
  },
  inputRowError: {
    borderColor: darkColors.overdue,
  },
  input: {
    ...typography.body,
    flex: 1,
    minHeight: minTouchTarget,
    color: darkColors.textPrimary,
  },
  hint: {
    ...typography.caption,
    color: darkColors.textMuted,
  },
  error: {
    ...typography.caption,
    color: darkColors.overdue,
  },
});
