import axios from "axios";
import { useAuthStore } from "@/store/authStore";
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/",
  withCredentials: true,
  headers: { "Content-Type": "application/json" }
});
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
let refreshing = null;
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retried) {
      original._retried = true;
      if (!refreshing) {
        refreshing = axios.post(
          `${import.meta.env.VITE_API_URL || ""}/api/auth/refresh`,
          {},
          { withCredentials: true }
        ).then((res) => {
          const newToken2 = res.data.data.accessToken;
          useAuthStore.getState().updateAccessToken(newToken2);
          refreshing = null;
          return newToken2;
        }).catch((refreshErr) => {
          refreshing = null;
          useAuthStore.getState().clearAuth();
          window.location.href = "/login";
          return Promise.reject(refreshErr);
        });
      }
      const newToken = await refreshing;
      original.headers.Authorization = `Bearer ${newToken}`;
      return api(original);
    }
    return Promise.reject(error);
  }
);
export default api;
