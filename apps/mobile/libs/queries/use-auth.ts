import type { LoginRequest, RegisterRequest, UserProfile } from '@appleway/shared';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { fetchMe, login, register } from '../services/auth.service';
import { signOut, startSession } from '../services/session';
import { authKeys } from './keys';

export function useSignIn(): UseMutationResult<void, Error, LoginRequest> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body) => {
      const session = await login(body);
      queryClient.setQueryData(authKeys.me(), session.user);
      await startSession(session);
    },
  });
}

export function useSignUp(): UseMutationResult<void, Error, RegisterRequest> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body) => {
      const session = await register(body);
      queryClient.setQueryData(authKeys.me(), session.user);
      await startSession(session);
    },
  });
}

/**
 * Signs out even when offline (the server call is best effort) and drops every
 * cached query, so the next account never sees the previous one's data.
 */
export function useSignOut(): UseMutationResult<void, Error, void> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: signOut,
    onSettled: () => queryClient.clear(),
  });
}

export function useMe(): UseQueryResult<UserProfile, Error> {
  return useQuery({ queryKey: authKeys.me(), queryFn: fetchMe });
}
