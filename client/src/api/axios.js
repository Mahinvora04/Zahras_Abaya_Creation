import axios from 'axios';
import { API_BASE_URL } from '../utils/apiBaseUrl';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname.replace(/\/+$/, '') || '/';
      const isAdminPath = currentPath === '/admin' || currentPath.startsWith('/admin/');
      const isAdminLogin = currentPath === '/admin/login';
      const publicPaths = ['/login', '/register', '/forgot-password', '/auth/callback'];

      if (isAdminPath && !isAdminLogin) {
        window.location.href = '/admin/login';
      } else if (!isAdminPath && !publicPaths.includes(currentPath)) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
