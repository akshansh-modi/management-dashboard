import api from './api';

export const uploadService = {
  uploadImage: async (file: File | Blob, folder: string = 'misc'): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    const { data } = await api.post<{ url: string }>('/upload/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return data.url;
  },
};
