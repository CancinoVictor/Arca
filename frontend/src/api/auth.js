import { api } from './client';
export const authApi = {
    register: (username, password) => api.post('/auth/register', { username, password }),
    login: (username, password) => api.post('/auth/login', { username, password }),
    logout: () => api.post('/auth/logout', {}),
    me: () => api.get('/auth/me'),
};
