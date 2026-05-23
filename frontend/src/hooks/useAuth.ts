import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi, PublicUser } from '../api/auth';
import { ApiError } from '../api/client';

const ME_KEY = ['auth', 'me'] as const;

export function useMe() {
  return useQuery<PublicUser | null>({
    queryKey: ME_KEY,
    queryFn: async () => {
      try {
        return await authApi.me();
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) return null;
        throw e;
      }
    },
    staleTime: 60_000,
  });
}

type Credentials = { username: string; password: string };

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (creds: Credentials) => authApi.login(creds.username, creds.password),
    onSuccess: (user) => qc.setQueryData(ME_KEY, user),
  });
}

export function useRegister() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (creds: Credentials) => authApi.register(creds.username, creds.password),
    onSuccess: () => qc.invalidateQueries({ queryKey: ME_KEY }),
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      qc.setQueryData(ME_KEY, null);
      qc.clear();
    },
  });
}
