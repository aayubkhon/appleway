import { StyleSheet } from 'react-native';

import { darkColors, minTouchTarget, radius, spacing, typography } from '../../theme';

export const styles = StyleSheet.create({
  base: {
    minHeight: minTouchTarget,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
  },
  primary: {
    backgroundColor: darkColors.accent,
  },
  secondary: {
    backgroundColor: darkColors.surfaceRaised,
  },
  link: {
    backgroundColor: 'transparent',
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    ...typography.label,
    color: darkColors.textPrimary,
  },
  linkLabel: {
    ...typography.label,
    color: darkColors.accent,
  },
});
