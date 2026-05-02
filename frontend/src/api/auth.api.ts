import api from './axios';
import type { AuthResponse, LoginRequest, RegisterRequest, User } from '@/types';

export const authApi = {
  login: (body: LoginRequest) =>
    api.post<{ data: AuthResponse }>('/api/auth/login', body),

  register: (body: RegisterRequest) =>
    api.post<{ data: AuthResponse }>('/api/auth/register', body),

  logout: () =>
    api.post('/api/auth/logout'),

  refreshToken: () =>
    api.post<{ data: { accessToken: string } }>('/api/auth/refresh'),

  getMe: (accessToken?: string) =>
    api.get<{ data: { user: User } }>('/api/auth/me', accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : undefined),
};
