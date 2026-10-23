import type { ReactElement } from 'react';
import { ActivityIndicator, Pressable, Text } from 'react-native';

import { darkColors } from '../../theme';
import { styles } from './button.styles';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'link';
  loading?: boolean;
  disabled?: boolean;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
}: ButtonProps): ReactElement {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole={variant === 'link' ? 'link' : 'button'}
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && styles.pressed,
        isDisabled && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={darkColors.textPrimary} />
      ) : (
        <Text style={variant === 'link' ? styles.linkLabel : styles.label}>{label}</Text>
      )}
    </Pressable>
  );
}
