import api from "./axios";
export const authApi = {
  login: (body) => api.post("/api/auth/login", body),
  register: (body) => api.post("/api/auth/register", body),
  logout: () => api.post("/api/auth/logout"),
  refreshToken: () => api.post("/api/auth/refresh"),
  getMe: (accessToken) => api.get("/api/auth/me", accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : void 0)
};
