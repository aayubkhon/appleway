import { useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { hitSlop } from '../../theme';
import type { AuthFormErrors, AuthFormValues } from '../../utils/auth-form';
import { Button } from '../ui/button';
import { TextField } from '../ui/text-field';
import { styles } from './auth-form.styles';

export interface AuthFormProps {
  mode: 'signIn' | 'signUp';
  /** Returns field errors to show, or null when the values were accepted. */
  onSubmit: (values: AuthFormValues) => AuthFormErrors | null;
  submitting: boolean;
  /** Translated message for a failed request. */
  formError?: string;
}

/** Phone-or-email plus password, shared by sign-in and sign-up. */
export function AuthForm({ mode, onSubmit, submitting, formError }: AuthFormProps): ReactElement {
  const { t } = useTranslation();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [errors, setErrors] = useState<AuthFormErrors>({});

  const submit = (): void => {
    setErrors(onSubmit({ identifier, password }) ?? {});
  };

  const isSignUp = mode === 'signUp';
  const toggleLabel = passwordVisible ? t('auth.hidePassword') : t('auth.showPassword');

  return (
    <View style={styles.form}>
      <TextField
        label={t('auth.identifierLabel')}
        placeholder={t('auth.identifierPlaceholder')}
        value={identifier}
        onChangeText={setIdentifier}
        error={errors.identifier && t(errors.identifier)}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="username"
        textContentType="username"
        inputMode="email"
        returnKeyType="next"
        editable={!submitting}
      />

      <TextField
        label={t('auth.passwordLabel')}
        value={password}
        onChangeText={setPassword}
        error={errors.password && t(errors.password)}
        hint={isSignUp ? t('auth.passwordHint') : undefined}
        secureTextEntry={!passwordVisible}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete={isSignUp ? 'new-password' : 'current-password'}
        textContentType={isSignUp ? 'newPassword' : 'password'}
        returnKeyType="go"
        onSubmitEditing={submit}
        editable={!submitting}
        trailing={
          <Pressable
            onPress={() => setPasswordVisible((visible) => !visible)}
            accessibilityRole="button"
            accessibilityLabel={toggleLabel}
            hitSlop={hitSlop}
            style={styles.toggle}
          >
            <Text style={styles.toggleLabel}>{toggleLabel}</Text>
          </Pressable>
        }
      />

      {formError !== undefined ? (
        <Text style={styles.formError} accessibilityRole="alert">
          {formError}
        </Text>
      ) : null}

      <Button
        label={isSignUp ? t('auth.signUpAction') : t('auth.signInAction')}
        onPress={submit}
        loading={submitting}
      />
    </View>
  );
}
