import axios from 'axios';
import { useAuthStore } from '@/store/authStore';

const api = axios.create({
  baseURL: '/',
  withCredentials: true, // send httpOnly refresh cookie
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request interceptor: attach Bearer token ─────────────────────────────
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Response interceptor: auto-refresh on 401 ───────────────────────────
let refreshing: Promise<string> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retried) {
      original._retried = true;

      if (!refreshing) {
        refreshing = axios
          .post<{ data: { accessToken: string } }>(
            '/api/auth/refresh',
            {},
            { withCredentials: true },
          )
          .then((res) => {
            const newToken = res.data.data.accessToken;
            useAuthStore.getState().updateAccessToken(newToken);
            refreshing = null;
            return newToken;
          })
          .catch((refreshErr) => {
            refreshing = null;
            useAuthStore.getState().clearAuth();
            window.location.href = '/login';
            return Promise.reject(refreshErr);
          });
      }

      const newToken = await refreshing;
      original.headers.Authorization = `Bearer ${newToken}`;
      return api(original);
    }
    return Promise.reject(error);
  },
);

export default api;
