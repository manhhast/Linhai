import { Capacitor } from '@capacitor/core';

// Đây là URL của server backend (AI Studio Preview URL)
// Khi chạy trên Android, chúng ta cần URL tuyệt đối thay vì đường dẫn tương đối
export const API_BASE_URL = Capacitor.isNativePlatform() 
  ? 'https://ais-dev-teuzfzcox7edjaufjngxz2-367782954090.asia-southeast1.run.app' 
  : '';

export const getApiUrl = (path: string) => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
};
