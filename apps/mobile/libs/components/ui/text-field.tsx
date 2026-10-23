import type { ReactElement, ReactNode } from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';

import { darkColors } from '../../theme';
import { styles } from './text-field.styles';

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  /** Already translated. Shown under the field and announced to screen readers. */
  error?: string;
  hint?: string;
  /** Rendered inside the field on the trailing edge, e.g. a show-password toggle. */
  trailing?: ReactNode;
}

export function TextField({
  label,
  error,
  hint,
  trailing,
  ...inputProps
}: TextFieldProps): ReactElement {
  const message = error ?? hint;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputRow, error !== undefined && styles.inputRowError]}>
        <TextInput
          {...inputProps}
          style={styles.input}
          placeholderTextColor={darkColors.textMuted}
          accessibilityLabel={label}
          accessibilityHint={message}
          aria-invalid={error !== undefined}
        />
        {trailing}
      </View>
      {message !== undefined ? (
        <Text
          style={error !== undefined ? styles.error : styles.hint}
          accessibilityLiveRegion={error !== undefined ? 'polite' : 'none'}
        >
          {message}
        </Text>
      ) : null}
    </View>
  );
}
