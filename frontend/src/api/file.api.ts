import api from './axios';
import type { FileRecord, PresignedUrlResponse } from '@/types';

export const fileApi = {
  upload: (file: File, channelId?: string) => {
    const form = new FormData();
    form.append('file', file);
    if (channelId) form.append('channelId', channelId);
    return api.post<{ data: FileRecord }>('/api/files/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  getInfo: (fileId: string) =>
    api.get<{ data: FileRecord }>(`/api/files/${fileId}`),

  getPresignedUrl: (fileId: string) =>
    api.get<{ data: PresignedUrlResponse }>(`/api/files/${fileId}/presigned`),

  getChannelFiles: (channelId: string) =>
    api.get<{ data: { files: FileRecord[] } }>(`/api/files/channel/${channelId}`),

  deleteFile: (fileId: string) =>
    api.delete(`/api/files/${fileId}`),
};
