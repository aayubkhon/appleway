import { StyleSheet } from 'react-native';

import { darkColors, minTouchTarget, spacing, typography } from '../../theme';

export const styles = StyleSheet.create({
  form: {
    gap: spacing.lg,
  },
  toggle: {
    minHeight: minTouchTarget,
    justifyContent: 'center',
    paddingLeft: spacing.sm,
  },
  toggleLabel: {
    ...typography.caption,
    color: darkColors.accent,
  },
  formError: {
    ...typography.body,
    color: darkColors.overdue,
  },
});
