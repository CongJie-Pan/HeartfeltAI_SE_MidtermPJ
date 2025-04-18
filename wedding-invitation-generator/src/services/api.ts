import axios, { AxiosResponse, AxiosError } from 'axios';
import { CoupleInfo, GuestInfo } from '../types';

// 設置API基礎URL
const API_URL = 'http://localhost:5000/api';

// 創建axios實例
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 錯誤處理
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    console.error('API請求錯誤:', error);
    return Promise.reject(error);
  }
);

// API函數
export const api = {
  // 健康檢查
  health: {
    check: () => apiClient.get('/health'),
    detailed: () => apiClient.get('/health/detailed'),
  },
  
  // 新人資料
  couple: {
    save: (coupleData: CoupleInfo) => apiClient.post('/couple', coupleData),
    get: () => apiClient.get('/couple'),
  },
  
  // 賓客管理
  guests: {
    add: (guestData: GuestInfo) => apiClient.post('/guests', guestData),
    getAll: () => apiClient.get('/guests'),
    get: (id: string) => apiClient.get(`/guests/${id}`),
    update: (id: string, guestData: GuestInfo) => apiClient.put(`/guests/${id}`, guestData),
    delete: (id: string) => apiClient.delete(`/guests/${id}`),
  },
  
  // 邀請函生成
  invitations: {
    generate: (guestId: string, force = false) => 
      apiClient.post('/invitations/generate', { guestId }, { params: { force } }),
    update: (guestId: string, invitationContent: string) => 
      apiClient.put(`/invitations/${guestId}`, { invitationContent }),
  },
  
  // 邀請函發送
  emails: {
    sendAll: () => apiClient.post('/emails/send'),
    send: (guestId: string) => apiClient.post(`/emails/send/${guestId}`),
  },
};

export default api; 