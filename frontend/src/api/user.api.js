import api from "./axios";
export const userApi = {
  updateProfile: (data) => api.patch("/api/users/profile", data)
};
