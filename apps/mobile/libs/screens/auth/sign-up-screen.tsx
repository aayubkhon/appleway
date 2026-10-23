import { useRouter } from 'expo-router';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { AuthForm } from '../../components/feature/auth-form';
import { Button } from '../../components/ui/button';
import { useSignUp } from '../../queries/use-auth';
import { authErrorKey } from '../../services/auth-error';
import { validateSignUp, type AuthFormErrors, type AuthFormValues } from '../../utils/auth-form';
import { AuthScreenLayout } from './auth-screen-layout';

export function SignUpScreen(): ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const signUp = useSignUp();

  const submit = (values: AuthFormValues): AuthFormErrors | null => {
    const result = validateSignUp(values);
    if (!result.ok) {
      return result.errors;
    }
    signUp.mutate(result.value);
    return null;
  };

  return (
    <AuthScreenLayout
      title={t('auth.signUpTitle')}
      subtitle={t('auth.signUpSubtitle')}
      footer={
        <Button
          variant="link"
          label={t('auth.toSignIn')}
          onPress={() => router.replace('/sign-in')}
        />
      }
    >
      <AuthForm
        mode="signUp"
        onSubmit={submit}
        submitting={signUp.isPending}
        formError={signUp.error ? t(authErrorKey(signUp.error)) : undefined}
      />
    </AuthScreenLayout>
  );
}
