import axios from 'axios';
import { useAuthStore } from './store';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Helper to get access token safely from localStorage or store
export const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return (
    localStorage.getItem('accessToken') ||
    useAuthStore.getState().accessToken ||
    null
  );
};

// Helper to get refresh token safely
export const getRefreshToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return (
    localStorage.getItem('refreshToken') ||
    useAuthStore.getState().refreshToken ||
    null
  );
};

// Attach access token to every outgoing request
api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    if (config.headers && typeof (config.headers as any).set === 'function') {
      (config.headers as any).set('Authorization', `Bearer ${token}`);
    } else {
      config.headers = config.headers || {};
      (config.headers as any).Authorization = `Bearer ${token}`;
      (config.headers as any)['authorization'] = `Bearer ${token}`;
    }
  }
  return config;
});

// Mutex & queue for concurrent token refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

// Auto-refresh on 401 with queuing to prevent concurrency storms
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;

    // Do not attempt refresh on auth endpoints or already retried requests
    if (
      !error.response ||
      error.response.status !== 401 ||
      originalRequest._retry ||
      originalRequest.url?.includes('/auth/refresh') ||
      originalRequest.url?.includes('/auth/login')
    ) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          if (originalRequest.headers && typeof (originalRequest.headers as any).set === 'function') {
            (originalRequest.headers as any).set('Authorization', `Bearer ${token}`);
          } else {
            originalRequest.headers = originalRequest.headers || {};
            (originalRequest.headers as any).Authorization = `Bearer ${token}`;
          }
          return api(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      // Dedicated unintercepted axios call to refresh
      const refreshResponse = await axios.post(`${API_URL}/auth/refresh`, {
        refreshToken,
      });

      const { accessToken, refreshToken: newRefreshToken } = refreshResponse.data;

      // Update both Zustand store and localStorage
      useAuthStore.getState().setTokens(accessToken, newRefreshToken);

      // Keep biometric auth in sync if saved
      if (typeof window !== 'undefined') {
        const bioStr = localStorage.getItem('aalawsng_biometric_auth');
        if (bioStr) {
          try {
            const bio = JSON.parse(bioStr);
            bio.accessToken = accessToken;
            bio.refreshToken = newRefreshToken;
            localStorage.setItem('aalawsng_biometric_auth', JSON.stringify(bio));
          } catch {}
        }
      }

      processQueue(null, accessToken);

      if (originalRequest.headers && typeof (originalRequest.headers as any).set === 'function') {
        (originalRequest.headers as any).set('Authorization', `Bearer ${accessToken}`);
      } else {
        originalRequest.headers = originalRequest.headers || {};
        (originalRequest.headers as any).Authorization = `Bearer ${accessToken}`;
      }

      return api(originalRequest);
    } catch (refreshErr) {
      processQueue(refreshErr, null);
      useAuthStore.getState().logout();
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
      return Promise.reject(refreshErr);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
