import {
  parseLoginIdentifier,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  type LoginRequest,
  type RegisterRequest,
} from '@appleway/shared';

/** i18n keys under auth.validation. */
export type AuthFieldError =
  | 'auth.validation.identifierRequired'
  | 'auth.validation.identifierInvalid'
  | 'auth.validation.passwordRequired'
  | 'auth.validation.passwordTooShort'
  | 'auth.validation.passwordTooLong';

export interface AuthFormValues {
  identifier: string;
  password: string;
}

export interface AuthFormErrors {
  identifier?: AuthFieldError;
  password?: AuthFieldError;
}

export type AuthFormResult<T> = { ok: true; value: T } | { ok: false; errors: AuthFormErrors };

function identifierError(identifier: string): AuthFieldError | undefined {
  if (identifier.trim() === '') {
    return 'auth.validation.identifierRequired';
  }
  return parseLoginIdentifier(identifier) === null
    ? 'auth.validation.identifierInvalid'
    : undefined;
}

/** Sign-in only checks presence: the server is the judge of whether it matches. */
export function validateSignIn(values: AuthFormValues): AuthFormResult<LoginRequest> {
  const errors: AuthFormErrors = {
    identifier: identifierError(values.identifier),
    password: values.password === '' ? 'auth.validation.passwordRequired' : undefined,
  };

  if (errors.identifier !== undefined || errors.password !== undefined) {
    return { ok: false, errors };
  }

  return { ok: true, value: { identifier: values.identifier.trim(), password: values.password } };
}

function newPasswordError(password: string): AuthFieldError | undefined {
  if (password === '') {
    return 'auth.validation.passwordRequired';
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    return 'auth.validation.passwordTooShort';
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return 'auth.validation.passwordTooLong';
  }
  return undefined;
}

/** One field takes a phone or an email; it is sent as whichever it is. */
export function validateSignUp(values: AuthFormValues): AuthFormResult<RegisterRequest> {
  const identifier = parseLoginIdentifier(values.identifier);
  const errors: AuthFormErrors = {
    identifier: identifierError(values.identifier),
    password: newPasswordError(values.password),
  };

  if (identifier === null || errors.identifier !== undefined || errors.password !== undefined) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value:
      identifier.kind === 'email'
        ? { email: identifier.email, password: values.password }
        : { phone: identifier.phone, password: values.password },
  };
}
