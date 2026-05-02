import api from './axios';
import type { User, ApiResponse } from '@/types';

export interface UpdateProfileRequest {
  displayName?: string;
  avatarUrl?: string;
  description?: string;
  dob?: string;
  gender?: string;
}

export const userApi = {
  updateProfile: (data: UpdateProfileRequest) =>
    api.patch<ApiResponse<{ user: User }>>('/api/users/profile', data),
};
