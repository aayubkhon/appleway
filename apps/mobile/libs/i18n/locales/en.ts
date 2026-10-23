import type { uz } from './uz';

/** English is planned; keys are kept in step with Uzbek as they are added. */
export const en: typeof uz = {
  common: {
    appName: 'Appleway',
    retry: 'Retry',
    loading: 'Loading...',
  },
  connection: {
    title: 'Server connection',
    checking: 'Checking the server...',
    online: 'Server is up',
    offline: 'Could not reach the server',
    database: 'Database',
    databaseUp: 'connected',
    databaseDown: 'not connected',
    apiUrl: 'Address',
  },
  auth: {
    signInTitle: 'Sign in',
    signInSubtitle: 'Sign in to your account',
    signUpTitle: 'Sign up',
    signUpSubtitle: 'Create a new account',
    identifierLabel: 'Phone or email',
    identifierPlaceholder: '90 123 45 67 or you@example.com',
    passwordLabel: 'Password',
    passwordHint: 'At least 8 characters',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    signInAction: 'Sign in',
    signUpAction: 'Sign up',
    toSignUp: 'No account? Sign up',
    toSignIn: 'Already have an account? Sign in',
    serverStatus: 'Check server connection',
    validation: {
      identifierRequired: 'Enter a phone or email',
      identifierInvalid: 'Phone number or email is not valid',
      passwordRequired: 'Enter your password',
      passwordTooShort: 'Password must be at least 8 characters',
      passwordTooLong: 'Password is too long',
    },
    errors: {
      invalidCredentials: 'Wrong login or password',
      accountExists: 'An account with this phone or email already exists',
      tooManyAttempts: 'Too many attempts. Try again in a minute',
      network: 'Could not reach the server. Check your connection',
      unknown: 'Something went wrong. Please try again',
    },
  },
  home: {
    welcome: 'Welcome',
    signedInAs: 'Account',
    timezone: 'Time zone',
    profileError: 'Could not load your profile',
    signOut: 'Sign out',
  },
};
