import { useRouter } from 'expo-router';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { AuthForm } from '../../components/feature/auth-form';
import { Button } from '../../components/ui/button';
import { useSignIn } from '../../queries/use-auth';
import { authErrorKey } from '../../services/auth-error';
import { validateSignIn, type AuthFormErrors, type AuthFormValues } from '../../utils/auth-form';
import { AuthScreenLayout } from './auth-screen-layout';

export function SignInScreen(): ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const signIn = useSignIn();

  const submit = (values: AuthFormValues): AuthFormErrors | null => {
    const result = validateSignIn(values);
    if (!result.ok) {
      return result.errors;
    }
    signIn.mutate(result.value);
    return null;
  };

  return (
    <AuthScreenLayout
      title={t('auth.signInTitle')}
      subtitle={t('auth.signInSubtitle')}
      footer={
        <>
          <Button
            variant="link"
            label={t('auth.toSignUp')}
            onPress={() => router.replace('/sign-up')}
          />
          <Button
            variant="link"
            label={t('auth.serverStatus')}
            onPress={() => router.push('/connection')}
          />
        </>
      }
    >
      <AuthForm
        mode="signIn"
        onSubmit={submit}
        submitting={signIn.isPending}
        formError={signIn.error ? t(authErrorKey(signIn.error)) : undefined}
      />
    </AuthScreenLayout>
  );
}
