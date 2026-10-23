import {
  authSessionSchema,
  userProfileSchema,
  type AuthSession,
  type LoginRequest,
  type RegisterRequest,
  type UserProfile,
} from '@appleway/shared';

import { API_PREFIX, apiRequest } from './api-client';
import { authorizedRequest } from './session';

export async function register(body: RegisterRequest): Promise<AuthSession> {
  return authSessionSchema.parse(
    await apiRequest(`${API_PREFIX}/auth/register`, { method: 'POST', json: body }),
  );
}

export async function login(body: LoginRequest): Promise<AuthSession> {
  return authSessionSchema.parse(
    await apiRequest(`${API_PREFIX}/auth/login`, { method: 'POST', json: body }),
  );
}

export async function fetchMe(): Promise<UserProfile> {
  return userProfileSchema.parse(await authorizedRequest(`${API_PREFIX}/auth/me`));
}
