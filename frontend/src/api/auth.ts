import { api } from './client';

export type PublicUser = {
  id: string;
  username: string;
  created_at: string;
};

export const authApi = {
  register: (username: string, password: string) =>
    api.post<PublicUser>('/auth/register', { username, password }),
  login: (username: string, password: string) =>
    api.post<PublicUser>('/auth/login', { username, password }),
  logout: () => api.post<{ ok: boolean }>('/auth/logout', {}),
  me: () => api.get<PublicUser>('/auth/me'),
};
